import { NextResponse } from "next/server";
import { z } from "zod";
import { getJourney, listJourneysForSession, reportOutcome } from "@/lib/outcomes";
import { getSessionId } from "@/lib/session";
import { FAILURE_REASONS, REPORTABLE_STAGES } from "@/lib/types";

export const runtime = "nodejs";

const BodySchema = z.object({
  journey_id: z.string().min(1).max(64),
  stage: z.enum(REPORTABLE_STAGES as unknown as [string, ...string[]]),
  failure_reason: z.enum(FAILURE_REASONS as unknown as [string, ...string[]]).nullish(),
  fit_rating: z.coerce.number().int().min(1).max(5).nullish(),
  would_choose_again: z.enum(["yes", "no", "unsure"]).nullish(),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ journeys: [] });
  return NextResponse.json({ journeys: listJourneysForSession(sessionId) });
}

/**
 * Records what actually happened with a challenge.
 *
 * Self-reported, and labelled as such everywhere it surfaces. The update is
 * scoped to the reporting session, so one visitor cannot overwrite another's
 * outcome by guessing an id.
 */
export async function POST(request: Request) {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ error: "No session" }, { status: 400 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const journey = getJourney(parsed.data.journey_id);
  if (!journey) return NextResponse.json({ error: "Unknown journey" }, { status: 404 });

  // A failure reason only makes sense on a failure.
  const failureReason =
    parsed.data.stage === "failed" ? (parsed.data.failure_reason ?? null) : null;

  const updated = reportOutcome(parsed.data.journey_id, sessionId, {
    stage: parsed.data.stage as never,
    failure_reason: failureReason as never,
    fit_rating: parsed.data.fit_rating ?? null,
    would_choose_again: parsed.data.would_choose_again ?? null,
    notes: parsed.data.notes ?? null,
  });

  if (!updated) {
    return NextResponse.json({ error: "Not yours to update" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    message: "Thanks — that helps us learn which challenges actually suit which traders.",
  });
}
