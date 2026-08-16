import {
  BUDGET_CEILING,
  DEAL_BREAKER_LABELS,
  type Budget,
  type ChallengeApproach,
  type ChallengeRecord,
  type DealBreaker,
  type EliminationReason,
  type Market,
  type RiskStyle,
  type TraderProfile,
} from "../types";

/**
 * The trader's hard requirements, derived once from their answers.
 *
 * Some requirements are stated directly ("I need overnight positions"), some
 * are implied ("I hold for several days"), and some are declared outright as
 * deal-breakers. Deriving them in one place means the filters, the
 * explanations, and the no-match diagnostics all reason about the same set.
 */
export interface DerivedRequirements {
  market: Market | null;
  needsOvernight: boolean;
  needsWeekend: boolean;
  needsNews: boolean;
  needsEa: boolean;
  needsCopyTrading: boolean;
  budgetCeiling: number | null;
  budgetBand: Budget | null;
  desiredAccountSize: number | null;
  approach: ChallengeApproach;
  riskStyle: RiskStyle;
  dealBreakers: Set<DealBreaker>;
  /**
   * Price above which a challenge counts as a "high fee" for this trader.
   * Relative, because "expensive" only means anything next to the alternatives.
   */
  highFeeThreshold: number | null;
}

export function deriveRequirements(
  profile: Partial<TraderProfile>,
  options: { highFeeThreshold?: number | null } = {},
): DerivedRequirements {
  const holding = profile.holding_period ?? null;

  // Holding overnight or for several days implies an overnight requirement,
  // unless the trader explicitly told us they don't need it.
  const impliedOvernight = holding === "overnight" || holding === "several_days";
  const needsOvernight =
    profile.overnight_required === "yes" ||
    (impliedOvernight && profile.overnight_required !== "no");

  // Several-day holds cross a weekend sooner or later.
  const needsWeekend =
    profile.weekend_required === true ||
    (holding === "several_days" && profile.weekend_required !== false);

  const desiredSize =
    profile.desired_account_size && profile.desired_account_size !== "no_preference"
      ? Number(profile.desired_account_size)
      : null;

  return {
    market:
      profile.market && profile.market !== "multiple" ? (profile.market as Market) : null,
    needsOvernight,
    needsWeekend,
    needsNews:
      profile.news_trading === "frequently" || profile.trading_style === "news_trading",
    needsEa: profile.ea_required === true || profile.trading_style === "algorithmic",
    needsCopyTrading: profile.trading_style === "copy_trading",
    budgetCeiling: profile.budget ? BUDGET_CEILING[profile.budget] : null,
    budgetBand: profile.budget ?? null,
    desiredAccountSize: Number.isFinite(desiredSize) ? desiredSize : null,
    approach: profile.challenge_approach ?? "normal",
    riskStyle: profile.risk_style ?? "balanced",
    dealBreakers: new Set(profile.deal_breakers ?? []),
    highFeeThreshold: options.highFeeThreshold ?? null,
  };
}

/**
 * Stage 1 — hard filtering.
 *
 * Returns every requirement this challenge fundamentally conflicts with. An
 * empty array means the challenge is eligible for scoring.
 *
 * Two sources of elimination, and the difference is deliberate:
 *
 *  - DERIVED requirements come from how the trader says they trade. These only
 *    eliminate on a confirmed `prohibited`, because an unconfirmed rule is not
 *    evidence of a conflict — it costs points and raises a warning instead.
 *
 *  - DEAL-BREAKERS are stated outright, so they are applied strictly. Someone
 *    who names trailing drawdown a deal-breaker should never see a trailing
 *    drawdown challenge, and a merely `restricted` news policy is still a
 *    restriction they told us they will not accept.
 */
export function hardFilter(
  challenge: ChallengeRecord,
  req: DerivedRequirements,
): EliminationReason[] {
  const out: EliminationReason[] = [];
  const rules = challenge.rules;

  if (req.market && challenge.markets.length > 0 && !challenge.markets.includes(req.market)) {
    out.push({
      requirement: "market",
      message: `This challenge does not cover ${labelMarket(req.market)}.`,
    });
  }

  if (req.needsOvernight && rules.overnight === "prohibited") {
    out.push({
      requirement: "overnight_required",
      message: "Overnight positions are prohibited, and your holding style needs them.",
    });
  }

  if (req.needsWeekend && rules.weekend === "prohibited") {
    out.push({
      requirement: "weekend_required",
      message: "Weekend holding is prohibited, and you hold positions across weekends.",
    });
  }

  if (req.needsNews && rules.news_trading === "prohibited") {
    out.push({
      requirement: "news_trading",
      message: "Trading around major news releases is prohibited on this challenge.",
    });
  }

  if (req.needsEa && rules.ea_allowed === "prohibited") {
    out.push({
      requirement: "ea_required",
      message: "Automated trading (EAs) is prohibited on this challenge.",
    });
  }

  if (req.needsCopyTrading && rules.copy_trading === "prohibited") {
    out.push({
      requirement: "copy_trading",
      message: "Copy trading is prohibited on this challenge.",
    });
  }

  // An unconfirmed price cannot be filtered on — it is flagged as a warning
  // during scoring instead.
  if (req.budgetCeiling !== null && challenge.price !== null && challenge.price > req.budgetCeiling) {
    out.push({
      requirement: "budget",
      message: `The entry price is above your ${formatMoney(req.budgetCeiling, challenge.currency)} budget.`,
    });
  }

  out.push(...dealBreakerFailures(challenge, req));

  return out;
}

