/**
 * Expands data/futures-specs.json into one import row per firm × product × size.
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
 *   npx tsx db/build-futures-catalogue.ts <out.csv>
 */
import fs from "node:fs";
import path from "node:path";
import { CHALLENGE_COLUMNS } from "../src/lib/import";

interface SizeSpec { target?: number; dd?: number; daily?: number }
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
  payout_days?: number;
  /** Percentages stated directly by the firm rather than as dollars. */
  target_pct?: number;
  dd_pct?: number;
  daily_pct?: number;
  uncertain?: boolean;
  dailyUnknown?: boolean;
  notes?: string;
  sizes: Record<string, SizeSpec>;
}

const outPath = process.argv[2] ?? "data/futures-catalogue.csv";
const specs = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "futures-specs.json"), "utf8"),
) as { products: Product[] };

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

    const label = size >= 1000 ? `${size / 1000}K` : String(size);
    const record: Record<string, string> = {
      firm_name: p.firm,
      challenge_name: `${p.product} ${label}`,
      markets: "futures",
      account_size: String(size),
      currency: "USD",
      price: "",
      profit_target_pct: isInstant ? "" : target,
      max_drawdown_pct: dd,
      daily_drawdown_pct: daily,
      drawdown_type: p.drawdown_type ?? "",
      minimum_days: p.min_days !== undefined ? String(p.min_days) : "",
      maximum_days: p.max_days !== undefined ? String(p.max_days) : "",
      payout_split_pct: p.split !== undefined ? String(p.split) : "",
      payout_conditions: conditions.join(" "),
      phases: isInstant ? "0" : "1",
      news_trading: p.news ?? "",
      consistency_rule: p.consistency ?? "",
      consistency_pct: p.consistency_pct !== undefined ? String(p.consistency_pct) : "",
      source_type: "trader_report",
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

console.log(`Wrote ${out.length - 1} challenge rows to ${outPath}`);
console.log(`  ${withFigures} carry a target, drawdown or daily limit`);
console.log(`  ${sizesOnly} carry the size and rules only — no figures were supplied`);
if (flagged.length) {
  console.log(
    `\n!! ${flagged.length} rows have a daily loss limit whose figure is unknown.\n` +
      `   Each says so in payout_conditions rather than letting the blank read as "no daily rule":\n   ` +
      [...new Set(flagged)].join(", "),
  );
}
console.log("\nPrices are absent throughout — none were supplied. Add them per size before publishing.");
