import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { LANDING_PAGES } from "@/lib/landing";
import { listArticles } from "@/lib/repo";

export const metadata = {
  title: "Learn",
  description:
    "Guides to the prop firm rules that actually decide whether you can trade your strategy — drawdown types, consistency rules, news windows and payout terms.",
};

export const dynamic = "force-dynamic";

export default function LearnPage() {
  const articles = listArticles("learn");

  return (
    <div className="shell section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Learn</span>
        <h1>Learn</h1>
        <p className="lede">
          The rules that decide whether a challenge suits you, explained without the sales pitch.
        </p>
      </header>

      <section>
        <h2 className="section-heading">Challenges by trading style and rule</h2>
        <div className="grid-3">
          {LANDING_PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              className="panel"
              style={{ display: "grid", gap: "0.4rem", alignContent: "start" }}
            >
              <h3 style={{ fontSize: "1rem" }}>{page.title}</h3>
              <p className="small muted">{page.metaDescription}</p>
              <span className="small" style={{ color: "var(--accent)" }}>
                Read →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/*
        The heading only appears once there is something under it. An
        "Articles" section whose content is a note explaining that there are no
        articles is worse than no section — it draws the eye to the gap.
      */}
      {articles.length > 0 ? (
        <section style={{ marginTop: "3rem" }}>
          <h2 className="section-heading">Articles</h2>
          <div className="grid-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/learn/${article.slug}`}
                className="panel"
                style={{ display: "grid", gap: "0.4rem", alignContent: "start" }}
              >
                <h3 style={{ fontSize: "1rem" }}>{article.title}</h3>
                {article.summary ? <p className="small muted">{article.summary}</p> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Rule changes lead here: the guides on this page go stale the moment a
          firm moves a drawdown, and this is how a reader hears about it. */}
      <section className="panel" style={{ marginTop: "3rem" }}>
        <NewsletterSignup
          source="learn"
          defaultTopics={["rule_changes", "psychology"]}
          heading="Rules change after you have read the guide"
          blurb="Firms move drawdowns from end-of-day to intraday, change profit splits and rewrite payout terms — usually without an announcement. When one does, we send what changed and what it means for the kind of trader it hits."
        />
      </section>

      <section style={{ marginTop: "3rem" }}>
        <div className="panel panel-accent spread">
          <div>
            <strong>Want a recommendation based on YOUR trading style?</strong>
            <p className="small muted">About a dozen questions, no account needed.</p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-primary">
            Find My Challenge
          </Link>
        </div>
      </section>
    </div>
  );
}
