import Link from "next/link";
import { listChallengeRecords, listReviews } from "@/lib/repo";

export const metadata = {
  title: "Trader reviews",
  description:
    "Moderated trader experiences of prop firm challenges. Every review is submitted by a trader, reviewed by a person, and labelled with how far it has been verified.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const challengeFilter = first(params.challenge);
  const styleFilter = first(params.style);
  const verifiedOnly = first(params.verified) === "1";

  const challenges = listChallengeRecords();
  const challengeById = new Map(challenges.map((c) => [c.id, c]));

  const reviews = listReviews({ status: "approved" }).filter((review) => {
    if (challengeFilter && review.challenge_id !== challengeFilter) return false;
    if (styleFilter && review.trading_style !== styleFilter) return false;
    if (verifiedOnly && review.verification !== "verified") return false;
    return true;
  });

  return (
    <div className="shell section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Reviews</span>
        <h1>Trader experiences</h1>
        <p className="lede">
          Reviews support the recommendation — they don&apos;t replace it. Everything here was
          submitted by a trader and approved by a person, and we only call a review
          &quot;verified&quot; when evidence was actually checked.
        </p>
      </header>

      <form method="get" className="panel" style={{ marginBottom: "2rem" }}>
        <div className="grid-3" style={{ gap: "0.9rem" }}>
          <div>
            <label className="field-label" htmlFor="challenge">
              Challenge
            </label>
            <select id="challenge" name="challenge" defaultValue={challengeFilter}>
              <option value="">All challenges</option>
              {challenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>
                  {challenge.firm.name} — {challenge.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="style">
              Trading style
            </label>
            <select id="style" name="style" defaultValue={styleFilter}>
              <option value="">Any style</option>
              {["scalping", "day_trading", "swing_trading", "news_trading", "algorithmic"].map(
                (style) => (
                  <option key={style} value={style}>
                    {style.replace(/_/g, " ")}
                  </option>
                ),
              )}
            </select>
          </div>
          <div style={{ display: "grid", alignContent: "end" }}>
            <label className="row" style={{ gap: "0.5rem" }}>
              <input
                type="checkbox"
                name="verified"
                value="1"
                defaultChecked={verifiedOnly}
                style={{ width: 16, height: 16, minHeight: "auto" }}
              />
              <span className="small">Verified experiences only</span>
            </label>
          </div>
        </div>
        <div className="row" style={{ marginTop: "1rem" }}>
          <button type="submit" className="btn btn-primary">
            Apply
          </button>
          <Link href="/reviews" className="btn btn-ghost">
            Reset
          </Link>
          <Link href="/reviews/submit" className="btn">
            Share your experience
          </Link>
        </div>
      </form>

      {reviews.length === 0 ? (
        <div className="panel panel-quiet">
          <h3>No verified trader experiences yet.</h3>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            We don&apos;t seed this page with anything. When traders submit experiences and a
            moderator approves them, they appear here.
          </p>
          <Link href="/reviews/submit" className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
            Be the first
          </Link>
        </div>
      ) : (
        <div className="stack">
          {reviews.map((review) => {
            const challenge = review.challenge_id ? challengeById.get(review.challenge_id) : null;
            return (
              <article key={review.id} className="panel">
                <div className="spread">
                  <div>
                    <strong>{review.display_name ?? "Trader"}</strong>
                    {challenge ? (
                      <div className="small muted">
                        <Link href={`/challenges/${challenge.slug}`}>
                          {challenge.firm.name} — {challenge.name}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                  <div className="row">
                    {review.rating ? <span className="pill">{review.rating}/5</span> : null}
                    <span
                      className={`pill ${review.verification === "verified" ? "pill-accent" : ""}`}
                    >
                      {review.verification === "verified"
                        ? "Verified trader experience"
                        : "Trader reported"}
                    </span>
                  </div>
                </div>

                <div className="row small muted" style={{ marginTop: "0.75rem" }}>
                  {review.trading_style ? <span>{review.trading_style.replace(/_/g, " ")}</span> : null}
                  {review.account_size ? <span>· ${review.account_size.toLocaleString()}</span> : null}
                  {review.passed ? <span>· passed: {review.passed.replace(/_/g, " ")}</span> : null}
                  {review.payout_days !== null ? <span>· payout in {review.payout_days} days</span> : null}
                </div>

                {review.body ? (
                  <p className="small" style={{ marginTop: "0.75rem" }}>
                    {review.body}
                  </p>
                ) : null}

                {review.liked || review.disliked ? (
                  <div className="grid-2" style={{ marginTop: "1rem", gap: "0.75rem" }}>
                    {review.liked ? (
                      <div className="panel panel-quiet">
                        <div className="stat-label">Liked</div>
                        <p className="small" style={{ marginTop: "0.3rem" }}>
                          {review.liked}
                        </p>
                      </div>
                    ) : null}
                    {review.disliked ? (
                      <div className="panel panel-quiet">
                        <div className="stat-label">Disliked</div>
                        <p className="small" style={{ marginTop: "0.3rem" }}>
                          {review.disliked}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
