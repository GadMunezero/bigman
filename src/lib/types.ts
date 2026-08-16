/**
 * Domain vocabulary.
 *
 * The whole product hinges on these being precise, because the recommendation
 * engine reasons about them structurally — every explanation shown to a trader
 * is derived from these values, never written by hand per challenge.
 */

export const MARKETS = ["futures", "forex", "cfd", "crypto"] as const;
export type Market = (typeof MARKETS)[number];

export const TRADING_STYLES = [
  "scalping",
  "day_trading",
  "swing_trading",
  "news_trading",
  "algorithmic",
  "copy_trading",
  "mixed",
] as const;
export type TradingStyle = (typeof TRADING_STYLES)[number];

export const HOLDING_PERIODS = [
  "seconds",
  "minutes",
  "hours",
  "overnight",
  "several_days",
] as const;
export type HoldingPeriod = (typeof HOLDING_PERIODS)[number];

export const NEWS_FREQUENCIES = ["frequently", "sometimes", "rarely", "never"] as const;
export type NewsFrequency = (typeof NEWS_FREQUENCIES)[number];

export const TRI_STATE = ["yes", "sometimes", "no"] as const;
export type TriState = (typeof TRI_STATE)[number];

/**
 * How the trader wants to approach the challenge.
 *
 * This is the single most load-bearing answer in the questionnaire: it does
 * not filter anything, it re-weights the entire scoring model. A trader
 * racing for a payout and a trader protecting an account want almost
 * opposite things from the same catalogue.
 */
export const CHALLENGE_APPROACHES = ["pass_fast", "normal", "protect"] as const;
export type ChallengeApproach = (typeof CHALLENGE_APPROACHES)[number];

export const RISK_STYLES = ["aggressive", "balanced", "conservative"] as const;
export type RiskStyle = (typeof RISK_STYLES)[number];

/**
 * Deal-breakers are hard filters, not preferences.
 *
 * The distinction matters: a trader who dislikes trailing drawdown should see
 * it weighted down, but a trader who names it a deal-breaker should never see
 * a trailing-drawdown challenge at all.
 */
export const DEAL_BREAKERS = [
  "trailing_drawdown",
  "daily_loss_limit",
  "news_restrictions",
  "minimum_trading_days",
  "consistency_rule",
  "overnight_restrictions",
  "high_fees",
] as const;
export type DealBreaker = (typeof DEAL_BREAKERS)[number];

export const DEAL_BREAKER_LABELS: Record<DealBreaker, string> = {
  trailing_drawdown: "Trailing drawdown",
  daily_loss_limit: "Daily loss limit",
  news_restrictions: "News restrictions",
  minimum_trading_days: "Minimum trading days",
  consistency_rule: "Consistency rule",
  overnight_restrictions: "Overnight restrictions",
  high_fees: "High fees",
};

export const BUDGETS = [
  "under_50",
  "50_100",
  "100_200",
  "200_300",
  "300_plus",
  "no_preference",
] as const;
export type Budget = (typeof BUDGETS)[number];

/** Upper bound in USD for each budget band. `null` = no ceiling. */
export const BUDGET_CEILING: Record<Budget, number | null> = {
  under_50: 50,
  "50_100": 100,
  "100_200": 200,
  "200_300": 300,
  "300_plus": null,
  no_preference: null,
};

export const PRIORITIES = [
  "large_drawdown",
  "static_drawdown",
  "low_profit_target",
  "low_price",
  "fast_payouts",
  "no_consistency_rule",
  "no_daily_loss_rule",
  "news_trading",
  "overnight_trading",
  "weekend_holding",
  "ea_automation",
  "low_restrictions",
  "platform",
  "large_account_size",
] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  large_drawdown: "Large drawdown",
  static_drawdown: "Static, not trailing, drawdown",
  low_profit_target: "Low profit target",
  low_price: "Low price",
  fast_payouts: "Fast payouts",
  no_consistency_rule: "No consistency rule",
  no_daily_loss_rule: "No daily loss rule",
  news_trading: "News trading",
  overnight_trading: "Overnight trading",
  weekend_holding: "Weekend holding",
  ea_automation: "EA / automation",
  low_restrictions: "Low restrictions",
  platform: "Platform",
  large_account_size: "Large account size",
};

/**
 * Rule status vocabulary.
 *
 * `unknown` is a real, load-bearing value. A rule we have not confirmed is
 * never silently treated as `allowed` — it costs the challenge confidence
 * points and is surfaced to the trader as unconfirmed.
 */
export const RULE_STATUSES = ["allowed", "restricted", "prohibited", "unknown"] as const;
export type RuleStatus = (typeof RULE_STATUSES)[number];

export type ConsistencyStatus = "required" | "not_required" | "unknown";

export const CONFIDENCE_LEVELS = [
  "verified",
  "trader_reported",
  "needs_review",
  "unknown",
] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export type PublishStatus = "draft" | "published" | "archived";

export interface Firm {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
}

