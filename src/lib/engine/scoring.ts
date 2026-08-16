import type {
  ChallengeRecord,
  CriterionScore,
  RuleStatus,
  ScoreCriterion,
  TraderProfile,
} from "../types";
import { SCORE_CRITERIA } from "../types";
import type { DerivedRequirements } from "./requirements";
import { formatMoney } from "./requirements";
import type { ResolvedWeights } from "./weights";

/**
 * Range context for the candidate set.
 *
 * Several criteria are only meaningful relatively — a $89 challenge is "cheap"
 * or "expensive" only next to the other challenges the trader could pick. The
 * context is computed once per request over the surviving candidates.
 */
export interface ScoringContext {
  priceMin: number;
  priceMax: number;
  drawdownMin: number;
  drawdownMax: number;
  payoutDaysMin: number;
  payoutDaysMax: number;
  splitMin: number;
  splitMax: number;
  targetMin: number;
  targetMax: number;
  minDaysMin: number;
  minDaysMax: number;
  /** Usable-drawdown ratios across the candidate set, for relative scoring. */
  usableMin: number;
  usableMax: number;
}

export function buildContext(challenges: ChallengeRecord[]): ScoringContext {
  const nums = (values: (number | null)[]) => values.filter((v): v is number => v !== null);
  const prices = nums(challenges.map((c) => c.price));
  const drawdowns = nums(challenges.map((c) => c.max_drawdown_pct));
  const payoutDays = nums(challenges.map((c) => c.payout_frequency_days));
  const splits = nums(challenges.map((c) => c.payout_split_pct));
  const targets = nums(challenges.map((c) => c.profit_target_pct));
  const minDays = nums(challenges.map((c) => c.minimum_days));
  const usable = challenges.map(usableDrawdown).filter((v): v is number => v !== null);

  return {
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    drawdownMin: drawdowns.length ? Math.min(...drawdowns) : 0,
    drawdownMax: drawdowns.length ? Math.max(...drawdowns) : 0,
    payoutDaysMin: payoutDays.length ? Math.min(...payoutDays) : 0,
    payoutDaysMax: payoutDays.length ? Math.max(...payoutDays) : 0,
    splitMin: splits.length ? Math.min(...splits) : 0,
    splitMax: splits.length ? Math.max(...splits) : 0,
    targetMin: targets.length ? Math.min(...targets) : 0,
    targetMax: targets.length ? Math.max(...targets) : 0,
    minDaysMin: minDays.length ? Math.min(...minDays) : 0,
    minDaysMax: minDays.length ? Math.max(...minDays) : 0,
    usableMin: usable.length ? Math.min(...usable) : 0,
    usableMax: usable.length ? Math.max(...usable) : 0,
  };
}

/**
 * How much drawdown a trader can actually spend, rather than the headline number.
 *
 * A big drawdown is not automatically better, and this is the function that
 * refuses to pretend otherwise. Three things decide how much of the headline
 * figure is genuinely usable:
 *
 *  - Room relative to the target. 10% of drawdown against a 5% target is a very
 *    different proposition from 10% against a 20% target.
 *  - The drawdown mechanic. A trailing drawdown follows your equity up, so a
 *    chunk of the headline number is never actually available to lose.
 *  - The daily cap. A tight daily limit rations the total, so you cannot deploy
 *    it when you need it even though the account technically holds it.
 *
 * Returns null when the inputs are unconfirmed — a guess here would quietly
 * distort the ranking.
 */
function usableDrawdown(challenge: ChallengeRecord): number | null {
  const { max_drawdown_pct: maxDd, profit_target_pct: target } = challenge;
  if (maxDd === null || maxDd <= 0) return null;

  // Without a confirmed target, fall back to the raw figure so the challenge
  // is still comparable, rather than dropping it from the range entirely.
  const headroom = target !== null && target > 0 ? maxDd / target : maxDd / 8;

  const MECHANIC_FACTOR: Record<string, number> = {
    static: 1,
    eod_trailing: 0.8,
    trailing: 0.68,
    intraday_trailing: 0.58,
  };
  const mechanic = challenge.drawdown_type
    ? (MECHANIC_FACTOR[challenge.drawdown_type] ?? 0.75)
    : 0.75;

  // A daily cap worth less than a third of the total rations it hard.
  const dailyFactor =
    challenge.daily_drawdown_pct === null
      ? 1
      : clamp(0.55 + (challenge.daily_drawdown_pct / maxDd) * 0.9, 0.55, 1);

  return headroom * mechanic * dailyFactor;
}

