import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateCta } from "@/components/AffiliateCta";
import { SaveButton } from "@/components/SaveButton";
import { TrackEvent } from "@/components/TrackEvent";
import {
  AccountSize,
  Figure,
  LastVerified,
  MatchRing,
  Money,
  ReasonList,
  RuleBadge,
  ScoreBreakdown,
} from "@/components/ui";
import { audienceFit, scoreOne } from "@/lib/engine";
import {
  getChallengeRecordBySlug,
  getOfferForChallenge,
  listChallengeRecords,
  listReviews,
  listRuleHistory,
  listSaved,
} from "@/lib/repo";
import { getCurrentProfile, getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const challenge = getChallengeRecordBySlug(slug);
  if (!challenge) return { title: "Challenge not found" };

  return {
    title: `${challenge.firm.name} — ${challenge.name}`,
    description: `Rules, pricing, drawdown and payout terms for the ${challenge.firm.name} ${challenge.name}, plus how well it fits the way you trade.`,
  };
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = getChallengeRecordBySlug(slug);
  if (!challenge || challenge.status !== "published") notFound();

  const [profile, sessionId] = await Promise.all([getCurrentProfile(), getSessionId()]);
  const catalogue = listChallengeRecords();
  const match = profile ? scoreOne(profile, challenge, catalogue) : null;
  const offer = getOfferForChallenge(challenge.id);
  const reviews = listReviews({ status: "approved", challengeId: challenge.id });
  const history = listRuleHistory({ challengeId: challenge.id, status: "approved" });
  const saved = sessionId ? listSaved(sessionId).includes(challenge.id) : false;
  const { suits, mayNotSuit } = audienceFit(challenge);

  const satisfied = match?.score_breakdown.filter((b) => b.ratio >= 0.7).length ?? 0;
  const totalCriteria = match?.score_breakdown.length ?? 0;

  return (
    <div className="shell section">
      <TrackEvent event="challenge_viewed" challengeId={challenge.id} />

      <nav className="small muted" style={{ marginBottom: "1.5rem" }}>
        <Link href="/challenges">Challenges</Link> ·{" "}
        <Link href={`/firms/${challenge.firm.slug}`}>{challenge.firm.name}</Link>
      </nav>

      <header
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        <div>
          <h1>
            {challenge.firm.name} — {challenge.name}
          </h1>
          <div className="row" style={{ marginTop: "1rem" }}>
            <LastVerified date={challenge.last_verified_at} />
            {challenge.markets.map((market) => (
              <span key={market} className="pill">
                {market}
              </span>
            ))}
            {challenge.phases !== null ? (
              <span className="pill">
                {challenge.phases === 0 ? "Instant funding" : `${challenge.phases}-step`}
              </span>
            ) : null}
          </div>
        </div>

        {match && match.eligibility === "compatible" ? (
          <MatchRing score={match.match_score} size={110} />
        ) : null}
      </header>

      {/* ----------------------------------------- personalised match block */}
      <section style={{ marginTop: "2rem" }}>
        {match === null ? (
          <div className="panel panel-accent spread">
            <div>
              <strong>See if this challenge fits you</strong>
              <p className="small muted">
                Answer a few questions and we&apos;ll score this challenge against how you actually
                trade.
              </p>
            </div>
            <Link href="/find-my-challenge" className="btn btn-primary">
              Find my match
            </Link>
          </div>
        ) : match.eligibility === "eliminated" ? (
          <div className="panel panel-danger">
            <span className="pill pill-danger">Not compatible with your profile</span>
            <h2 style={{ margin: "0.75rem 0", fontSize: "1.25rem" }}>
              This challenge conflicts with a requirement you gave us.
            </h2>
            <ul className="stack-sm small" style={{ listStyle: "none" }}>
              {match.eliminations.map((elimination) => (
                <li key={elimination.requirement}>· {elimination.message}</li>
              ))}
            </ul>
            <p className="small muted" style={{ marginTop: "1rem" }}>
              We don&apos;t give this a percentage score. A challenge that prohibits something you
              need is not a weaker match — it is the wrong challenge.
            </p>
            <Link href="/find-my-challenge/results" className="btn" style={{ marginTop: "1rem" }}>
              See what does fit
            </Link>
          </div>
        ) : (
          <div className="panel panel-accent">
            <div className="spread">
              <div>
                <span className="pill pill-accent">{match.label}</span>
                <h2 style={{ margin: "0.6rem 0 0.3rem", fontSize: "1.4rem" }}>
                  Your match: {match.match_score}%
                </h2>
                <p className="small muted">
                  Based on your profile, this challenge satisfies {satisfied} of {totalCriteria}{" "}
                  scoring criteria well.
                </p>
              </div>
              <Link href="/find-my-challenge" className="btn btn-sm">
                Retake match
              </Link>
            </div>

            <div className="grid-2" style={{ marginTop: "1.25rem" }}>
              <div>
                <h3 className="section-heading">Why it fits</h3>
                <ReasonList items={match.reasons} />
              </div>
              {match.warnings.length > 0 ? (
                <div>
                  <h3 className="section-heading">Things to consider</h3>
                  <ReasonList items={match.warnings} tone="warning" />
                </div>
              ) : null}
            </div>

            <details style={{ marginTop: "1.25rem" }}>
              <summary className="btn btn-sm" style={{ display: "inline-flex" }}>
                How this score was calculated
              </summary>
              <div style={{ marginTop: "1rem" }}>
                <ScoreBreakdown breakdown={match.score_breakdown} />
              </div>
            </details>
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- overview */}
      <section style={{ marginTop: "3rem" }}>
        <h2 className="section-heading">Challenge overview</h2>
        <div className="grid-2" style={{ gap: "1.5rem", alignItems: "start" }}>
          <dl className="panel">
            <div className="kv">
              <dt>Account size</dt>
              <dd>
                <AccountSize value={challenge.account_size} />
              </dd>
            </div>
            <div className="kv">
              <dt>Challenge price</dt>
              <dd>
                <Money value={challenge.price} currency={challenge.currency} />
                {challenge.billing_type === "monthly" ? " / month" : ""}
              </dd>
            </div>
            <div className="kv">
              <dt>Profit target</dt>
              <dd>
                <Figure value={challenge.profit_target_pct} suffix="%" />
              </dd>
            </div>
            <div className="kv">
              <dt>Maximum drawdown</dt>
              <dd>
                <Figure value={challenge.max_drawdown_pct} suffix="%" />
              </dd>
            </div>
            <div className="kv">
              <dt>Daily loss limit</dt>
              <dd>
                {challenge.daily_drawdown_pct === null ? (
                  <span className="muted">None recorded</span>
                ) : (
                  `${challenge.daily_drawdown_pct}%`
                )}
              </dd>
            </div>
            <div className="kv">
              <dt>Drawdown type</dt>
              <dd>
                {challenge.drawdown_type ? (
                  challenge.drawdown_type.replace(/_/g, " ")
                ) : (
                  <span className="muted">Not confirmed</span>
                )}
              </dd>
            </div>
          </dl>

          <dl className="panel">
            <div className="kv">
              <dt>Minimum trading days</dt>
              <dd>
                <Figure value={challenge.minimum_days} />
              </dd>
            </div>
            <div className="kv">
              <dt>Maximum trading days</dt>
              <dd>
                {challenge.maximum_days === null ? (
                  <span className="muted">Not confirmed</span>
                ) : (
                  challenge.maximum_days
                )}
              </dd>
            </div>
            <div className="kv">
              <dt>Payout frequency</dt>
              <dd>
                {challenge.payout_frequency_days ? (
                  `Every ${challenge.payout_frequency_days} days`
                ) : (
                  <span className="muted">Not confirmed</span>
                )}
              </dd>
            </div>
            <div className="kv">
              <dt>Profit split</dt>
              <dd>
                <Figure value={challenge.payout_split_pct} suffix="%" />
              </dd>
            </div>
            <div className="kv">
              <dt>Platforms</dt>
              <dd>
                {challenge.platforms.length > 0 ? (
                  challenge.platforms.join(", ")
                ) : (
                  <span className="muted">Not confirmed</span>
                )}
              </dd>
            </div>
            <div className="kv">
              <dt>Payout conditions</dt>
              <dd style={{ textAlign: "right", maxWidth: "28ch" }}>
                {challenge.payout_conditions ?? <span className="muted">Not confirmed</span>}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ----------------------------------------------------- trading rules */}
      <section style={{ marginTop: "3rem" }}>
        <h2 className="section-heading">Trading rules</h2>
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Scalping", challenge.rules.scalping],
                ["News trading", challenge.rules.news_trading],
                ["Overnight", challenge.rules.overnight],
                ["Weekend", challenge.rules.weekend],
                ["EA / automation", challenge.rules.ea_allowed],
                ["Copy trading", challenge.rules.copy_trading],
                ["Hedging", challenge.rules.hedging],
                ["Consistency rule", challenge.rules.consistency_rule],
              ].map(([label, status]) => (
                <tr key={label as string}>
                  <td>{label as string}</td>
                  <td>
                    <RuleBadge label="" status={status as never} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {challenge.rules.notes ? (
            <p className="small muted" style={{ marginTop: "1rem" }}>
              {challenge.rules.notes}
            </p>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------- who it suits */}
      <section style={{ marginTop: "3rem" }}>
        <div className="grid-2">
          <div className="panel">
            <h3>Who is this challenge for?</h3>
            {suits.length > 0 ? (
              <ul className="stack-sm small" style={{ marginTop: "0.75rem", listStyle: "none" }}>
                {suits.map((item) => (
                  <li key={item}>· It may suit {item}.</li>
                ))}
              </ul>
            ) : (
              <p className="small muted" style={{ marginTop: "0.75rem" }}>
                Not enough confirmed rule data to say yet.
              </p>
            )}
          </div>
          <div className="panel">
            <h3>Who may not like it?</h3>
            {mayNotSuit.length > 0 ? (
              <ul className="stack-sm small" style={{ marginTop: "0.75rem", listStyle: "none" }}>
                {mayNotSuit.map((item) => (
                  <li key={item}>· It may be less suitable for {item}.</li>
                ))}
              </ul>
            ) : (
              <p className="small muted" style={{ marginTop: "0.75rem" }}>
                Not enough confirmed rule data to say yet.
              </p>
            )}
          </div>
        </div>
        <p className="small muted" style={{ marginTop: "0.75rem" }}>
          Both lists are generated from the recorded rules above, not written by hand.
        </p>
      </section>

      {/* --------------------------------------------------------- outbound */}
      <section style={{ marginTop: "3rem" }}>
        <div className="panel panel-accent">
          <div className="spread">
            <div>
              <h2 style={{ fontSize: "1.25rem" }}>{challenge.name}</h2>
              <p className="small muted">
                <Money value={challenge.price} currency={challenge.currency} /> ·{" "}
                <AccountSize value={challenge.account_size} /> account
              </p>
            </div>
            <div className="row">
              <SaveButton challengeId={challenge.id} initialSaved={saved} />
              <Link href={`/compare?add=${challenge.id}`} className="btn btn-sm">
                Compare
              </Link>
            </div>
          </div>
          <div style={{ marginTop: "1.25rem", maxWidth: "34rem" }}>
            <AffiliateCta
              challengeId={challenge.id}
              offer={offer}
              page="challenge_detail"
              placement="primary"
              score={match?.match_score}
            />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- recent changes */}
      {history.length > 0 ? (
        <section style={{ marginTop: "3rem" }}>
          <h2 className="section-heading">Recent changes</h2>
          <div className="panel">
            {history.slice(0, 8).map((entry) => (
              <div key={entry.id} className="kv">
                <dt>
                  {new Date(entry.changed_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </dt>
                <dd>
                  {entry.field.replace(/_/g, " ")}: {entry.old_value ?? "—"} → {entry.new_value ?? "—"}
                </dd>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- reviews */}
      <section style={{ marginTop: "3rem" }}>
        <h2 className="section-heading">Trader experiences</h2>
        {reviews.length === 0 ? (
          <div className="panel panel-quiet">
            <p className="small muted">No verified trader experiences yet for this challenge.</p>
            <Link href={`/reviews/submit?challenge=${challenge.id}`} className="btn btn-sm" style={{ marginTop: "1rem" }}>
              Share your experience
            </Link>
          </div>
        ) : (
          <div className="stack">
            {reviews.slice(0, 5).map((review) => (
              <article key={review.id} className="panel">
                <div className="spread">
                  <strong>{review.display_name ?? "Trader"}</strong>
                  <span className={`pill ${review.verification === "verified" ? "pill-accent" : ""}`}>
                    {review.verification === "verified"
                      ? "Verified trader experience"
                      : "Trader reported"}
                  </span>
                </div>
                <p className="small" style={{ marginTop: "0.6rem" }}>
                  {review.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: "3rem" }}>
        <div className="panel panel-quiet spread">
          <div>
            <strong>Want a recommendation based on how you trade?</strong>
            <p className="small muted">Six to eight questions. No account needed.</p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-primary">
            Find My Challenge
          </Link>
        </div>
      </section>
    </div>
  );
}