export interface ChallengeRules {
  challenge_id: string;
  news_trading: RuleStatus;
  overnight: RuleStatus;
  weekend: RuleStatus;
  ea_allowed: RuleStatus;
  copy_trading: RuleStatus;
  scalping: RuleStatus;
  hedging: RuleStatus;
  consistency_rule: ConsistencyStatus;
  consistency_pct: number | null;
  notes: string | null;
  updated_at: string;
}

export interface Challenge {
  id: string;
  firm_id: string;
  name: string;
  slug: string;
  markets: Market[];
  account_size: number | null;
  price: number | null;
  currency: string;
  billing_type: "one_time" | "monthly" | null;
  profit_target_pct: number | null;
  max_drawdown_pct: number | null;
  daily_drawdown_pct: number | null;
  drawdown_type: "static" | "trailing" | "eod_trailing" | "intraday_trailing" | null;
  minimum_days: number | null;
  maximum_days: number | null;
  payout_frequency_days: number | null;
  payout_split_pct: number | null;
  payout_conditions: string | null;
  platforms: string[];
  leverage: string | null;
  refund_policy: string | null;
  country_restrictions: string | null;
  phases: number | null;
  status: PublishStatus;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A challenge joined with its rules and firm — what the engine actually scores. */
export interface ChallengeRecord extends Challenge {
  firm: Firm;
  rules: ChallengeRules;
  /** Field name -> confidence. Missing key means `unknown`. */
  confidence: Record<string, Confidence>;
}

export interface TraderProfile {
  id: string;
  user_id: string | null;
  session_id: string;
  market: Market | "multiple" | null;
  trading_style: TradingStyle | null;
  holding_period: HoldingPeriod | null;
  news_trading: NewsFrequency | null;
  overnight_required: TriState | null;
  challenge_approach: ChallengeApproach | null;
  risk_style: RiskStyle | null;
  deal_breakers: DealBreaker[];
  budget: Budget | null;
  /** Account size in USD, or "no_preference". */
  desired_account_size: string | null;
  priorities: Priority[];
  platform: string | null;
  ea_required: boolean | null;
  weekend_required: boolean | null;
  created_at: string;
  updated_at: string;
}

/** The shape the questionnaire produces before it is persisted. */
export type ProfileInput = Partial<
  Pick<
    TraderProfile,
    | "market"
    | "trading_style"
    | "holding_period"
    | "news_trading"
    | "overnight_required"
    | "challenge_approach"
    | "risk_style"
    | "deal_breakers"
    | "budget"
    | "desired_account_size"
    | "priorities"
    | "platform"
    | "ea_required"
    | "weekend_required"
  >
>;

// ---------------------------------------------------------------------------
// Recommendation engine output
// ---------------------------------------------------------------------------

/** The criteria the soft-scoring stage evaluates. Weights are configurable. */
export const SCORE_CRITERIA = [
  "trading_style",
  "rules",
  "budget",
  "drawdown",
  "difficulty",
  "payout",
  "account_size",
  "platform",
  "data_confidence",
] as const;
export type ScoreCriterion = (typeof SCORE_CRITERIA)[number];

export const CRITERION_LABELS: Record<ScoreCriterion, string> = {
  trading_style: "Trading style",
  rules: "Rules",
  budget: "Budget",
  drawdown: "Usable drawdown",
  difficulty: "Target & pace",
  payout: "Payout",
  account_size: "Account size",
  platform: "Platform",
  data_confidence: "Data confidence",
};

export interface CriterionScore {
  criterion: ScoreCriterion;
  /** 0..1 — how well the challenge satisfies this criterion. */
  ratio: number;
  /** Points earned, already scaled by the (possibly boosted) weight. */
  earned: number;
  /** Points available for this criterion after priority boosting. */
  available: number;
  /** True when the trader named this criterion as a priority. */
  boosted: boolean;
  notes: string[];
}

/** Why a challenge was removed at the hard-filter stage. */
export interface EliminationReason {
  /** Machine-readable requirement that failed, e.g. "overnight_required". */
  requirement: string;
  /** One sentence a trader can act on. */
  message: string;
}

export interface Recommendation {
  challenge: ChallengeRecord;
  eligibility: "compatible" | "eliminated";
  /** 0..100. Only meaningful when eligibility is "compatible". */
  match_score: number;
  label: MatchLabel | null;
  /** Positive, structurally-derived statements about the fit. */
  reasons: string[];
  /** Caveats. Always populated when a real trade-off exists. */
  warnings: string[];
  /** Why this was eliminated, when it was. */
  eliminations: EliminationReason[];
  score_breakdown: CriterionScore[];
}

export type MatchLabel =
  | "Excellent match"
  | "Strong match"
  | "Good match"
  | "Possible match"
  | "Weak match";

export interface RecommendationResult {
  /** Compatible challenges, best first. */
  recommendations: Recommendation[];
  /** Challenges removed by hard filters, with the reason why. */
  eliminated: Recommendation[];
  /**
   * When nothing survived the hard filters, these are the requirements to
   * relax — ordered by how many challenges each one is costing the trader.
   */
  blocking_requirements: {
    requirement: string;
    label: string;
    message: string;
    blocked: number;
  }[];
  total_considered: number;
}
