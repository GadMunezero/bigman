import { APPROACH_LABELS } from "@/lib/engine";
import {
  calibrationSignals,
  MIN_SAMPLE_FOR_SIGNAL,
  outcomesByApproach,
  outcomesByChallenge,
  scoreCalibration,
} from "@/lib/outcomes";
import { listChallengeRecords } from "@/lib/repo";
import { FAILURE_REASON_LABELS, type FailureReason } from "@/lib/types";

export const dynamic = "force-dynamic";

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}

function fit(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} / 5`;
}

export default function AdminOutcomesPage() {
  const byChallenge = outcomesByChallenge();
  const byApproach = outcomesByApproach();
  const signals = calibrationSignals();
  const calibration = scoreCalibration();

  const challenges = new Map(
    listChallengeRecords({ includeUnpublished: true }).map((c) => [c.id, c]),
  );

  const totalReported = byChallenge.reduce((sum, c) => sum + c.summary.reported, 0);
  const totalClicks = byChallenge.reduce((sum, c) => sum + c.clicks, 0);

  return (
    <div className="stack-lg">
      <div className="panel panel-quiet">
        <strong>This is measurement, not a control loop.</strong>
        <p className="small muted" style={{ marginTop: "0.4rem" }}>
          Outcomes are self-reported by traders and are never read by the recommendation engine.
          They exist so a person can decide whether the weights need retuning. Anything below{" "}
          {MIN_SAMPLE_FOR_SIGNAL} reports is shown but explicitly marked as too small to act on.
        </p>
      </div>

      <section>
        <h2 className="section-heading">Coverage</h2>
        <div className="grid-3">
          <div className="panel">
            <div className="stat-label">Journeys started</div>
            <div className="stat-value">{totalClicks}</div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              Outbound clicks with a profile attached.
            </p>
          </div>
          <div className="panel">
            <div className="stat-label">Outcomes reported</div>
            <div className="stat-value">{totalReported}</div>
          </div>
          <div className="panel">
            <div className="stat-label">Report rate</div>
            <div className="stat-value">
              {totalClicks > 0 ? `${Math.round((totalReported / totalClicks) * 100)}%` : "—"}
            </div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              The number that decides whether any of this is usable.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Calibration signals</h2>
        {signals.length === 0 ? (
          <p className="small muted">
            No cohort has enough resolved outcomes to say anything yet. This fills in once traders
            start reporting passes and failures.
          </p>
        ) : (
          <div className="stack-sm">
            {signals.map((signal) => (
              <div
                key={signal.headline}
                className={`panel ${signal.actionable ? "panel-accent" : "panel-quiet"}`}
              >
                <div className="spread">
                  <strong>{signal.headline}</strong>
                  <span className={`pill ${signal.actionable ? "pill-accent" : "pill-warn"}`}>
                    {signal.actionable
                      ? `n=${signal.sample}`
                      : `n=${signal.sample} — too small to act on`}
                  </span>
                </div>
                <p className="small muted" style={{ marginTop: "0.5rem" }}>
                  {signal.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-heading">Does the score predict satisfaction?</h2>
        <div className="panel">
          <div className="grid-2">
            <div>
              <div className="stat-label">Shown at 80% or above</div>
              <div className="stat-value">{fit(calibration.highBand.averageFit)}</div>
              <p className="small muted" style={{ marginTop: "0.4rem" }}>
                {calibration.highBand.count} rated
              </p>
            </div>
            <div>
              <div className="stat-label">Shown below 80%</div>
              <div className="stat-value">{fit(calibration.lowBand.averageFit)}</div>
              <p className="small muted" style={{ marginTop: "0.4rem" }}>
                {calibration.lowBand.count} rated
              </p>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: "1rem" }}>
            {calibration.actionable
              ? "If these two numbers are close, the match score is not measuring anything a trader can feel — and the weighting needs work regardless of how principled it looks."
              : `Not enough rated outcomes in both bands yet (need ${MIN_SAMPLE_FOR_SIGNAL} in each). Until then this comparison means nothing.`}
          </p>
        </div>
      </section>

      <section>
        <h2 className="section-heading">By approach</h2>
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Approach</th>
                <th>Reported</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Avg fit</th>
                <th>Would choose again</th>
                <th>Top failure</th>
              </tr>
            </thead>
            <tbody>
              {byApproach.length === 0 ? (
                <tr>
                  <td colSpan={7} className="small muted">
                    No journeys recorded yet.
                  </td>
                </tr>
              ) : (
                byApproach.map((cohort) => (
                  <tr key={cohort.approach}>
                    <td className="small">
                      {cohort.approach === "unknown"
                        ? "Not stated"
                        : APPROACH_LABELS[cohort.approach]}
                    </td>
                    <td className="mono small">{cohort.summary.reported}</td>
                    <td className="mono small">{cohort.summary.passed}</td>
                    <td className="mono small">{cohort.summary.failed}</td>
                    <td className="mono small">{fit(cohort.summary.averageFit)}</td>
                    <td className="mono small">{pct(cohort.summary.wouldChooseAgainPct)}</td>
                    <td className="small">
                      {cohort.topFailure
                        ? `${FAILURE_REASON_LABELS[cohort.topFailure.reason as FailureReason]} (${cohort.topFailure.count})`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="section-heading">By challenge</h2>
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Challenge</th>
                <th>Clicks</th>
                <th>Reported</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Avg fit</th>
              </tr>
            </thead>
            <tbody>
              {byChallenge.length === 0 ? (
                <tr>
                  <td colSpan={6} className="small muted">
                    No journeys recorded yet.
                  </td>
                </tr>
              ) : (
                byChallenge.map((row) => {
                  const challenge = challenges.get(row.challenge_id);
                  return (
                    <tr key={row.challenge_id}>
                      <td className="small">
                        {challenge ? `${challenge.firm.name} — ${challenge.name}` : row.challenge_id}
                      </td>
                      <td className="mono small">{row.clicks}</td>
                      <td className="mono small">{row.summary.reported}</td>
                      <td className="mono small">{row.summary.passed}</td>
                      <td className="mono small">{row.summary.failed}</td>
                      <td className="mono small">{fit(row.summary.averageFit)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: "0.75rem" }}>
          Pass rates here are self-reported and heavily self-selected — traders who fail are less
          likely to come back and say so. Treat them as a signal about our matching, not as a
          published statistic about any firm.
        </p>
      </section>
    </div>
  );
}
