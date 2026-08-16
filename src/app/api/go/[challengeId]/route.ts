import { NextResponse } from "next/server";
import { recordJourneyStart } from "@/lib/outcomes";
import { getChallengeRecordById, getOfferForChallenge, recordAffiliateClick } from "@/lib/repo";
import { getCurrentProfile, getSessionId } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Affiliate outbound redirect.
 *
 * This is the ONLY place affiliate URLs are resolved, and it runs strictly
 * after the recommendation has already been produced and shown. The click is
 * recorded with the position and match score it was shown at, so the funnel
 * can be measured without any of it ever feeding back into ranking.
 *
 * If a challenge has no affiliate offer we still send the trader onward — to
 * the firm's own website. Monetisation never gates the destination.
 *
 * The redirect only ever targets a URL an admin stored against the firm. It
 * never constructs one from the firm's name: lookalike domains are common in
 * this industry, and guessing one would hand a trader to a scam site wearing
 * our recommendation as endorsement. No stored URL means no redirect.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> },
) {
  const { challengeId } = await params;
  const url = new URL(request.url);

  const challenge = getChallengeRecordById(challengeId);
  if (!challenge) {
    return NextResponse.redirect(new URL("/challenges", request.url));
  }

  const offer = getOfferForChallenge(challengeId);
  const destination = offer?.affiliate_url ?? challenge.firm.website;

  const asInt = (value: string | null) => {
    if (value === null) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sessionId = await getSessionId();
  const matchScore = asInt(url.searchParams.get("score"));
  const position = asInt(url.searchParams.get("position"));

  // Recorded for every outbound click, sponsored or not, because the funnel
  // question ("did they act on the recommendation") is the same either way.
  // The table name predates there being unpaid links; `offer` distinguishes them.
  recordAffiliateClick({
    challenge_id: challengeId,
    session_id: sessionId,
    page: url.searchParams.get("page"),
    placement: url.searchParams.get("placement"),
    match_score: matchScore,
    position,
    utm_source: url.searchParams.get("utm_source"),
  });

  /*
   * The outbound click is the closest thing we have to "this is the one they
   * chose", so it is where the outcome journey begins. The profile is frozen
   * here rather than referenced, because the question we want to answer later
   * is whether this challenge suited the person who picked it — not whoever
   * they became after retaking the questionnaire.
   */
  const profile = await getCurrentProfile();
  recordJourneyStart({
    session_id: sessionId,
    challenge_id: challengeId,
    profile,
    match_score: matchScore,
    position,
  });

  if (!destination) {
    return NextResponse.redirect(new URL(`/challenges/${challenge.slug}`, request.url));
  }

  return NextResponse.redirect(destination, { status: 302 });
}
