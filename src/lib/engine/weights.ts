import type { Priority, ScoreCriterion } from "../types";
import { SCORE_CRITERIA } from "../types";

/**
 * Default soft-scoring weights. They sum to 100.
 *
 * These are defaults, not constants — `resolveWeights` accepts overrides from
 * the `scoring_weights` table so the algorithm can be tuned without a deploy.
 */
export const DEFAULT_WEIGHTS: Record<ScoreCriterion, number> = {
  trading_style: 25,
  rules: 25,
  budget: 15,
  drawdown: 10,
  payout: 10,
  account_size: 5,
  platform: 5,
  data_confidence: 5,
};

/**
 * Which criterion each priority amplifies.
 *
 * A trader who says "fast payouts matter most" should see payout weigh more
 * heavily in their score than it does for someone who never mentioned it.
 */
const PRIORITY_TARGET: Record<Priority, ScoreCriterion> = {
  large_drawdown: "drawdown",
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
}

/**
 * Applies priority boosts and renormalises back to a 100-point total.
 *
 * Renormalising matters: without it, a trader who picks three priorities would
 * be scored out of 130 and every one of their matches would look worse than
 * another trader's. Scores have to stay comparable across profiles.
 */
export function resolveWeights(
  priorities: Priority[] = [],
  overrides: Partial<Record<ScoreCriterion, number>> = {},
): ResolvedWeights {
  const base: Record<ScoreCriterion, number> = { ...DEFAULT_WEIGHTS, ...overrides };
  const boosted = new Set<ScoreCriterion>();

  for (const priority of priorities) {
    const target = PRIORITY_TARGET[priority];
    if (target) boosted.add(target);
  }

  const boostedWeights = { ...base };
  for (const criterion of boosted) {
    boostedWeights[criterion] = base[criterion] * PRIORITY_BOOST;
  }

  const total = SCORE_CRITERIA.reduce((sum, c) => sum + boostedWeights[c], 0);
  const normalised = {} as Record<ScoreCriterion, number>;
  for (const criterion of SCORE_CRITERIA) {
    normalised[criterion] = (boostedWeights[criterion] / total) * 100;
  }

  return { weights: normalised, boosted };
}

/** Maps a priority to the criterion it boosts — used for explanation copy. */
export function priorityCriterion(priority: Priority): ScoreCriterion {
  return PRIORITY_TARGET[priority];
}
