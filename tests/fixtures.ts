import type { ChallengeRecord, ChallengeRules, Firm, Market, RuleStatus } from "@/lib/types";

const firm: Firm = {
  id: "firm_1",
  name: "Test Firm",
  slug: "test-firm",
  logo_url: null,
  website: "https://example.invalid",
  description: null,
  status: "published",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

function rules(overrides: Partial<ChallengeRules> = {}): ChallengeRules {
  return {
    challenge_id: "c",
    news_trading: "allowed",
    overnight: "allowed",
    weekend: "allowed",
    ea_allowed: "allowed",
    copy_trading: "allowed",
    scalping: "allowed",
    hedging: "allowed",
    consistency_rule: "not_required",
    consistency_pct: null,
    notes: null,
    updated_at: "2026-01-01",
    ...overrides,
  };
}

export function challenge(
  id: string,
  overrides: Partial<Omit<ChallengeRecord, "rules">> & { rules?: Partial<ChallengeRules> } = {},
): ChallengeRecord {
  const { rules: ruleOverrides, ...rest } = overrides;

  return {
    id,
    firm_id: firm.id,
    firm,
    name: `${id} challenge`,
    slug: id,
    markets: ["futures"] as Market[],
    account_size: 100_000,
    price: 100,
    currency: "USD",
    billing_type: "one_time",
    profit_target_pct: 8,
    max_drawdown_pct: 6,
    daily_drawdown_pct: 3,
    drawdown_type: "static",
    minimum_days: 3,
    maximum_days: null,
    payout_frequency_days: 14,
    payout_split_pct: 80,
    payout_conditions: null,
    platforms: ["NinjaTrader"],
    leverage: null,
    refund_policy: null,
    country_restrictions: null,
    phases: 1,
    status: "published",
    last_verified_at: new Date().toISOString(),
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    confidence: {
      price: "verified",
      account_size: "verified",
      max_drawdown_pct: "verified",
      profit_target_pct: "verified",
      payout_frequency_days: "verified",
    },
    ...rest,
    rules: { ...rules(ruleOverrides), challenge_id: id },
  };
}

export const RULE: Record<string, RuleStatus> = {
  allowed: "allowed",
  restricted: "restricted",
  prohibited: "prohibited",
  unknown: "unknown",
};
