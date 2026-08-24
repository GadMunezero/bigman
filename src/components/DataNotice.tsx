import { countVerifiedChallenges } from "@/lib/repo";

/**
 * Says out loud how well the catalogue is checked.
 *
 * The per-field "Not confirmed" labels are honest about individual gaps, but
 * someone reading a match score does not audit twenty fields — they read the
 * number and decide whether to spend $200. If nothing in the catalogue has been
 * read on the firm's own page, that belongs where the decision happens, in a
 * sentence, not buried in a methodology link.
 *
 * It reads the real count rather than hard-coding a claim, so it stops saying
 * "none" the moment the first challenge is verified in /admin, and disappears
 * entirely once everything shown has been. A disclaimer nobody can retire is a
 * disclaimer nobody reads.
 */
export function DataNotice() {
  const { verified, total } = countVerifiedChallenges();
  if (total === 0 || verified === total) return null;

  return (
    <div className="panel panel-warn" style={{ marginBottom: "1.5rem" }}>
      <strong>
        {verified === 0
          ? "None of these figures has been checked against the firm's own page yet."
          : `${verified} of ${total} challenges here have been checked against the firm's own page.`}
      </strong>
      <p className="small muted" style={{ marginTop: "0.4rem" }}>
        Prices and rules change often and without announcement. Treat this as a shortlist, and
        confirm the numbers on the firm&apos;s site before you pay for anything. Every figure shows
        its own status, and anything we do not know says so rather than guessing.
      </p>
    </div>
  );
}
