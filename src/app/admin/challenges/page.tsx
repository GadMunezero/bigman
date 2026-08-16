import Link from "next/link";
import { listChallengeRecords, listFirms } from "@/lib/repo";
import { CONFIDENCE_LEVELS, RULE_STATUSES } from "@/lib/types";
import { deleteChallenge, saveChallenge } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const RULE_FIELDS = [
  ["news_trading", "News trading"],
  ["overnight", "Overnight"],
  ["weekend", "Weekend"],
  ["ea_allowed", "EA / automation"],
  ["copy_trading", "Copy trading"],
  ["scalping", "Scalping"],
  ["hedging", "Hedging"],
] as const;

const CONFIDENCE_FIELDS = [
  ["price", "Price"],
  ["account_size", "Account size"],
  ["max_drawdown_pct", "Max drawdown"],
  ["profit_target_pct", "Profit target"],
  ["payout_frequency_days", "Payout frequency"],
] as const;

export default async function AdminChallengesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;

  const firms = listFirms({ includeUnpublished: true });
  const challenges = listChallengeRecords({ includeUnpublished: true });
  const editing = editId ? challenges.find((c) => c.id === editId) : null;

  if (firms.length === 0) {
    return (
      <div className="panel panel-warn">
        <h2 style={{ fontSize: "1.15rem" }}>Add a firm first.</h2>
        <p className="small" style={{ marginTop: "0.5rem" }}>
          A challenge belongs to a firm, so there is nothing to attach one to yet.
        </p>
        <Link href="/admin/firms" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Add a firm
        </Link>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <section>
        <h2 className="section-heading">
          {editing ? `Edit ${editing.firm.name} — ${editing.name}` : "Add a challenge"}
        </h2>

        <form action={saveChallenge} className="panel stack">
          <input type="hidden" name="id" value={editing?.id ?? ""} />

          <div className="grid-2">
            <div>
              <label className="field-label" htmlFor="firm_id">
                Firm
              </label>
              <select id="firm_id" name="firm_id" defaultValue={editing?.firm_id ?? ""} required>
                <option value="" disabled>
                  Select a firm
                </option>
                {firms.map((firm) => (
                  <option key={firm.id} value={firm.id}>
                    {firm.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="name">
                Challenge name
              </label>
              <input
                id="name"
                name="name"
                className="input"
                defaultValue={editing?.name ?? ""}
                placeholder="e.g. $100K Evaluation"
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="slug">
                Slug
              </label>
              <input id="slug" name="slug" className="input" defaultValue={editing?.slug ?? ""} />
            </div>
            <div>
              <label className="field-label" htmlFor="markets">
                Markets (comma separated: futures, forex, cfd, crypto)
              </label>
              <input
                id="markets"
                name="markets"
                className="input"
                defaultValue={editing?.markets.join(", ") ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="account_size">
                Account size
              </label>
              <input
                id="account_size"
                name="account_size"
                type="number"
                className="input"
                defaultValue={editing?.account_size ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="price">
                Price (leave blank if unconfirmed)
              </label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                className="input"
                defaultValue={editing?.price ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="currency">
                Currency
              </label>
              <input
                id="currency"
                name="currency"
                className="input"
                defaultValue={editing?.currency ?? "USD"}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="billing_type">
                Billing
              </label>
              <select id="billing_type" name="billing_type" defaultValue={editing?.billing_type ?? ""}>
                <option value="">Not confirmed</option>
                <option value="one_time">One-time</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="profit_target_pct">
                Profit target %
              </label>
              <input
                id="profit_target_pct"
                name="profit_target_pct"
                type="number"
                step="0.1"
                className="input"
                defaultValue={editing?.profit_target_pct ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="max_drawdown_pct">
                Max drawdown %
              </label>
              <input
                id="max_drawdown_pct"
                name="max_drawdown_pct"
                type="number"
                step="0.1"
                className="input"
                defaultValue={editing?.max_drawdown_pct ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="daily_drawdown_pct">
                Daily loss % (blank = no daily rule)
              </label>
              <input
                id="daily_drawdown_pct"
                name="daily_drawdown_pct"
                type="number"
                step="0.1"
                className="input"
                defaultValue={editing?.daily_drawdown_pct ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="drawdown_type">
                Drawdown type
              </label>
              <select id="drawdown_type" name="drawdown_type" defaultValue={editing?.drawdown_type ?? ""}>
                <option value="">Not confirmed</option>
                <option value="static">Static</option>
                <option value="trailing">Trailing</option>
                <option value="eod_trailing">End-of-day trailing</option>
                <option value="intraday_trailing">Intraday trailing</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="minimum_days">
                Minimum trading days
              </label>
              <input
                id="minimum_days"
                name="minimum_days"
                type="number"
                className="input"
                defaultValue={editing?.minimum_days ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="maximum_days">
                Maximum trading days (blank = unlimited)
              </label>
              <input
                id="maximum_days"
                name="maximum_days"
                type="number"
                className="input"
                defaultValue={editing?.maximum_days ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="payout_frequency_days">
                Payout frequency (days)
              </label>
              <input
                id="payout_frequency_days"
                name="payout_frequency_days"
                type="number"
                className="input"
                defaultValue={editing?.payout_frequency_days ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="payout_split_pct">
                Profit split %
              </label>
              <input
                id="payout_split_pct"
                name="payout_split_pct"
                type="number"
                step="1"
                className="input"
                defaultValue={editing?.payout_split_pct ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="platforms">
                Platforms (comma separated)
              </label>
              <input
                id="platforms"
                name="platforms"
                className="input"
                defaultValue={editing?.platforms.join(", ") ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="leverage">
                Leverage
              </label>
              <input
                id="leverage"
                name="leverage"
                className="input"
                placeholder="e.g. 1:30"
                defaultValue={editing?.leverage ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="refund_policy">
                Refund policy
              </label>
              <input
                id="refund_policy"
                name="refund_policy"
                className="input"
                placeholder="e.g. Fee refunded with first payout"
                defaultValue={editing?.refund_policy ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="country_restrictions">
                Country restrictions
              </label>
              <input
                id="country_restrictions"
                name="country_restrictions"
                className="input"
                placeholder="Countries not accepted"
                defaultValue={editing?.country_restrictions ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="phases">
                Phases (0 = instant funding)
              </label>
              <input
                id="phases"
                name="phases"
                type="number"
                className="input"
                defaultValue={editing?.phases ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="last_verified_at">
                Last verified (ISO date)
              </label>
              <input
                id="last_verified_at"
                name="last_verified_at"
                className="input"
                placeholder="2026-08-16"
                defaultValue={editing?.last_verified_at ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="status">
                Status
              </label>
              <select id="status" name="status" defaultValue={editing?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="payout_conditions">
              Payout conditions
            </label>
            <textarea
              id="payout_conditions"
              name="payout_conditions"
              defaultValue={editing?.payout_conditions ?? ""}
            />
          </div>

          <fieldset style={{ border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "1rem" }}>
            <legend className="field-label">Trading rules</legend>
            <p className="small muted" style={{ marginBottom: "0.75rem" }}>
              Leave a rule as &quot;not confirmed&quot; if you have not verified it. Unconfirmed
              never reads as allowed — it costs the challenge confidence points and shows the trader
              a warning.
            </p>
            <div className="grid-4">
              {RULE_FIELDS.map(([field, label]) => (
                <div key={field}>
                  <label className="field-label" htmlFor={field}>
                    {label}
                  </label>
                  <select
                    id={field}
                    name={field}
                    defaultValue={editing?.rules[field] ?? "unknown"}
                  >
                    {RULE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status === "unknown" ? "not confirmed" : status}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="field-label" htmlFor="consistency_rule">
                  Consistency rule
                </label>
                <select
                  id="consistency_rule"
                  name="consistency_rule"
                  defaultValue={editing?.rules.consistency_rule ?? "unknown"}
                >
                  <option value="unknown">not confirmed</option>
                  <option value="required">required</option>
                  <option value="not_required">not required</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="consistency_pct">
                  Consistency %
                </label>
                <input
                  id="consistency_pct"
                  name="consistency_pct"
                  type="number"
                  className="input"
                  defaultValue={editing?.rules.consistency_pct ?? ""}
                />
              </div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <label className="field-label" htmlFor="rule_notes">
                Rule notes
              </label>
              <textarea id="rule_notes" name="rule_notes" defaultValue={editing?.rules.notes ?? ""} />
            </div>
          </fieldset>

          <fieldset style={{ border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "1rem" }}>
            <legend className="field-label">Data confidence</legend>
            <p className="small muted" style={{ marginBottom: "0.75rem" }}>
              Where each figure came from. This is scored — a well-verified challenge earns more
              than one assembled from unconfirmed reports.
            </p>
            <div className="grid-3">
              {CONFIDENCE_FIELDS.map(([field, label]) => (
                <div key={field}>
                  <label className="field-label" htmlFor={`confidence_${field}`}>
                    {label}
                  </label>
                  <select
                    id={`confidence_${field}`}
                    name={`confidence_${field}`}
                    defaultValue={editing?.confidence[field] ?? "unknown"}
                  >
                    {CONFIDENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="row">
            <button type="submit" className="btn btn-primary">
              {editing ? "Save challenge" : "Create challenge"}
            </button>
            {editing ? (
              <Link href="/admin/challenges" className="btn btn-ghost">
                Cancel
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section>
        <h2 className="section-heading">Challenges ({challenges.length})</h2>
        {challenges.length === 0 ? (
          <p className="small muted">
            No challenges yet. Nothing is seeded — every figure here should come from the
            firm&apos;s own documentation.
          </p>
        ) : (
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Firm</th>
                  <th>Challenge</th>
                  <th>Size</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {challenges.map((challenge) => (
                  <tr key={challenge.id}>
                    <td>{challenge.firm.name}</td>
                    <td>{challenge.name}</td>
                    <td className="mono small">
                      {challenge.account_size
                        ? `$${(challenge.account_size / 1000).toLocaleString()}K`
                        : "—"}
                    </td>
                    <td className="mono small">
                      {challenge.price === null ? "—" : `$${challenge.price}`}
                    </td>
                    <td>
                      <span
                        className={`pill ${challenge.status === "published" ? "pill-accent" : ""}`}
                      >
                        {challenge.status}
                      </span>
                    </td>
                    <td className="mono small">
                      {challenge.last_verified_at
                        ? new Date(challenge.last_verified_at).toLocaleDateString("en-US")
                        : "—"}
                    </td>
                    <td>
                      <div className="row" style={{ gap: "0.35rem", flexWrap: "nowrap" }}>
                        <Link href={`/admin/challenges?edit=${challenge.id}`} className="btn btn-sm">
                          Edit
                        </Link>
                        <form action={deleteChallenge}>
                          <input type="hidden" name="id" value={challenge.id} />
                          <button type="submit" className="btn btn-sm btn-ghost">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
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
