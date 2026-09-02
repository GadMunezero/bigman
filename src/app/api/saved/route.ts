import { NextResponse } from "next/server";
import { z } from "zod";
import { getChallengeRecordById, listSaved, toggleSaved, trackEvent } from "@/lib/repo";
import { getSessionId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ saved: [] });
  return NextResponse.json({ saved: listSaved(sessionId) });
}

export async function POST(request: Request) {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ error: "No session" }, { status: 400 });

  const parsed = z
    .object({ challenge_id: z.string().min(1).max(64) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 422 });

  // Only save challenges that actually exist — otherwise the saved list can be
  // stuffed with arbitrary ids.
  if (!getChallengeRecordById(parsed.data.challenge_id)) {
    return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });
  }

  const saved = toggleSaved(sessionId, parsed.data.challenge_id);
  if (saved) trackEvent("saved", sessionId, { challenge_id: parsed.data.challenge_id });

  return NextResponse.json({ saved });
}
