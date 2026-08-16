import Link from "next/link";
import { listArticles, listChallengeRecords, listFirms } from "@/lib/repo";

export const metadata = {
  title: "Search",
  description: "Search challenges, firms and articles.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Global search.
 *
 * Deliberately literal: a query like "100k" should surface $100K challenges,
 * and "overnight" should surface challenges whose overnight rule is recorded,
 * so the rule vocabulary is part of the searchable text.
 */
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const query = raw.trim().toLowerCase();

  const challenges = query
    ? listChallengeRecords().filter((challenge) => {
        const sizeK = challenge.account_size ? `${challenge.account_size / 1000}k` : "";
        const rules = Object.entries(challenge.rules)
          .filter(([, value]) => value === "allowed" || value === "prohibited" || value === "restricted")
          .map(([key, value]) => `${key} ${value}`)
          .join(" ");
        const haystack = [
          challenge.name,
          challenge.firm.name,
          challenge.markets.join(" "),
          challenge.platforms.join(" "),
          String(challenge.account_size ?? ""),
          sizeK,
          rules,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
    : [];

  const firms = query
    ? listFirms().filter((firm) => firm.name.toLowerCase().includes(query))
    : [];

  const articles = query
    ? listArticles().filter((article) =>
        `${article.title} ${article.summary ?? ""}`.toLowerCase().includes(query),
      )
    : [];

  const total = challenges.length + firms.length + articles.length;

  return (
    <div className="shell-narrow section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Search</span>
        <h1>Search</h1>
      </header>

      <form method="get" className="panel" style={{ marginBottom: "2rem" }}>
        <label className="field-label" htmlFor="q">
          Search challenges, firms and articles
        </label>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={raw}
            placeholder="100k, overnight, no consistency rule…"
            autoFocus
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </div>
      </form>

      {!query ? (
        <p className="small muted">
          Try an account size like &quot;100k&quot;, a rule like &quot;overnight&quot;, or a firm
          name.
        </p>
      ) : total === 0 ? (
        <div className="panel panel-quiet">
          <h3>No results for &quot;{raw}&quot;.</h3>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            If you are looking for a challenge that suits a specific way of trading, the
            questionnaire is a better tool than search.
          </p>
          <Link href="/find-my-challenge" className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
            Find My Challenge
          </Link>
        </div>
      ) : (
        <div className="stack-lg">
          {challenges.length > 0 ? (
            <section>
              <h2 className="section-heading">Challenges ({challenges.length})</h2>
              <div className="stack-sm">
                {challenges.map((challenge) => (
                  <Link key={challenge.id} href={`/challenges/${challenge.slug}`} className="panel">
                    <strong>{challenge.name}</strong>
                    <div className="small muted">{challenge.firm.name}</div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {firms.length > 0 ? (
            <section>
              <h2 className="section-heading">Firms ({firms.length})</h2>
              <div className="stack-sm">
                {firms.map((firm) => (
                  <Link key={firm.id} href={`/firms/${firm.slug}`} className="panel">
                    <strong>{firm.name}</strong>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {articles.length > 0 ? (
            <section>
              <h2 className="section-heading">Articles ({articles.length})</h2>
              <div className="stack-sm">
                {articles.map((article) => (
                  <Link key={article.id} href={`/learn/${article.slug}`} className="panel">
                    <strong>{article.title}</strong>
                    {article.summary ? <div className="small muted">{article.summary}</div> : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
