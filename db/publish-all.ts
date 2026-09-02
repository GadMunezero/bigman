/**
 * Publishes every draft firm and challenge. LOCAL TESTING ONLY.
 *
 * The draft gate exists so unverified data cannot reach traders. This script
 * deliberately opens that gate, which is safe on your own machine and is not
 * safe anywhere a trader can reach. It therefore refuses to run in production
 * and prints what it is publishing rather than doing it quietly.
 *
 * The catalogue it publishes is aggregator-derived and heavily templated — see
 * docs/DATA-SOURCING.md. It is here so you can exercise the questionnaire and
 * the engine against a realistic spread of challenges, not because the numbers
 * are trustworthy.
 */
import { getDb } from "../src/lib/db";

if (process.env.NODE_ENV === "production") {
  console.error(
    "Refusing to run with NODE_ENV=production.\n" +
      "This publishes unverified data. Publish deliberately in /admin/challenges instead.",
  );
  process.exit(1);
}

const db = getDb();

const firms = db.prepare(`UPDATE firms SET status = 'published' WHERE status = 'draft'`).run();
const challenges = db
  .prepare(`UPDATE challenges SET status = 'published' WHERE status = 'draft'`)
  .run();

const missingWebsite = (
  db
    .prepare(`SELECT COUNT(*) AS n FROM firms WHERE website IS NULL OR website = ''`)
    .get() as { n: number }
).n;

console.log(`Published ${firms.changes} firms and ${challenges.changes} challenges.`);
console.log("\n  ⚠  These figures are unverified aggregator data. Local testing only.");

if (missingWebsite > 0) {
  console.log(
    `  ⚠  ${missingWebsite} firms have no website on file, so their outbound buttons will\n` +
      `     correctly show "official link not on file" instead of a link. Add real URLs in\n` +
      `     /admin/firms to exercise the redirect.`,
  );
}
