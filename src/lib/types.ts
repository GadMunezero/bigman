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
 * How often the trader actually trades.
 *
 * This is not a preference, it is a fact about their strategy, and it decides
 * whether a minimum-trading-days rule is harmless or disqualifying. Someone
 * taking two A+ setups a week against a four-day minimum is being asked to
 * invent trades that do not exist — the rule stops measuring their edge and
 * starts working against it.
 */
export const TRADE_FREQUENCIES = [
  "many_daily",
  "few_daily",
  "few_weekly",
  "few_monthly",
] as const;
export type TradeFrequency = (typeof TRADE_FREQUENCIES)[number];

export const TRADE_FREQUENCY_LABELS: Record<TradeFrequency, string> = {
  many_daily: "20+ trades a day",
  few_daily: "a few trades a day",
  few_weekly: "a few trades a week",
  few_monthly: "a few trades a month",
};

/**
 * The shape of the trader's returns — the single most load-bearing fact for
 * deciding whether a consistency rule is irrelevant or fatal.
 *
 * A consistency rule caps what share of total profit one day may contribute.
 * For a trader whose P&L is +200, +250, +180, +300 it never binds. For a
 * trader whose month is four small days and one +$3,000 day it is a rule that
 * says, in effect, "we do not accept your return distribution" — they can hit
 * the profit target and still be unable to withdraw.
 *
 * So the engine never asks "is a consistency rule good or bad?". It asks
 * whether it is good or bad *for this distribution*.
 */
export const PROFIT_SHAPES = ["one_big_day", "mixed", "even", "unsure"] as const;
export type ProfitShape = (typeof PROFIT_SHAPES)[number];

export const PROFIT_SHAPE_LABELS: Record<ProfitShape, string> = {
  one_big_day: "a few big days carry the month",
  mixed: "some days matter more than others",
  even: "profit accumulates evenly",
  unsure: "not sure yet",
};

/**
 * How much of the risk budget a single trade consumes.
 *
 * Replaces asking the trader to self-describe as "aggressive" or
 * "conservative", which is a personality question rather than a measurable
 * one. Stop width against the daily loss limit is what actually decides
 * whether an account is survivable: a trader risking $500 a trade on an
 * account with a $750 daily cap is one ordinary losing trade from being
 * locked out, however calm they feel about it.
 */
export const RISK_WIDTHS = ["wide", "moderate", "tight", "unsure"] as const;
export type RiskWidth = (typeof RISK_WIDTHS)[number];

export const RISK_WIDTH_LABELS: Record<RiskWidth, string> = {
  wide: "wide stops or large risk per trade",
  moderate: "moderate risk per trade",
  tight: "small, tightly controlled risk",
  unsure: "not sure",
};

/**
 * What the trader is actually optimising for once funded.
 *
 * `challenge_approach` asks about pace through the evaluation; this asks what
 * winning looks like afterwards. They are genuinely different objectives —
 * the cheapest route to a funded account and the fastest route to money in a
 * bank account rank the same catalogue differently.
 */
export const PRIMARY_GOALS = [
  "get_funded",
  "fast_payouts",
  "cheapest_route",
  "long_term_seat",
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  get_funded: "reach a funded account",
  fast_payouts: "withdraw money quickly",
  cheapest_route: "spend as little as possible getting there",
  long_term_seat: "hold a funded seat for the long term",
};

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

/**
 * What a subscriber can agree to receive.
 *
 * Separate topics rather than one "subscribe" flag, because they are different
 * promises. Someone who wants psychology tips has not thereby agreed to be
 * sent discount codes, and a discount email carries a commercial relationship
 * that a tips email does not.
 */
export const NEWSLETTER_TOPICS = ["psychology", "rule_changes", "deals"] as const;
export type NewsletterTopic = (typeof NEWSLETTER_TOPICS)[number];

export const NEWSLETTER_TOPIC_LABELS: Record<NewsletterTopic, string> = {
  psychology: "Trading psychology",
  rule_changes: "Prop firm rule changes",
  deals: "Discounts and offers",
};

