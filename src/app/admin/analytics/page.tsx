import { getDb } from "@/lib/db";
import { eventCounts, listChallengeRecords } from "@/lib/repo";

export const dynamic = "force-dynamic";

const FUNNEL = [
  "homepage_view",
  "quiz_started",
  "quiz_completed",
  "results_viewed",
  "challenge_viewed",
  "compare_clicked",
  "saved",
];

export default function AdminAnalyticsPage() {
  const db = getDb();
  const counts = new Map(eventCounts().map((row) => [row.event, row.count]));

  const clicks = db
    .prepare(
      `SELECT challenge_id, COUNT(*) AS clicks, AVG(match_score) AS avg_score,
              AVG(position) AS avg_position
       FROM affiliate_clicks GROUP BY challenge_id ORDER BY clicks DESC LIMIT 25`,
    )
    .all() as {
    challenge_id: string | null;
    clicks: number;
    avg_score: number | null;
    avg_position: number | null;
  }[];

  const byPlacement = db
    .prepare(
      `SELECT placement, COUNT(*) AS clicks FROM affiliate_clicks
       GROUP BY placement ORDER BY clicks DESC`,
    )
    .all() as { placement: string | null; clicks: number }[];

  const totalClicks = clicks.reduce((sum, row) => sum + row.clicks, 0);
  const challenges = new Map(listChallengeRecords({ includeUnpublished: true }).map((c) => [c.id, c]));

  const started = counts.get("quiz_started") ?? 0;
  const completed = counts.get("quiz_completed") ?? 0;
  const viewed = counts.get("results_viewed") ?? 0;

  const rate = (numerator: number, denominator: number) =>
    denominator > 0 ? `${Math.round((numerator / denominator) * 100)}%` : "—";

  return (
    <div className="stack-lg">
      <section>
        <h2 className="section-heading">Primary funnel</h2>
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Count</th>
                <th>Conversion from previous</th>
              </tr>
            </thead>
            <tbody>
              {FUNNEL.map((event, i) => {
                const count = counts.get(event) ?? 0;
                const previous = i === 0 ? null : (counts.get(FUNNEL[i - 1]) ?? 0);
                return (
                  <tr key={event}>
                    <td className="mono small">{event}</td>
                    <td className="mono">{count}</td>
                    <td className="mono small muted">
                      {previous === null ? "—" : rate(count, previous)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="mono small">affiliate_clicked</td>
                <td className="mono">{totalClicks}</td>
                <td className="mono small muted">{rate(totalClicks, viewed)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Headline rates</h2>
        <div className="grid-3">
          <div className="panel">
            <div className="stat-label">Quiz completion</div>
            <div className="stat-value">{rate(completed, started)}</div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              {completed} of {started} started quizzes finished.
            </p>
          </div>
          <div className="panel">
            <div className="stat-label">Result → outbound click</div>
            <div className="stat-value">{rate(totalClicks, viewed)}</div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              The metric that says whether the recommendation was actually useful.
            </p>
          </div>
          <div className="panel">
            <div className="stat-label">Outbound clicks</div>
            <div className="stat-value">{totalClicks}</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Clicks by placement</h2>
        {byPlacement.length === 0 ? (
          <p className="small muted">No outbound clicks recorded yet.</p>
        ) : (
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Placement</th>
                  <th>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {byPlacement.map((row) => (
                  <tr key={row.placement ?? "unknown"}>
                    <td className="mono small">{row.placement ?? "unknown"}</td>
                    <td className="mono">{row.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-heading">Clicks by challenge</h2>
        {clicks.length === 0 ? (
          <p className="small muted">No outbound clicks recorded yet.</p>
        ) : (
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Challenge</th>
                  <th>Clicks</th>
                  <th>Avg match score shown</th>
                  <th>Avg position</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map((row) => {
                  const challenge = row.challenge_id ? challenges.get(row.challenge_id) : null;
                  return (
                    <tr key={row.challenge_id ?? "unknown"}>
                      <td className="small">
                        {challenge ? `${challenge.firm.name} — ${challenge.name}` : "Unknown"}
                      </td>
                      <td className="mono">{row.clicks}</td>
                      <td className="mono small">
                        {row.avg_score === null ? "—" : `${Math.round(row.avg_score)}%`}
                      </td>
                      <td className="mono small">
                        {row.avg_position === null ? "—" : row.avg_position.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted" style={{ marginTop: "0.75rem" }}>
          Match score and position are recorded at click time so you can see whether high-scoring
          recommendations actually convert. This data is reporting only — nothing here feeds back
          into ranking.
        </p>
      </section>
    </div>
  );
}
