import Link from "next/link";
import { adminOverview } from "@/lib/repo";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default function AdminHome() {
  const stats = adminOverview();

  const cards = [
    { label: "Challenges", value: stats.challenges, sub: `${stats.publishedChallenges} published`, href: "/admin/challenges" },
    { label: "Firms", value: stats.firms, href: "/admin/firms" },
    { label: "Pending reviews", value: stats.pendingReviews, href: "/admin/reviews" },
    { label: "Pending data changes", value: stats.pendingChanges, href: "/admin/rules" },
    { label: "Affiliate clicks", value: stats.affiliateClicks, href: "/admin/analytics" },
    { label: "Quiz starts", value: stats.quizStarts, href: "/admin/analytics" },
    { label: "Quiz completions", value: stats.quizCompletions, href: "/admin/analytics" },
    { label: "Results viewed", value: stats.resultsViewed, href: "/admin/analytics" },
  ];

  const completionRate =
    stats.quizStarts > 0 ? Math.round((stats.quizCompletions / stats.quizStarts) * 100) : null;

  return (
    <div className="stack-lg">
      <section>
        <h2 className="section-heading">Platform overview</h2>
        <div className="grid-4">
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className="panel">
              <div className="stat-label">{card.label}</div>
              <div className="stat-value">{card.value}</div>
              {card.sub ? (
                <p className="small muted" style={{ marginTop: "0.4rem" }}>
                  {card.sub}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-heading">The metric that matters</h2>
        <div className="panel panel-accent">
          <div className="stat-label">Quiz completion rate</div>
          <div className="stat-value" style={{ fontSize: "3rem" }}>
            {completionRate === null ? "—" : `${completionRate}%`}
          </div>
          <p className="small muted" style={{ marginTop: "0.75rem" }}>
            The MVP succeeds if a new trader can arrive and get a useful personalised recommendation
            in about a minute. Quiz completion → recommendation → challenge click is the funnel that
            measures that; everything else is secondary.
          </p>
        </div>
      </section>

      {stats.pendingReviews > 0 || stats.pendingChanges > 0 ? (
        <section>
          <h2 className="section-heading">Needs your attention</h2>
          <div className="stack-sm">
            {stats.pendingReviews > 0 ? (
              <Link href="/admin/reviews" className="panel panel-warn spread">
                <span>
                  {stats.pendingReviews} review{stats.pendingReviews === 1 ? "" : "s"} awaiting
                  moderation
                </span>
                <span className="pill">Moderate →</span>
              </Link>
            ) : null}
            {stats.pendingChanges > 0 ? (
              <Link href="/admin/rules" className="panel panel-warn spread">
                <span>
                  {stats.pendingChanges} data change{stats.pendingChanges === 1 ? "" : "s"} awaiting
                  approval
                </span>
                <span className="pill">Review →</span>
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <form action={logout}>
        <button type="submit" className="btn btn-ghost">
          Sign out
        </button>
      </form>
    </div>
  );
}
