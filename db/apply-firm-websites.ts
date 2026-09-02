/**
 * Sets `firms.website` from data/firm-websites.csv.
 *
 * Only fills a website that is currently empty. An existing value is left
 * alone and reported, because someone typed it deliberately and a bulk script
 * should not silently overwrite that.
 *
 * These URLs came from search-engine results, not from opening the pages —
 * this session cannot reach them. That is enough to be worth recording and not
 * enough to be trusted blindly: confirm the domain before publishing a firm,
 * because a lookalike domain in an outbound link is the most damaging error
 * this catalogue can make.
 *
 *   npx tsx db/apply-firm-websites.ts [--apply]
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";
import { parseCsv } from "../src/lib/import";

const apply = process.argv.includes("--apply");
const csvPath = path.join(process.cwd(), "data", "firm-websites.csv");

const table = parseCsv(fs.readFileSync(csvPath, "utf8"));
const header = table[0].map((h) => h.trim());
const col = (row: string[], name: string) => (row[header.indexOf(name)] ?? "").trim();

const db = getDb();
const select = db.prepare(`SELECT id, name, website FROM firms WHERE name = ?`);
const update = db.prepare(`UPDATE firms SET website = ?, updated_at = ? WHERE id = ?`);

let filled = 0;
let kept = 0;
let missing = 0;

for (let i = 1; i < table.length; i++) {
  const name = col(table[i], "firm_name");
  const site = col(table[i], "official_website");
  if (!name || !site) continue;

  const firm = select.get(name) as { id: string; name: string; website: string | null } | undefined;
  if (!firm) {
    console.log(`  ?  ${name} — not in the catalogue under this exact name`);
    missing++;
    continue;
  }

  if (firm.website) {
    console.log(`  =  ${name} — already set to ${firm.website}, leaving it`);
    kept++;
    continue;
  }

  if (apply) update.run(site, new Date().toISOString(), firm.id);
  console.log(`  ${apply ? "+" : "→"}  ${name} — ${site}`);
  filled++;
}

console.log(
  `\n${apply ? "Set" : "Would set"} ${filled} website${filled === 1 ? "" : "s"}. ` +
    `${kept} already had one. ${missing} name${missing === 1 ? "" : "s"} did not match.`,
);
if (!apply) console.log("Dry run. Nothing was written. Re-run with --apply.");
else console.log("\nConfirm each domain before publishing the firm — these came from search, not from opening the page.");
