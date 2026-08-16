import Link from "next/link";
import { ChallengeCard } from "@/components/ui";
import { getChallengeRecommendations } from "@/lib/engine";
import { listAccountSizes, listChallengeRecords, listPlatforms } from "@/lib/repo";
import { getCurrentProfile } from "@/lib/session";
import type { ChallengeRecord } from "@/lib/types";

export const metadata = {
  title: "Explore prop firm challenges",
  description:
    "Browse and filter prop firm challenges by market, account size, price, drawdown and the rules that decide whether you can trade your strategy.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const RULE_FILTERS = [
  { key: "news", label: "News trading", field: "news_trading" },
  { key: "overnight", label: "Overnight", field: "overnight" },
  { key: "weekend", label: "Weekend", field: "weekend" },
  // The word "allowed" is appended by the label renderer, so it must not be
  // baked into the label here — that produced "EA allowed allowed".
  { key: "ea", label: "EAs", field: "ea_allowed" },
] as const;

export default async function ChallengesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const query = first(params.q).toLowerCase().trim();
  const market = first(params.market);
  const size = first(params.size);
  const maxPrice = Number(first(params.max_price)) || null;
  const platform = first(params.platform);
  const sort = first(params.sort) || (profile ? "match" : "price");

  const all = listChallengeRecords();

  // Personalised scores make the directory personal too — the same engine, the
  // same numbers a trader saw on their results page.
  const scores = new Map<string, number>();
  if (profile) {
    const result = getChallengeRecommendations(profile, all);
    for (const rec of result.recommendations) scores.set(rec.challenge.id, rec.match_score);
  }

  const filtered = all.filter((challenge) => {
    if (query) {
      const haystack =
        `${challenge.name} ${challenge.firm.name} ${challenge.account_size ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (market && !challenge.markets.includes(market as never)) return false;
    if (size && String(challenge.account_size) !== size) return false;
    if (maxPrice !== null && (challenge.price === null || challenge.price > maxPrice)) return false;
    if (platform && !challenge.platforms.some((p) => p === platform)) return false;

    for (const filter of RULE_FILTERS) {
      if (first(params[filter.key]) === "allowed" && challenge.rules[filter.field] !== "allowed") {
        return false;
      }
    }
    if (first(params.no_consistency) === "1" && challenge.rules.consistency_rule !== "not_required") {
      return false;
    }
    return true;
  });

  const sorted = sortChallenges(filtered, sort, scores);
  const accountSizes = listAccountSizes();
  const platforms = listPlatforms();

  return (
    <div className="shell section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Directory</span>
        <h1>Explore prop firm challenges</h1>
        <p className="lede">
          The full catalogue, filterable. If you&apos;d rather have it narrowed down for you,{" "}
          <Link href="/find-my-challenge" style={{ color: "var(--accent)" }}>
            answer a few questions instead
          </Link>
          .
        </p>
      </header>

      {!profile ? (
        <div className="panel panel-accent spread" style={{ marginBottom: "2rem" }}>
          <div>
            <strong>See how each of these fits you.</strong>
            <p className="small muted">
              Take the questionnaire once and every card here shows your personal match score.
            </p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-primary">
            Find My Challenge
          </Link>
        </div>
      ) : null}

      <form method="get" className="panel" style={{ marginBottom: "2rem" }}>
        <div className="grid-4" style={{ gap: "0.9rem" }}>
          <div>
            <label className="field-label" htmlFor="q">
              Search challenges
            </label>
            <input id="q" name="q" className="input" defaultValue={query} placeholder="100k, firm name…" />
          </div>

          <div>
            <label className="field-label" htmlFor="market">
              Market
            </label>
            <select id="market" name="market" defaultValue={market}>
              <option value="">Any</option>
              <option value="futures">Futures</option>
              <option value="forex">Forex</option>
              <option value="cfd">CFDs</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="size">
              Account size
            </label>
            <select id="size" name="size" defaultValue={size}>
              <option value="">Any</option>
              {accountSizes.map((accountSize) => (
                <option key={accountSize} value={accountSize}>
                  ${(accountSize / 1000).toLocaleString("en-US")}K
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="max_price">
              Max price
            </label>
            <input
              id="max_price"
              name="max_price"
              type="number"
              min="0"
              step="1"
              className="input"
              defaultValue={maxPrice ?? ""}
              placeholder="Any"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="platform">
              Platform
            </label>
            <select id="platform" name="platform" defaultValue={platform}>
              <option value="">Any</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="sort">
              Sort by
            </label>
            <select id="sort" name="sort" defaultValue={sort}>
              {profile ? <option value="match">Your match score</option> : null}
              <option value="price">Price, low to high</option>
              <option value="drawdown">Drawdown, high to low</option>
              <option value="size">Account size, high to low</option>
            </select>
          </div>
        </div>

        <fieldset style={{ border: 0, marginTop: "1rem" }}>
          <legend className="field-label">Rules</legend>
          <div className="row">
            {RULE_FILTERS.map((filter) => (
              <label key={filter.key} className="row" style={{ gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  name={filter.key}
                  value="allowed"
                  defaultChecked={first(params[filter.key]) === "allowed"}
                  style={{ width: 16, height: 16, minHeight: "auto" }}
                />
                <span className="small">{filter.label} allowed</span>
              </label>
            ))}
            <label className="row" style={{ gap: "0.4rem" }}>
              <input
                type="checkbox"
                name="no_consistency"
                value="1"
                defaultChecked={first(params.no_consistency) === "1"}
                style={{ width: 16, height: 16, minHeight: "auto" }}
              />
              <span className="small">No consistency rule</span>
            </label>
          </div>
        </fieldset>

        <div className="row" style={{ marginTop: "1.25rem" }}>
          <button type="submit" className="btn btn-primary">
            Apply filters
          </button>
          <Link href="/challenges" className="btn btn-ghost">
            Reset
          </Link>
        </div>
      </form>

      <div className="spread" style={{ marginBottom: "1.25rem" }}>
        <p className="small muted">
          {sorted.length} of {all.length} challenges
        </p>
        <Link href="/compare" className="small" style={{ color: "var(--accent)" }}>
          Compare challenges →
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="panel panel-warn">
          <h3>No challenges match these filters.</h3>
          <p className="small" style={{ marginTop: "0.5rem" }}>
            {all.length === 0
              ? "This installation has no published challenge data yet. Nothing is shown here rather than filling the page with placeholder firms."
              : "Try removing a filter — the rule filters are the most restrictive."}
          </p>
        </div>
      ) : (
        <div className="grid-auto">
          {sorted.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              score={scores.get(challenge.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function sortChallenges(
  challenges: ChallengeRecord[],
  sort: string,
  scores: Map<string, number>,
): ChallengeRecord[] {
  const copy = [...challenges];
  const last = Number.POSITIVE_INFINITY;

  switch (sort) {
    case "match":
      return copy.sort((a, b) => (scores.get(b.id) ?? -1) - (scores.get(a.id) ?? -1));
    case "drawdown":
      return copy.sort((a, b) => (b.max_drawdown_pct ?? -1) - (a.max_drawdown_pct ?? -1));
    case "size":
      return copy.sort((a, b) => (b.account_size ?? -1) - (a.account_size ?? -1));
    default:
      return copy.sort((a, b) => (a.price ?? last) - (b.price ?? last));
  }
}
