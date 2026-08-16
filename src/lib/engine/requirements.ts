import {
  BUDGET_CEILING,
  type Budget,
  type ChallengeRecord,
  type EliminationReason,
  type Market,
  type TraderProfile,
} from "../types";

/**
 * The trader's hard requirements, derived once from their answers.
 *
 * Some requirements are stated directly ("I need overnight positions") and
 * some are implied ("I hold for several days"). Deriving them in one place
 * means the filters, the explanations, and the no-match diagnostics all
 * reason about exactly the same set.
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
}

export function deriveRequirements(profile: Partial<TraderProfile>): DerivedRequirements {
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
  };
}

/**
 * Stage 1 — hard filtering.
 *
 * Returns every requirement this challenge fundamentally conflicts with. An
 * empty array means the challenge is eligible for scoring.
 *
 * Deliberate policy on unknown rules: only `prohibited` eliminates. A rule we
 * have not confirmed is not evidence of a conflict, so the challenge survives
 * — but it loses points in scoring and the trader sees an explicit warning
 * that the rule is unconfirmed. Silently treating unknown as "allowed" would
 * be dishonest; treating it as "prohibited" would hide real options.
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

  return out;
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
