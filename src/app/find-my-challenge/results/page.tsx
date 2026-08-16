import Link from "next/link";
import { redirect } from "next/navigation";
import { AffiliateCta } from "@/components/AffiliateCta";
import { SaveButton } from "@/components/SaveButton";
import {
  AccountSize,
  ChallengeCard,
  Figure,
  LastVerified,
  MatchRing,
  Money,
  ReasonList,
  ScoreBreakdown,
} from "@/components/ui";
import { getChallengeRecommendations, PRIMARY_RESULT_THRESHOLD } from "@/lib/engine";
import { getOfferForChallenge, listChallengeRecords, listSaved, trackEvent } from "@/lib/repo";
import { getCurrentProfile, getSessionId } from "@/lib/session";
import type { Recommendation } from "@/lib/types";
import styles from "./results.module.css";

export const metadata = {
  title: "Your challenge matches",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const [profile, sessionId] = await Promise.all([getCurrentProfile(), getSessionId()]);

  // No profile means the trader landed here directly — send them to the quiz
  // rather than showing an arbitrary list.
  if (!profile) redirect("/find-my-challenge");

  const catalogue = listChallengeRecords();
  const result = getChallengeRecommendations(profile, catalogue);
  const saved = sessionId ? new Set(listSaved(sessionId)) : new Set<string>();

  if (sessionId) {
    trackEvent("results_viewed", sessionId, {
      compatible: result.recommendations.length,
      eliminated: result.eliminated.length,
    });
  }

  // ---- empty catalogue -----------------------------------------------------
  if (catalogue.length === 0) {
    return (
      <div className="shell section">
        <div className={styles.noMatch}>
          <h1>There are no published challenges yet.</h1>
          <p className="lede" style={{ marginTop: "1rem" }}>
            Your profile has been saved. This installation has no verified challenge data loaded, so
            there is nothing to match you against — and we won&apos;t invent options to fill the
            page.
          </p>
          <p className="small muted" style={{ marginTop: "1rem" }}>
            If you are running this yourself, add firms and challenges in the admin area. Every
            field records where the figure came from and when it was last verified.
          </p>
          <Link href="/admin" className="btn" style={{ marginTop: "1.5rem" }}>
            Open admin
          </Link>
        </div>
      </div>
    );
  }

  const primary = result.recommendations.filter((r) => r.match_score >= PRIMARY_RESULT_THRESHOLD);
  const belowThreshold = result.recommendations.filter(
    (r) => r.match_score < PRIMARY_RESULT_THRESHOLD,
  );

  // ---- nothing survived the hard filters ----------------------------------
  if (result.recommendations.length === 0) {
    return (
      <div className="shell section">
        <div className={styles.noMatch}>
          <h1>We couldn&apos;t find a challenge that meets every requirement.</h1>
          <p className="lede" style={{ marginTop: "1rem" }}>
            Your current combination of requirements is very restrictive. We&apos;d rather tell you
            that than show you challenges that conflict with what you asked for.
          </p>

          <h2 className="section-heading" style={{ marginTop: "2.5rem" }}>
            The requirements causing the problem
          </h2>
          <div>
            {result.blocking_requirements.map((blocker) => (
              <div key={blocker.requirement} className={styles.blocker}>
                <div>
                  <strong>{blocker.label}</strong>
                  <p className="small muted" style={{ marginTop: "0.2rem" }}>
                    {blocker.message}
                  </p>
                </div>
                <span className="pill nowrap">
                  removes {blocker.blocked} of {result.total_considered}
                </span>
              </div>
            ))}
          </div>

          <h2 className="section-heading" style={{ marginTop: "2.5rem" }}>
            Relax one requirement
          </h2>
          <ul className="stack-sm" style={{ listStyle: "none" }}>
            <li className="small">· Increase your budget by one band.</li>
            <li className="small">· Allow a different account size.</li>
            <li className="small">
              · Reconsider whether a rule is genuinely non-negotiable — &quot;sometimes&quot; scores
              differently from &quot;required&quot;.
            </li>
          </ul>

          <div className={styles.actions}>
            <Link href="/find-my-challenge" className="btn btn-primary">
              Change my answers
            </Link>
            <Link href="/challenges" className="btn">
              Browse all challenges
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [first, second, third, ...rest] = primary.length > 0 ? primary : result.recommendations;
  const offer = getOfferForChallenge(first.challenge.id);

  return (
    <div className="shell section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Your results</span>
        <h1>Your challenge matches</h1>
        <p className="lede">
          Based on the trading preferences you gave us. {result.recommendations.length} of{" "}
          {result.total_considered} challenges are compatible with your requirements.
        </p>
      </header>

      {/* ---------------------------------------------------- top result */}
      <section aria-labelledby="top-match">
        <h2 className="section-heading" id="top-match">
          Your #1 match
        </h2>

        <div className={styles.top}>
          <div>
            <span className="pill pill-accent">{first.label}</span>
            <h3 className={styles.topTitle}>{first.challenge.name}</h3>
            <div className={styles.topFirm}>{first.challenge.firm.name}</div>

            <div className={styles.specGrid}>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Price</span>
                <span className={styles.specValue}>
                  <Money value={first.challenge.price} currency={first.challenge.currency} />
                </span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Account</span>
                <span className={styles.specValue}>
                  <AccountSize value={first.challenge.account_size} />
                </span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Max drawdown</span>
                <span className={styles.specValue}>
                  <Figure value={first.challenge.max_drawdown_pct} suffix="%" />
                </span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Profit target</span>
                <span className={styles.specValue}>
                  <Figure value={first.challenge.profit_target_pct} suffix="%" />
                </span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Payout</span>
                <span className={styles.specValue}>
                  {first.challenge.payout_frequency_days ? (
                    `Every ${first.challenge.payout_frequency_days}d`
                  ) : (
                    <span className="muted">Not confirmed</span>
                  )}
                </span>
              </div>
              <div className={styles.spec}>
                <span className={styles.specLabel}>Platform</span>
                <span className={styles.specValue}>
                  {first.challenge.platforms.length > 0 ? (
                    first.challenge.platforms.join(", ")
                  ) : (
                    <span className="muted">Not confirmed</span>
                  )}
                </span>
              </div>
            </div>

            <div className={styles.why}>
              <div className={styles.whyBox}>
                <h3>Why this challenge fits you</h3>
                {first.reasons.length > 0 ? (
                  <ReasonList items={first.reasons} />
                ) : (
                  <p className="small muted">
                    It clears every hard requirement you gave us, but none of your stated priorities
                    single it out.
                  </p>
                )}
              </div>

              {first.warnings.length > 0 ? (
                <div className={`${styles.whyBox} ${styles.caveat}`}>
                  <h3>One thing to consider</h3>
                  <ReasonList items={first.warnings.slice(0, 3)} tone="warning" />
                </div>
              ) : null}
            </div>

            <details className={styles.breakdown}>
              <summary>How we calculated your {first.match_score}% match</summary>
              <div className={styles.breakdownBody}>
                <ScoreBreakdown breakdown={first.score_breakdown} />
                <p className="small muted" style={{ marginTop: "0.9rem" }}>
                  Criteria marked &quot;priority&quot; carry extra weight because you named them.
                  Weights are renormalised to 100 so scores stay comparable.
                </p>
              </div>
            </details>

            <div className={styles.actions}>
              <AffiliateCta
                challengeId={first.challenge.id}
                offer={offer}
                page="results"
                placement="top_match"
                score={first.match_score}
                position={1}
              />
            </div>

            <div className={styles.actions}>
              <Link href={`/challenges/${first.challenge.slug}`} className="btn">
                Challenge details
              </Link>
              {second ? (
                <Link
                  href={`/compare?ids=${first.challenge.id},${second.challenge.id}`}
                  className="btn"
                >
                  Compare with #2
                </Link>
              ) : null}
              <SaveButton
                challengeId={first.challenge.id}
                initialSaved={saved.has(first.challenge.id)}
              />
            </div>

            <p className="small muted" style={{ marginTop: "1rem" }}>
              <LastVerified date={first.challenge.last_verified_at} />
            </p>
          </div>

          <MatchRing score={first.match_score} size={128} />
        </div>
      </section>

      {/* -------------------------------------------------- alternatives */}
      {second ? (
        <section style={{ marginTop: "3rem" }}>
          <h2 className="section-heading">Strong alternative</h2>
          <AlternativeCard rec={second} position={2} saved={saved.has(second.challenge.id)} />
        </section>
      ) : null}

      {third ? (
        <section style={{ marginTop: "2rem" }}>
          <h2 className="section-heading">Another option worth considering</h2>
          <AlternativeCard rec={third} position={3} saved={saved.has(third.challenge.id)} />
        </section>
      ) : null}

      {/* ------------------------------------------------------- see more */}
      {rest.length > 0 ? (
        <section style={{ marginTop: "3rem" }}>
          <details>
            <summary className="btn" style={{ display: "inline-flex" }}>
              See all {result.recommendations.length} compatible challenges
            </summary>
            <div className="grid-auto" style={{ marginTop: "1.5rem" }}>
              {rest.map((rec) => (
                <ChallengeCard
                  key={rec.challenge.id}
                  challenge={rec.challenge}
                  score={rec.match_score}
                />
              ))}
            </div>
          </details>
        </section>
      ) : null}

      {/* --------------------------------------------- below the threshold */}
      {belowThreshold.length > 0 ? (
        <section style={{ marginTop: "3rem" }}>
          <details>
            <summary className="btn" style={{ display: "inline-flex" }}>
              Show {belowThreshold.length} weaker match
              {belowThreshold.length === 1 ? "" : "es"} (under {PRIMARY_RESULT_THRESHOLD}%)
            </summary>
            <p className="small muted" style={{ margin: "1rem 0" }}>
              These clear your hard requirements but score poorly against your preferences. They are
              hidden by default so a weak fit never sits next to a strong one as though they were
              equivalent.
            </p>
            <div className="grid-auto">
              {belowThreshold.map((rec) => (
                <ChallengeCard
                  key={rec.challenge.id}
                  challenge={rec.challenge}
                  score={rec.match_score}
                />
              ))}
            </div>
          </details>
        </section>
      ) : null}

      {/* ------------------------------------------------------ eliminated */}
      {result.eliminated.length > 0 ? (
        <section style={{ marginTop: "3rem" }}>
          <details>
            <summary className="btn" style={{ display: "inline-flex" }}>
              {result.eliminated.length} challenge
              {result.eliminated.length === 1 ? " was" : "s were"} ruled out — see why
            </summary>
            <div className="stack" style={{ marginTop: "1.5rem" }}>
              {result.eliminated.map((rec) => (
                <div key={rec.challenge.id} className={styles.eliminated}>
                  <div>
                    <Link href={`/challenges/${rec.challenge.slug}`}>
                      <strong>{rec.challenge.name}</strong>
                    </Link>
                    <div className="small muted">{rec.challenge.firm.name}</div>
                    <ul className="stack-sm small" style={{ marginTop: "0.5rem", listStyle: "none" }}>
                      {rec.eliminations.map((elimination) => (
                        <li key={elimination.requirement}>· {elimination.message}</li>
                      ))}
                    </ul>
                  </div>
                  <span className="pill pill-danger nowrap">Not compatible</span>
                </div>
              ))}
            </div>
          </details>
        </section>
      ) : null}

      <section style={{ marginTop: "3.5rem" }}>
        <div className="panel panel-quiet spread">
          <div>
            <strong>Answers changed?</strong>
            <p className="small muted">Retake the questionnaire and your matches update.</p>
          </div>
          <Link href="/find-my-challenge" className="btn">
            Retake match
          </Link>
        </div>
      </section>
    </div>
  );
}

function AlternativeCard({
  rec,
  position,
  saved,
}: {
  rec: Recommendation;
  position: number;
  saved: boolean;
}) {
  return (
    <div className={styles.alt}>
      <div>
        <span className="pill">{rec.label}</span>
        <h3 style={{ margin: "0.5rem 0 0.15rem" }}>{rec.challenge.name}</h3>
        <div className="small muted">{rec.challenge.firm.name}</div>

        <div className={styles.specGrid}>
          <div className={styles.spec}>
            <span className={styles.specLabel}>Price</span>
            <span className={styles.specValue}>
              <Money value={rec.challenge.price} currency={rec.challenge.currency} />
            </span>
          </div>
          <div className={styles.spec}>
            <span className={styles.specLabel}>Account</span>
            <span className={styles.specValue}>
              <AccountSize value={rec.challenge.account_size} />
            </span>
          </div>
          <div className={styles.spec}>
            <span className={styles.specLabel}>Drawdown</span>
            <span className={styles.specValue}>
              <Figure value={rec.challenge.max_drawdown_pct} suffix="%" />
            </span>
          </div>
          <div className={styles.spec}>
            <span className={styles.specLabel}>Target</span>
            <span className={styles.specValue}>
              <Figure value={rec.challenge.profit_target_pct} suffix="%" />
            </span>
          </div>
        </div>

        <ReasonList items={rec.reasons.slice(0, 4)} />
        {rec.warnings.length > 0 ? (
          <div style={{ marginTop: "0.75rem" }}>
            <ReasonList items={rec.warnings.slice(0, 1)} tone="warning" />
          </div>
        ) : null}

        <details className={styles.breakdown}>
          <summary>Score breakdown</summary>
          <div className={styles.breakdownBody}>
            <ScoreBreakdown breakdown={rec.score_breakdown} />
          </div>
        </details>

        <div className={styles.actions}>
          <Link href={`/challenges/${rec.challenge.slug}`} className="btn">
            View challenge
          </Link>
          <Link href={`/compare?add=${rec.challenge.id}`} className="btn">
            Compare
          </Link>
          <SaveButton challengeId={rec.challenge.id} initialSaved={saved} />
          <a
            className="btn btn-sm"
            href={`/api/go/${rec.challenge.id}?page=results&placement=alternative&score=${rec.match_score}&position=${position}`}
            rel="sponsored nofollow noopener"
            target="_blank"
          >
            Open at {rec.challenge.firm.name}
          </a>
        </div>
      </div>

      <MatchRing score={rec.match_score} size={96} />
    </div>
  );
}
