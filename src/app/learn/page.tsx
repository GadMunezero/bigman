import Link from "next/link";
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

      <section style={{ marginTop: "3rem" }}>
        <h2 className="section-heading">Articles</h2>
        {articles.length === 0 ? (
          <div className="panel panel-quiet">
            <p className="small muted">
              No articles have been published on this installation yet. Articles are created in the
              admin area — we don&apos;t ship placeholder content.
            </p>
          </div>
        ) : (
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
        )}
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
