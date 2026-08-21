import { countSubscribers, listSubscribers } from "@/lib/repo";
import { NEWSLETTER_TOPIC_LABELS, type NewsletterTopic } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The subscriber list.
 *
 * `confirmed` is the only number that means anything — it is the list you may
 * actually mail. `pending` is people who filled the form and never clicked the
 * link, and mailing them is exactly what double opt-in exists to prevent.
 */
export default async function AdminNewsletterPage() {
  const counts = countSubscribers();
  const subscribers = listSubscribers();

  const csv = [
    "email,status,topics,source,created_at,confirmed_at",
    ...subscribers.map((s) =>
      [s.email, s.status, s.topics.join("|"), s.source ?? "", s.created_at, s.confirmed_at ?? ""]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  return (
    <div className="stack-lg">
      <div className="panel panel-quiet">
        <strong>Only the confirmed list is mailable.</strong>
        <p className="small muted" style={{ marginTop: "0.4rem" }}>
          Pending rows are addresses someone typed into a form and never confirmed. Some of them
          belong to people who did not type them. Mailing that column is the thing double opt-in is
          there to stop.
        </p>
      </div>

      <section className="grid-4">
        {(["confirmed", "pending", "unsubscribed", "bounced"] as const).map((status) => (
          <div key={status} className="panel">
            <div className="stat-label">{status}</div>
            <div className="stat-value">{counts[status]}</div>
          </div>
        ))}
      </section>

      <section className="stack">
        <h2 className="section-heading">Export</h2>
        <p className="small muted">
          Copy this into whatever sends the emails. Filter to `confirmed` before you import it.
        </p>
        <textarea className="input mono" rows={8} readOnly value={csv} />
      </section>

      <section className="stack">
        <h2 className="section-heading">Subscribers ({subscribers.length})</h2>
        {subscribers.length === 0 ? (
          <div className="panel panel-quiet">
            <p className="small muted">Nobody has signed up yet.</p>
          </div>
        ) : (
          <div className="table-scroll panel panel-flush">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Topics</th>
                  <th>Source</th>
                  <th>Signed up</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td className="mono small">{s.email}</td>
                    <td>
                      <span
                        className={
                          s.status === "confirmed"
                            ? "pill pill-accent"
                            : s.status === "pending"
                              ? "pill pill-info"
                              : "pill"
                        }
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="small muted">
                      {s.topics
                        .map((t) => NEWSLETTER_TOPIC_LABELS[t as NewsletterTopic] ?? t)
                        .join(", ")}
                    </td>
                    <td className="small muted">{s.source ?? "—"}</td>
                    <td className="small muted nowrap">{s.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
