import Link from "next/link";
import { TrackEvent } from "@/components/TrackEvent";
import { AccountSize, Figure, Money, RuleBadge } from "@/components/ui";
import { getChallengeRecommendations } from "@/lib/engine";
import { getChallengeRecordsByIds, listChallengeRecords } from "@/lib/repo";
import { getCurrentProfile } from "@/lib/session";
import type { ChallengeRecord, Recommendation } from "@/lib/types";
import styles from "./compare.module.css";

export const metadata = {
  title: "Compare prop firm challenges",
  description:
    "Put two to four challenges side by side on price, drawdown, targets, payout and the rules that decide whether you can trade your strategy.",
};

export const dynamic = "force-dynamic";

const MAX_COMPARE = 4;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Reads an id list that may arrive in either of two shapes.
 *
 * The links across the site build `?ids=a,b,c`. The multi-select on this page
 * is a plain HTML form, so the browser submits `?ids=a&ids=b&ids=c` instead —
 * and reading only the first of those meant choosing three challenges in the
 * picker compared one and answered "pick at least two". The form was the main
 * way anyone reached this page, so the feature was broken by its own control.
 */
function idList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw.flatMap((entry) => entry.split(",")).filter(Boolean);
}

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const catalogue = listChallengeRecords();

  // `ids` is the canonical list; `add` appends one, which is what the "Compare"
  // buttons across the site link to.
  const add = first(params.add);
  const ids = [...new Set([...idList(params.ids), ...(add ? [add] : [])])].slice(0, MAX_COMPARE);

  const selected = getChallengeRecordsByIds(ids).filter((c) => c.status === "published");

  const matches = new Map<string, Recommendation>();
  if (profile) {
    const result = getChallengeRecommendations(profile, catalogue);
    for (const rec of [...result.recommendations, ...result.eliminated]) {
      matches.set(rec.challenge.id, rec);
    }
  }

  return (
    <div className="shell section">
      {selected.length >= 2 ? <TrackEvent event="compare_clicked" /> : null}

      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Compare</span>
        <h1>Compare challenges</h1>
        <p className="lede">
          Up to {MAX_COMPARE} at a time, on the fields that actually change how you have to trade.
        </p>
      </header>

      <form method="get" className="panel" style={{ marginBottom: "2rem" }}>
        <label className="field-label" htmlFor="ids">
          Choose challenges to compare
        </label>
        <select
          id="ids"
          name="ids"
          multiple
          size={Math.min(8, Math.max(4, catalogue.length))}
          defaultValue={ids}
          style={{ minHeight: "auto", height: "auto" }}
        >
          {catalogue.map((challenge) => (
            <option key={challenge.id} value={challenge.id}>
              {challenge.firm.name} — {challenge.name}
            </option>
          ))}
        </select>
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          Hold Ctrl (or Cmd) to select several. The first {MAX_COMPARE} are used.
        </p>
        <div className="row" style={{ marginTop: "1rem" }}>
          <button type="submit" className="btn btn-primary">
            Compare
          </button>
          <Link href="/challenges" className="btn btn-ghost">
            Browse challenges
          </Link>
        </div>
      </form>

      {selected.length < 2 ? (
        <div className="panel panel-quiet">
          <h3>Pick at least two challenges.</h3>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            {catalogue.length === 0
              ? "There are no published challenges to compare yet."
              : "Select them above, or hit “Compare” on any challenge card."}
          </p>
        </div>
      ) : (
        <>
          {profile ? (
            <PersonalisedVerdict selected={selected} matches={matches} />
          ) : (
            <div className="panel panel-accent spread" style={{ marginBottom: "2rem" }}>
              <div>
                <strong>Which of these fits you better?</strong>
                <p className="small muted">
                  Take the questionnaire and this page will score each column against how you trade.
                </p>
              </div>
              <Link href="/find-my-challenge" className="btn btn-primary">
                Find My Challenge
              </Link>
            </div>
          )}

          <div className={`panel panel-flush ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rowHead}>Field</th>
                  {selected.map((challenge) => (
                    <th key={challenge.id}>
                      <Link href={`/challenges/${challenge.slug}`}>{challenge.name}</Link>
                      <div className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                        {challenge.firm.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile ? (
                  <tr>
                    <th className={styles.rowHead}>Your match</th>
                    {selected.map((challenge) => {
                      const match = matches.get(challenge.id);
                      return (
                        <td key={challenge.id}>
                          {!match || match.eligibility === "eliminated" ? (
                            <span className="pill pill-danger">Not compatible</span>
                          ) : (
                            <strong style={{ color: "var(--accent)" }}>{match.match_score}%</strong>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ) : null}

                <ComparisonRow
                  label="Price"
                  items={selected}
                  render={(c) => <Money value={c.price} currency={c.currency} />}
                />
                <ComparisonRow
                  label="Account size"
                  items={selected}
                  render={(c) => <AccountSize value={c.account_size} />}
                />
                <ComparisonRow
                  label="Profit target"
                  items={selected}
                  render={(c) => <Figure value={c.profit_target_pct} suffix="%" />}
                />
                <ComparisonRow
                  label="Max drawdown"
                  items={selected}
                  render={(c) => <Figure value={c.max_drawdown_pct} suffix="%" />}
                />
                <ComparisonRow
                  label="Daily loss"
                  items={selected}
                  render={(c) =>
                    c.daily_drawdown_pct === null ? (
                      <span className="muted">None recorded</span>
                    ) : (
                      `${c.daily_drawdown_pct}%`
                    )
                  }
                />
                <ComparisonRow
                  label="Drawdown type"
                  items={selected}
                  render={(c) =>
                    c.drawdown_type ? (
                      c.drawdown_type.replace(/_/g, " ")
                    ) : (
                      <span className="muted">Not confirmed</span>
                    )
                  }
                />
                <ComparisonRow
                  label="Minimum days"
                  items={selected}
                  render={(c) => <Figure value={c.minimum_days} />}
                />
                <ComparisonRow
                  label="Payout frequency"
                  items={selected}
                  render={(c) =>
                    c.payout_frequency_days ? (
                      `Every ${c.payout_frequency_days} days`
                    ) : (
                      <span className="muted">Not confirmed</span>
                    )
                  }
                />
                <ComparisonRow
                  label="Profit split"
                  items={selected}
                  render={(c) => <Figure value={c.payout_split_pct} suffix="%" />}
                />
                <ComparisonRow
                  label="Consistency"
                  items={selected}
                  render={(c) => <RuleBadge label="" status={c.rules.consistency_rule} />}
                />
                <ComparisonRow
                  label="News"
                  items={selected}
                  render={(c) => <RuleBadge label="" status={c.rules.news_trading} />}
                />
                <ComparisonRow
                  label="Overnight"
                  items={selected}
                  render={(c) => <RuleBadge label="" status={c.rules.overnight} />}
                />
                <ComparisonRow
                  label="Weekend"
                  items={selected}
                  render={(c) => <RuleBadge label="" status={c.rules.weekend} />}
                />
                <ComparisonRow
                  label="EA"
                  items={selected}
                  render={(c) => <RuleBadge label="" status={c.rules.ea_allowed} />}
                />
                <ComparisonRow
                  label="Platform"
                  items={selected}
                  render={(c) =>
                    c.platforms.length > 0 ? (
                      c.platforms.join(", ")
                    ) : (
                      <span className="muted">Not confirmed</span>
                    )
                  }
                />
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ComparisonRow({
  label,
  items,
  render,
}: {
  label: string;
  items: ChallengeRecord[];
  render: (challenge: ChallengeRecord) => React.ReactNode;
}) {
  return (
    <tr>
      <th className={styles.rowHead}>{label}</th>
      {items.map((challenge) => (
        <td key={challenge.id}>{render(challenge)}</td>
      ))}
    </tr>
  );
}

/**
 * The differentiator on this page: not just "here are the numbers" but
 * "here is which one fits you better, and why".
 */
function PersonalisedVerdict({
  selected,
  matches,
}: {
  selected: ChallengeRecord[];
  matches: Map<string, Recommendation>;
}) {
  const scored = selected
    .map((challenge) => matches.get(challenge.id))
    .filter((m): m is Recommendation => Boolean(m));

  const compatible = scored
    .filter((m) => m.eligibility === "compatible")
    .sort((a, b) => b.match_score - a.match_score);

  const incompatible = scored.filter((m) => m.eligibility === "eliminated");

  return (
    <div className="panel panel-accent" style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "1.25rem" }}>Which fits you better?</h2>

      {compatible.length === 0 ? (
        <p className="small" style={{ marginTop: "0.75rem" }}>
          None of these clear all of your hard requirements.
        </p>
      ) : (
        <>
          <div className="row" style={{ margin: "1rem 0" }}>
            {compatible.map((match) => (
              <span key={match.challenge.id} className="pill pill-accent">
                {match.challenge.name}: {match.match_score}%
              </span>
            ))}
          </div>

          <p className="small">
            <strong>{compatible[0].challenge.name}</strong> from{" "}
            {compatible[0].challenge.firm.name} scores highest for you.
          </p>

          {compatible.length > 1 ? (
            <ul className="stack-sm small" style={{ marginTop: "0.75rem", listStyle: "none" }}>
              {differences(compatible[0], compatible[1]).map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      {incompatible.length > 0 ? (
        <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
          {incompatible.map((match) => (
            <p key={match.challenge.id} className="small muted">
              <strong>{match.challenge.name}</strong> is not compatible:{" "}
              {match.eliminations.map((e) => e.message).join(" ")}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Explains the gap between two results using their own score breakdowns. */
function differences(winner: Recommendation, runnerUp: Recommendation): string[] {
  const lines: string[] = [];

  for (const criterion of winner.score_breakdown) {
    const other = runnerUp.score_breakdown.find((b) => b.criterion === criterion.criterion);
    if (!other) continue;

    const gap = criterion.earned - other.earned;
    if (Math.abs(gap) < 1.5) continue;

    const better = gap > 0 ? winner : runnerUp;
    const worse = gap > 0 ? runnerUp : winner;
    const note = better.score_breakdown.find((b) => b.criterion === criterion.criterion)?.notes[0];

    lines.push(
      `${better.challenge.name} scores better on ${criterion.criterion.replace(/_/g, " ")} than ${worse.challenge.name}${note ? ` — ${note.toLowerCase()}` : ""}.`,
    );
  }

  return lines.slice(0, 5);
}
