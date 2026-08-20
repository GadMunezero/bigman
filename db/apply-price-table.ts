/**
 * Applies a supplied price table to data/futures-specs.json.
 *
 * This one OVERWRITES, which is the opposite of db/apply-research.ts, and the
 * difference is deliberate. A search pass off secondary pages is a weaker
 * claim than the figures already on file, so that script only fills blanks.
 * A price table supplied directly for this project is the stronger claim and
 * the later one, so it wins — the convention already recorded in the specs
 * file header: where two supplied lists disagree, the later one wins.
 *
 * Every overwrite is printed with the value it replaced, so the change is
 * reviewable rather than silent.
 *
 * Two rules keep it honest:
 *
 *   RANGES ARE NOT PRICES. "$115.20–$140.40" describes several products or
 *   configurations. Writing either endpoint onto one row states a price the
 *   firm does not charge for that thing. Ranges are recorded in the product's
 *   notes and left out of the price column.
 *
 *   A FIRM-LEVEL ROW NEEDS A UNIQUE HOME. Where the table names a size but not
 *   a product, the price is applied only if exactly one product at that firm
 *   sells that size. Otherwise it is reported as ambiguous and skipped —
 *   spreading one price across four products would be four claims from one
 *   fact.
 *
 *   npx tsx db/apply-price-table.ts            # dry run
 *   npx tsx db/apply-price-table.ts --apply
 */
import fs from "node:fs";
import path from "node:path";

interface SizeSpec { target?: number; dd?: number; daily?: number; price?: number }
interface Product {
  firm: string;
  product: string;
  program?: string;
  billing?: string;
  notes?: string;
  sizes: Record<string, SizeSpec>;
  [key: string]: unknown;
}

interface Row {
  firm: string;
  /** Omit to let the unique-size rule find the product. */
  product?: string;
  size: number;
  price?: number;
  /** Published as a range rather than a single figure. Never becomes a price. */
  range?: string;
  billing?: "one_time" | "monthly";
  /** Adds the size to the product when the table covers one the file lacks. */
  addSize?: boolean;
  note?: string;
}

