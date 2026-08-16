import Link from "next/link";
import { APPROACH_LABELS } from "@/lib/engine";
import { listJourneysForSession } from "@/lib/outcomes";
import { getChallengeRecordsByIds } from "@/lib/repo";
import { getSessionId } from "@/lib/session";
import { OutcomeForm, type JourneyView } from "./OutcomeForm";

export const metadata = {
  title: "How did it go?",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OutcomesPage() {
  const sessionId = await getSessionId();
  const journeys = sessionId ? listJourneysForSession(sessionId) : [];
  const challenges = getChallengeRecordsByIds(journeys.map((j) => j.challenge_id));
  const byId = new Map(challenges.map((c) => [c.id, c]));

  const views: JourneyView[] = journeys
    .map((journey) => {
      const challenge = byId.get(journey.challenge_id);
      if (!challenge) return null;
      const approach = journey.profile_snapshot?.challenge_approach ?? null;
      return {
        id: journey.id,
        challengeName: challenge.name,
        firmName: challenge.firm.name,
        slug: challenge.slug,
        matchScore: journey.match_score,
        stage: journey.stage,
        reported: journey.outcome_reported_at !== null,
        startedAt: journey.created_at,
        approach: approach ? APPROACH_LABELS[approach] : null,
      };
    })
    .filter((v): v is JourneyView => v !== null);

  return (
    <div className="shell-narrow section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Your challenges</span>
        <h1>How did it go?</h1>
        <p className="lede">
          Every challenge you clicked through to is listed here. Telling us what happened is the
          one thing that makes the recommendations better over time — especially when it went
          badly.
        </p>
      </header>

      {views.length === 0 ? (
        <div className="panel panel-quiet">
          <h3>Nothing to report yet.</h3>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            When you click through to a challenge from your matches, it appears here so you can
            tell us how it went.
          </p>
          <Link href="/find-my-challenge" className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
            Find My Challenge
          </Link>
        </div>
      ) : (
        <div className="stack">
          {views.map((view) => (
            <OutcomeForm key={view.id} journey={view} />
          ))}
        </div>
      )}

      <div className="panel panel-quiet" style={{ marginTop: "2.5rem" }}>
        <strong>What we do with this</strong>
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          We compare what you told us you wanted against what actually happened. If traders who
          asked to protect their account keep failing on drawdown, that means our weighting is
          wrong — and that is exactly the kind of thing this is for.
        </p>
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          Outcomes never adjust the scoring automatically. They surface as a signal for a person to
          review, because an engine that silently rewrites itself from self-reported data is an
          engine nobody can audit.
        </p>
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          Stored against your anonymous session. No name, no email, no account.
        </p>
      </div>
    </div>
  );
}
