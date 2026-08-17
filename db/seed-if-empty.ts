/**
 * Brings a fresh deployment up with the catalogue already loaded.
 *
 * Runs on container start. If the database already has challenges it does
 * nothing at all — this must be safe to run on every boot, including restarts
 * of a container whose volume already holds edits made in /admin. Overwriting
 * those would destroy a human's verification work, which is the one thing the
 * whole review flow exists to protect.
 *
 * What it loads, in order:
 *   1. data/propfirmmatch-import.csv — the 50-firm aggregator export
 *   2. data/futures-catalogue.csv    — the futures product matrix, one row per
 *                                      firm x product x account size
 *   3. data/firm-websites.csv        — official domains, where known
 *
 * Everything lands as `draft`. Set SEED_PUBLISH=1 to publish it too, which is
 * what a demo deployment wants and what a real one must not do.
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";
import { applyImport, planImport } from "../src/lib/import";

const db = getDb();

const existing = (db.prepare(`SELECT COUNT(*) AS n FROM challenges`).get() as { n: number }).n;
if (existing > 0) {
  console.log(`[seed] ${existing} challenges already present — leaving the database alone.`);
  process.exit(0);
}

function load(file: string): void {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.warn(`[seed] ${file} not found, skipping.`);
    return;
  }
  const plan = planImport(fs.readFileSync(full, "utf8"));
  if (plan.errors.length) {
    console.error(`[seed] ${file} has ${plan.errors.length} validation errors:`);
    for (const e of plan.errors.slice(0, 5)) console.error(`  row ${e.row} ${e.column}: ${e.message}`);
    throw new Error(`${file} failed validation`);
  }
  const result = applyImport(plan);
  console.log(
    `[seed] ${file}: ${result.firmsCreated} firms, ${result.challengesCreated} challenges.`,
  );
}

// Order matters. The futures specs carry real per-size figures and must claim
// their slugs first; the importer never overwrites, so if the aggregator rows
// landed first the real numbers would sit unapplied in the pending queue.
load("data/futures-catalogue.csv");
load("data/propfirmmatch-import.csv");

// Websites are applied directly rather than through the importer, because the
// importer treats an existing firm's differing field as a change to review.
const websitesPath = path.join(process.cwd(), "data", "firm-websites.csv");
if (fs.existsSync(websitesPath)) {
  const rows = fs.readFileSync(websitesPath, "utf8").split("\n").slice(1);
  const select = db.prepare(`SELECT id, website FROM firms WHERE name = ?`);
  const update = db.prepare(`UPDATE firms SET website = ? WHERE id = ?`);
  let n = 0;
  for (const line of rows) {
    const cells = line.split(",");
    const name = (cells[0] ?? "").trim();
    const site = (cells[1] ?? "").trim();
    if (!name || !site) continue;
    const firm = select.get(name) as { id: string; website: string | null } | undefined;
    if (firm && !firm.website) { update.run(site, firm.id); n++; }
  }
  console.log(`[seed] ${n} firm websites applied.`);
}

if (process.env.SEED_PUBLISH === "1") {
  const f = db.prepare(`UPDATE firms SET status = 'published' WHERE status = 'draft'`).run();
  const c = db.prepare(`UPDATE challenges SET status = 'published' WHERE status = 'draft'`).run();
  console.log(`[seed] SEED_PUBLISH=1 — published ${f.changes} firms and ${c.changes} challenges.`);
  console.log("[seed] These figures are unverified. Do not run this on a deployment traders use.");
} else {
  console.log("[seed] Everything is DRAFT. Publish in /admin, or set SEED_PUBLISH=1 for a demo.");
}
