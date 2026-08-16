import { CHALLENGE_COLUMNS, csvTemplate, planImport } from "@/lib/import";
import { runImport } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Bulk import.
 *
 * Dry run is not optional — the CSV is planned and reported before anything can
 * be applied, because the failure mode of a bad import is publishing figures
 * nobody checked.
 */
export default async function AdminImportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const csv = typeof params.csv === "string" ? params.csv : "";
  const applied = params.applied === "1";
  const plan = csv.trim() ? planImport(csv) : null;

  return (
    <div className="stack-lg">
      <section>
        <h2 className="section-heading">Bulk import challenges</h2>
        <p className="lede">
          One row per challenge. Research in a spreadsheet, paste the CSV here, read the plan, then
          apply.
        </p>
      </section>

      {applied ? (
        <div className="panel panel-accent">
          <strong>Import applied.</strong>
          <p className="small" style={{ marginTop: "0.4rem" }}>
            New firms and challenges are <strong>draft</strong> unless the row said published.
            Existing challenges were not overwritten — any differences are waiting for you at{" "}
            <a href="/admin/rules" style={{ textDecoration: "underline" }}>
              rule changes
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="panel panel-quiet">
        <strong>Three rules this importer enforces</strong>
        <ul className="stack-sm small" style={{ marginTop: "0.6rem", paddingLeft: "1.1rem" }}>
          <li style={{ color: "var(--ink-2)" }}>
            A blank cell means <em>not confirmed</em>. It is never read as zero, and it never
            overwrites a value already stored.
          </li>
          <li style={{ color: "var(--ink-2)" }}>
            Re-importing an existing challenge does not overwrite it. Each differing field becomes a
            pending change for you to approve, so the dated history stays true.
          </li>
          <li style={{ color: "var(--ink-2)" }}>
            Nothing imports as <span className="mono">verified</span> without a source URL. The
            default is <span className="mono">needs_review</span>, because a spreadsheet cell is not
            verification.
          </li>
        </ul>
      </div>

      <section>
        <h2 className="section-heading">Columns</h2>
        <div className="panel">
          <p className="small muted" style={{ marginBottom: "0.75rem" }}>
            Only <span className="mono">firm_name</span> and{" "}
            <span className="mono">challenge_name</span> are required. Everything else can be blank
            and will render as &quot;not confirmed&quot;.
          </p>
          <div className="row" style={{ gap: "0.35rem" }}>
            {CHALLENGE_COLUMNS.map((column) => (
              <span key={column} className="pill mono">
                {column}
              </span>
            ))}
          </div>
          <details style={{ marginTop: "1rem" }}>
            <summary className="btn btn-sm" style={{ display: "inline-flex" }}>
              Show the template row
            </summary>
            <pre
              className="small mono"
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                overflowX: "auto",
                background: "var(--bg-2)",
                borderRadius: "var(--r)",
                whiteSpace: "pre",
              }}
            >
              {csvTemplate()}
            </pre>
          </details>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Paste your CSV</h2>
        <form method="get" className="panel stack">
          <textarea
            name="csv"
            defaultValue={csv}
            style={{ minHeight: "220px", fontFamily: "var(--font-mono)", fontSize: "12.5px" }}
            placeholder="firm_name,firm_website,challenge_name,..."
          />
          <div className="row">
            <button type="submit" className="btn btn-primary">
              Check it (dry run)
            </button>
            <a href="/admin/import" className="btn btn-ghost">
              Clear
            </a>
          </div>
        </form>
      </section>

      {plan ? (
        <section>
          <h2 className="section-heading">Plan</h2>

          {plan.errors.length > 0 ? (
            <div className="panel panel-danger">
              <strong>
                {plan.errors.length} error{plan.errors.length === 1 ? "" : "s"} — nothing can be
                imported until these are fixed
              </strong>
              <div className="table-scroll" style={{ marginTop: "0.75rem" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Column</th>
                      <th>Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.errors.slice(0, 50).map((issue, i) => (
                      <tr key={`${issue.row}-${issue.column}-${i}`}>
                        <td className="mono small">{issue.row}</td>
                        <td className="mono small">{issue.column}</td>
                        <td className="small">{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div className="grid-4">
                <div className="panel">
                  <div className="stat-label">Rows parsed</div>
                  <div className="stat-value">{plan.rows.length}</div>
                </div>
                <div className="panel">
                  <div className="stat-label">New firms</div>
                  <div className="stat-value">{plan.newFirms.length}</div>
                </div>
                <div className="panel">
                  <div className="stat-label">New challenges</div>
                  <div className="stat-value">{plan.newChallenges.length}</div>
                </div>
                <div className="panel">
                  <div className="stat-label">Pending changes</div>
                  <div className="stat-value">{plan.changedChallenges.length}</div>
                </div>
              </div>

              {plan.warnings.length > 0 ? (
                <div className="panel panel-warn" style={{ marginTop: "1rem" }}>
                  <strong>
                    {plan.warnings.length} warning{plan.warnings.length === 1 ? "" : "s"} — these
                    will import, but check them
                  </strong>
                  <ul className="stack-sm small" style={{ marginTop: "0.6rem", paddingLeft: "1.1rem" }}>
                    {plan.warnings.slice(0, 20).map((issue, i) => (
                      <li key={`${issue.row}-${issue.column}-${i}`} style={{ color: "var(--ink-2)" }}>
                        row {issue.row}, {issue.column}: {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {plan.newChallenges.length > 0 ? (
                <div className="panel" style={{ marginTop: "1rem" }}>
                  <div className="stat-label">Will be created</div>
                  <ul className="stack-sm small" style={{ marginTop: "0.6rem", paddingLeft: "1.1rem" }}>
                    {plan.newChallenges.map((name) => (
                      <li key={name} style={{ color: "var(--ink-2)" }}>
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {plan.changedChallenges.length > 0 ? (
                <div className="panel" style={{ marginTop: "1rem" }}>
                  <div className="stat-label">Already exist — these become pending changes</div>
                  {plan.changedChallenges.map((changed) => (
                    <div key={changed.slug} style={{ marginTop: "0.75rem" }}>
                      <strong className="small">{changed.name}</strong>
                      <ul className="stack-sm small mono" style={{ marginTop: "0.3rem", paddingLeft: "1.1rem" }}>
                        {changed.changes.map((change) => (
                          <li key={change} style={{ color: "var(--muted)" }}>
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}

              <form action={runImport} style={{ marginTop: "1.5rem" }}>
                <input type="hidden" name="csv" value={csv} />
                <button type="submit" className="btn btn-primary btn-lg">
                  Apply this import
                </button>
              </form>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
