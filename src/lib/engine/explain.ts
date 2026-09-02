import type { ChallengeRecord, CriterionScore, TraderProfile } from "../types";
import { PRIORITY_LABELS } from "../types";
import type { DerivedRequirements } from "./requirements";
import { formatMoney, labelMarket } from "./requirements";
import { APPROACH_LABELS } from "./weights";

/**
 * Explanations are generated from the trader's answers and the challenge's
 * structured fields — never written per challenge, never paraphrased by a
 * language model. If a sentence appears here, a specific stored value and a
 * specific answer produced it, which is what makes the score auditable.
 */

export function buildReasons(
  challenge: ChallengeRecord,
  profile: Partial<TraderProfile>,
  req: DerivedRequirements,
  breakdown: CriterionScore[],
): string[] {
  const reasons: string[] = [];
  const rules = challenge.rules;
  const by = (criterion: string) => breakdown.find((b) => b.criterion === criterion);

  if (req.market && challenge.markets.includes(req.market)) {
    reasons.push(`Covers ${labelMarket(req.market)}, the market you trade.`);
  }

  const style = by("trading_style");
  if (style && style.ratio >= 0.75 && profile.trading_style) {
    reasons.push(`Rules are compatible with ${styleLabel(profile.trading_style)}.`);
  }

  if (req.budgetCeiling !== null && challenge.price !== null && challenge.price <= req.budgetCeiling) {
    reasons.push(
      `Costs ${formatMoney(challenge.price, challenge.currency)}, inside your ${formatMoney(req.budgetCeiling, challenge.currency)} budget.`,
    );
  }

  if (req.needsOvernight && rules.overnight === "allowed") {
    reasons.push("Allows overnight positions, which your holding style needs.");
  }
  if (req.needsWeekend && rules.weekend === "allowed") {
    reasons.push("Allows holding through the weekend.");
  }
  if (req.needsNews && rules.news_trading === "allowed") {
    reasons.push("Permits trading around major news releases.");
  }
  if (req.needsEa && rules.ea_allowed === "allowed") {
    reasons.push("Permits automated trading.");
  }
  if (req.needsCopyTrading && rules.copy_trading === "allowed") {
    reasons.push("Permits copy trading.");
  }

  if (
    req.desiredAccountSize !== null &&
    challenge.account_size === req.desiredAccountSize
  ) {
    reasons.push(`Offers the ${formatMoney(req.desiredAccountSize)} account size you asked for.`);
  }

  if (profile.platform && challenge.platforms.some((p) => p.toLowerCase() === profile.platform!.toLowerCase())) {
    reasons.push(`Available on ${profile.platform}.`);
  }

  // The approach the trader chose, where this challenge genuinely serves it.
  const difficulty = by("difficulty");
  if (difficulty && difficulty.ratio >= 0.7 && req.approach === "pass_fast") {
    reasons.push(
      `Structured to be cleared quickly — ${difficulty.notes.slice(0, 2).join(", ").toLowerCase()} — which matches your aim to ${APPROACH_LABELS.pass_fast}.`,
    );
  }
  if (req.approach === "protect" && challenge.drawdown_type === "static") {
    reasons.push(
      "A static drawdown will not tighten against you as the account grows, which suits taking your time.",
    );
  }
  const drawdownScore = by("drawdown");
  if (
    drawdownScore &&
    drawdownScore.ratio >= 0.7 &&
    challenge.max_drawdown_pct !== null &&
    challenge.profit_target_pct !== null
  ) {
    reasons.push(
      `Gives you ${(challenge.max_drawdown_pct / challenge.profit_target_pct).toFixed(1)}x your profit target in usable loss budget.`,
    );
  }

  // Priorities the trader named and this challenge actually delivers on.
  for (const priority of profile.priorities ?? []) {
    const delivered = priorityDelivered(priority, challenge, breakdown);
    if (delivered) reasons.push(delivered);
  }

  return dedupe(reasons);
}

