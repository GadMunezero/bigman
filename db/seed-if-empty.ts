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
import { execFileSync } from "node:child_process";
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
load("data/cfd-catalogue.csv");
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

// Company details — who runs each firm, where it is based. Applied through the
// real script rather than reimplemented here, so the checks it makes (a
// plausible founding year, key_people as a list, never overwriting a value
// already on file) apply on a server exactly as they do locally.
const profilesPath = path.join(process.cwd(), "data", "firm-profiles.csv");
if (fs.existsSync(profilesPath)) {
  try {
    const out = execFileSync(
      path.join("node_modules", ".bin", "tsx"),
      [path.join("db", "apply-firm-profile.ts"), "--apply"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    console.log(out.trim().split("\n").slice(-1)[0]);
  } catch (error) {
    // Company details are not worth failing a boot over — the site is fully
    // usable without them, and a server that will not start is worse than a
    // firm page with no CEO on it.
    console.warn(`[seed] firm profiles could not be applied: ${(error as Error).message}`);
  }
} else {
  console.log("[seed] no data/firm-profiles.csv — firm pages will have no company details.");
}

/**
 * What a fresh deployment shows on its first morning.
 *
 * The old behaviour had two settings and neither was right. Unset published
 * nothing, so a correct deploy looked like a broken one — an empty catalogue
 * reads as a bug, not as caution. `SEED_PUBLISH=1` published all 324,
 * including rows with no price, no drawdown and no profit split, which is
 * putting a match score on a guess.
 *
 * The default is now the middle one, and it is the only one of the three that
 * is both useful and honest: publish the challenges that carry every figure
 * the engine scores on, and leave the rest as drafts to be finished in /admin.
 * The site says on the results page and on every challenge page how much of it
 * has been checked against a firm's own page, so nothing here is passing itself
 * off as verified.
 *
 *   SEED_PUBLISH unset or 'ready'  publish only complete challenges (default)
 *   SEED_PUBLISH=none              publish nothing; do it all by hand
 *   SEED_PUBLISH=all               publish everything, gaps included
 */
const READY = `
  price IS NOT NULL
  AND max_drawdown_pct IS NOT NULL
  AND drawdown_type IS NOT NULL
  AND profit_target_pct IS NOT NULL
  AND payout_split_pct IS NOT NULL
`;

const mode = (process.env.SEED_PUBLISH ?? "ready").toLowerCase();

if (mode === "none") {
  console.log("[seed] SEED_PUBLISH=none — everything left as draft. Publish in /admin.");
} else if (mode === "all" || mode === "1") {
  const f = db.prepare(`UPDATE firms SET status = 'published' WHERE status = 'draft'`).run();
  const c = db.prepare(`UPDATE challenges SET status = 'published' WHERE status = 'draft'`).run();
  console.log(`[seed] SEED_PUBLISH=all — published ${f.changes} firms and ${c.changes} challenges.`);
  console.log("[seed] This includes challenges with no price, drawdown or profit split on file.");
  console.log("[seed] Those get a match score built on gaps. 'ready' is the safer setting.");
} else {
  const c = db
    .prepare(`UPDATE challenges SET status = 'published' WHERE status = 'draft' AND ${READY}`)
    .run();
  // Only the firms that ended up with something to show. A published firm with
  // no published challenges is a dead page: it appears in the directory,
  // someone clicks it, and there is nothing there.
  const f = db
    .prepare(
      `UPDATE firms SET status = 'published'
        WHERE status = 'draft'
          AND id IN (SELECT firm_id FROM challenges WHERE status = 'published')`,
    )
    .run();
  const held = (
    db.prepare(`SELECT COUNT(*) n FROM challenges WHERE status = 'draft'`).get() as { n: number }
  ).n;
  console.log(`[seed] Published ${c.changes} challenges across ${f.changes} firms.`);
  console.log(`[seed] ${held} held back as draft — missing a price, drawdown, target or split.`);
  console.log("[seed] Finish them in /admin, or set SEED_PUBLISH=all to publish them as they are.");
}
