import Link from "next/link";
import { notFound } from "next/navigation";
import { ChallengeCard } from "@/components/ui";
import { getChallengeRecommendations } from "@/lib/engine";
import { getFirmBySlug, listChallengeRecords, listReviews } from "@/lib/repo";
import { getCurrentProfile } from "@/lib/session";
import { parseKeyPeople } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const firm = getFirmBySlug(slug);
  if (!firm) return { title: "Firm not found" };

  return {
    title: firm.name,
    description:
      firm.description ??
      `Challenges, rules and trader experiences for ${firm.name}, plus which of their challenges fits how you trade.`,
  };
}

export default async function FirmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const firm = getFirmBySlug(slug);
  if (!firm || firm.status !== "published") notFound();

  const profile = await getCurrentProfile();
  const catalogue = listChallengeRecords();
  const challenges = catalogue.filter((c) => c.firm_id === firm.id);

  const scores = new Map<string, number>();
  if (profile) {
    const result = getChallengeRecommendations(profile, catalogue);
    for (const rec of result.recommendations) scores.set(rec.challenge.id, rec.match_score);
  }

  const bestForYou = profile
    ? challenges
        .map((c) => ({ challenge: c, score: scores.get(c.id) }))
        .filter((entry): entry is { challenge: typeof entry.challenge; score: number } =>
          typeof entry.score === "number",
        )
        .sort((a, b) => b.score - a.score)[0]
    : null;

  const reviews = listReviews({ status: "approved" }).filter((r) => r.firm_id === firm.id);

  const markets = [...new Set(challenges.flatMap((c) => c.markets))];
  const platforms = [...new Set(challenges.flatMap((c) => c.platforms))];

  const keyPeople = parseKeyPeople(firm.key_people);
  const hasLeadership = Boolean(
    firm.ceo || keyPeople.length > 0 || firm.headquarters || firm.founded_year,
  );

  return (
    <div className="shell section">
      <nav className="small muted" style={{ marginBottom: "1.5rem" }}>
        <Link href="/challenges">Challenges</Link> · {firm.name}
      </nav>

      <header className="stack-sm">
        <h1>{firm.name}</h1>
        {firm.description ? <p className="lede">{firm.description}</p> : null}
        <div className="row" style={{ marginTop: "0.75rem" }}>
          {markets.map((market) => (
            <span key={market} className="pill">
              {market}
            </span>
          ))}
          {platforms.map((platform) => (
            <span key={platform} className="pill">
              {platform}
            </span>
          ))}
        </div>
      </header>

      {bestForYou ? (
        <div className="panel panel-accent spread" style={{ marginTop: "2rem" }}>
          <div>
            <span className="pill pill-accent">{bestForYou.score}% match</span>
            <h2 style={{ margin: "0.6rem 0 0.2rem", fontSize: "1.3rem" }}>
              {bestForYou.challenge.name} is this firm&apos;s best fit for you
            </h2>
            <p className="small muted">Scored against the profile you gave us.</p>
          </div>
          <Link href={`/challenges/${bestForYou.challenge.slug}`} className="btn btn-primary">
            View challenge
          </Link>
        </div>
      ) : (
        <div className="panel panel-accent spread" style={{ marginTop: "2rem" }}>
          <div>
            <strong>Find the right challenge from this firm</strong>
            <p className="small muted">
              This firm has {challenges.length} challenge{challenges.length === 1 ? "" : "s"}. Tell
              us how you trade and we&apos;ll say which one fits.
            </p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-primary">
            Find My Challenge
          </Link>
        </div>
      )}

      <section style={{ marginTop: "3rem" }}>
        <h2 className="section-heading">Who runs this firm</h2>
        {hasLeadership ? (
          <div className="panel stack">
            <dl className="stack-sm" style={{ margin: 0 }}>
              {firm.ceo ? (
                <div className="spread">
                  <dt className="small muted">Chief executive</dt>
                  <dd style={{ margin: 0 }}>
                    <strong>{firm.ceo}</strong>
                  </dd>
                </div>
              ) : null}
              {keyPeople.map((person) => (
                <div key={`${person.name}-${person.role}`} className="spread">
                  <dt className="small muted">{person.role || "Key person"}</dt>
                  <dd style={{ margin: 0 }}>{person.name}</dd>
                </div>
              ))}
              {firm.headquarters ? (
                <div className="spread">
                  <dt className="small muted">Headquarters</dt>
                  <dd style={{ margin: 0 }}>{firm.headquarters}</dd>
                </div>
              ) : null}
              {firm.founded_year ? (
                <div className="spread">
                  <dt className="small muted">Founded</dt>
                  <dd style={{ margin: 0 }}>{firm.founded_year}</dd>
                </div>
              ) : null}
            </dl>
            {firm.leadership_source_url ? (
              <p className="small muted" style={{ marginTop: "0.75rem" }}>
                Recorded from{" "}
                <a href={firm.leadership_source_url} rel="nofollow noopener" target="_blank">
                  this source
                </a>
                . Tell us if it is out of date.
              </p>
            ) : (
              <p className="small muted" style={{ marginTop: "0.75rem" }}>
                No source recorded for this yet, so treat it as unconfirmed.
              </p>
            )}
          </div>
        ) : (
          <div className="panel">
            <p className="small">
              This firm has not been recorded as publicly naming the people who run it.
            </p>
            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              That is not an accusation — plenty of legitimate firms keep a low profile, and we may
              simply not have researched it yet. But when you are sending money to a company, who
              stands behind it is worth knowing, so we show the gap rather than hiding it.
            </p>
          </div>
        )}
      </section>

      <section style={{ marginTop: "3rem" }}>
        <h2 className="section-heading">Available challenges</h2>
        {challenges.length === 0 ? (
          <p className="small muted">No published challenges recorded for this firm yet.</p>
        ) : (
          <div className="grid-auto">
            {challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                score={scores.get(challenge.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: "3rem" }}>
        <h2 className="section-heading">Trader experiences</h2>
        {reviews.length === 0 ? (
          <p className="small muted">No verified trader experiences yet for this firm.</p>
        ) : (
          <div className="stack">
            {reviews.slice(0, 8).map((review) => (
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

      {firm.website ? (
        <p className="small muted" style={{ marginTop: "2rem" }}>
          Official site:{" "}
          <a href={firm.website} rel="nofollow noopener" target="_blank" style={{ textDecoration: "underline" }}>
            {firm.website}
          </a>
        </p>
      ) : null}
    </div>
  );
}