function priorityDelivered(
  priority: string,
  challenge: ChallengeRecord,
  breakdown: CriterionScore[],
): string | null {
  const by = (criterion: string) => breakdown.find((b) => b.criterion === criterion);

  switch (priority) {
    case "large_drawdown": {
      const dd = by("drawdown");
      if (dd && dd.ratio >= 0.7 && challenge.max_drawdown_pct !== null) {
        return `Drawdown of ${challenge.max_drawdown_pct}% is on the roomier end of your options — one of your stated priorities.`;
      }
      return null;
    }
    case "static_drawdown":
      return challenge.drawdown_type === "static"
        ? "Static drawdown rather than trailing — one of your stated priorities."
        : null;
    case "low_profit_target": {
      const diff = by("difficulty");
      if (diff && diff.ratio >= 0.65 && challenge.profit_target_pct !== null) {
        return `A ${challenge.profit_target_pct}% profit target, among the lower ones available to you — one of your stated priorities.`;
      }
      return null;
    }
    case "low_price": {
      const budget = by("budget");
      if (budget && budget.ratio >= 0.75 && challenge.price !== null) {
        return `At ${formatMoney(challenge.price, challenge.currency)} it is among the cheaper compatible options — one of your stated priorities.`;
      }
      return null;
    }
    case "fast_payouts": {
      if (challenge.payout_frequency_days !== null && challenge.payout_frequency_days <= 14) {
        return `Payouts every ${challenge.payout_frequency_days} days — one of your stated priorities.`;
      }
      return null;
    }
    case "no_consistency_rule":
      return challenge.rules.consistency_rule === "not_required"
        ? "No consistency rule — one of your stated priorities."
        : null;
    case "no_daily_loss_rule":
      return challenge.daily_drawdown_pct === null
        ? "No daily loss rule recorded — one of your stated priorities."
        : null;
    case "large_account_size":
      return challenge.account_size !== null && challenge.account_size >= 100_000
        ? `${formatMoney(challenge.account_size)} account — one of your stated priorities.`
        : null;
    default:
      return null;
  }
}

/**
 * Caveats. Every recommendation shows at least one when a real trade-off
 * exists, so a result never reads like an advertisement.
 */
export function buildWarnings(
  challenge: ChallengeRecord,
  profile: Partial<TraderProfile>,
  req: DerivedRequirements,
): string[] {
  const warnings: string[] = [];
  const rules = challenge.rules;

  if (challenge.price === null) {
    warnings.push("The entry price is not confirmed — check it on the firm's own page before buying.");
  }

  /*
   * The budget criterion compares one number, so a recurring fee and a one-off
   * fee score as if they were the same kind of cost. They are not: a $170/month
   * evaluation costs more than a $400 one-off by the third month. Rather than
   * quietly reweighting price, which would make the score harder to audit, the
   * trader is told what they are looking at.
   */
  if (challenge.billing_type === "monthly" && challenge.price !== null) {
    warnings.push(
      `The $${challenge.price} price is charged monthly, not once — it keeps billing until you pass or cancel, so compare it against one-off fees over the time you expect to take.`,
    );
  }

  const restricted: string[] = [];
  if (req.needsOvernight && rules.overnight === "restricted") restricted.push("overnight positions");
  if (req.needsWeekend && rules.weekend === "restricted") restricted.push("weekend holding");
  if (req.needsNews && rules.news_trading === "restricted") restricted.push("news trading");
  if (req.needsEa && rules.ea_allowed === "restricted") restricted.push("automated trading");
  if (restricted.length) {
    warnings.push(
      `This challenge restricts ${joinList(restricted)} rather than allowing it outright — read the conditions carefully.`,
    );
  }

  const unconfirmed: string[] = [];
  if (req.needsOvernight && rules.overnight === "unknown") unconfirmed.push("overnight holding");
  if (req.needsWeekend && rules.weekend === "unknown") unconfirmed.push("weekend holding");
  if (req.needsNews && rules.news_trading === "unknown") unconfirmed.push("news trading");
  if (req.needsEa && rules.ea_allowed === "unknown") unconfirmed.push("automated trading");
  if (unconfirmed.length) {
    warnings.push(
      `We have not confirmed this firm's rules on ${joinList(unconfirmed)}, and you told us it matters to you.`,
    );
  }

  if (rules.consistency_rule === "required") {
    const pct = rules.consistency_pct ? ` (${rules.consistency_pct}%)` : "";
    warnings.push(`This challenge has a consistency rule${pct}, which limits how much of your profit can come from one day.`);
  }

  if (challenge.drawdown_type === "trailing" || challenge.drawdown_type === "intraday_trailing") {
    warnings.push("The drawdown trails your balance, so unrealised profit can move your loss limit against you.");
  }

  // A headline drawdown that shrinks once the mechanics are accounted for.
  if (
    challenge.max_drawdown_pct !== null &&
    challenge.profit_target_pct !== null &&
    challenge.max_drawdown_pct / challenge.profit_target_pct < 1
  ) {
    warnings.push(
      `You have less loss budget (${challenge.max_drawdown_pct}%) than the profit you must make (${challenge.profit_target_pct}%), so the margin for error is thin.`,
    );
  }

  if (req.approach === "pass_fast" && challenge.minimum_days !== null && challenge.minimum_days >= 10) {
    warnings.push(
      `You want to pass quickly, but this challenge requires at least ${challenge.minimum_days} trading days.`,
    );
  }

  if (req.approach === "protect" && challenge.maximum_days !== null) {
    warnings.push(
      `You want to take your time, but this challenge must be completed within ${challenge.maximum_days} days.`,
    );
  }

  if (req.approach === "pass_fast" && challenge.phases !== null && challenge.phases >= 2) {
    warnings.push(
      "This is a two-step evaluation, so there are two hurdles before any payout.",
    );
  }

  if (challenge.daily_drawdown_pct !== null && (profile.priorities ?? []).includes("no_daily_loss_rule")) {
    warnings.push(`There is a ${challenge.daily_drawdown_pct}% daily loss rule, and you asked for challenges without one.`);
  }

  if (!challenge.last_verified_at) {
    warnings.push("This challenge has no recorded verification date — treat the figures as unconfirmed.");
  } else if (isStale(challenge.last_verified_at)) {
    warnings.push("Some information here is more than 90 days old and may need re-verification.");
  }

  return dedupe(warnings);
}

