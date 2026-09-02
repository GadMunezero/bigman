import type { TraderFitProfile } from "@/lib/types";
import styles from "./fit-profile.module.css";

/**
 * What the engine concluded about the trader, shown before the ranking it
 * produced.
 *
 * This is the part that makes the results checkable. A ranked list asks to be
 * trusted; a ranked list preceded by "we read you as a low-frequency trader
 * whose month is made on two days, so we treated consistency rules as
 * disqualifying" can be argued with. If the reading is wrong, everything below
 * it is wrong, and the trader is the only person in a position to notice.
 */
export function FitProfile({ profile }: { profile: TraderFitProfile }) {
  // Nothing detected is a real outcome, not an empty state to apologise for.
  // Rendering an "unclassified" banner would imply a failure where the honest
  // reading is that the answers described an ordinary trader.
  if (profile.archetypes.length === 0) return null;

  return (
    <section className={styles.wrap} aria-labelledby="fit-profile">
      <div className={styles.header}>
        <h2 className="section-heading" id="fit-profile" style={{ margin: 0 }}>
          How we read your trading
        </h2>
        <p className="small muted" style={{ margin: "0.35rem 0 0" }}>
          Everything below is ranked against this. If it does not describe you,{" "}
          <a href="/find-my-challenge">change your answers</a> — the ranking will change with them.
        </p>
      </div>

      <div className={styles.archetypes}>
        {profile.archetypes.map((a) => (
          <article key={a.id} className={styles.archetype}>
            <div className={styles.archetypeHead}>
              <strong>{a.label}</strong>
              <span className={styles.strength} aria-label={`${Math.round(a.strength * 100)}% match`}>
                {Math.round(a.strength * 100)}%
              </span>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {a.summary}
            </p>
          </article>
        ))}
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>
            <span className={`${styles.marker} ${styles.markerGood}`} aria-hidden="true">
              ✓
            </span>
            What you need
          </h3>
          <ul className={styles.list}>
            {profile.must_have.map((req) => (
              <li key={req.label}>
                <strong>{req.label}</strong>
                <span className="small muted"> — {req.because}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <h3 className={styles.columnTitle}>
            <span className={`${styles.marker} ${styles.markerBad}`} aria-hidden="true">
              !
            </span>
            What works against you
          </h3>
          <ul className={styles.list}>
            {profile.avoid.map((req) => (
              <li key={req.label}>
                <strong>{req.label}</strong>
                <span className="small muted"> — {req.because}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className={styles.footnote}>
        These are not universal rules. A consistency rule is close to irrelevant for a trader
        whose profit accumulates evenly, and close to disqualifying for one whose month is made on
        two days. The list above is what these rules mean{" "}
        <em>for the way you said you trade</em>.
      </p>
    </section>
  );
}
