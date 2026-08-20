import type { ChallengeApproach, Priority, RiskStyle, ScoreCriterion } from "../types";
import { SCORE_CRITERIA } from "../types";

/**
 * Base soft-scoring weights, summing to 100.
 *
 * These are the starting point for a trader who told us nothing about how they
 * want to approach the challenge. They are not the weights anyone is actually
 * scored on — `resolveWeights` reshapes them per profile.
 */
export const DEFAULT_WEIGHTS: Record<ScoreCriterion, number> = {
  archetype_fit: 18,
  trading_style: 14,
  rules: 18,
  budget: 11,
  drawdown: 11,
  difficulty: 11,
  payout: 7,
  account_size: 3,
  platform: 3,
  data_confidence: 4,
};

/**
 * How the trader's chosen approach reshapes the model.
 *
 * This is the part that makes the engine personal rather than a fixed ranking
 * with a nicer wrapper. A trader racing to a payout and a trader protecting an
 * account are scoring the same catalogue against genuinely different questions:
 *
 *  - `pass_fast` cares about how quickly the challenge can be cleared — the
 *    profit target, minimum days, and how much room there is to push.
 *  - `protect` cares about how hard it is to fail by accident — drawdown
 *    mechanics, rule traps, and whether the data can be trusted at all.
 *  - `normal` leaves the base weights alone.
 *
 * Values are multipliers on the base weight, renormalised afterwards.
 */
const APPROACH_MODIFIERS: Record<
  ChallengeApproach,
  Partial<Record<ScoreCriterion, number>>
> = {
  pass_fast: {
    difficulty: 1.8,
    drawdown: 1.35,
    rules: 1.1,
    payout: 0.6,
    account_size: 0.6,
    platform: 0.8,
  },
  normal: {},
  protect: {
    drawdown: 1.45,
    rules: 1.3,
    data_confidence: 1.5,
    difficulty: 0.7,
    payout: 0.8,
  },
};

/**
 * Risk style is a second, smaller adjustment on top of approach.
 *
 * Approach is about pace; risk style is about how much rope the trader wants.
 * They are related but not the same — someone can want to pass quickly while
 * still being risk-averse about the mechanics that could void the account.
 */
const RISK_MODIFIERS: Record<RiskStyle, Partial<Record<ScoreCriterion, number>>> = {
  aggressive: {
    drawdown: 1.2,
    difficulty: 1.25,
    rules: 0.9,
  },
  balanced: {},
  conservative: {
    rules: 1.2,
    data_confidence: 1.25,
    drawdown: 1.1,
    difficulty: 0.8,
  },
};

/** Which criterion each stated priority amplifies. */
const PRIORITY_TARGET: Record<Priority, ScoreCriterion> = {
  large_drawdown: "drawdown",
  static_drawdown: "drawdown",
  low_profit_target: "difficulty",
  low_price: "budget",
  fast_payouts: "payout",
  no_consistency_rule: "rules",
  no_daily_loss_rule: "rules",
  news_trading: "rules",
  overnight_trading: "rules",
  weekend_holding: "rules",
  ea_automation: "rules",
  low_restrictions: "rules",
  platform: "platform",
  large_account_size: "account_size",
};

/** How much a single named priority multiplies its criterion's weight. */
export const PRIORITY_BOOST = 1.6;

export interface ResolvedWeights {
  weights: Record<ScoreCriterion, number>;
  /** Criteria the trader explicitly prioritised — surfaced in the breakdown. */
  boosted: Set<ScoreCriterion>;
  approach: ChallengeApproach;
  riskStyle: RiskStyle;
}

export interface WeightInput {
  approach?: ChallengeApproach | null;
  riskStyle?: RiskStyle | null;
  priorities?: Priority[];
  overrides?: Partial<Record<ScoreCriterion, number>>;
  /**
   * Multipliers derived from the trader's archetypes. Applied before stated
   * priorities so that an explicit answer always outranks an inferred one.
   */
  archetype?: Partial<Record<ScoreCriterion, number>>;
}

/**
 * Produces the weights a specific trader is scored on.
 *
 * Order matters: base → archetype → approach → risk style → stated priorities
 * → renormalise.
 *
 * Archetype first because it is the broadest reshaping — it decides which
 * questions the model is asking at all. Stated priorities last because a
 * trader who explicitly names something should never be overruled by an
 * inference the engine made about them.
 *
 * Renormalising at the end keeps every trader scored out of 100, so a 93%
 * means the same thing regardless of archetype, approach, or how many
 * priorities they picked. Without it, scores would not be comparable between
 * profiles — and comparing them is the entire product.
 */
export function resolveWeights(input: WeightInput = {}): ResolvedWeights {
  const approach: ChallengeApproach = input.approach ?? "normal";
  const riskStyle: RiskStyle = input.riskStyle ?? "balanced";

  const base: Record<ScoreCriterion, number> = { ...DEFAULT_WEIGHTS, ...input.overrides };
  const shaped = { ...base };

  for (const criterion of SCORE_CRITERIA) {
    const byArchetype = input.archetype?.[criterion] ?? 1;
    const byApproach = APPROACH_MODIFIERS[approach][criterion] ?? 1;
    const byRisk = RISK_MODIFIERS[riskStyle][criterion] ?? 1;
    shaped[criterion] = base[criterion] * byArchetype * byApproach * byRisk;
  }

  const boosted = new Set<ScoreCriterion>();
  for (const priority of input.priorities ?? []) {
    const target = PRIORITY_TARGET[priority];
    if (target) boosted.add(target);
  }
  for (const criterion of boosted) {
    shaped[criterion] *= PRIORITY_BOOST;
  }

  const total = SCORE_CRITERIA.reduce((sum, c) => sum + shaped[c], 0);
  const normalised = {} as Record<ScoreCriterion, number>;
  for (const criterion of SCORE_CRITERIA) {
    normalised[criterion] = (shaped[criterion] / total) * 100;
  }

  return { weights: normalised, boosted, approach, riskStyle };
}

export function priorityCriterion(priority: Priority): ScoreCriterion {
  return PRIORITY_TARGET[priority];
}

export const APPROACH_LABELS: Record<ChallengeApproach, string> = {
  pass_fast: "pass as quickly as possible",
  normal: "pass at a normal pace",
  protect: "take your time and protect the account",
};

export const RISK_STYLE_LABELS: Record<RiskStyle, string> = {
  aggressive: "aggressive",
  balanced: "balanced",
  conservative: "conservative",
};