/** How resistant the drawdown mechanic is to accidental failure. */
function drawdownStability(challenge: ChallengeRecord): number {
  const STABILITY: Record<string, number> = {
    static: 1,
    eod_trailing: 0.68,
    trailing: 0.45,
    intraday_trailing: 0.3,
  };
  const base = challenge.drawdown_type ? (STABILITY[challenge.drawdown_type] ?? 0.4) : 0.4;
  // A daily limit is another way to fail an otherwise healthy account.
  return challenge.daily_drawdown_pct === null ? base : base * 0.85;
}

/** Position of `value` in [min,max], 0..1. Returns 0.5 when the range is flat. */
function normalise(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0.5;
  if (max <= min) return 0.5;
  return clamp((value - min) / (max - min));
}

function clamp(value: number, lo = 0, hi = 1): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * How much credit a rule status earns when the trader needs that permission.
 *
 * `unknown` sits below `restricted` on purpose: an unconfirmed rule is a real
 * risk to the trader, and the scoring should prefer a challenge whose rules we
 * have actually verified.
 */
const RULE_CREDIT: Record<RuleStatus, number> = {
  allowed: 1,
  restricted: 0.5,
  unknown: 0.35,
  prohibited: 0,
};

/** Credit when the trader wants the rule ABSENT (e.g. "no consistency rule"). */
function absenceCredit(status: RuleStatus): number {
  switch (status) {
    case "prohibited":
      return 0.2;
    case "restricted":
      return 0.6;
    case "allowed":
      return 1;
    default:
      return 0.4;
  }
}

interface ScorerArgs {
  challenge: ChallengeRecord;
  profile: Partial<TraderProfile>;
  req: DerivedRequirements;
  ctx: ScoringContext;
}

type Scorer = (args: ScorerArgs) => { ratio: number; notes: string[] };

// ---------------------------------------------------------------------------
// Individual criteria
// ---------------------------------------------------------------------------

const scoreTradingStyle: Scorer = ({ challenge, profile }) => {
  const rules = challenge.rules;
  const notes: string[] = [];
  const parts: number[] = [];

  switch (profile.trading_style) {
    case "scalping":
      parts.push(RULE_CREDIT[rules.scalping]);
      notes.push(ruleNote("Scalping", rules.scalping));
      break;
    case "swing_trading":
      parts.push(RULE_CREDIT[rules.overnight]);
      notes.push(ruleNote("Overnight holding", rules.overnight));
      break;
    case "news_trading":
      parts.push(RULE_CREDIT[rules.news_trading]);
      notes.push(ruleNote("News trading", rules.news_trading));
      break;
    case "algorithmic":
      parts.push(RULE_CREDIT[rules.ea_allowed]);
      notes.push(ruleNote("Automated trading", rules.ea_allowed));
      break;
    case "copy_trading":
      parts.push(RULE_CREDIT[rules.copy_trading]);
      notes.push(ruleNote("Copy trading", rules.copy_trading));
      break;
    case "day_trading":
      // Day traders live inside the session: the daily loss rule and any
      // consistency requirement are what actually constrain them.
      parts.push(challenge.daily_drawdown_pct === null ? 1 : 0.75);
      parts.push(rules.consistency_rule === "required" ? 0.5 : rules.consistency_rule === "not_required" ? 1 : 0.6);
      notes.push(
        challenge.daily_drawdown_pct === null
          ? "No daily loss rule recorded"
          : `Daily loss limit of ${challenge.daily_drawdown_pct}%`,
      );
      break;
    case "mixed":
    default:
      // A mixed trader benefits from breadth: average permissiveness.
      parts.push(
        average([
          RULE_CREDIT[rules.scalping],
          RULE_CREDIT[rules.overnight],
          RULE_CREDIT[rules.news_trading],
        ]),
      );
      notes.push("Scored on overall rule flexibility");
      break;
  }

  // Holding period alignment is a second, independent signal.
  const holding = profile.holding_period;
  if (holding === "overnight" || holding === "several_days") {
    parts.push(RULE_CREDIT[rules.overnight]);
    notes.push(ruleNote("Holding positions overnight", rules.overnight));
  } else if (holding === "seconds" || holding === "minutes") {
    parts.push(RULE_CREDIT[rules.scalping]);
    notes.push(ruleNote("Very short holding times", rules.scalping));
  } else if (holding === "hours") {
    parts.push(1);
  }

  return { ratio: average(parts), notes };
};

