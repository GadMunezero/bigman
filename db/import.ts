import fs from "node:fs";
import path from "node:path";
import { applyImport, csvTemplate, planImport } from "../src/lib/import";

/**
 * Bulk import CLI.
 *
 *   npm run db:template > data/challenges.csv   # get the column template
 *   npm run db:import -- data/challenges.csv    # dry run, reports what would change
 *   npm run db:import -- data/challenges.csv --apply
 *
 * The dry run is the default on purpose. Importing prop firm data blind is how
 * a comparison site ends up publishing figures nobody checked.
 */

const args = process.argv.slice(2);

if (args.includes("--template")) {
  process.stdout.write(csvTemplate());
  process.exit(0);
}

const file = args.find((a) => !a.startsWith("--"));
const apply = args.includes("--apply");

if (!file) {
  console.error("Usage: npm run db:import -- <file.csv> [--apply]");
  console.error("       npm run db:import -- --template   (prints the column template)");
  process.exit(1);
}

const resolved = path.resolve(file);
if (!fs.existsSync(resolved)) {
  console.error(`No such file: ${resolved}`);
  process.exit(1);
}

const csv = fs.readFileSync(resolved, "utf8");
const plan = planImport(csv);

console.log(`\nParsed ${plan.rows.length} row(s) from ${path.basename(resolved)}\n`);

if (plan.errors.length > 0) {
  console.error(`✗ ${plan.errors.length} error(s) — nothing will be imported:\n`);
  for (const issue of plan.errors) {
    console.error(`  row ${issue.row}  ${issue.column}: ${issue.message}`);
  }
  console.error("");
  process.exit(1);
}

if (plan.warnings.length > 0) {
  console.log(`⚠ ${plan.warnings.length} warning(s):\n`);
  for (const issue of plan.warnings.slice(0, 30)) {
    console.log(`  row ${issue.row}  ${issue.column}: ${issue.message}`);
  }
  if (plan.warnings.length > 30) console.log(`  …and ${plan.warnings.length - 30} more`);
  console.log("");
}

console.log("Plan:");
console.log(`  New firms:            ${plan.newFirms.length}`);
for (const firm of plan.newFirms.slice(0, 20)) console.log(`    + ${firm}`);
console.log(`  New challenges:       ${plan.newChallenges.length}`);
for (const challenge of plan.newChallenges.slice(0, 20)) console.log(`    + ${challenge}`);
console.log(`  Existing, changed:    ${plan.changedChallenges.length}`);
for (const changed of plan.changedChallenges.slice(0, 10)) {
  console.log(`    ~ ${changed.name}`);
  for (const change of changed.changes.slice(0, 6)) console.log(`        ${change}`);
}
console.log(`  Existing, unchanged:  ${plan.unchanged}`);
console.log("");

if (!apply) {
  console.log("Dry run. Nothing was written. Re-run with --apply to commit.\n");
  process.exit(0);
}

const result = applyImport(plan);

console.log("Applied:");
console.log(`  Firms created:        ${result.firmsCreated}`);
console.log(`  Challenges created:   ${result.challengesCreated}`);
console.log(`  Pending changes:      ${result.pendingChanges}`);
console.log(`  Sources recorded:     ${result.sourcesRecorded}`);
console.log("");
console.log("New firms and challenges are DRAFT unless the row said 'published'.");
if (result.pendingChanges > 0) {
  console.log(
    `Existing challenges were not overwritten — approve the ${result.pendingChanges} pending change(s) at /admin/rules.`,
  );
}
console.log("");
