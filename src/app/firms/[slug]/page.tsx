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

  // A firm's range is what a trader scans for first: what can I get, and what
  // does the cheapest one cost. Computed from what is on file, so it never
  // implies coverage we do not have.
  const sizes = challenges.map((c) => c.account_size).filter((n): n is number => typeof n === "number");
  const prices = challenges.map((c) => c.price).filter((n): n is number => typeof n === "number");
  const fmtSize = (n: number) => (n >= 1000 ? `$${n / 1000}K` : `$${n}`);
  const summary = [
    challenges.length > 0
      ? `${challenges.length} challenge${challenges.length === 1 ? "" : "s"}`
      : null,
    sizes.length > 1
      ? `${fmtSize(Math.min(...sizes))} – ${fmtSize(Math.max(...sizes))}`
      : sizes.length === 1
        ? fmtSize(sizes[0])
        : null,
    prices.length > 0 ? `from $${Math.min(...prices)}` : null,
  ].filter(Boolean);

  const keyPeople = parseKeyPeople(firm.key_people);
  const hasLeadership = Boolean(
    firm.ceo || keyPeople.length > 0 || firm.headquarters || firm.founded_year,
  );

  /**
   * The terms that actually differ between firms, gathered across everything
   * this one sells.
   *
   * Every value is counted from the catalogue rather than written by hand, so
   * a firm we know little about shows a short list rather than a paragraph of
   * filler — and a row appears only when at least one challenge has that field
   * on file. Nothing here can claim knowledge we do not have.
   */
  const distinct = <T,>(values: (T | null | undefined)[]): T[] =>
    [...new Set(values.filter((v): v is T => v !== null && v !== undefined && v !== ("" as T)))];

  const splits = challenges
    .map((c) => c.payout_split_pct)
    .filter((n): n is number => typeof n === "number");
  const cadences = distinct(challenges.map((c) => c.payout_frequency_days));
  const drawdownTypes = distinct(challenges.map((c) => c.drawdown_type));
  const targets = challenges
    .map((c) => c.profit_target_pct)
    .filter((n): n is number => typeof n === "number");

  const range = (nums: number[], suffix: string) =>
    nums.length === 0
      ? null
      : Math.min(...nums) === Math.max(...nums)
        ? `${Math.min(...nums)}${suffix}`
        : `${Math.min(...nums)}${suffix} – ${Math.max(...nums)}${suffix}`;

  const terms: { label: string; value: string }[] = [
    { label: "Account sizes", value: sizes.length ? distinct(sizes.map(fmtSize)).join(", ") : "" },
    { label: "Entry price", value: range(prices, "") ? `$${range(prices, "")}` : "" },
    { label: "Profit target", value: range(targets, "%") ?? "" },
    { label: "Profit split", value: range(splits, "%") ?? "" },
    {
      label: "Drawdown type",
      value: drawdownTypes.map((t) => String(t).replace(/_/g, " ")).join(", "),
    },
    {
      label: "Payouts",
      value: cadences.length ? cadences.map((d) => `every ${d} days`).join(", ") : "",
    },
    { label: "Platforms", value: platforms.join(", ") },
  ].filter((row) => row.value.trim() !== "");

  return (
    <div className="shell section">
      <nav className="small muted" style={{ marginBottom: "1.5rem" }}>
        <Link href="/challenges">Challenges</Link> · {firm.name}
      </nav>

      <header className="stack-sm">
        <h1>{firm.name}</h1>
        {firm.description ? <p className="lede">{firm.description}</p> : null}
        {summary.length > 0 ? (
          <p className="small muted" style={{ marginTop: "0.35rem" }}>
            {summary.join(" · ")}
          </p>
        ) : null}
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

      {/*
        What the firm sells, counted from the catalogue. This replaced a
        section that existed only to say we had no company details — a heading
        followed by an apology on every page, which reads worse than not asking
        the question. Rows appear only where there is something on file.
      */}
      {terms.length > 0 ? (
        <section style={{ marginTop: "3rem" }}>
          <h2 className="section-heading">What {firm.name} offers</h2>
          <dl className="panel" style={{ margin: 0 }}>
            {terms.map((row) => (
              <div key={row.label} className="kv">
                <dt>{row.label}</dt>
                <dd style={{ textAlign: "right", maxWidth: "34ch" }}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="small muted" style={{ marginTop: "0.75rem" }}>
            Counted across this firm&apos;s {challenges.length} published challenge
            {challenges.length === 1 ? "" : "s"}. Anything not on file is left out rather than
            guessed.
          </p>
        </section>
      ) : null}

      {hasLeadership ? (
        <section style={{ marginTop: "3rem" }}>
          <h2 className="section-heading">Who runs this firm</h2>
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
        </section>
      ) : null}

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
