/**
 * Expands a specs file into one import row per firm × product × size.
 *
 * The specs file records figures exactly as the firm states them — usually in
 * dollars, against a named account size. This converts them to the percentages
 * the schema stores, which is what makes a $50K and a $150K account comparable
 * at all.
 *
 * The conversion is always against the size on the same row. Nothing is
 * derived across sizes, because nothing scales: Tradeify Growth runs a $2,000
 * drawdown on 50K (4%) and $3,500 on 100K (3.5%), and Blue Guardian Standard
 * runs 6% on 25K against 3.33% on 150K. A ladder assumed from one size would
 * be wrong for most of the others, and wrong in the criterion the engine
 * weights most heavily.
 *
 * Three states are kept distinct, because collapsing them is how a catalogue
 * starts lying:
 *
 *   figure present   -> recorded
 *   no daily rule    -> blank, which the engine correctly reads as "none"
 *   daily rule exists, figure unknown (`dailyUnknown`)
 *                    -> blank is a false claim here, so the row is flagged in
 *                       payout_conditions and kept out of the published set
 *
 * Products marked `uncertain` carry their sizes and nothing else. The source
 * said explicitly not to rely on their figures, so there are none to convert.
 *
 *   npx tsx db/build-futures-catalogue.ts <specs.json> [out.csv]
 */
import fs from "node:fs";
import path from "node:path";
import { CHALLENGE_COLUMNS } from "../src/lib/import";

interface SizeSpec { target?: number; dd?: number; daily?: number; price?: number }
interface Product {
  firm: string;
  product: string;
  program: string;
  drawdown_type?: string;
  consistency?: string;
  consistency_pct?: number;
  min_days?: number;
  max_days?: number;
  split?: number;
  news?: string;
  overnight?: string;
  weekend?: string;
  payout_days?: number;
  /** "monthly" where the firm bills a recurring subscription. */
  billing?: string;
  /** Percentages stated directly by the firm rather than as dollars. */
  target_pct?: number;
  dd_pct?: number;
  daily_pct?: number;
  /**
   * Where these figures came from. Written to `source_url` so a reviewer can
   * open the page that produced the number instead of taking it on trust.
   *
   * `source` alone is the firm's own help centre or pricing page. `source_note`
   * carries the caveat when a figure was read off a secondary page — a review
   * or comparison site — which is a weaker claim and has to stay visible.
   */
  source?: string;
  source_note?: string;
  /**
   * True when the figures came from somewhere other than the firm's own site.
   * Forces `source_type` to `aggregator_unverified`, which the schema will
   * never let be marked `verified`.
   */
  secondhand?: boolean;
  uncertain?: boolean;
  dailyUnknown?: boolean;
  notes?: string;
  sizes: Record<string, SizeSpec>;
}

const specsPath = process.argv[2] ?? "data/futures-specs.json";
const outPath = process.argv[3] ?? specsPath.replace(/-specs\.json$/, "-catalogue.csv");
const specs = JSON.parse(fs.readFileSync(path.join(process.cwd(), specsPath), "utf8")) as {
  /** Written onto every row, so one builder serves futures and CFD alike. */
  market?: string;
  products: Product[];
};
const MARKET = specs.market ?? "futures";

/**
 * Dollars against an account size.
 *
 * Three decimal places, not two. At two, a $5,000 drawdown on a $150K account
 * stores as 3.33% and reads back as $4,995 — a $5 discrepancy against the
 * figure the firm publishes. That is immaterial to ranking and corrosive to a
 * site whose whole claim is that you can check its numbers. Three places puts
 * the round-trip error under a dollar.
 */
function asPercent(dollars: number | undefined, size: number): string {
  if (dollars === undefined) return "";
  return String(Math.round((dollars / size) * 100000) / 1000);
}

const out: string[][] = [CHALLENGE_COLUMNS.slice()];
let withFigures = 0;
let sizesOnly = 0;
let priced = 0;
const flagged: string[] = [];