const scoreRules: Scorer = ({ challenge, profile, req }) => {
  const rules = challenge.rules;
  const parts: number[] = [];
  const notes: string[] = [];

  if (req.needsNews) {
    parts.push(RULE_CREDIT[rules.news_trading]);
    notes.push(ruleNote("News trading", rules.news_trading));
  } else if (profile.news_trading === "sometimes") {
    // Occasional news traders care, but a restriction is not fatal.
    parts.push(Math.max(RULE_CREDIT[rules.news_trading], 0.6));
    notes.push(ruleNote("Occasional news trading", rules.news_trading));
  }

  if (req.needsOvernight) {
    parts.push(RULE_CREDIT[rules.overnight]);
    notes.push(ruleNote("Overnight positions", rules.overnight));
  }
  if (req.needsWeekend) {
    parts.push(RULE_CREDIT[rules.weekend]);
    notes.push(ruleNote("Weekend holding", rules.weekend));
  }
  if (req.needsEa) {
    parts.push(RULE_CREDIT[rules.ea_allowed]);
    notes.push(ruleNote("EA / automation", rules.ea_allowed));
  }
  if (req.needsCopyTrading) {
    parts.push(RULE_CREDIT[rules.copy_trading]);
    notes.push(ruleNote("Copy trading", rules.copy_trading));
  }

  const priorities = profile.priorities ?? [];
  if (priorities.includes("no_consistency_rule")) {
    const credit =
      rules.consistency_rule === "not_required" ? 1 : rules.consistency_rule === "required" ? 0 : 0.4;
    parts.push(credit);
    notes.push(
      rules.consistency_rule === "not_required"
        ? "No consistency rule"
        : rules.consistency_rule === "required"
          ? "Has a consistency rule"
          : "Consistency rule not confirmed",
    );
  }
  if (priorities.includes("no_daily_loss_rule")) {
    const credit = challenge.daily_drawdown_pct === null ? 1 : 0.2;
    parts.push(credit);
    notes.push(
      challenge.daily_drawdown_pct === null
        ? "No daily loss rule recorded"
        : `Daily loss rule of ${challenge.daily_drawdown_pct}%`,
    );
  }
  if (priorities.includes("low_restrictions")) {
    parts.push(
      average([
        absenceCredit(rules.news_trading),
        absenceCredit(rules.overnight),
        absenceCredit(rules.weekend),
        absenceCredit(rules.ea_allowed),
        rules.consistency_rule === "not_required" ? 1 : rules.consistency_rule === "required" ? 0.3 : 0.5,
      ]),
    );
    notes.push("Scored on overall restrictiveness");
  }

  // Nothing specific to check means the rules simply do not stand in the way.
  if (parts.length === 0) {
    return { ratio: 0.85, notes: ["No rule conflicts with the preferences you gave us"] };
  }

  return { ratio: average(parts), notes };
};

const scoreBudget: Scorer = ({ challenge, req, ctx }) => {
  if (challenge.price === null) {
    return { ratio: 0.4, notes: ["Price not confirmed"] };
  }

  const notes = [`Entry price ${formatMoney(challenge.price, challenge.currency)}`];

  // Cheaper inside the candidate set scores higher. Fitting the stated budget
  // at all is already worth a baseline, since the alternative was elimination.
  const relative = 1 - normalise(challenge.price, ctx.priceMin, ctx.priceMax);

  if (req.budgetCeiling === null) {
    return { ratio: 0.45 + relative * 0.55, notes };
  }

  const headroom = clamp(1 - challenge.price / req.budgetCeiling);
  return { ratio: clamp(0.5 + headroom * 0.25 + relative * 0.25), notes };
};

const scoreDrawdown: Scorer = ({ challenge, req, ctx, profile }) => {
  if (challenge.max_drawdown_pct === null) {
    return { ratio: 0.4, notes: ["Maximum drawdown not confirmed"] };
  }

  const notes = [`Maximum drawdown ${challenge.max_drawdown_pct}%`];

  const usable = usableDrawdown(challenge);
  const room = usable === null ? 0.5 : normalise(usable, ctx.usableMin, ctx.usableMax);
  const stability = drawdownStability(challenge);

  if (challenge.drawdown_type) {
    notes.push(`${challenge.drawdown_type.replace(/_/g, " ")} drawdown`);
  } else {
    notes.push("Drawdown type not confirmed");
  }
  if (challenge.profit_target_pct !== null) {
    const ratio = challenge.max_drawdown_pct / challenge.profit_target_pct;
    notes.push(`${ratio.toFixed(1)}x the profit target in loss budget`);
  }

  /*
   * Room and stability are weighted by what the trader is trying to do, which
   * is the whole reason a bigger headline drawdown is not automatically better.
   * Someone racing to a payout wants room to push. Someone protecting an
   * account wants a mechanic that will not fail them by accident — and for
   * them a huge trailing drawdown is worse than a modest static one.
   */
  const prioritisesStability = (profile.priorities ?? []).includes("static_drawdown");
  let roomWeight: number;
  if (prioritisesStability) roomWeight = 0.3;
  else if (req.approach === "protect" || req.riskStyle === "conservative") roomWeight = 0.4;
  else if (req.approach === "pass_fast" || req.riskStyle === "aggressive") roomWeight = 0.7;
  else roomWeight = 0.55;

  const ratio = room * roomWeight + stability * (1 - roomWeight);

  return { ratio: clamp(0.15 + ratio * 0.85), notes };
};

