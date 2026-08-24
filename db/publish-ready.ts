/**
 * Publishes only the challenges that are complete enough to recommend.
 *
 * The alternative to this script is the choice nobody should have to make:
 * publish all 324 and put figures in front of traders that nobody checked, or
 * publish nothing and have no site. Neither is necessary. A recommendation
 * engine does not need every challenge in the world — it needs enough of them,
 * each described well enough that the ranking means something.
 *
 * THE BAR
 *
 * Five figures, because these are what the engine actually scores on:
 *
 *   price               the budget filter, and the cost criterion
 *   max_drawdown_pct    feeds usableDrawdown, the core of the whole model
 *   drawdown_type       static / trailing / EOD changes what that drawdown costs
 *   profit_target_pct   the difficulty criterion
 *   payout_split_pct    the payout criterion
 *
 * A challenge missing any of these is not a weaker recommendation, it is a
 * guess wearing a match score. Scoring it against a trader's profile produces a
 * number that looks exactly as confident as a real one.
 *
 * Rules are deliberately NOT part of the bar. They are still mostly unknown,
 * and `unknown` is handled honestly everywhere: it never reads as `allowed`,
 * it costs points in the data-confidence criterion, and it never hard-filters
 * anyone out. A challenge with solid figures and unknown rules is worth
 * showing; one with unknown figures is not.
 *
 *   npx tsx db/publish-ready.ts             # dry run — shows what would change
 *   npx tsx db/publish-ready.ts --apply     # publish the ready ones
 *   npx tsx db/publish-ready.ts --apply --demote
 *       also returns already-published incomplete challenges to draft, which is
 *       what you want if you previously ran publish-all.ts
 */
import { getDb } from "../src/lib/db";

const apply = process.argv.includes("--apply");
const demote = process.argv.includes("--demote");

const READY = `
  price IS NOT NULL
  AND max_drawdown_pct IS NOT NULL
  AND drawdown_type IS NOT NULL
  AND profit_target_pct IS NOT NULL
  AND payout_split_pct IS NOT NULL
`;

const db = getDb();

const ready = db
  .prepare(
    `SELECT c.id, c.name, c.status, f.name firm, f.website
       FROM challenges c JOIN firms f ON f.id = c.firm_id
      WHERE ${READY} ORDER BY f.name, c.account_size`,
  )
  .all() as { id: string; name: string; status: string; firm: string; website: string | null }[];

const notReady = db
  .prepare(
    `SELECT c.id, c.status, f.name firm FROM challenges c JOIN firms f ON f.id = c.firm_id
      WHERE NOT (${READY})`,
  )
  .all() as { id: string; status: string; firm: string }[];

const toPublish = ready.filter((c) => c.status !== "published");
const toDemote = notReady.filter((c) => c.status === "published");

// A published challenge whose firm is still draft renders nowhere, so the firm
// has to come with it.
const firmsToPublish = [...new Set(ready.map((c) => c.firm))];

/**
 * A firm with no website on file is still worth publishing — the challenge
 * pages are useful and the outbound button says so honestly rather than
 * linking somewhere wrong. It is worth calling out, though: an unlinked firm
 * is a dead end for anyone who decides to buy.
 */
const noWebsite = [...new Set(ready.filter((c) => !c.website).map((c) => c.firm))];

const byFirm = new Map<string, number>();
for (const c of ready) byFirm.set(c.firm, (byFirm.get(c.firm) ?? 0) + 1);

if (apply) {
  db.transaction(() => {
    const pubChallenge = db.prepare(`UPDATE challenges SET status = 'published' WHERE id = ?`);
    for (const c of toPublish) pubChallenge.run(c.id);

    const pubFirm = db.prepare(`UPDATE firms SET status = 'published' WHERE name = ?`);
    for (const f of firmsToPublish) pubFirm.run(f);

    if (demote) {
      const draft = db.prepare(`UPDATE challenges SET status = 'draft' WHERE id = ?`);
      for (const c of toDemote) draft.run(c.id);
    }
  })();
}

console.log(`${ready.length} of ${ready.length + notReady.length} challenges meet the bar.\n`);

console.log("Ready, by firm:");
for (const [firm, n] of [...byFirm.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${firm.padEnd(24)} ${String(n).padStart(3)}`);
}

console.log(
  `\n${apply ? "Published" : "Would publish"} ${toPublish.length} challenge(s) ` +
    `across ${firmsToPublish.length} firm(s).`,
);

if (toDemote.length > 0) {
  console.log(
    demote
      ? `${apply ? "Returned" : "Would return"} ${toDemote.length} incomplete published challenge(s) to draft.`
      : `\n${toDemote.length} incomplete challenge(s) are currently PUBLISHED. ` +
          `Re-run with --demote to take them back to draft.`,
  );
}

if (noWebsite.length > 0) {
  console.log(
    `\n${noWebsite.length} firm(s) here have no website on file, so their outbound button ` +
      `will say so instead of linking:\n   ${noWebsite.join(", ")}`,
  );
}

console.log(
  "\nEverything published this way still shows its own confidence. Nothing has been\n" +
    "verified against a firm's own page — last_verified_at is empty on every row — so\n" +
    "the site should say that where a trader will see it.",
);

if (!apply) console.log("\nDry run — nothing written. Re-run with --apply.");
