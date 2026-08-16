import { NextResponse } from "next/server";
import { z } from "zod";
import { trackEvent } from "@/lib/repo";
import { getSessionId } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Funnel events only. The allowlist is deliberate: this endpoint is public, so
 * it accepts the funnel steps the product measures and nothing else. No
 * free-form event names, no personal data — the payload is capped to a few
 * known keys.
 */
const ALLOWED_EVENTS = [
  "homepage_view",
  "quiz_started",
  "quiz_completed",
  "results_viewed",
  "challenge_viewed",
  "compare_clicked",
  "saved",
] as const;

const BodySchema = z.object({
  event: z.enum(ALLOWED_EVENTS),
  challenge_id: z.string().max(64).optional(),
  position: z.number().int().min(0).max(500).optional(),
  match_score: z.number().int().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Unknown event" }, { status: 422 });

  const { event, ...payload } = parsed.data;
  trackEvent(event, await getSessionId(), payload);

  return NextResponse.json({ ok: true });
}