function dealBreakerFailures(
  challenge: ChallengeRecord,
  req: DerivedRequirements,
): EliminationReason[] {
  const out: EliminationReason[] = [];
  const rules = challenge.rules;
  const has = (breaker: DealBreaker) => req.dealBreakers.has(breaker);

  const trailing =
    challenge.drawdown_type === "trailing" ||
    challenge.drawdown_type === "eod_trailing" ||
    challenge.drawdown_type === "intraday_trailing";

  if (has("trailing_drawdown") && trailing) {
    out.push({
      requirement: "deal_breaker:trailing_drawdown",
      message: `You marked trailing drawdown as a deal-breaker, and this challenge uses ${labelDrawdownType(challenge.drawdown_type)} drawdown.`,
    });
  }

  if (has("daily_loss_limit") && challenge.daily_drawdown_pct !== null) {
    out.push({
      requirement: "deal_breaker:daily_loss_limit",
      message: `You marked daily loss limits as a deal-breaker, and this challenge has a ${challenge.daily_drawdown_pct}% daily limit.`,
    });
  }

  if (
    has("news_restrictions") &&
    (rules.news_trading === "prohibited" || rules.news_trading === "restricted")
  ) {
    out.push({
      requirement: "deal_breaker:news_restrictions",
      message: `You marked news restrictions as a deal-breaker, and news trading is ${rules.news_trading} here.`,
    });
  }

  if (
    has("overnight_restrictions") &&
    (rules.overnight === "prohibited" || rules.overnight === "restricted")
  ) {
    out.push({
      requirement: "deal_breaker:overnight_restrictions",
      message: `You marked overnight restrictions as a deal-breaker, and overnight holding is ${rules.overnight} here.`,
    });
  }

  if (has("minimum_trading_days") && challenge.minimum_days !== null && challenge.minimum_days > 0) {
    out.push({
      requirement: "deal_breaker:minimum_trading_days",
      message: `You marked minimum trading days as a deal-breaker, and this challenge requires ${challenge.minimum_days}.`,
    });
  }

  if (has("consistency_rule") && rules.consistency_rule === "required") {
    const pct = rules.consistency_pct ? ` (${rules.consistency_pct}%)` : "";
    out.push({
      requirement: "deal_breaker:consistency_rule",
      message: `You marked consistency rules as a deal-breaker, and this challenge has one${pct}.`,
    });
  }

  if (
    has("high_fees") &&
    req.highFeeThreshold !== null &&
    challenge.price !== null &&
    challenge.price > req.highFeeThreshold
  ) {
    out.push({
      requirement: "deal_breaker:high_fees",
      message: `You marked high fees as a deal-breaker, and at ${formatMoney(challenge.price, challenge.currency)} this is above the ${formatMoney(req.highFeeThreshold)} midpoint for challenges you could otherwise buy.`,
    });
  }

  return out;
}

/** Readable drawdown-type names, so generated sentences stay grammatical. */
export function labelDrawdownType(type: string | null): string {
  const labels: Record<string, string> = {
    static: "a static",
    trailing: "a trailing",
    eod_trailing: "an end-of-day trailing",
    intraday_trailing: "an intraday trailing",
  };
  return type ? (labels[type] ?? `a ${type.replace(/_/g, " ")}`) : "an unconfirmed";
}

export function labelMarket(market: string): string {
  const labels: Record<string, string> = {
    futures: "futures",
    forex: "forex",
    cfd: "CFDs",
    crypto: "crypto",
    multiple: "multiple markets",
  };
  return labels[market] ?? market;
}

export function formatMoney(value: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${Math.round(value).toLocaleString("en-US")}`;
}

/** Human-readable name for a requirement key, used in the no-match screen. */
export const REQUIREMENT_LABELS: Record<string, string> = {
  market: "Market",
  overnight_required: "Overnight holding",
  weekend_required: "Weekend holding",
  news_trading: "News trading",
  ea_required: "Automated trading",
  copy_trading: "Copy trading",
  budget: "Budget",
};

export function requirementLabel(requirement: string): string {
  if (requirement.startsWith("deal_breaker:")) {
    const key = requirement.slice("deal_breaker:".length) as DealBreaker;
    return `Deal-breaker: ${DEAL_BREAKER_LABELS[key] ?? key}`;
  }
  return REQUIREMENT_LABELS[requirement] ?? requirement;
}