/**
 * How demanding the challenge is to clear, and how well that matches the pace
 * the trader chose.
 *
 * This is the criterion that gives the "pass quickly" answer something to bite
 * on: a low profit target and no minimum trading days are what actually make a
 * challenge fast, and neither was represented anywhere before.
 */
const scoreDifficulty: Scorer = ({ challenge, req, ctx }) => {
  const notes: string[] = [];
  const parts: { value: number; weight: number }[] = [];

  if (challenge.profit_target_pct === null) {
    notes.push("Profit target not confirmed");
    parts.push({ value: 0.4, weight: 2 });
  } else {
    const ease = 1 - normalise(challenge.profit_target_pct, ctx.targetMin, ctx.targetMax);
    notes.push(`${challenge.profit_target_pct}% profit target`);
    parts.push({ value: ease, weight: req.approach === "pass_fast" ? 2.5 : 2 });
  }

  const minDays = challenge.minimum_days;
  if (minDays === null) {
    notes.push("Minimum trading days not confirmed");
    parts.push({ value: 0.45, weight: 1 });
  } else if (minDays === 0) {
    notes.push("No minimum trading days");
    parts.push({ value: 1, weight: req.approach === "pass_fast" ? 2 : 1 });
  } else {
    const ease = 1 - normalise(minDays, ctx.minDaysMin, ctx.minDaysMax);
    notes.push(`${minDays} minimum trading days`);
    parts.push({ value: ease, weight: req.approach === "pass_fast" ? 2 : 1 });
  }

  // A capped window is pressure. It barely matters to someone sprinting, and
  // it matters a lot to someone who chose to take their time.
  if (challenge.maximum_days !== null) {
    notes.push(`${challenge.maximum_days} day limit to complete`);
    parts.push({
      value: req.approach === "protect" ? 0.25 : 0.7,
      weight: req.approach === "protect" ? 1.5 : 0.5,
    });
  } else {
    notes.push("No time limit recorded");
    parts.push({ value: 1, weight: req.approach === "protect" ? 1.5 : 0.5 });
  }

  // The phase count is real friction: a two-step evaluation is two chances to
  // fail before any payout.
  if (challenge.phases !== null) {
    const phaseEase = challenge.phases === 0 ? 1 : challenge.phases === 1 ? 0.8 : 0.5;
    notes.push(
      challenge.phases === 0 ? "Instant funding" : `${challenge.phases}-step evaluation`,
    );
    parts.push({ value: phaseEase, weight: req.approach === "pass_fast" ? 1.5 : 1 });
  }

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const ratio = totalWeight > 0 ? parts.reduce((sum, p) => sum + p.value * p.weight, 0) / totalWeight : 0.5;

  return { ratio: clamp(ratio), notes };
};

const scorePayout: Scorer = ({ challenge, ctx }) => {
  const parts: number[] = [];
  const notes: string[] = [];

  if (challenge.payout_frequency_days !== null) {
    // Faster payouts (fewer days) score higher.
    parts.push(1 - normalise(challenge.payout_frequency_days, ctx.payoutDaysMin, ctx.payoutDaysMax));
    notes.push(`Payouts every ${challenge.payout_frequency_days} days`);
  }
  if (challenge.payout_split_pct !== null) {
    parts.push(normalise(challenge.payout_split_pct, ctx.splitMin, ctx.splitMax));
    notes.push(`${challenge.payout_split_pct}% profit split`);
  }

  if (parts.length === 0) return { ratio: 0.4, notes: ["Payout terms not confirmed"] };
  return { ratio: clamp(0.3 + average(parts) * 0.7), notes };
};

