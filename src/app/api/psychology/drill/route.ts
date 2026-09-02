import { NextResponse } from "next/server";
import { z } from "zod";
import { DRILL_CATEGORIES, type DrillCategory } from "@/app/psychology/data";
import {
  contextForMarket,
  evaluateLocally,
  pickLocalScenario,
  type Rating,
} from "@/app/psychology/scenarios";
import { getCurrentProfile } from "@/lib/session";

export const runtime = "nodejs";

const CATEGORY_IDS = DRILL_CATEGORIES.map((c) => c.id) as unknown as [
  DrillCategory,
  ...DrillCategory[],
];

const GenerateSchema = z.object({
  action: z.literal("generate"),
  category: z.enum(CATEGORY_IDS),
});

const EvaluateSchema = z.object({
  action: z.literal("evaluate"),
  category: z.enum(CATEGORY_IDS),
  scenario: z.string().min(1).max(4000),
  response: z.string().min(20).max(4000),
});

const BodySchema = z.discriminatedUnion("action", [GenerateSchema, EvaluateSchema]);

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Practice drills.
 *
 * The model call happens here, on the server, because the browser has no
 * business holding an API key. When no key is configured the endpoint still
 * works: it serves a scenario from the local bank and evaluates the response
 * with a transparent rubric, and it says so in the payload so the UI can be
 * honest about which one produced the feedback.
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }

  const profile = await getCurrentProfile();
  const context = contextForMarket(profile?.market ?? null);

  if (parsed.data.action === "generate") {
    const local = pickLocalScenario(parsed.data.category, context);

    if (!API_KEY) {
      return NextResponse.json({ ...local, source: "local" });
    }

    const prompt = `You are a trading psychologist writing one practice drill scenario for a trader.

TRADER CONTEXT
- Market: ${context.market}
- Trading style: ${profile?.trading_style ?? "not specified"}
- Typical holding period: ${profile?.holding_period ?? "not specified"}
- Context: they are trading a prop firm evaluation, so drawdown rules carry real stakes.

DRILL CATEGORY: ${parsed.data.category}

Write ONE realistic, specific scenario that creates psychological pressure relevant to that category. Put the trader inside a concrete moment. Do not use real firm names, and do not invent statistics or price data presented as fact — keep price references generic or clearly hypothetical. End with a direct question asking what they think and what they do. Under 120 words. Return only the scenario text.`;

    const text = await callClaude(prompt);
    if (!text) return NextResponse.json({ ...local, source: "local" });

    return NextResponse.json({ category: local.category, text, source: "model" });
  }

  // ---- evaluate ------------------------------------------------------------
  const { scenario, response, category } = parsed.data;

  if (!API_KEY) {
    const local = evaluateLocally(response);
    return NextResponse.json({ ...local, source: "local" });
  }

  const prompt = `You are a trading psychologist evaluating a trader's response to a practice drill.

DRILL CATEGORY: ${category}

SCENARIO PRESENTED:
${scenario}

TRADER'S RESPONSE:
${response}

Evaluate the response. Be direct, specific and honest — reference their actual words rather than giving generic advice. Point out what was psychologically strong, what was reactive, and one concrete thing to internalise.

Rate as exactly one of:
- SOLID: genuinely process-oriented, defused thinking, disciplined
- PARTIAL: mixed — some good awareness but still reactive elements
- REACTIVE: fused thinking, emotion-driven, broke process

Format exactly:
RATING: [SOLID/PARTIAL/REACTIVE]
FEEDBACK: [3-5 sentences]`;

  const text = await callClaude(prompt);
  if (!text) {
    const local = evaluateLocally(response);
    return NextResponse.json({ ...local, source: "local" });
  }

  const ratingMatch = text.match(/RATING:\s*(SOLID|PARTIAL|REACTIVE)/i);
  const feedbackMatch = text.match(/FEEDBACK:\s*([\s\S]+)/i);

  return NextResponse.json({
    rating: (ratingMatch?.[1]?.toUpperCase() ?? "PARTIAL") as Rating,
    feedback: feedbackMatch?.[1]?.trim() ?? text.trim(),
    source: "model",
  });
}

/** Returns null on any failure so the caller can fall back to the local path. */
async function callClaude(prompt: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    return data.content?.find((block) => block.type === "text")?.text ?? null;
  } catch {
    return null;
  }
}