/**
 * A caveat that only exists relative to another result — e.g. "stricter
 * payouts than your second-best option". Computed after ranking.
 */
export function comparativeWarning(
  challenge: ChallengeRecord,
  alternative: ChallengeRecord | undefined,
): string | null {
  if (!alternative) return null;

  if (
    challenge.payout_frequency_days !== null &&
    alternative.payout_frequency_days !== null &&
    challenge.payout_frequency_days > alternative.payout_frequency_days
  ) {
    return `Payouts come every ${challenge.payout_frequency_days} days here versus ${alternative.payout_frequency_days} on ${alternative.firm.name}'s ${alternative.name}.`;
  }

  if (
    challenge.price !== null &&
    alternative.price !== null &&
    challenge.price > alternative.price
  ) {
    return `It costs ${formatMoney(challenge.price - alternative.price, challenge.currency)} more than your next-best match.`;
  }

  if (
    challenge.max_drawdown_pct !== null &&
    alternative.max_drawdown_pct !== null &&
    challenge.max_drawdown_pct < alternative.max_drawdown_pct
  ) {
    return `Its ${challenge.max_drawdown_pct}% drawdown gives you less room than the ${alternative.max_drawdown_pct}% on your next-best match.`;
  }

  return null;
}

/** "Who is this challenge for?" — derived from stored fields, not prose. */
export function audienceFit(challenge: ChallengeRecord): { suits: string[]; mayNotSuit: string[] } {
  const suits: string[] = [];
  const mayNotSuit: string[] = [];
  const rules = challenge.rules;

  if (challenge.max_drawdown_pct !== null && challenge.max_drawdown_pct >= 8) {
    suits.push("traders who want more drawdown room to work with");
  }
  if (challenge.drawdown_type === "static") {
    suits.push("traders who prefer a fixed loss limit over a trailing one");
  }
  if (rules.overnight === "allowed") suits.push("traders who hold positions overnight");
  if (rules.weekend === "allowed") suits.push("swing traders holding across weekends");
  if (rules.news_trading === "allowed") suits.push("traders who take positions around news releases");
  if (rules.ea_allowed === "allowed") suits.push("traders running automated strategies");
  if (rules.consistency_rule === "not_required") suits.push("traders who dislike consistency requirements");
  if (challenge.payout_frequency_days !== null && challenge.payout_frequency_days <= 14) {
    suits.push("traders who want frequent payouts");
  }

  if (rules.news_trading === "prohibited") mayNotSuit.push("news traders");
  if (rules.overnight === "prohibited") mayNotSuit.push("traders who need overnight positions");
  if (rules.weekend === "prohibited") mayNotSuit.push("traders holding through weekends");
  if (rules.ea_allowed === "prohibited") mayNotSuit.push("algorithmic traders");
  if (rules.consistency_rule === "required") mayNotSuit.push("traders who want no consistency rule");
  if (challenge.daily_drawdown_pct !== null) {
    mayNotSuit.push("traders who want no daily loss limit");
  }
  if (challenge.drawdown_type === "trailing" || challenge.drawdown_type === "intraday_trailing") {
    mayNotSuit.push("traders who find trailing drawdown hard to manage");
  }

  return { suits, mayNotSuit };
}

// ---------------------------------------------------------------------------

function styleLabel(style: string): string {
  const labels: Record<string, string> = {
    scalping: "scalping",
    day_trading: "day trading",
    swing_trading: "swing trading",
    news_trading: "news trading",
    algorithmic: "algorithmic trading",
    copy_trading: "copy trading",
    mixed: "a mixed trading style",
  };
  return labels[style] ?? style;
}

export function priorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

function isStale(iso: string): boolean {
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(iso).getTime() > NINETY_DAYS;
}
