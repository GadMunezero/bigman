import { NextResponse } from "next/server";
import { getChallengeRecordById, getOfferForChallenge, recordAffiliateClick } from "@/lib/repo";
import { getSessionId } from "@/lib/session";

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

  recordAffiliateClick({
    challenge_id: challengeId,
    session_id: await getSessionId(),
    page: url.searchParams.get("page"),
    placement: url.searchParams.get("placement"),
    match_score: asInt(url.searchParams.get("score")),
    position: asInt(url.searchParams.get("position")),
    utm_source: url.searchParams.get("utm_source"),
  });

  if (!destination) {
    return NextResponse.redirect(new URL(`/challenges/${challenge.slug}`, request.url));
  }

  return NextResponse.redirect(destination, { status: 302 });
}