const ROWS: Row[] = [
  // ---- Lucid Trading ------------------------------------------------------
  // The four-size ladder belongs to LucidFlex: it is the only Lucid product
  // sold at all four sizes, which is what a four-rung ladder describes. The
  // "alternative" 50K figures are the LucidPro and LucidDaily variants, but
  // the table does not say which is which, so they stay in the notes.
  { firm: "Lucid Trading", product: "LucidFlex", size: 25000, price: 65.3, billing: "one_time" },
  { firm: "Lucid Trading", product: "LucidFlex", size: 50000, price: 105.2, billing: "one_time" },
  { firm: "Lucid Trading", product: "LucidFlex", size: 100000, price: 215.6, billing: "one_time" },
  { firm: "Lucid Trading", product: "LucidFlex", size: 150000, price: 295.4, billing: "one_time" },
  {
    firm: "Lucid Trading",
    product: "LucidPro",
    size: 50000,
    range: "$115.20–$140.40",
    note: "The supplied table lists 50K alternatives at $115.20–$140.40 and a $25K alternative at $85 without saying which Lucid product each belongs to.",
  },

  // ---- Tradeify -----------------------------------------------------------
  { firm: "Tradeify", product: "Growth", size: 25000, price: 59.4, billing: "one_time" },
  { firm: "Tradeify", product: "Growth", size: 50000, price: 99, billing: "one_time" },
  { firm: "Tradeify", product: "Growth", size: 100000, price: 159, billing: "one_time" },
  { firm: "Tradeify", product: "Growth", size: 150000, price: 221.4, billing: "one_time" },
  { firm: "Tradeify", product: "Select", size: 25000, price: 65.4, billing: "one_time" },
  { firm: "Tradeify", product: "Select", size: 50000, price: 99, billing: "one_time" },
  { firm: "Tradeify", product: "Select", size: 100000, price: 159, billing: "one_time" },
  { firm: "Tradeify", product: "Select", size: 150000, price: 221.4, billing: "one_time" },
  { firm: "Tradeify", product: "Lightning Funded", size: 25000, price: 207, billing: "one_time" },
  { firm: "Tradeify", product: "Lightning Funded", size: 50000, price: 295.2, billing: "one_time" },
  { firm: "Tradeify", product: "Lightning Funded", size: 100000, price: 396, billing: "one_time" },
  { firm: "Tradeify", product: "Lightning Funded", size: 150000, price: 477.6, billing: "one_time" },

  // ---- My Funded Futures --------------------------------------------------
  // Billing is the correction that matters most here: these were recorded as
  // one-off fees and are monthly subscriptions, which changes what the price
  // means rather than just what it is.
  { firm: "My Funded Futures", product: "Builder", size: 25000, price: 52.5, billing: "monthly" },
  { firm: "My Funded Futures", product: "Builder", size: 50000, price: 76.5, billing: "monthly" },
  { firm: "My Funded Futures", product: "Pro", size: 50000, price: 113.5, billing: "monthly" },
  { firm: "My Funded Futures", product: "Pro", size: 100000, price: 172, billing: "monthly" },
  { firm: "My Funded Futures", product: "Pro", size: 150000, price: 238.5, billing: "monthly" },
  { firm: "My Funded Futures", product: "Rapid", size: 25000, price: 54.5, billing: "monthly" },
  { firm: "My Funded Futures", product: "Rapid", size: 50000, price: 78.5, billing: "monthly" },
  { firm: "My Funded Futures", product: "Rapid", size: 100000, price: 133.5, billing: "monthly" },
  { firm: "My Funded Futures", product: "Rapid", size: 150000, price: 173.5, billing: "monthly" },
  {
    firm: "My Funded Futures",
    product: "Rapid",
    size: 50000,
    note: "A one-off $125.60 Rapid EOD variant at $50K is also sold; it is not a separate product on file.",
  },

  // ---- FundedNext Futures -------------------------------------------------
  // 150K is unique to Flex. The 25K figure fits three products and the 50K and
  // 100K figures are ranges, so neither is applied.
  { firm: "FundedNext Futures", size: 150000, price: 217.8, billing: "one_time" },
  { firm: "FundedNext Futures", product: "Rapid Pro", size: 50000, range: "$60.30–$149.99" },
  { firm: "FundedNext Futures", product: "Rapid Pro", size: 100000, range: "$112.50–$249.99" },

  // ---- Top One Futures ----------------------------------------------------
  { firm: "Top One Futures", product: "Elite Access", size: 25000, price: 39, billing: "one_time" },
  { firm: "Top One Futures", product: "Elite Access", size: 50000, price: 39, billing: "one_time" },
  { firm: "Top One Futures", product: "Elite Access", size: 100000, price: 39, billing: "one_time" },
  { firm: "Top One Futures", product: "Elite Daily", size: 25000, price: 71.2, billing: "monthly", addSize: true },
  { firm: "Top One Futures", product: "Elite Daily", size: 50000, price: 87.2, billing: "monthly", addSize: true },
  { firm: "Top One Futures", product: "Elite Daily", size: 100000, price: 159.2, billing: "monthly" },
  { firm: "Top One Futures", product: "Elite Daily", size: 150000, price: 219.6, billing: "monthly", addSize: true },
  { firm: "Top One Futures", product: "Instant", size: 25000, price: 167.6, billing: "one_time" },
  { firm: "Top One Futures", product: "Instant", size: 50000, price: 271.6, billing: "one_time", addSize: true },
  {
    firm: "Top One Futures",
    product: "Instant",
    size: 25000,
    range: "$225.20–$328.40 at 100K and $319.60–$375.60 at 150K",
    note: "The larger Instant sizes are published as ranges, so they are not on file as priced rows.",
  },

  // ---- Topstep ------------------------------------------------------------
  // Topstep reached the catalogue through the aggregator export with a single
  // templated row. A supplied price ladder is better than that, so it moves
  // into the specs file — which also drops the aggregator row automatically,
  // because db/convert-propfirmmatch.ts skips any firm this file covers.
  { firm: "Topstep", product: "Trading Combine", size: 50000, price: 49, billing: "monthly", addSize: true },
  { firm: "Topstep", product: "Trading Combine", size: 100000, price: 99, billing: "monthly", addSize: true },
  { firm: "Topstep", product: "Trading Combine", size: 150000, price: 199, billing: "monthly", addSize: true },
  { firm: "Topstep", product: "Trading Combine No Activation Fee", size: 50000, price: 95, billing: "monthly", addSize: true },
  { firm: "Topstep", product: "Trading Combine No Activation Fee", size: 100000, price: 149, billing: "monthly", addSize: true },
  { firm: "Topstep", product: "Trading Combine No Activation Fee", size: 150000, price: 229, billing: "monthly", addSize: true },

  // ---- E8 Futures ---------------------------------------------------------
  // 150K is unique to Signature. Everything else in the E8 row is a range.
  { firm: "E8 Futures", size: 150000, price: 312, billing: "one_time" },
  {
    firm: "E8 Futures",
    product: "E8 Signature",
    size: 150000,
    range: "$115.70–$213.20 at 50K, $180.70–$382.20 at 100K, $362.70–$707.20 at 200K, and $88 at 25K (a size not on file)",
  },

  // ---- The Trading Pit Futures --------------------------------------------
  { firm: "The Trading Pit Futures", size: 50000, price: 84.15, billing: "one_time" },

  // ---- Earn2Trade ---------------------------------------------------------
  { firm: "Earn2Trade", product: "Gauntlet Mini", size: 50000, range: "$85–$95", billing: "monthly" },
  { firm: "Earn2Trade", product: "Trader Career Path", size: 50000, billing: "monthly" },

  // ---- Apex Trader Funding ------------------------------------------------
  {
    firm: "Apex Trader Funding",
    product: "Evaluation",
    size: 50000,
    range: "$16.70–$24.90 at 25K, $19.70–$24.90 at 50K, $29.70–$39.90 at 100K, $49.70–$59.90 at 150K",
    note: "Apex prices move with a running promotion and are published as ranges, so none is recorded as the price.",
  },

  // ---- Funded Futures Family ----------------------------------------------
  {
    firm: "Funded Futures Family",
    product: "Velocity",
    size: 50000,
    note: "A $25 monthly promotional price and a $142.80 monthly standard price are both published for $50K; a promotional price is not the price, so neither replaces what is on file.",
  },

  // ---- DayTraders / The5ers: ambiguous, reported not applied ---------------
  { firm: "DayTraders", size: 50000, price: 70.35, billing: "one_time" },
  { firm: "The5ers Futures", size: 50000, price: 90, billing: "one_time" },
];

