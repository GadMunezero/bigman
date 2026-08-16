import Link from "next/link";
import { ChallengeCard, LastVerified } from "@/components/ui";
import { getChallengeRecommendations } from "@/lib/engine";
import { getChallengeRecordsByIds, listChallengeRecords, listSaved } from "@/lib/repo";
import { getCurrentProfile, getSessionId } from "@/lib/session";

export const metadata = {
  title: "Saved challenges",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const [sessionId, profile] = await Promise.all([getSessionId(), getCurrentProfile()]);
  const savedIds = sessionId ? listSaved(sessionId) : [];
  const saved = getChallengeRecordsByIds(savedIds);

  const scores = new Map<string, number>();
  if (profile) {
    const catalogue = listChallengeRecords();
    const result = getChallengeRecommendations(profile, catalogue);
    for (const rec of result.recommendations) scores.set(rec.challenge.id, rec.match_score);
  }

  return (
    <div className="shell section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Saved</span>
        <h1>Saved challenges</h1>
        <p className="lede">
          Kept against this browser session. Each one shows its current match score, price and
          verification date, so you can spot when something changes.
        </p>
      </header>

      {saved.length === 0 ? (
        <div className="panel panel-quiet">
          <h3>Nothing saved yet.</h3>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            Hit save on any challenge or result and it lands here.
          </p>
          <Link href="/find-my-challenge" className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
            Find My Challenge
          </Link>
        </div>
      ) : (
        <>
          <div className="grid-auto">
            {saved.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                score={scores.get(challenge.id)}
              />
            ))}
          </div>

          <div className="panel" style={{ marginTop: "2rem" }}>
            <h2 className="section-heading">Data freshness</h2>
            {saved.map((challenge) => (
              <div key={challenge.id} className="kv">
                <dt>
                  {challenge.firm.name} — {challenge.name}
                </dt>
                <dd>
                  <LastVerified date={challenge.last_verified_at} />
                </dd>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