for (const p of specs.products) {
  const isInstant = p.program === "instant_funding" || p.program === "direct_funding";

  for (const [sizeKey, spec] of Object.entries(p.sizes)) {
    const size = Number(sizeKey);

    // A stated percentage wins over a dollar conversion; both are the firm's
    // own number, but the percentage needs no arithmetic to go wrong.
    const target = p.uncertain
      ? ""
      : p.target_pct !== undefined
        ? String(p.target_pct)
        : asPercent(spec.target, size);
    const dd = p.uncertain
      ? ""
      : p.dd_pct !== undefined
        ? String(p.dd_pct)
        : asPercent(spec.dd, size);
    const daily = p.uncertain
      ? ""
      : p.daily_pct !== undefined
        ? String(p.daily_pct)
        : asPercent(spec.daily, size);

    if (target || dd || daily) withFigures++;
    else sizesOnly++;
    if (spec.price !== undefined) priced++;

    const conditions: string[] = [];
    if (p.notes) conditions.push(p.notes);
    if (p.payout_days) conditions.push(`Payouts every ${p.payout_days} day${p.payout_days === 1 ? "" : "s"}.`);
    if (p.dailyUnknown) {
      conditions.push(
        "A daily loss limit applies but the figure is not recorded — do not read the blank as 'no daily rule'.",
      );
      flagged.push(`${p.firm} ${p.product}`);
    }
    if (p.uncertain) {
      conditions.push("Figures deliberately absent: the source said not to rely on them for this product.");
    }
    if (p.source_note) conditions.push(p.source_note);

    const label = size >= 1000 ? `${size / 1000}K` : String(size);
    const record: Record<string, string> = {
      firm_name: p.firm,
      challenge_name: `${p.product} ${label}`,
      markets: MARKET,
      account_size: String(size),
      currency: "USD",
      // Priced per size, never carried across sizes: Tradeify Growth is $145 at
      // 50K and $369 at 150K, and Take Profit Trader bills monthly where Goat
      // charges once. A price on the wrong row is worse than none.
      price: spec.price !== undefined ? String(spec.price) : "",
      billing_type: p.billing ?? "",
      profit_target_pct: isInstant ? "" : target,
      max_drawdown_pct: dd,
      daily_drawdown_pct: daily,
      drawdown_type: p.drawdown_type ?? "",
      minimum_days: p.min_days !== undefined ? String(p.min_days) : "",
      maximum_days: p.max_days !== undefined ? String(p.max_days) : "",
      // The cadence went into the notes but never into its own column, so the
      // comparison table read "Not confirmed" for products whose payout days
      // were on file, and the payout criterion scored every one of them as
      // unknown. Both read this column, not the prose.
      payout_frequency_days: p.payout_days !== undefined ? String(p.payout_days) : "",
      payout_split_pct: p.split !== undefined ? String(p.split) : "",
      payout_conditions: conditions.join(" "),
      phases: isInstant ? "0" : "1",
      news_trading: p.news ?? "",
      overnight: p.overnight ?? "",
      weekend: p.weekend ?? "",
      consistency_rule: p.consistency ?? "",
      consistency_pct: p.consistency_pct !== undefined ? String(p.consistency_pct) : "",
      source_url: p.source ?? "",
      // A figure read off a comparison site is a weaker claim than one read off
      // the firm's help centre, and the difference has to survive into the
      // database rather than being flattened at import time.
      source_type: p.secondhand ? "aggregator_unverified" : "trader_report",
      confidence: "needs_review",
      status: "draft",
    };

    out.push(CHALLENGE_COLUMNS.map((c) => record[c] ?? ""));
  }
}

const csv = out
  .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
  .join("\n");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, csv + "\n");

console.log(`Wrote ${out.length - 1} ${MARKET} challenge rows to ${outPath}`);
console.log(`  ${withFigures} carry a target, drawdown or daily limit`);
console.log(`  ${sizesOnly} carry the size and rules only — no figures were supplied`);
console.log(`  ${priced} carry a price`);
if (flagged.length) {
  console.log(
    `\n!! ${flagged.length} rows have a daily loss limit whose figure is unknown.\n` +
      `   Each says so in payout_conditions rather than letting the blank read as "no daily rule":\n   ` +
      [...new Set(flagged)].join(", "),
  );
}
console.log("\nSizes without a price show \"Not confirmed\" rather than guessing from a sibling size.");
