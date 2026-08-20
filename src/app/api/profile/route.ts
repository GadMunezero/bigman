import { NextResponse } from "next/server";
import { z } from "zod";
import { clearProfile, saveProfile, trackEvent } from "@/lib/repo";
import { getSessionId } from "@/lib/session";
import {
  BUDGETS,
  CHALLENGE_APPROACHES,
  DEAL_BREAKERS,
  HOLDING_PERIODS,
  MARKETS,
  NEWS_FREQUENCIES,
  PRIMARY_GOALS,
  PRIORITIES,
  PROFIT_SHAPES,
  RISK_STYLES,
  RISK_WIDTHS,
  TRADE_FREQUENCIES,
  TRADING_STYLES,
  TRI_STATE,
} from "@/lib/types";

export const runtime = "nodejs";

/**
 * The questionnaire posts raw string answers. Everything is validated here —
 * an unrecognised value is dropped rather than stored, so the engine never
 * has to defend against junk in the profile.
 */
const BodySchema = z.object({
  market: z.enum([...MARKETS, "multiple"] as [string, ...string[]]).optional(),
  trading_style: z.enum(TRADING_STYLES as unknown as [string, ...string[]]).optional(),
  holding_period: z.enum(HOLDING_PERIODS as unknown as [string, ...string[]]).optional(),
  news_trading: z.enum(NEWS_FREQUENCIES as unknown as [string, ...string[]]).optional(),
  overnight_required: z.enum(TRI_STATE as unknown as [string, ...string[]]).optional(),
  challenge_approach: z
    .enum(CHALLENGE_APPROACHES as unknown as [string, ...string[]])
    .optional(),
  risk_style: z.enum(RISK_STYLES as unknown as [string, ...string[]]).optional(),
  trade_frequency: z.enum(TRADE_FREQUENCIES as unknown as [string, ...string[]]).optional(),
  profit_shape: z.enum(PROFIT_SHAPES as unknown as [string, ...string[]]).optional(),
  risk_width: z.enum(RISK_WIDTHS as unknown as [string, ...string[]]).optional(),
  primary_goal: z.enum(PRIMARY_GOALS as unknown as [string, ...string[]]).optional(),
  deal_breakers: z
    .array(z.enum(DEAL_BREAKERS as unknown as [string, ...string[]]))
    .max(DEAL_BREAKERS.length)
    .optional(),
  budget: z.enum(BUDGETS as unknown as [string, ...string[]]).optional(),
  desired_account_size: z.string().optional(),
  priorities: z.array(z.enum(PRIORITIES as unknown as [string, ...string[]])).max(3).optional(),
  platform: z.string().optional(),
  ea_required: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  weekend_required: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
});

function toBool(value: boolean | "true" | "false" | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return typeof value === "boolean" ? value : value === "true";
}

export async function POST(request: Request) {
  const sessionId = await getSessionId();

  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid answers", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const profile = saveProfile(sessionId, {
    market: data.market as never,
    trading_style: data.trading_style as never,
    holding_period: data.holding_period as never,
    news_trading: data.news_trading as never,
    overnight_required: data.overnight_required as never,
    challenge_approach: data.challenge_approach as never,
    risk_style: data.risk_style as never,
    trade_frequency: data.trade_frequency as never,
    profit_shape: data.profit_shape as never,
    risk_width: data.risk_width as never,
    primary_goal: data.primary_goal as never,
    deal_breakers: (data.deal_breakers ?? []) as never,
    budget: data.budget as never,
    desired_account_size: data.desired_account_size || null,
    priorities: (data.priorities ?? []) as never,
    // An empty platform string means "no preference", not a platform named "".
    platform: data.platform ? data.platform : null,
    ea_required: toBool(data.ea_required) ?? null,
    weekend_required: toBool(data.weekend_required) ?? null,
  });

  trackEvent("quiz_completed", sessionId, {
    market: profile.market,
    trading_style: profile.trading_style,
    budget: profile.budget,
    challenge_approach: profile.challenge_approach,
    profit_shape: profile.profit_shape,
    trade_frequency: profile.trade_frequency,
    deal_breakers: profile.deal_breakers.length,
  });

  return NextResponse.json({ ok: true });
}

/** Lets a trader discard their profile from the profile page. */
export async function DELETE() {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ error: "No session" }, { status: 400 });

  clearProfile(sessionId);
  return NextResponse.json({ ok: true });
}
