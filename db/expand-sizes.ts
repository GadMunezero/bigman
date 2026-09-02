/**
 * Generates a research worksheet with one row per firm per account size.
 *
 * A real prop firm sells the same evaluation at six or seven account sizes. The
 * imported catalogue has exactly one per firm, which makes the account-size
 * filter almost useless and makes every firm page say "this firm has 1
 * challenge". This closes that gap the only way it can honestly be closed: by
 * producing the rows to research, not by inventing them.
 *
 * Every generated row has the firm, the account size and the rules copied from
 * the size already on file — and NO price, NO profit target, NO drawdown.
 * Those three vary per size in ways that cannot be derived: firms price a 150K
 * at far more than 3x a 50K, and drawdown rarely scales linearly with the
 * account either. Anything that cannot be derived is left blank for a human to
 * read off the firm's pricing page.
 *
 * The output is a worksheet, not an import. Fill the blanks, then run it
 * through `npm run db:import` like any other CSV.
 *
 *   npx tsx db/expand-sizes.ts <out.csv>
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";
import { CHALLENGE_COLUMNS } from "../src/lib/import";

/**
 * The sizes firms in each market actually sell. Futures firms cluster on these
 * round numbers; CFD firms use a different ladder. A size already on file for a
 * firm is skipped rather than duplicated.
 */
const SIZE_LADDER: Record<string, number[]> = {
  futures: [25_000, 50_000, 75_000, 100_000, 150_000, 250_000, 300_000],
  default: [5_000, 10_000, 25_000, 50_000, 100_000, 200_000],
};

const outPath = process.argv[2] ?? "data/account-sizes-worksheet.csv";

const db = getDb();

// Rules are carried across sizes because a firm applies one rulebook to a whole
// evaluation product. Prices and limits are not, which is the whole point.
const existing = db
  .prepare(
    `SELECT f.name AS firm_name, f.website AS firm_website, c.name AS challenge_name,
            c.markets, c.account_size, c.drawdown_type, c.phases, c.platforms,
            c.payout_split_pct, c.currency,
            r.news_trading, r.overnight, r.weekend, r.ea_allowed,
            r.copy_trading, r.scalping, r.hedging, r.consistency_rule
     FROM challenges c
     JOIN firms f ON f.id = c.firm_id
     LEFT JOIN challenge_rules r ON r.challenge_id = c.id
     ORDER BY f.name, c.account_size`,
  )
  .all() as Record<string, string | number | null>[];

const sizesByFirm = new Map<string, Set<number>>();
for (const row of existing) {
  const firm = String(row.firm_name);
  const set = sizesByFirm.get(firm) ?? new Set<number>();
  if (typeof row.account_size === "number") set.add(row.account_size);
  sizesByFirm.set(firm, set);
}

const out: string[][] = [CHALLENGE_COLUMNS.slice()];
let generated = 0;

for (const row of existing) {
  const firm = String(row.firm_name);
  const markets = String(row.markets ?? "").toLowerCase();
  const ladder = markets.includes("futures") ? SIZE_LADDER.futures : SIZE_LADDER.default;
  const have = sizesByFirm.get(firm) ?? new Set<number>();

  // Strip the size out of the existing challenge name so "Growth 50K" becomes
  // "Growth", ready to have a different size appended.
  const baseName = String(row.challenge_name ?? "")
    .replace(/\b\d+\s*[KkMm]\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  for (const size of ladder) {
    if (have.has(size)) continue;
    have.add(size); // a firm appears once per existing challenge; do not repeat
    sizesByFirm.set(firm, have);

    const label = size >= 1000 ? `${size / 1000}K` : String(size);
    const record: Record<string, string> = {
      firm_name: firm,
      firm_website: String(row.firm_website ?? ""),
      challenge_name: baseName ? `${baseName} ${label}` : label,
      markets: String(row.markets ?? "").replace(/[\[\]"]/g, "").split(",").filter(Boolean).join(";"),
      account_size: String(size),
      currency: String(row.currency ?? "USD"),
      // Deliberately blank — these three do not scale from another size and
      // must be read off the firm's own pricing page.
      price: "",
      profit_target_pct: "",
      max_drawdown_pct: "",
      daily_drawdown_pct: "",
      // These usually DO hold across sizes within one evaluation product, so
      // they are carried over as a starting point. Confirm them anyway.
      drawdown_type: String(row.drawdown_type ?? ""),
      phases: String(row.phases ?? ""),
      platforms: String(row.platforms ?? "").replace(/[\[\]"]/g, "").split(",").filter(Boolean).join(";"),
      payout_split_pct: String(row.payout_split_pct ?? ""),
      news_trading: String(row.news_trading ?? ""),
      overnight: String(row.overnight ?? ""),
      weekend: String(row.weekend ?? ""),
      ea_allowed: String(row.ea_allowed ?? ""),
      copy_trading: String(row.copy_trading ?? ""),
      scalping: String(row.scalping ?? ""),
      hedging: String(row.hedging ?? ""),
      consistency_rule: String(row.consistency_rule ?? ""),
      source_url: "",
      source_type: "official_pricing",
      confidence: "needs_review",
      status: "draft",
    };

    out.push(CHALLENGE_COLUMNS.map((c) => record[c] ?? ""));
    generated++;
  }
}

const csv = out
  .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
  .join("\n");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, csv + "\n");

console.log(`Wrote ${generated} rows to ${outPath}`);
console.log(
  `\nEach row needs three figures from the firm's own pricing page:\n` +
    `  price, profit_target_pct, max_drawdown_pct  (plus daily_drawdown_pct if they have one)\n\n` +
    `They are blank because they cannot be derived from another account size — a 150K\n` +
    `evaluation is not priced at 3x the 50K, and its drawdown is rarely 3x either.\n\n` +
    `Fill them in, then:  npm run db:import -- ${outPath}`,
);
