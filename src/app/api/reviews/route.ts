import { NextResponse } from "next/server";
import { z } from "zod";
import { createReview, getChallengeRecordById } from "@/lib/repo";
import { getSessionId } from "@/lib/session";

export const runtime = "nodejs";

const BodySchema = z.object({
  challenge_id: z.string().min(1).max(64),
  display_name: z.string().max(60).optional(),
  account_size: z.coerce.number().int().positive().max(10_000_000).optional(),
  trading_style: z.string().max(40).optional(),
  market: z.string().max(40).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  passed: z.enum(["yes", "no", "in_progress"]).optional(),
  received_payout: z.enum(["yes", "no", "not_applicable"]).optional(),
  payout_days: z.coerce.number().int().min(0).max(3650).optional(),
  liked: z.string().max(2000).optional(),
  disliked: z.string().max(2000).optional(),
  body: z.string().max(5000).optional(),
  evidence_note: z.string().max(1000).optional(),
});

/**
 * Review submission.
 *
 * Every review is stored as `pending` and `trader_reported`. Nothing published
 * automatically, nothing marked verified without a human doing the verifying.
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const challenge = getChallengeRecordById(parsed.data.challenge_id);
  if (!challenge) return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });

  const id = createReview({
    ...parsed.data,
    firm_id: challenge.firm_id,
    session_id: await getSessionId(),
  });

  return NextResponse.json({
    ok: true,
    id,
    status: "pending",
    message: "Thanks — your review is queued for moderation and is not published yet.",
  });
}