// ---------------------------------------------------------------------------

const apply = process.argv.includes("--apply");
const specsPath = path.join(process.cwd(), "data", "futures-specs.json");
const specs = JSON.parse(fs.readFileSync(specsPath, "utf8")) as {
  _comment: string[];
  products: Product[];
};

const changed: string[] = [];
const added: string[] = [];
const ambiguous: string[] = [];
const noted: string[] = [];
const unmatched: string[] = [];

const appendNote = (product: Product, text: string) => {
  if (product.notes?.includes(text)) return;
  product.notes = product.notes ? `${product.notes} ${text}` : text;
  noted.push(`${product.firm} ${product.product}: ${text}`);
};

for (const row of ROWS) {
  const inFirm = specs.products.filter((p) => p.firm === row.firm);
  if (inFirm.length === 0) {
    unmatched.push(`${row.firm} — no products on file`);
    continue;
  }

  let product: Product | undefined;
  if (row.product) {
    product = inFirm.find((p) => p.product === row.product);
    if (!product) {
      unmatched.push(`${row.firm} — ${row.product}`);
      continue;
    }
  } else {
    // The unique-size rule: a firm-level price only lands where exactly one
    // product sells that size.
    const candidates = inFirm.filter((p) => p.sizes[String(row.size)]);
    if (candidates.length !== 1) {
      ambiguous.push(
        `${row.firm} $${row.size / 1000}K = ${row.price ?? row.range} — ${candidates.length} products sell that size (${candidates.map((c) => c.product).join(", ") || "none"})`,
      );
      continue;
    }
    product = candidates[0];
  }

  if (row.note) appendNote(product, row.note);
  if (row.range) {
    appendNote(product, `Published as a range rather than one figure: ${row.range}. Not recorded as a price.`);
  }

  if (row.billing && product.billing !== row.billing) {
    const before = product.billing ?? "unset";
    product.billing = row.billing;
    changed.push(`${row.firm} ${product.product}.billing: ${before} -> ${row.billing}`);
  }

  if (row.price === undefined) continue;

  const key = String(row.size);
  if (!product.sizes[key]) {
    if (!row.addSize) {
      unmatched.push(`${row.firm} ${product.product} has no $${row.size / 1000}K size`);
      continue;
    }
    product.sizes[key] = {};
    added.push(`${row.firm} ${product.product} $${row.size / 1000}K`);
  }

  const before = product.sizes[key].price;
  if (before === row.price) continue;
  product.sizes[key].price = row.price;
  changed.push(
    before === undefined
      ? `${row.firm} ${product.product} $${row.size / 1000}K price: (blank) -> $${row.price}`
      : `${row.firm} ${product.product} $${row.size / 1000}K price: $${before} -> $${row.price}`,
  );
}

console.log(`${apply ? "Applied" : "Would apply"} ${changed.length} changes from the supplied price table.`);
if (changed.length) console.log("   " + changed.join("\n   "));
if (added.length) console.log(`\nAdded ${added.length} sizes the table covers and the file did not:\n   ` + added.join("\n   "));
if (noted.length) console.log(`\nRecorded ${noted.length} notes for figures that are not single prices:\n   ` + noted.map((n) => n.slice(0, 150)).join("\n   "));
if (ambiguous.length) {
  console.log(
    `\n?? ${ambiguous.length} rows name a size but not a product, and more than one product sells it.\n` +
      `   Spreading one price across several products would be several claims from one fact,\n` +
      `   so these are skipped. Name the product to apply them:\n   ` + ambiguous.join("\n   "),
  );
}
if (unmatched.length) console.log(`\n?? ${unmatched.length} rows matched nothing:\n   ` + unmatched.join("\n   "));

if (apply) {
  fs.writeFileSync(specsPath, JSON.stringify(specs, null, 2) + "\n");
  console.log(`\nWrote ${specsPath}.`);
} else {
  console.log("\nDry run — nothing written. Re-run with --apply.");
}
