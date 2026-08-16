import { listChallengeRecords, listReviews } from "@/lib/repo";
import { moderate } from "../actions";

export const dynamic = "force-dynamic";

const QUEUES = [
  { status: "pending", label: "Pending", tone: "pill-warn" },
  { status: "approved", label: "Approved", tone: "pill-accent" },
  { status: "rejected", label: "Rejected", tone: "" },
  { status: "spam", label: "Spam", tone: "pill-danger" },
] as const;

export default async function AdminReviewsPage() {
  const challenges = listChallengeRecords({ includeUnpublished: true });
  const byId = new Map(challenges.map((c) => [c.id, c]));

  return (
    <div className="stack-lg">
      {QUEUES.map((queue) => {
        const reviews = listReviews({ status: queue.status });
        return (
          <section key={queue.status}>
            <h2 className="section-heading">
              {queue.label} ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <p className="small muted">Nothing here.</p>
            ) : (
              <div className="stack">
                {reviews.map((review) => {
                  const challenge = review.challenge_id ? byId.get(review.challenge_id) : null;
                  return (
                    <article key={review.id} className="panel">
                      <div className="spread">
                        <div>
                          <strong>{review.display_name ?? "Anonymous trader"}</strong>
                          <div className="small muted">
                            {challenge
                              ? `${challenge.firm.name} — ${challenge.name}`
                              : "Challenge missing"}{" "}
                            · {new Date(review.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="row">
                          {review.rating ? <span className="pill">{review.rating}/5</span> : null}
                          <span className={`pill ${queue.tone}`}>{review.status}</span>
                          <span className="pill">{review.verification.replace(/_/g, " ")}</span>
                        </div>
                      </div>

                      <div className="row small muted" style={{ marginTop: "0.6rem" }}>
                        {review.trading_style ? <span>{review.trading_style}</span> : null}
                        {review.account_size ? (
                          <span>· ${review.account_size.toLocaleString()}</span>
                        ) : null}
                        {review.passed ? <span>· passed: {review.passed}</span> : null}
                        {review.received_payout ? (
                          <span>· payout: {review.received_payout}</span>
                        ) : null}
                        {review.payout_days !== null ? (
                          <span>· {review.payout_days} days</span>
                        ) : null}
                      </div>

                      {review.body ? (
                        <p className="small" style={{ marginTop: "0.75rem" }}>
                          {review.body}
                        </p>
                      ) : null}

                      {review.liked ? (
                        <p className="small" style={{ marginTop: "0.5rem" }}>
                          <strong>Liked:</strong> {review.liked}
                        </p>
                      ) : null}
                      {review.disliked ? (
                        <p className="small" style={{ marginTop: "0.35rem" }}>
                          <strong>Disliked:</strong> {review.disliked}
                        </p>
                      ) : null}

                      {review.evidence_note ? (
                        <div className="panel panel-quiet" style={{ marginTop: "0.75rem" }}>
                          <div className="stat-label">Evidence offered</div>
                          <p className="small" style={{ marginTop: "0.3rem" }}>
                            {review.evidence_note}
                          </p>
                        </div>
                      ) : null}

                      <div className="row" style={{ marginTop: "1rem" }}>
                        <ModerateButton id={review.id} status="approved" label="Approve as trader reported" />
                        <ModerateButton
                          id={review.id}
                          status="approved"
                          verification="verified"
                          label="Approve as verified"
                          primary
                        />
                        <ModerateButton id={review.id} status="pending" label="Return to pending" />
                        <ModerateButton id={review.id} status="rejected" label="Reject" />
                        <ModerateButton id={review.id} status="spam" label="Spam" />
                      </div>

                      <p className="small muted" style={{ marginTop: "0.75rem" }}>
                        Only mark verified if you have actually checked evidence. The label is a
                        claim to the reader about what was checked.
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ModerateButton({
  id,
  status,
  verification,
  label,
  primary,
}: {
  id: string;
  status: string;
  verification?: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={moderate}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      {verification ? <input type="hidden" name="verification" value={verification} /> : null}
      <button type="submit" className={`btn btn-sm ${primary ? "btn-primary" : ""}`}>
        {label}
      </button>
    </form>
  );
}