export const NEWSLETTER_TOPIC_HINTS: Record<NewsletterTopic, string> = {
  psychology: "The behavioural half of passing a challenge — one idea at a time, not a drip campaign.",
  rule_changes: "When a firm moves a drawdown, a profit split or a payout rule, and what it means for you.",
  deals: "Discount codes. We may earn a commission on these — it never affects how the engine ranks anything.",
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
 * Outcome tracking.
 *
 * The long-term value of this product is not the size of the catalogue — it is
 * the relationship between how someone trades, which challenge they chose, and
 * whether that challenge actually worked for them. These are the vocabulary for
 * the last part.
 */
export const JOURNEY_STAGES = [
  "clicked",
  "purchased",
  "in_progress",
  "passed",
  "failed",
  "funded",
  "paid_out",
  "abandoned",
] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const JOURNEY_STAGE_LABELS: Record<JourneyStage, string> = {
  clicked: "Viewed the offer",
  purchased: "Bought the challenge",
  in_progress: "Currently trading it",
  passed: "Passed the evaluation",
  failed: "Failed the evaluation",
  funded: "Got a funded account",
  paid_out: "Received a payout",
  abandoned: "Gave up on it",
};

/** Stages a trader can self-report as a terminal or near-terminal result. */
export const REPORTABLE_STAGES: JourneyStage[] = [
  "purchased",
  "in_progress",
  "passed",
  "failed",
  "funded",
  "paid_out",
  "abandoned",
];

export const FAILURE_REASONS = [
  "max_drawdown",
  "daily_loss",
  "time_limit",
  "consistency_rule",
  "other_rule_violation",
  "lost_motivation",
  "other",
] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

export const FAILURE_REASON_LABELS: Record<FailureReason, string> = {
  max_drawdown: "Hit the maximum drawdown",
  daily_loss: "Hit the daily loss limit",
  time_limit: "Ran out of time",
  consistency_rule: "Broke the consistency rule",
  other_rule_violation: "Broke another rule",
  lost_motivation: "Lost motivation / stopped trading it",
  other: "Something else",
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
  founded_year: number | null;
  headquarters: string | null;
  ceo: string | null;
  /** JSON array of {name, role}. Empty is meaningful: nobody is named. */
  key_people: string;
  leadership_source_url: string | null;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
}

export interface KeyPerson {
  name: string;
  role: string;
}

/**
 * Leadership is never inferred. A firm whose people are not on the record shows
 * as "not disclosed", which is information a trader can act on — not a gap to
 * be filled with a plausible-sounding name.
 */
export function parseKeyPeople(raw: string | null | undefined): KeyPerson[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is KeyPerson => Boolean(p) && typeof p.name === "string" && p.name.trim() !== "")
      .map((p) => ({ name: p.name.trim(), role: String(p.role ?? "").trim() }));
  } catch {
    return [];
  }
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
  /** Charged on passing, on top of the entry price. */
  activation_fee: number | null;
  /** Cap on a single withdrawal, where the firm sets one. */
  max_payout: number | null;
  /** Position limits as the firm states them, e.g. "5/50" for minis/micros. */
  contracts: string | null;
  /** Broker or data connection behind the account, e.g. "Rithmic". */
  data_feed: string | null;
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
  /**
   * Derived from `risk_width` rather than asked. Kept on the profile because
   * the weighting model reasons in these terms and because a profile saved
   * before `risk_width` existed still carries a usable value.
   */
  risk_style: RiskStyle | null;
  trade_frequency: TradeFrequency | null;
  profit_shape: ProfitShape | null;
  risk_width: RiskWidth | null;
  primary_goal: PrimaryGoal | null;
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
    | "trade_frequency"
    | "profit_shape"
    | "risk_width"
    | "primary_goal"
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
  "archetype_fit",
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
  archetype_fit: "Strategy fit",
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

/**
 * What the engine concluded about the trader, before it looked at any
 * challenge.
 *
 * Shown back to them at the top of their results, because a recommendation is
 * only checkable if you can see the reading of you that produced it. If the
 * profile is wrong, the ranking below it is wrong, and the trader is the only
 * person who can tell.
 */
export interface TraderFitProfile {
  archetypes: { id: string; label: string; summary: string; strength: number }[];
  /** Rules this profile needs, strongest archetype first. */
  must_have: { label: string; because: string }[];
  /** Rules that work against this profile. */
  avoid: { label: string; because: string }[];
}

export interface RecommendationResult {
  /** Compatible challenges, best first. */
  recommendations: Recommendation[];
  /** What kind of trader the answers describe, and what that implies. */
  fit_profile: TraderFitProfile;
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


// ---------------------------------------------------------------------------
// Outcome tracking
// ---------------------------------------------------------------------------

/**
 * One trader's journey with one challenge.
 *
 * The profile is stored as a SNAPSHOT rather than a foreign key, deliberately.
 * A trader retakes the questionnaire and their profile changes; the question
 * this table answers is "did this challenge work for the person they were when
 * they chose it", so the answer has to be frozen at the point of choice.
 */
export interface ChallengeJourney {
  id: string;
  session_id: string | null;
  challenge_id: string;
  /** JSON snapshot of the profile at the moment of choice. */
  profile_snapshot: Partial<TraderProfile> | null;
  match_score: number | null;
  position: number | null;
  stage: JourneyStage;
  failure_reason: FailureReason | null;
  /** 1-5: how well did the challenge actually suit them, in hindsight? */
  fit_rating: number | null;
  would_choose_again: "yes" | "no" | "unsure" | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  outcome_reported_at: string | null;
}
