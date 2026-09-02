import Link from "next/link";
import { ChallengeCard } from "@/components/ui";
import { getChallengeRecommendations } from "@/lib/engine";
import type { LandingConfig } from "@/lib/landing";
import { listChallengeRecords } from "@/lib/repo";
import { getCurrentProfile } from "@/lib/session";

/**
 * Shared renderer for the SEO landing pages.
 *
 * Every page states the criteria it filtered on and never claims a challenge is
 * objectively best — only that it scored highest against the criteria described
 * on the page. The CTA back into the questionnaire is the point of the page.
 */
export async function LandingPage({ config }: { config: LandingConfig }) {
  const catalogue = listChallengeRecords();
  const profile = await getCurrentProfile();

  const matching = catalogue.filter(config.matches);
  const ranked = config.rank ? [...matching].sort(config.rank) : matching;

  const scores = new Map<string, number>();
  if (profile) {
    const result = getChallengeRecommendations(profile, catalogue);
    for (const rec of result.recommendations) scores.set(rec.challenge.id, rec.match_score);
  }

  return (
    <div className="shell section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Guide</span>
        <h1>{config.title}</h1>
        {config.intro.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="lede" style={{ marginTop: "0.5rem" }}>
            {paragraph}
          </p>
        ))}
      </header>

      <div className="panel panel-quiet" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem" }}>How this list was built</h2>
        <ul className="stack-sm" style={{ marginTop: "0.75rem", paddingLeft: "1.1rem" }}>
          {config.criteria.map((criterion) => (
            <li key={criterion} className="small" style={{ color: "var(--ink-2)" }}>
              {criterion}
            </li>
          ))}
        </ul>
        <p className="small muted" style={{ marginTop: "0.75rem" }}>
          These challenges scored highest against the criteria described here. That is not a claim
          that any of them is objectively the best challenge — the right one depends on how you
          trade, which is what the questionnaire is for.
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="panel panel-warn">
          <h2 style={{ fontSize: "1.15rem" }}>Nothing qualifies right now.</h2>
          <p className="small" style={{ marginTop: "0.5rem" }}>
            {config.emptyNote}
          </p>
          <Link href="/challenges" className="btn" style={{ marginTop: "1.25rem" }}>
            Browse all challenges
          </Link>
        </div>
      ) : (
        <>
          <p className="small muted" style={{ marginBottom: "1rem" }}>
            {ranked.length} of {catalogue.length} challenges qualify.
          </p>
          <div className="grid-auto">
            {ranked.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                score={scores.get(challenge.id)}
              />
            ))}
          </div>
        </>
      )}

      <section style={{ marginTop: "3rem" }}>
        <div className="panel panel-accent spread">
          <div>
            <strong>Want a recommendation based on YOUR trading style?</strong>
            <p className="small muted">
              This page applied one filter. The questionnaire applies all of them, in the order that
              matters, and explains every score.
            </p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-primary btn-lg">
            Find My Challenge
          </Link>
        </div>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <div className="row">
          <Link href="/compare" className="btn btn-sm">
            Compare challenges
          </Link>
          <Link href="/methodology" className="btn btn-sm">
            How we score
          </Link>
          <Link href="/psychology" className="btn btn-sm">
            Trading psychology
          </Link>
        </div>
      </section>
    </div>
  );
}
