import { listChallengeRecords, listRuleHistory } from "@/lib/repo";
import { resolveChange, submitChange } from "../actions";

export const dynamic = "force-dynamic";

const EDITABLE_FIELDS = [
  "price",
  "account_size",
  "profit_target_pct",
  "max_drawdown_pct",
  "daily_drawdown_pct",
  "drawdown_type",
  "minimum_days",
  "maximum_days",
  "payout_frequency_days",
  "payout_split_pct",
  "news_trading",
  "overnight",
  "weekend",
  "ea_allowed",
  "copy_trading",
  "scalping",
  "consistency_rule",
];

export default async function AdminRulesPage() {
  const challenges = listChallengeRecords({ includeUnpublished: true });
  const byId = new Map(challenges.map((c) => [c.id, c]));

  const pending = listRuleHistory({ status: "pending" });
  const investigating = listRuleHistory({ status: "investigating" });
  const approved = listRuleHistory({ status: "approved" }).slice(0, 25);

  return (
    <div className="stack-lg">
      <section>
        <h2 className="section-heading">Pending changes ({pending.length})</h2>
        <p className="small muted" style={{ marginBottom: "1rem" }}>
          Nothing here is live. A change only reaches the public site once approved, and approval
          writes both the new value and a dated history entry.
        </p>

        {pending.length === 0 ? (
          <p className="small muted">No pending changes.</p>
        ) : (
          <div className="stack">
            {[...pending, ...investigating].map((change) => {
              const challenge = byId.get(change.challenge_id);
              return (
                <div key={change.id} className="panel panel-warn">
                  <div className="spread">
                    <div>
                      <span className="pill pill-warn">Possible change detected</span>
                      <h3 style={{ margin: "0.5rem 0 0.2rem", fontSize: "1.05rem" }}>
                        {challenge ? `${challenge.firm.name} — ${challenge.name}` : change.challenge_id}
                      </h3>
                      <div className="small muted mono">{change.field}</div>
                    </div>
                    <span className="pill">{change.status}</span>
                  </div>

                  <div className="grid-2" style={{ marginTop: "1rem" }}>
                    <div className="panel panel-quiet">
                      <div className="stat-label">Current</div>
                      <div className="mono" style={{ marginTop: "0.3rem" }}>
                        {change.old_value ?? "—"}
                      </div>
                    </div>
                    <div className="panel panel-quiet">
                      <div className="stat-label">Proposed</div>
                      <div className="mono" style={{ marginTop: "0.3rem", color: "var(--accent)" }}>
                        {change.new_value ?? "—"}
                      </div>
                    </div>
                  </div>

                  {change.notes ? (
                    <p className="small muted" style={{ marginTop: "0.75rem" }}>
                      {change.notes}
                    </p>
                  ) : null}

                  <div className="row" style={{ marginTop: "1rem" }}>
                    <Decision id={change.id} decision="approve" label="Approve change" primary />
                    <Decision id={change.id} decision="rejected" label="Reject" />
                    <Decision id={change.id} decision="investigating" label="Investigate" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-heading">Record a change</h2>
        <form action={submitChange} className="panel stack">
          <div className="grid-2">
            <div>
              <label className="field-label" htmlFor="challenge_id">
                Challenge
              </label>
              <select id="challenge_id" name="challenge_id" required defaultValue="">
                <option value="" disabled>
                  Select a challenge
                </option>
                {challenges.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {challenge.firm.name} — {challenge.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="field">
                Field
              </label>
              <select id="field" name="field" required defaultValue="">
                <option value="" disabled>
                  Select a field
                </option>
                {EDITABLE_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="old_value">
                Current value
              </label>
              <input id="old_value" name="old_value" className="input" />
            </div>
            <div>
              <label className="field-label" htmlFor="new_value">
                New value
              </label>
              <input id="new_value" name="new_value" className="input" />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="notes">
              Source / notes
            </label>
            <textarea id="notes" name="notes" placeholder="Where did you see this? Link the firm's own page." />
          </div>
          <button type="submit" className="btn btn-primary" style={{ justifySelf: "start" }}>
            Submit for approval
          </button>
        </form>
      </section>

      <section>
        <h2 className="section-heading">Approved history</h2>
        {approved.length === 0 ? (
          <p className="small muted">No approved changes yet.</p>
        ) : (
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Challenge</th>
                  <th>Field</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((change) => {
                  const challenge = byId.get(change.challenge_id);
                  return (
                    <tr key={change.id}>
                      <td className="small mono">
                        {new Date(change.changed_at).toLocaleDateString("en-US")}
                      </td>
                      <td className="small">
                        {challenge ? `${challenge.firm.name} — ${challenge.name}` : "—"}
                      </td>
                      <td className="small mono">{change.field}</td>
                      <td className="small mono">
                        {change.old_value ?? "—"} → {change.new_value ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Decision({
  id,
  decision,
  label,
  primary,
}: {
  id: string;
  decision: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={resolveChange}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <button type="submit" className={`btn btn-sm ${primary ? "btn-primary" : ""}`}>
        {label}
      </button>
    </form>
  );
}
