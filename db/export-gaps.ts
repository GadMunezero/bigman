/**
 * Writes a fill-in worksheet of everything the catalogue does not know.
 *
 * The columns are exactly the importer's columns, so a filled-in worksheet
 * goes straight back in with `npm run db:import -- <file> --apply` — no
 * reshaping, no copy-paste into a different template. Cells we already have
 * are pre-filled; cells we do not are left empty. Fill the empties, leave the
 * rest alone, and the importer will queue the changes for review rather than
 * overwriting anything silently.
 *
 * Two output files, because they are two different jobs:
 *
 *   gaps-challenges.csv — per challenge: price, drawdown, target, payout terms
 *   gaps-rules.csv      — per challenge: the trading rules (news, EA, scalping,
 *                         consistency), which are the fields the archetype
 *                         engine actually reads and which are almost entirely
 *                         unknown today
 *   gaps-firms.csv      — per firm: website, who runs it, where it is based.
 *                         Fill it in, save it as data/firm-profiles.csv, and
 *                         `npm run db:firm-profiles -- --apply` puts it in.
 *
 *   npx tsx db/export-gaps.ts
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";

const OUT_DIR = path.join(process.cwd(), "data");

const CHALLENGE_COLUMNS = [
  "firm_name",
  "firm_website",
  "challenge_name",
  "markets",
  "account_size",
  "price",
  "billing_type",
  "currency",
  "profit_target_pct",
  "max_drawdown_pct",
  "daily_drawdown_pct",
  "drawdown_type",
  "minimum_days",
  "maximum_days",
  "payout_frequency_days",
  "payout_split_pct",
  "payout_conditions",
  "platforms",
  "activation_fee",
  "max_payout",
  "contracts",
  "data_feed",
  "source_url",
  "source_type",
  "confidence",
] as const;

const FIRM_COLUMNS = [
  "firm_name",
  "website",
  "ceo",
  "key_people",
  "headquarters",
  "founded_year",
  "description",
  "leadership_source_url",
] as const;

const RULE_COLUMNS = [
  "firm_name",
  "challenge_name",
  "account_size",
  "news_trading",
  "overnight",
  "weekend",
  "ea_allowed",
  "copy_trading",
  "scalping",
  "hedging",
  "consistency_rule",
  "consistency_pct",
  "source_url",
] as const;

interface Row {
  [key: string]: string | number | null;
}

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // `unknown` is a real stored value meaning "we asked and could not find out".
  // In a worksheet it should read as an empty cell to be filled, not as data.
  if (text === "unknown" || text === "[]") return "";
  // Lists are stored as JSON but the importer reads a separated list, so a
  // worksheet that round-trips has to write the importer's format. Emitting
  // `["futures"]` here made every row fail validation on re-import.
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text) as unknown[];
      if (Array.isArray(parsed)) text = parsed.map(String).join("; ");
    } catch {
      /* not JSON after all — write it through as-is */
    }
  }
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (columns: readonly string[], rows: Row[]): string =>
  [columns.join(","), ...rows.map((row) => columns.map((c) => cell(row[c])).join(","))].join("\n");

const db = getDb();

const challenges = db
  .prepare(
    `SELECT f.name firm_name, f.website firm_website, c.name challenge_name, c.markets,
            c.account_size, c.price, c.billing_type, c.currency, c.profit_target_pct,
            c.max_drawdown_pct, c.daily_drawdown_pct, c.drawdown_type, c.minimum_days,
            c.maximum_days, c.payout_frequency_days, c.payout_split_pct, c.payout_conditions,
            c.platforms, c.activation_fee, c.max_payout, c.contracts, c.data_feed
       FROM challenges c JOIN firms f ON f.id = c.firm_id
      WHERE c.status = 'published'
      ORDER BY f.name, c.account_size`,
  )
  .all() as Row[];

const rules = db
  .prepare(
    `SELECT f.name firm_name, c.name challenge_name, c.account_size,
            r.news_trading, r.overnight, r.weekend, r.ea_allowed, r.copy_trading,
            r.scalping, r.hedging, r.consistency_rule, r.consistency_pct
       FROM challenges c
       JOIN firms f ON f.id = c.firm_id
       LEFT JOIN challenge_rules r ON r.challenge_id = c.id
      WHERE c.status = 'published'
      ORDER BY f.name, c.account_size`,
  )
  .all() as Row[];

const firms = db
  .prepare(
    `SELECT name firm_name, website, ceo, key_people, headquarters, founded_year,
            description, leadership_source_url
       FROM firms WHERE status = 'published' ORDER BY name`,
  )
  .all() as Row[];

/** How many of the columns worth chasing are empty on this row. */
const gapCount = (row: Row, columns: readonly string[]): number =>
  columns.filter((c) => !["firm_name", "firm_website", "challenge_name", "account_size", "markets", "currency", "source_url", "source_type", "confidence"].includes(c) && cell(row[c]) === "").length;

const challengeGaps = challenges.filter((row) => gapCount(row, CHALLENGE_COLUMNS) > 0);
const ruleGaps = rules.filter((row) => gapCount(row, RULE_COLUMNS) > 0);
const firmGaps = firms.filter((row) => gapCount(row, FIRM_COLUMNS) > 0);

fs.writeFileSync(path.join(OUT_DIR, "gaps-challenges.csv"), toCsv(CHALLENGE_COLUMNS, challengeGaps));
fs.writeFileSync(path.join(OUT_DIR, "gaps-rules.csv"), toCsv(RULE_COLUMNS, ruleGaps));
fs.writeFileSync(path.join(OUT_DIR, "gaps-firms.csv"), toCsv(FIRM_COLUMNS, firmGaps));

// A per-firm tally, so the biggest wins are obvious before anyone opens a
// spreadsheet: one firm's official rules page usually fills a whole block.
const byFirm = new Map<string, number>();
const tally = (rows: Row[], columns: readonly string[]) => {
  for (const row of rows) {
    const firm = String(row.firm_name);
    byFirm.set(firm, (byFirm.get(firm) ?? 0) + gapCount(row, columns));
  }
};
tally(challengeGaps, CHALLENGE_COLUMNS);
tally(ruleGaps, RULE_COLUMNS);

const ranked = [...byFirm.entries()].sort((a, b) => b[1] - a[1]);

console.log(`data/gaps-challenges.csv — ${challengeGaps.length} rows with at least one empty field`);
console.log(`data/gaps-rules.csv      — ${ruleGaps.length} rows with at least one unknown rule`);
console.log(`data/gaps-firms.csv      — ${firmGaps.length} firms missing company details\n`);
console.log("Empty cells by firm — the top of this list is where an hour goes furthest:\n");
for (const [firm, cells] of ranked) {
  console.log(`  ${firm.padEnd(26)} ${String(cells).padStart(4)} empty cells`);
}
console.log(
  `\nFill the blanks from the firm's own pages, then:\n` +
    `  npm run db:import -- data/gaps-challenges.csv --apply\n` +
    `  npm run db:import -- data/gaps-rules.csv --apply\n` +
    `The importer never overwrites — it queues changes for review in /admin/rules.\n\n` +
    `For company details, save the filled gaps-firms.csv as data/firm-profiles.csv, then:\n` +
    `  npm run db:firm-profiles -- --apply`,
);
