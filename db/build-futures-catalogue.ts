/**
 * Expands data/futures-products.csv into one import row per firm × product × size.
 *
 * This replaces the guessed account-size ladder in db/expand-sizes.ts with the
 * real one: which products a firm actually sells, and which sizes each product
 * actually comes in. A firm does not offer one generic ladder — Goat's Sprint
 * Challenge stops at 100K while its Instant Funded goes to 150K, and no
 * derived ladder would ever get that right.
 *
 * What it carries and what it leaves blank:
 *
 *   - Where an existing challenge already covers the same firm AND size, its
 *     price, profit target and drawdown are carried over as a STARTING POINT.
 *     Those came from an unverified aggregator export, so they are a hypothesis
 *     to check, not an answer. They are only carried to the matching size.
 *   - Every other size gets NO price, NO profit target, NO drawdown. Those do
 *     not scale between sizes and must be read off the firm's own page.
 *   - Instant-funding and direct-funding products get phases 0 and no profit
 *     target at all, because there is no evaluation to pass.
 *
 * The `evidence` column is preserved as confidence:
 *   cited/listed -> a source URL is recorded and source_type is official_faq
 *   assumed      -> no source URL; the row says so rather than implying one
 *
 *   npx tsx db/build-futures-catalogue.ts <out.csv>
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";
import { CHALLENGE_COLUMNS, parseCsv } from "../src/lib/import";

const outPath = process.argv[2] ?? "data/futures-catalogue.csv";

const table = parseCsv(fs.readFileSync(path.join(process.cwd(), "data", "futures-products.csv"), "utf8"));
const header = table[0].map((h) => h.trim());
const col = (row: string[], name: string) => (row[header.indexOf(name)] ?? "").trim();

const db = getDb();

/** Existing rows, keyed firm+size, so known figures land on the right size only. */
const existing = new Map<string, Record<string, unknown>>();
for (const row of db
  .prepare(
    `SELECT f.name AS firm, c.account_size, c.price, c.profit_target_pct, c.max_drawdown_pct,
            c.daily_drawdown_pct, c.drawdown_type, c.platforms, c.payout_split_pct, c.currency,
            r.news_trading, r.overnight, r.weekend, r.ea_allowed, r.copy_trading,
            r.scalping, r.hedging, r.consistency_rule
     FROM challenges c
     JOIN firms f ON f.id = c.firm_id
     LEFT JOIN challenge_rules r ON r.challenge_id = c.id`,
  )
  .all() as Record<string, unknown>[]) {
  existing.set(`${String(row.firm).toLowerCase()}|${row.account_size}`, row);
}

/** Rules apply per firm, so any known row for the firm seeds them. */
const firmRules = new Map<string, Record<string, unknown>>();
for (const [key, row] of existing) {
  const firm = key.split("|")[0];
  if (!firmRules.has(firm)) firmRules.set(firm, row);
}

const clean = (v: unknown) =>
  v === null || v === undefined ? "" : String(v).replace(/[[\]"]/g, "").split(",").filter(Boolean).join(";");

const out: string[][] = [CHALLENGE_COLUMNS.slice()];
let carried = 0;
let blank = 0;

for (let i = 1; i < table.length; i++) {
  const firm = col(table[i], "firm_name");
  if (!firm) continue;

  const program = col(table[i], "program_type");
  const product = col(table[i], "product_name");
  const evidence = col(table[i], "evidence");
  const sourceUrl = col(table[i], "source_url");
  const sizes = col(table[i], "sizes_k")
    .split(";")
    .map((s) => Number(s.trim()) * 1000)
    .filter((n) => Number.isFinite(n) && n > 0);

  const seed = firmRules.get(firm.toLowerCase());
  // Instant and direct funding skip the evaluation entirely, so a profit
  // target is not "unknown" for them — it does not exist.
  const isInstant = program === "instant_funding" || program === "direct_funding";

  for (const size of sizes) {
    const match = existing.get(`${firm.toLowerCase()}|${size}`);
    if (match) carried++;
    else blank++;

    const label = `${size / 1000}K`;
    const record: Record<string, string> = {
      firm_name: firm,
      challenge_name: `${product} ${label}`,
      markets: "futures",
      account_size: String(size),
      currency: "USD",
      // Carried only onto the size they were actually recorded against.
      price: match ? String(match.price ?? "") : "",
      profit_target_pct: isInstant ? "" : match ? String(match.profit_target_pct ?? "") : "",
      max_drawdown_pct: match ? String(match.max_drawdown_pct ?? "") : "",
      daily_drawdown_pct: match ? String(match.daily_drawdown_pct ?? "") : "",
      drawdown_type: String((match ?? seed)?.drawdown_type ?? ""),
      payout_split_pct: String((match ?? seed)?.payout_split_pct ?? ""),
      platforms: clean((match ?? seed)?.platforms),
      phases: isInstant ? "0" : "1",
      news_trading: String(seed?.news_trading ?? ""),
      overnight: String(seed?.overnight ?? ""),
      weekend: String(seed?.weekend ?? ""),
      ea_allowed: String(seed?.ea_allowed ?? ""),
      copy_trading: String(seed?.copy_trading ?? ""),
      scalping: String(seed?.scalping ?? ""),
      hedging: String(seed?.hedging ?? ""),
      consistency_rule: String(seed?.consistency_rule ?? ""),
      payout_conditions:
        program === "instant_funding"
          ? "Instant funding — no evaluation to pass"
          : program === "direct_funding"
            ? "Direct funding — no evaluation to pass"
            : program === "funded"
              ? "Funded account, not an evaluation"
              : "",
      source_url: sourceUrl,
      source_type: sourceUrl ? "official_faq" : "aggregator_unverified",
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
console.log(`  ${carried} inherited figures from an existing row at the same size (verify them)`);
console.log(`  ${blank} have no price/target/drawdown yet — read them off the firm's page`);