const scoreAccountSize: Scorer = ({ challenge, req, profile }) => {
  if (req.desiredAccountSize === null) {
    // No stated preference: size should not push any challenge up or down.
    if ((profile.priorities ?? []).includes("large_account_size") && challenge.account_size) {
      return {
        ratio: clamp(challenge.account_size / 200_000),
        notes: [`${formatMoney(challenge.account_size)} account`],
      };
    }
    return { ratio: 0.8, notes: ["No account size preference given"] };
  }
  if (challenge.account_size === null) {
    return { ratio: 0.4, notes: ["Account size not confirmed"] };
  }

  const wanted = req.desiredAccountSize;
  const ratio = challenge.account_size / wanted;

  if (challenge.account_size === wanted) {
    return { ratio: 1, notes: [`Exactly the ${formatMoney(wanted)} size you asked for`] };
  }
  if (ratio >= 0.5 && ratio <= 2) {
    return {
      ratio: 0.6,
      notes: [`${formatMoney(challenge.account_size)} account, close to your ${formatMoney(wanted)} target`],
    };
  }
  return {
    ratio: 0.25,
    notes: [`${formatMoney(challenge.account_size)} account, away from your ${formatMoney(wanted)} target`],
  };
};

const scorePlatform: Scorer = ({ challenge, profile }) => {
  if (!profile.platform) return { ratio: 0.85, notes: ["No platform preference given"] };
  if (challenge.platforms.length === 0) {
    return { ratio: 0.4, notes: ["Platform support not confirmed"] };
  }
  const supported = challenge.platforms.some(
    (p) => p.toLowerCase() === profile.platform!.toLowerCase(),
  );
  return supported
    ? { ratio: 1, notes: [`Supports ${profile.platform}`] }
    : { ratio: 0.15, notes: [`Does not list ${profile.platform}`] };
};

/**
 * Data confidence is scored, not hidden.
 *
 * A challenge whose numbers we have verified against the firm's own rules page
 * is worth more to a trader than one assembled from unconfirmed reports, and
 * the score should say so.
 */
const scoreDataConfidence: Scorer = ({ challenge }) => {
  const CONFIDENCE_CREDIT: Record<string, number> = {
    verified: 1,
    trader_reported: 0.6,
    needs_review: 0.3,
    unknown: 0,
  };

  const keyFields = [
    "price",
    "account_size",
    "max_drawdown_pct",
    "profit_target_pct",
    "payout_frequency_days",
  ];
  const fieldScores = keyFields.map((f) => CONFIDENCE_CREDIT[challenge.confidence[f] ?? "unknown"]);

  const ruleValues = [
    challenge.rules.news_trading,
    challenge.rules.overnight,
    challenge.rules.weekend,
    challenge.rules.ea_allowed,
    challenge.rules.consistency_rule,
  ];
  const knownRules = ruleValues.filter((v) => v !== "unknown").length / ruleValues.length;

  const verifiedCount = fieldScores.filter((s) => s === 1).length;
  const notes: string[] = [];
  notes.push(`${verifiedCount} of ${keyFields.length} key figures verified`);
  if (challenge.last_verified_at) {
    notes.push(`Last verified ${new Date(challenge.last_verified_at).toLocaleDateString("en-US", { dateStyle: "medium" })}`);
  } else {
    notes.push("No verification date recorded");
  }

  return { ratio: clamp(average(fieldScores) * 0.6 + knownRules * 0.4), notes };
};

const SCORERS: Record<ScoreCriterion, Scorer> = {
  trading_style: scoreTradingStyle,
  rules: scoreRules,
  budget: scoreBudget,
  drawdown: scoreDrawdown,
  difficulty: scoreDifficulty,
  payout: scorePayout,
  account_size: scoreAccountSize,
  platform: scorePlatform,
  data_confidence: scoreDataConfidence,
};

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export function scoreChallenge(
  args: ScorerArgs,
  resolved: ResolvedWeights,
): { score: number; breakdown: CriterionScore[] } {
  const breakdown: CriterionScore[] = SCORE_CRITERIA.map((criterion) => {
    const { ratio, notes } = SCORERS[criterion](args);
    const available = resolved.weights[criterion];
    return {
      criterion,
      ratio: clamp(ratio),
      earned: clamp(ratio) * available,
      available,
      boosted: resolved.boosted.has(criterion),
      notes,
    };
  });

  const earned = breakdown.reduce((sum, b) => sum + b.earned, 0);
  const available = breakdown.reduce((sum, b) => sum + b.available, 0);
  const score = available > 0 ? Math.round((earned / available) * 100) : 0;

  return { score, breakdown };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function ruleNote(subject: string, status: RuleStatus | string): string {
  switch (status) {
    case "allowed":
      return `${subject}: allowed`;
    case "restricted":
      return `${subject}: restricted`;
    case "prohibited":
      return `${subject}: prohibited`;
    default:
      return `${subject}: not confirmed`;
  }
}
