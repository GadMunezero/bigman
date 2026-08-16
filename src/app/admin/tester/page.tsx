import { getChallengeRecommendations } from "@/lib/engine";
import { listAccountSizes, listChallengeRecords, listPlatforms } from "@/lib/repo";
import {
  BUDGETS,
  HOLDING_PERIODS,
  MARKETS,
  NEWS_FREQUENCIES,
  PRIORITIES,
  PRIORITY_LABELS,
  TRADING_STYLES,
  TRI_STATE,
  type TraderProfile,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Recommendation tester.
 *
 * Lets an operator build a hypothetical trader and see exactly what the engine
 * does with them — what ranks, what gets eliminated and why. This is how you
 * keep the algorithm honest as the catalogue grows, without waiting for a real
 * trader to hit a bad result.
 */
export default async function TesterPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hasRun = Object.keys(params).length > 0;

  const catalogue = listChallengeRecords();
  const accountSizes = listAccountSizes();
  const platforms = listPlatforms();

  const profile: Partial<TraderProfile> = {
    market: (first(params.market) || null) as TraderProfile["market"],
    trading_style: (first(params.trading_style) || null) as TraderProfile["trading_style"],
    holding_period: (first(params.holding_period) || null) as TraderProfile["holding_period"],
    news_trading: (first(params.news_trading) || null) as TraderProfile["news_trading"],
    overnight_required: (first(params.overnight_required) || null) as TraderProfile["overnight_required"],
    budget: (first(params.budget) || null) as TraderProfile["budget"],
    desired_account_size: first(params.desired_account_size) || null,
    priorities: all(params.priorities) as TraderProfile["priorities"],
    platform: first(params.platform) || null,
    ea_required: first(params.ea_required) === "1" ? true : null,
    weekend_required: first(params.weekend_required) === "1" ? true : null,
  };

  const result = hasRun ? getChallengeRecommendations(profile, catalogue) : null;

  return (
    <div className="stack-lg">
      <section>
        <h2 className="section-heading">Build a hypothetical trader</h2>
        <form method="get" className="panel stack">
          <div className="grid-4">
            <div>
              <label className="field-label" htmlFor="market">
                Market
              </label>
              <select id="market" name="market" defaultValue={first(params.market)}>
                <option value="">Any</option>
                {[...MARKETS, "multiple"].map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="trading_style">
                Trading style
              </label>
              <select id="trading_style" name="trading_style" defaultValue={first(params.trading_style)}>
                <option value="">Any</option>
                {TRADING_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="holding_period">
                Holding period
              </label>
              <select id="holding_period" name="holding_period" defaultValue={first(params.holding_period)}>
                <option value="">Any</option>
                {HOLDING_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {period.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="news_trading">
                News trading
              </label>
              <select id="news_trading" name="news_trading" defaultValue={first(params.news_trading)}>
                <option value="">Any</option>
                {NEWS_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="overnight_required">
                Overnight required
              </label>
              <select
                id="overnight_required"
                name="overnight_required"
                defaultValue={first(params.overnight_required)}
              >
                <option value="">Any</option>
                {TRI_STATE.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="budget">
                Budget
              </label>
              <select id="budget" name="budget" defaultValue={first(params.budget)}>
                <option value="">Any</option>
                {BUDGETS.map((budget) => (
                  <option key={budget} value={budget}>
                    {budget.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="desired_account_size">
                Account size
              </label>
              <select
                id="desired_account_size"
                name="desired_account_size"
                defaultValue={first(params.desired_account_size)}
              >
                <option value="">No preference</option>
                {accountSizes.map((size) => (
                  <option key={size} value={size}>
                    ${(size / 1000).toLocaleString("en-US")}K
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="platform">
                Platform
              </label>
              <select id="platform" name="platform" defaultValue={first(params.platform)}>
                <option value="">No preference</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset style={{ border: 0 }}>
            <legend className="field-label">Priorities (choose up to 3)</legend>
            <div className="row">
              {PRIORITIES.map((priority) => (
                <label key={priority} className="row" style={{ gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    name="priorities"
                    value={priority}
                    defaultChecked={all(params.priorities).includes(priority)}
                    style={{ width: 16, height: 16, minHeight: "auto" }}
                  />
                  <span className="small">{PRIORITY_LABELS[priority]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="row">
            <label className="row" style={{ gap: "0.4rem" }}>
              <input
                type="checkbox"
                name="ea_required"
                value="1"
                defaultChecked={first(params.ea_required) === "1"}
                style={{ width: 16, height: 16, minHeight: "auto" }}
              />
              <span className="small">Requires automation</span>
            </label>
            <label className="row" style={{ gap: "0.4rem" }}>
              <input
                type="checkbox"
                name="weekend_required"
                value="1"
                defaultChecked={first(params.weekend_required) === "1"}
                style={{ width: 16, height: 16, minHeight: "auto" }}
              />
              <span className="small">Requires weekend holding</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ justifySelf: "start" }}>
            Run recommendation
          </button>
        </form>
      </section>

      {result ? (
        <>
          <section>
            <h2 className="section-heading">
              Ranked results ({result.recommendations.length} of {result.total_considered})
            </h2>

            {result.recommendations.length === 0 ? (
              <div className="panel panel-warn">
                <strong>No compatible challenges.</strong>
                <p className="small" style={{ marginTop: "0.5rem" }}>
                  A real trader would see the no-match screen here, with these blocking requirements:
                </p>
                <ul className="stack-sm small" style={{ marginTop: "0.75rem", paddingLeft: "1.1rem" }}>
                  {result.blocking_requirements.map((blocker) => (
                    <li key={blocker.requirement}>
                      {blocker.label} — removes {blocker.blocked} challenge
                      {blocker.blocked === 1 ? "" : "s"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="stack-sm">
                {result.recommendations.map((rec, i) => (
                  <details key={rec.challenge.id} className="panel">
                    <summary style={{ cursor: "pointer" }}>
                      <span className="mono" style={{ color: "var(--accent)" }}>
                        #{i + 1} {rec.match_score}%
                      </span>{" "}
                      — {rec.challenge.firm.name} {rec.challenge.name}{" "}
                      <span className="small muted">({rec.label})</span>
                    </summary>
                    <div className="grid-2" style={{ marginTop: "1rem" }}>
                      <div>
                        <div className="stat-label">Criteria</div>
                        <table style={{ marginTop: "0.5rem" }}>
                          <tbody>
                            {rec.score_breakdown.map((row) => (
                              <tr key={row.criterion}>
                                <td className="small">
                                  {row.criterion.replace(/_/g, " ")}
                                  {row.boosted ? " ★" : ""}
                                </td>
                                <td className="small mono">
                                  {row.earned.toFixed(1)} / {row.available.toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <div className="stat-label">Reasons</div>
                        <ul className="stack-sm small" style={{ marginTop: "0.5rem", paddingLeft: "1.1rem" }}>
                          {rec.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        <div className="stat-label" style={{ marginTop: "1rem" }}>
                          Warnings
                        </div>
                        <ul className="stack-sm small" style={{ marginTop: "0.5rem", paddingLeft: "1.1rem" }}>
                          {rec.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="section-heading">Eliminated ({result.eliminated.length})</h2>
            {result.eliminated.length === 0 ? (
              <p className="small muted">Nothing was eliminated by the hard filters.</p>
            ) : (
              <div className="panel table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Challenge</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.eliminated.map((rec) => (
                      <tr key={rec.challenge.id}>
                        <td className="small">
                          {rec.challenge.firm.name} — {rec.challenge.name}
                        </td>
                        <td className="small">
                          {rec.eliminations.map((e) => e.message).join(" ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <p className="small muted">
          Set some answers and run it. This is the fastest way to check that a change to the weights
          or the filters does what you expected.
        </p>
      )}
    </div>
  );
}
