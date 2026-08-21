/**
 * Fills in company details — who runs a firm, where it is based, when it
 * started — from data/firm-profiles.csv.
 *
 * This exists because that information has no other home. Prices and rules
 * arrive through the catalogue builders and the importer; leadership does not,
 * so it was only ever typed straight into the database and vanished the first
 * time `db:reset` ran. A file in the repo is the fix: it survives a rebuild,
 * it is reviewable in a diff, and it says where each claim came from.
 *
 * Only fills a field that is currently empty. Something already on file was
 * put there deliberately and a bulk script does not get to overwrite it — the
 * conflict is printed instead, so a human decides.
 *
 * `leadership_source_url` matters more here than anywhere else in the
 * catalogue. Naming a real person as the CEO of a prop firm is a claim about
 * an identifiable individual, and it needs to point at where it was read.
 *
 * The file is optional: if it is not there, this is a no-op, so the catalogue
 * pipeline runs cleanly on a checkout that has not filled it in yet.
 *
 *   npx tsx db/apply-firm-profile.ts [--apply]
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";
import { parseCsv } from "../src/lib/import";

const apply = process.argv.includes("--apply");
const csvPath = path.join(process.cwd(), "data", "firm-profiles.csv");

if (!fs.existsSync(csvPath)) {
  console.log(
    "No data/firm-profiles.csv — nothing to apply.\n" +
      "Run `npm run db:gaps` to generate data/gaps-firms.csv, fill it in, and save it under that name.",
  );
  process.exit(0);
}

/** Columns that map straight onto a firms column of the same name. */
const TEXT_FIELDS = [
  "website",
  "ceo",
  "headquarters",
  "description",
  "leadership_source_url",
] as const;

const table = parseCsv(fs.readFileSync(csvPath, "utf8"));
if (table.length < 2) {
  console.log("data/firm-profiles.csv has a header and no rows — nothing to apply.");
  process.exit(0);
}

const header = table[0].map((h) => h.trim().toLowerCase());
const col = (row: string[], name: string) => {
  const i = header.indexOf(name);
  return i === -1 ? "" : (row[i] ?? "").trim();
};

const db = getDb();
const select = db.prepare(`SELECT * FROM firms WHERE name = ?`);

let filled = 0;
let kept = 0;
let unmatched = 0;

for (let i = 1; i < table.length; i++) {
  const name = col(table[i], "firm_name");
  if (!name) continue;

  const firm = select.get(name) as Record<string, unknown> | undefined;
  if (!firm) {
    console.log(`  ?  ${name} — not in the catalogue under this exact name`);
    unmatched++;
    continue;
  }

  const updates: Record<string, string | number> = {};

  for (const field of TEXT_FIELDS) {
    const value = col(table[i], field);
    if (!value) continue;
    const current = firm[field];
    if (current) {
      if (String(current) !== value) {
        console.log(`  =  ${name}.${field} — already "${current}", leaving it (file says "${value}")`);
        kept++;
      }
      continue;
    }
    updates[field] = value;
  }

  const year = col(table[i], "founded_year");
  if (year && !firm.founded_year) {
    const parsed = Number(year);
    // A founding year outside this range is a typo, not a fact about a prop
    // firm, and writing it would put nonsense on a public page.
    if (Number.isInteger(parsed) && parsed >= 1980 && parsed <= new Date().getFullYear()) {
      updates.founded_year = parsed;
    } else {
      console.log(`  !  ${name}.founded_year — "${year}" is not a plausible year, skipped`);
    }
  }

  // key_people is a JSON array in the database and a separated list in the
  // sheet, because nobody should have to type JSON into a spreadsheet cell.
  const people = col(table[i], "key_people");
  if (people && (!firm.key_people || firm.key_people === "[]")) {
    const list = people
      .split(/[;|]/)
      .map((person) => person.trim())
      .filter(Boolean);
    if (list.length > 0) updates.key_people = JSON.stringify(list);
  }

  const fields = Object.keys(updates);
  if (fields.length === 0) continue;

  if (apply) {
    db.prepare(
      `UPDATE firms SET ${fields.map((f) => `${f} = ?`).join(", ")}, updated_at = ? WHERE id = ?`,
    ).run(...fields.map((f) => updates[f]), new Date().toISOString(), firm.id);
  }
  console.log(`  ${apply ? "+" : "→"}  ${name} — ${fields.join(", ")}`);
  filled += fields.length;
}

console.log(
  `\n${apply ? "Filled" : "Would fill"} ${filled} field${filled === 1 ? "" : "s"}. ` +
    `${kept} conflict${kept === 1 ? "" : "s"} left alone, ${unmatched} firm name${unmatched === 1 ? "" : "s"} unmatched.`,
);
if (!apply) console.log("\nDry run — nothing written. Re-run with --apply.");
