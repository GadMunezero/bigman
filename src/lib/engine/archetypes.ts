import type {
  ChallengeRecord,
  ScoreCriterion,
  TraderProfile,
} from "../types";

/**
 * Trader archetypes — the layer that makes this a decision matrix rather than
 * a leaderboard.
 *
 * The governing idea, and the reason this file exists at all:
 *
 *   The importance of a rule depends on the trader's return distribution, not
 *   on the rule.
 *
 * "Is a consistency rule bad?" has no answer. For a trader whose P&L reads
 * +200, +250, +180, +300 it never binds and is worth nothing to avoid. For a
 * trader whose month is four flat days and one +$3,000 day it is the rule that
 * stops them withdrawing after they already hit the target. Same rule, same
 * account, opposite verdicts — so the engine has to know which trader it is
 * looking at before it can weight anything.
 *
 * Each archetype therefore carries three things:
 *
 *   - `detect`  how strongly this trader matches, 0..1, from their answers.
 *   - `weights` how matching reshapes the scoring model. Multipliers, applied
 *               before renormalisation, so a scalper and a swing trader score
 *               the same catalogue on genuinely different questions.
 *   - `fit`     what this archetype needs from a specific challenge, scored
 *               and explained. This is what the `archetype_fit` criterion
 *               reads, which is why the reasoning appears in the breakdown
 *               instead of being applied as an invisible multiplier.
 *
 * A trader is usually several archetypes at once — high R:R *and*
 * low-frequency *and* news-dependent is a perfectly ordinary combination. So
 * detection returns strengths rather than a single winner, and everything
 * downstream blends by strength.
 */

export const ARCHETYPES = [
  "scalper",
  "wide_stop",
  "lumpy_winner",
  "grinder",
  "swing",
  "news_dependent",
  "algorithmic",
  "low_frequency",
  "aggressive_risk",
  "conservative",
  "payout_maximiser",
  "cost_minimiser",
  "low_friction",
] as const;
export type ArchetypeId = (typeof ARCHETYPES)[number];

/** A rule this archetype needs, or must not have, stated for a trader to read. */
export interface FitRequirement {
  /** Short label: "No consistency rule", "Static or EOD drawdown". */
  label: string;
  /** Why it matters for this archetype, in one sentence. */
  because: string;
}

export interface ArchetypeFit {
  /** 0..1 — how well this challenge serves this archetype. */
  ratio: number;
  /** Things that fit, phrased for a trader. */
  supports: string[];
  /** Things that conflict. These become warnings. */
  conflicts: string[];
}

export interface Archetype {
  id: ArchetypeId;
  label: string;
  /** One sentence shown back to the trader as their profile. */
  summary: string;
  detect: (p: Partial<TraderProfile>) => number;
  weights: Partial<Record<ScoreCriterion, number>>;
  /** Ranked, most important first — the "what you should prioritise" list. */
  mustHave: FitRequirement[];
  avoid: FitRequirement[];
  fit: (c: ChallengeRecord) => ArchetypeFit;
}

// ---------------------------------------------------------------------------
// Reading a challenge
// ---------------------------------------------------------------------------

const isTrailing = (c: ChallengeRecord) =>
  c.drawdown_type === "trailing" || c.drawdown_type === "intraday_trailing";

const isIntradayTrailing = (c: ChallengeRecord) => c.drawdown_type === "intraday_trailing";

const isForgivingDrawdown = (c: ChallengeRecord) =>
  c.drawdown_type === "static" || c.drawdown_type === "eod_trailing";

const hasConsistency = (c: ChallengeRecord) => c.rules.consistency_rule === "required";

const consistencyPct = (c: ChallengeRecord) => c.rules.consistency_pct;

const minDays = (c: ChallengeRecord) => c.minimum_days ?? 0;

/**
 * Scores an unknown as the worse case rather than the middle.
 *
 * Used everywhere a missing figure could otherwise flatter a challenge. The
 * whole catalogue is unverified, so a mechanic that treated blanks as neutral
 * would let the least transparent firms drift to the top of every list.
 */
const UNKNOWN = 0.4;

/**
 * Blends the checks an archetype runs on one challenge.
 *
 * The minimum is weighted alongside the mean deliberately: an archetype with
 * four satisfied requirements and one disqualifying conflict is not 80% happy.
 * The conflict is the thing that decides whether the account is usable.
 */
function blend(parts: number[]): number {
  if (parts.length === 0) return 0.6;
  const mean = parts.reduce((a, b) => a + b, 0) / parts.length;
  const worst = Math.min(...parts);
  return mean * 0.6 + worst * 0.4;
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

const yes = (v: boolean, strength = 1) => (v ? strength : 0);
const strongest = (...values: number[]) => Math.max(0, ...values);

// ---------------------------------------------------------------------------
// The archetypes
// ---------------------------------------------------------------------------

export const ARCHETYPE_DEFINITIONS: Record<ArchetypeId, Archetype> = {
  scalper: {
    id: "scalper",
    label: "Scalper",
    summary:
      "Many trades a day, small stops, profit built up in small pieces. Needs room to keep operating, not a large nominal account.",
    detect: (p) =>
      strongest(
        yes(p.trading_style === "scalping", 1),
        yes(p.trade_frequency === "many_daily", 0.9),
        yes(p.holding_period === "seconds", 0.75),
        yes(p.holding_period === "minutes" && p.trade_frequency === "few_daily", 0.5),
      ),
    weights: { drawdown: 1.5, rules: 1.15, platform: 1.4, payout: 0.75, account_size: 0.6 },
    mustHave: [
      {
        label: "End-of-day or static drawdown",
        because:
          "An intraday trailing floor follows every equity spike, so a normal winning burst permanently raises the level you can be stopped out at.",
      },
      {
        label: "A daily loss limit you can actually trade inside",
        because: "Forty entries a day cannot fit through a cap sized for two.",
      },
    ],
    avoid: [
      {
        label: "Intraday trailing drawdown",
        because:
          "Going $50,000 to $51,000 and giving back $700 is a normal session for you, and an intraday model treats it as a much bigger event than a static one.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      if (isIntradayTrailing(c)) {
        parts.push(0.1);
        conflicts.push(
          "Intraday trailing drawdown — the floor moves with every equity spike, which is exactly what high-frequency trading produces.",
        );
      } else if (isForgivingDrawdown(c)) {
        parts.push(1);
        supports.push(
          `${c.drawdown_type === "static" ? "Static" : "End-of-day"} drawdown, which does not react to intraday equity swings.`,
        );
      } else if (c.drawdown_type === "trailing") {
        parts.push(0.4);
        conflicts.push("Trailing drawdown follows your equity up between sessions.");
      } else {
        parts.push(UNKNOWN);
        conflicts.push("The drawdown mechanic is not confirmed, and it is the rule that decides this one.");
      }

      // A daily cap that is a small slice of the total rations the account.
      if (c.daily_drawdown_pct !== null && c.max_drawdown_pct !== null && c.max_drawdown_pct > 0) {
        const share = c.daily_drawdown_pct / c.max_drawdown_pct;
        parts.push(Math.min(1, 0.3 + share * 1.6));
        if (share < 0.3) {
          conflicts.push(
            `The daily limit is only ${Math.round(share * 100)}% of the total drawdown, which rations how much you can trade in a session.`,
          );
        } else {
          supports.push("The daily loss limit leaves usable room inside a session.");
        }
      } else if (c.daily_drawdown_pct === null) {
        parts.push(0.85);
        supports.push("No daily loss limit recorded, so a bad hour does not end the day.");
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  wide_stop: {
    id: "wide_stop",
    label: "Wide-stop trader",
    summary:
      "Few trades, large risk on each, a wide spread of outcomes. Needs absolute buffer more than anything else.",
    detect: (p) =>
      strongest(
        yes(p.risk_width === "wide", 1),
        yes(p.risk_width === "moderate" && p.trade_frequency === "few_daily", 0.4),
      ),
    weights: { drawdown: 1.75, difficulty: 0.85, budget: 0.8, account_size: 1.2, payout: 0.7 },
    mustHave: [
      {
        label: "A large maximum drawdown in dollars, not percent",
        because: "One ordinary losing trade should never be a meaningful share of the account's life.",
      },
      {
        label: "A generous daily loss limit",
        because: "A $500 loser against a $750 daily cap means one trade ends your day.",
      },
    ],
    avoid: [
      {
        label: "A tight daily loss rule",
        because:
          "A $50K account with a $1,500 max drawdown and a $750 daily cap is incompatible with your strategy however good the profit split is.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      if (c.max_drawdown_pct === null) {
        parts.push(UNKNOWN);
        conflicts.push("The maximum drawdown is not confirmed, and it is the number your strategy lives on.");
      } else {
        // 4% is roughly the futures norm; below 3% is tight for a wide-stop trader.
        parts.push(Math.min(1, c.max_drawdown_pct / 5));
        if (c.max_drawdown_pct >= 5) {
          supports.push(`A ${c.max_drawdown_pct}% maximum drawdown gives your stop width somewhere to live.`);
        } else if (c.max_drawdown_pct < 3) {
          conflicts.push(
            `A ${c.max_drawdown_pct}% maximum drawdown is thin for a strategy that risks a lot per trade.`,
          );
        }
      }

      if (c.daily_drawdown_pct !== null && c.max_drawdown_pct !== null && c.max_drawdown_pct > 0) {
        const share = c.daily_drawdown_pct / c.max_drawdown_pct;
        parts.push(Math.min(1, 0.25 + share * 1.7));
        if (share < 0.35) {
          conflicts.push(
            `The daily limit is ${c.daily_drawdown_pct}% against a ${c.max_drawdown_pct}% total — a single wide stop can use most of a day.`,
          );
        }
      } else if (c.daily_drawdown_pct === null) {
        parts.push(1);
        supports.push("No daily loss limit recorded, so the full drawdown is available when you need it.");
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  lumpy_winner: {
    id: "lumpy_winner",
    label: "High R:R / one-big-day trader",
    summary:
      "Many small losses and occasional large winners. A legitimate edge with a lopsided return distribution — and the one profile a consistency rule can defeat outright.",
    detect: (p) =>
      strongest(
        yes(p.profit_shape === "one_big_day", 1),
        yes(p.profit_shape === "mixed", 0.45),
        yes(p.trading_style === "news_trading" && p.profit_shape !== "even", 0.35),
      ),
    weights: { rules: 1.5, drawdown: 1.25, difficulty: 0.9, payout: 0.9, account_size: 0.8 },
    mustHave: [
      {
        label: "No consistency rule",
        because:
          "You can hit the profit target and still be unable to withdraw, because the day that got you there was too large a share of the total.",
      },
    ],
    avoid: [
      {
        label: "A 30–40% best-day rule",
        because:
          "A month of +$100, -$50, +$200, +$50, +$3,000 is your strategy working correctly. A best-day cap calls that a failure.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      // The ordering the research asks for: none > 50% > 40% > 30%.
      if (c.rules.consistency_rule === "not_required") {
        parts.push(1);
        supports.push("No consistency rule, so one outsized day cannot block your payout.");
      } else if (hasConsistency(c)) {
        const pct = consistencyPct(c);
        if (pct === null) {
          parts.push(0.2);
          conflicts.push(
            "There is a consistency rule and the percentage is not recorded — for your return shape that is the rule most likely to stop a withdrawal.",
          );
        } else {
          // 50% is survivable, 30% usually is not.
          parts.push(Math.max(0, Math.min(1, (pct - 20) / 40)));
          conflicts.push(
            `A ${pct}% consistency rule caps what one day may contribute, and your best day routinely exceeds that share.`,
          );
        }
      } else {
        parts.push(UNKNOWN);
        conflicts.push("Whether there is a consistency rule is not confirmed — check before buying.");
      }

      if (c.max_drawdown_pct !== null) {
        parts.push(Math.min(1, 0.4 + c.max_drawdown_pct / 10));
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  grinder: {
    id: "grinder",
    label: "Consistent daily earner",
    summary:
      "Smooth, repeatable daily P&L. Consistency rules and trailing drawdowns barely touch you, so the decision moves to cost and payout terms.",
    detect: (p) =>
      strongest(
        yes(p.profit_shape === "even", 1),
        yes(p.profit_shape === "even" && p.trade_frequency === "many_daily", 1),
      ),
    weights: { budget: 1.45, payout: 1.5, rules: 0.75, drawdown: 0.85, data_confidence: 1.1 },
    mustHave: [
      {
        label: "Low total cost to reach a payout",
        because: "Your rules risk is low, so price and payout terms are what actually separate the options.",
      },
    ],
    avoid: [
      {
        label: "Paying a premium for permissions you do not use",
        because:
          "A large drawdown and a no-consistency rule are worth real money to some traders. For your distribution they are close to free.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      if (c.price !== null) {
        parts.push(c.price <= 150 ? 1 : c.price <= 300 ? 0.7 : 0.45);
        if (c.price <= 150) supports.push(`At ${c.currency === "USD" ? "$" : ""}${c.price} the entry cost is low, which is what matters most for you.`);
      } else {
        parts.push(UNKNOWN);
        conflicts.push("The price is not confirmed, and price is your main lever.");
      }

      if (c.payout_frequency_days !== null) {
        parts.push(c.payout_frequency_days <= 7 ? 1 : c.payout_frequency_days <= 14 ? 0.75 : 0.5);
        if (c.payout_frequency_days <= 7) {
          supports.push(`Payouts every ${c.payout_frequency_days} days suit a steady daily edge.`);
        }
      } else {
        parts.push(0.55);
      }

      if (hasConsistency(c)) {
        supports.push("The consistency rule is unlikely to bind on an even daily P&L.");
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  swing: {
    id: "swing",
    label: "Swing trader",
    summary:
      "Positions held overnight and often across weekends. Holding permission outranks profit split, and a moving drawdown floor is a structural problem.",
    detect: (p) =>
      strongest(
        yes(p.trading_style === "swing_trading", 1),
        yes(p.holding_period === "several_days", 0.95),
        yes(p.holding_period === "overnight", 0.8),
        yes(p.overnight_required === "yes", 0.7),
      ),
    weights: { rules: 1.6, drawdown: 1.3, payout: 0.85, platform: 0.7, difficulty: 0.9 },
    mustHave: [
      {
        label: "Overnight holding allowed",
        because: "Without it the strategy simply cannot be run, whatever else the account offers.",
      },
      {
        label: "Static or end-of-day drawdown",
        because:
          "A static floor does not move up just because an open position is temporarily in profit — which is the normal state of a multi-day trade.",
      },
      {
        label: "Weekend holding allowed",
        because: "A three-day hold crosses a Friday sooner or later.",
      },
    ],
    avoid: [
      {
        label: "Intraday trailing drawdown",
        because:
          "It measures your account at its best tick, including the unrealised profit of a position you have not closed yet.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      const overnight = c.rules.overnight;
      parts.push(overnight === "allowed" ? 1 : overnight === "restricted" ? 0.45 : overnight === "prohibited" ? 0 : UNKNOWN);
      if (overnight === "allowed") supports.push("Overnight holding is allowed.");
      else if (overnight === "prohibited") conflicts.push("Overnight holding is prohibited.");
      else if (overnight === "unknown") conflicts.push("Overnight holding is not confirmed.");

      const weekend = c.rules.weekend;
      parts.push(weekend === "allowed" ? 1 : weekend === "restricted" ? 0.5 : weekend === "prohibited" ? 0.15 : UNKNOWN);
      if (weekend === "prohibited") conflicts.push("Weekend holding is prohibited.");

      if (isIntradayTrailing(c)) {
        parts.push(0.15);
        conflicts.push("Intraday trailing drawdown counts the unrealised profit of an open multi-day position.");
      } else if (c.drawdown_type === "static") {
        parts.push(1);
        supports.push("Static drawdown — the floor stays where it started while a position matures.");
      } else if (c.drawdown_type === "eod_trailing") {
        parts.push(0.8);
        supports.push("End-of-day trailing, which only moves on closed balances.");
      } else {
        parts.push(UNKNOWN);
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  news_dependent: {
    id: "news_dependent",
    label: "News / event trader",
    summary:
      "The edge lives around CPI, NFP, FOMC and similar releases. News permission is not a preference here, it is whether the strategy is legal on the account.",
    detect: (p) =>
      strongest(
        yes(p.trading_style === "news_trading", 1),
        yes(p.news_trading === "frequently", 0.95),
        yes(p.news_trading === "sometimes", 0.35),
      ),
    weights: { rules: 1.8, drawdown: 1.2, payout: 0.8, budget: 0.85, platform: 0.8 },
    mustHave: [
      {
        label: "News trading allowed",
        because:
          "A restriction here is the firm saying your strategy may not be used. No profit split compensates for that.",
      },
      {
        label: "Room for an event-sized move",
        because: "Your returns cluster on the few days that move fastest.",
      },
    ],
    avoid: [
      {
        label: "A news blackout window",
        because:
          "A rule that bars entries either side of a release removes precisely the minutes your edge occupies.",
      },
      {
        label: "A consistency rule",
        because: "Event days are naturally your largest, so they are the ones a best-day cap penalises.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      const news = c.rules.news_trading;
      parts.push(news === "allowed" ? 1 : news === "restricted" ? 0.3 : news === "prohibited" ? 0 : UNKNOWN);
      if (news === "allowed") supports.push("News trading is allowed outright.");
      else if (news === "restricted") conflicts.push("News trading is restricted — check the blackout window before buying.");
      else if (news === "prohibited") conflicts.push("News trading is prohibited, which rules out your strategy.");
      else conflicts.push("The news policy is not confirmed, and it is the rule that decides this account for you.");

      if (hasConsistency(c)) {
        const pct = consistencyPct(c);
        parts.push(pct === null ? 0.35 : Math.max(0.2, Math.min(1, (pct - 20) / 40)));
        conflicts.push(
          "There is a consistency rule, and event days are exactly the outsized days it caps.",
        );
      } else if (c.rules.consistency_rule === "not_required") {
        parts.push(1);
        supports.push("No consistency rule, so a big event day is bankable.");
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  algorithmic: {
    id: "algorithmic",
    label: "Algorithmic / EA trader",
    summary:
      "Automated execution. Permission and platform compatibility come first; economics are only worth comparing between accounts the strategy may legally run on.",
    detect: (p) =>
      strongest(yes(p.trading_style === "algorithmic", 1), yes(p.ea_required === true, 1)),
    weights: { rules: 1.7, platform: 1.8, payout: 0.8, difficulty: 0.85, account_size: 0.8 },
    mustHave: [
      {
        label: "EAs and automation permitted",
        because: "A 95% profit split is worth nothing on an account your strategy may not trade.",
      },
      {
        label: "A platform your system connects to",
        because: "Permission without an API or a supported platform is permission you cannot use.",
      },
    ],
    avoid: [
      {
        label: "Manual-execution-only rules",
        because: "These are usually enforced after the fact, at the payout stage.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      const ea = c.rules.ea_allowed;
      parts.push(ea === "allowed" ? 1 : ea === "restricted" ? 0.4 : ea === "prohibited" ? 0 : UNKNOWN);
      if (ea === "allowed") supports.push("Automated trading is allowed.");
      else if (ea === "prohibited") conflicts.push("Automated trading is prohibited.");
      else if (ea === "restricted") conflicts.push("Automated trading is restricted — confirm what is actually permitted.");
      else conflicts.push("The automation policy is not confirmed, and it decides whether you can trade here at all.");

      parts.push(c.platforms.length > 0 ? 1 : 0.4);
      if (c.platforms.length === 0) conflicts.push("No platform is recorded, so connectivity cannot be checked.");

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  low_frequency: {
    id: "low_frequency",
    label: "Low-frequency trader",
    summary:
      "A handful of A+ setups a week or a month. The danger is a rule that rewards activity you would not otherwise take.",
    detect: (p) =>
      strongest(
        yes(p.trade_frequency === "few_monthly", 1),
        yes(p.trade_frequency === "few_weekly", 0.85),
      ),
    weights: { difficulty: 1.55, rules: 1.15, payout: 0.85, platform: 0.7 },
    mustHave: [
      {
        label: "No minimum trading days",
        because: "Not trading is a valid decision, and an account should not charge you for making it.",
      },
    ],
    avoid: [
      {
        label: "A four-day-or-more minimum per phase",
        because:
          "It pressures you into manufacturing setups that do not exist, which is the fastest way to lose an account you would otherwise have passed.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      const days = minDays(c);
      if (c.minimum_days === null) {
        parts.push(0.55);
        conflicts.push("Whether there is a minimum trading day requirement is not confirmed.");
      } else if (days === 0) {
        parts.push(1);
        supports.push("No minimum trading days — you can take only the setups you actually want.");
      } else {
        parts.push(Math.max(0.1, 1 - days / 10));
        if (days >= 4) {
          conflicts.push(
            `${days} minimum trading days is meaningful pressure on a strategy that trades a few times a week.`,
          );
        } else {
          supports.push(`Only ${days} minimum trading day${days === 1 ? "" : "s"}.`);
        }
      }

      if (c.maximum_days !== null && c.maximum_days > 0 && c.maximum_days <= 30) {
        parts.push(0.5);
        conflicts.push(`A ${c.maximum_days}-day time limit is a second kind of pressure to trade.`);
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  aggressive_risk: {
    id: "aggressive_risk",
    label: "Aggressive trader",
    summary:
      "Large risk per trade and a willingness to push. Needs absolute buffer — a tight trailing account will have you trading its rules instead of your strategy.",
    /*
     * Requires the measured answer, not the self-description.
     *
     * Both looser readings were wrong in the same way. "I want to pass
     * quickly" is about pace, not size per trade. "I am an aggressive trader"
     * is about self-image — and calling yourself aggressive is not evidence
     * that you risk a lot per trade. Either one alone was enough to hand a
     * trader who had just asked for speed a ten-day evaluation, because this
     * archetype's drawdown boost outweighed their stated approach.
     *
     * `wide_stop` covers wide risk on its own. This one is specifically wide
     * risk plus the intent to push, which is what makes a moving floor a trap
     * rather than an inconvenience.
     */
    detect: (p) =>
      strongest(
        yes(p.risk_width === "wide" && p.challenge_approach === "pass_fast", 1),
        yes(p.risk_width === "wide" && p.risk_style === "aggressive", 0.75),
      ),
    weights: { drawdown: 1.6, difficulty: 1.2, rules: 0.9, budget: 0.85 },
    mustHave: [
      {
        label: "A large static or end-of-day drawdown",
        because:
          "Constantly feeling one trade away from failure changes how you trade, and the strategy you tested is not the one you will run.",
      },
    ],
    avoid: [
      {
        label: "A tight trailing drawdown",
        because: "It converts an ordinary drawdown into an account breach.",
      },
    ],
    /*
     * Deliberately narrow. How roomy the drawdown is already has its own
     * heavily weighted criterion, and this archetype raises that weight by
     * 1.6 — grading size again here counted the same fact twice, hard enough
     * that a trader who asked to pass quickly was handed a ten-day evaluation
     * because it had a bigger buffer.
     *
     * So this scores only what the general criteria cannot see: the specific
     * trap of a moving floor on a thin account, where an ordinary drawdown
     * becomes a breach.
     */
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const buffer = c.max_drawdown_pct;

      if (isIntradayTrailing(c) && (buffer === null || buffer < 5)) {
        conflicts.push(
          "An intraday trailing floor on a thin buffer turns a normal losing sequence into a breach at the size you trade.",
        );
        return { ratio: 0.2, supports, conflicts };
      }
      if (c.drawdown_type === "trailing" && (buffer === null || buffer < 4)) {
        conflicts.push("A trailing floor on a small buffer leaves very little room to be wrong.");
        return { ratio: 0.4, supports, conflicts };
      }
      if (isForgivingDrawdown(c)) {
        supports.push("The drawdown floor does not chase your equity, so your position size is not fighting the rules.");
        return { ratio: 0.95, supports, conflicts };
      }
      if (c.drawdown_type === null) {
        conflicts.push("The drawdown mechanic is not confirmed, and at your size that is the rule that decides the account.");
        return { ratio: UNKNOWN, supports, conflicts };
      }
      return { ratio: 0.8, supports, conflicts };
    },
  },

  conservative: {
    id: "conservative",
    label: "Conservative trader",
    summary:
      "Small risk per trade, rarely near the limits. Your strategy does not consume much of the risk budget, so cost and payout terms should decide.",
    detect: (p) =>
      strongest(
        yes(p.risk_width === "tight", 1),
        yes(p.risk_style === "conservative" && p.risk_width !== "wide", 0.55),
      ),
    weights: { budget: 1.4, payout: 1.25, data_confidence: 1.3, drawdown: 0.75, difficulty: 0.9 },
    mustHave: [
      {
        label: "Low cost and clear payout terms",
        because: "You are unlikely to use the drawdown, so paying extra for it buys you nothing.",
      },
    ],
    avoid: [
      {
        label: "Paying a premium for a large drawdown",
        because: "It is the most expensive feature in this market and the one you are least likely to need.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      if (c.price !== null) {
        parts.push(c.price <= 120 ? 1 : c.price <= 250 ? 0.75 : 0.5);
      } else {
        parts.push(UNKNOWN);
        conflicts.push("The price is not confirmed, and price is what should decide this for you.");
      }

      if (c.payout_split_pct !== null) {
        parts.push(Math.min(1, c.payout_split_pct / 90));
        if (c.payout_split_pct >= 90) supports.push(`A ${c.payout_split_pct}% profit split.`);
      }

      if (c.billing_type === "monthly") {
        parts.push(0.45);
        conflicts.push("The fee recurs monthly, which changes the cost calculation you are optimising.");
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  payout_maximiser: {
    id: "payout_maximiser",
    label: "Payout-focused trader",
    summary:
      "The question is not whether you can pass, it is how quickly money reaches your account afterwards. Cadence, caps and buffers outrank the headline split.",
    detect: (p) => yes(p.primary_goal === "fast_payouts", 1),
    weights: { payout: 2.1, rules: 1.1, budget: 0.9, difficulty: 0.85, account_size: 0.8 },
    mustHave: [
      {
        label: "Frequent withdrawals with a short buffer",
        because:
          "Two accounts with the same profit split can have completely different real payout economics once cadence and minimums are counted.",
      },
    ],
    avoid: [
      {
        label: "Long payout buffers and withdrawal caps",
        because: "They delay the only outcome you are optimising for.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      if (c.payout_frequency_days === null) {
        parts.push(UNKNOWN);
        conflicts.push("Payout frequency is not confirmed, and it is the number you care about most.");
      } else {
        parts.push(c.payout_frequency_days <= 7 ? 1 : c.payout_frequency_days <= 14 ? 0.7 : 0.4);
        supports.push(`Payouts every ${c.payout_frequency_days} days.`);
      }

      if (c.payout_split_pct !== null) parts.push(Math.min(1, c.payout_split_pct / 90));

      if (hasConsistency(c)) {
        parts.push(0.45);
        conflicts.push("A consistency rule is a payout condition as well as a trading one.");
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  cost_minimiser: {
    id: "cost_minimiser",
    label: "Lowest-cost route",
    summary:
      "Willing to retry. The right question is not the cheapest entry, it is the lowest expected cost of eventually reaching a payout.",
    detect: (p) =>
      strongest(
        yes(p.primary_goal === "cheapest_route", 1),
        yes(p.budget === "under_50", 0.6),
      ),
    weights: { budget: 1.9, difficulty: 1.3, payout: 0.9, account_size: 0.6, platform: 0.7 },
    mustHave: [
      {
        label: "A low entry price against a target you can actually hit",
        because:
          "A $50 account you pass 2% of the time is worse value than a $150 account you pass 15% of the time. Price alone is the wrong number.",
      },
    ],
    avoid: [
      {
        label: "A recurring monthly fee",
        because: "It keeps billing until you pass or cancel, so a slow attempt costs more than the sticker price.",
      },
      {
        label: "An activation fee on passing",
        because: "It is a second price, charged at the moment you thought you had finished paying.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      if (c.price === null) {
        parts.push(UNKNOWN);
        conflicts.push("The price is not confirmed, and price is the whole basis of your decision.");
      } else {
        parts.push(c.price <= 75 ? 1 : c.price <= 150 ? 0.8 : c.price <= 300 ? 0.55 : 0.3);
      }

      if (c.billing_type === "monthly") {
        parts.push(0.3);
        conflicts.push("The fee is monthly, so the true cost depends on how long the attempt takes.");
      }

      // Difficulty is half of expected cost: a cheap challenge you cannot pass
      // is not cheap. This is the "price / probability of payout" idea, using
      // the target and the drawdown as the only proxies actually on file.
      if (c.profit_target_pct !== null && c.max_drawdown_pct !== null && c.profit_target_pct > 0) {
        const headroom = c.max_drawdown_pct / c.profit_target_pct;
        parts.push(Math.min(1, 0.3 + headroom * 0.7));
        if (headroom < 0.6) {
          conflicts.push(
            `The target is ${c.profit_target_pct}% against ${c.max_drawdown_pct}% of drawdown — cheap to buy, hard to convert.`,
          );
        }
      }

      if (c.payout_conditions?.toLowerCase().includes("activation fee")) {
        parts.push(0.4);
        conflicts.push("There is an activation fee on top of the entry price.");
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },

  low_friction: {
    id: "low_friction",
    label: "Low-friction / simple rules",
    summary:
      "Fewer rules to hold in your head. The best account here is not the mathematically richest one, it is the one with the least to get wrong.",
    // "Protect the account" on its own sits deliberately below the match floor.
    // One answer should not be enough to assign someone a personality — it
    // needs corroboration from how they actually size trades, or from having
    // named several rules they will not accept.
    detect: (p) =>
      strongest(
        yes(p.challenge_approach === "protect" && p.risk_width === "tight", 0.9),
        yes(p.challenge_approach === "protect", 0.45),
        yes((p.deal_breakers?.length ?? 0) >= 3, 0.55),
      ),
    weights: { rules: 1.45, data_confidence: 1.5, drawdown: 1.15, difficulty: 0.8, account_size: 0.7 },
    mustHave: [
      {
        label: "Simple, published rules",
        because:
          "Every unconfirmed rule is a decision you have to make under pressure with incomplete information.",
      },
      {
        label: "Static or end-of-day drawdown",
        because: "A floor that moves is a number you have to track while you are trading.",
      },
    ],
    avoid: [
      {
        label: "Stacked conditions",
        because:
          "A consistency rule and a minimum-days rule and an intraday floor is three ways to fail an account you were otherwise passing.",
      },
    ],
    fit: (c) => {
      const supports: string[] = [];
      const conflicts: string[] = [];
      const parts: number[] = [];

      // Count the things that can go wrong. Fewer is better, and unconfirmed
      // counts as a thing that can go wrong.
      let friction = 0;
      if (hasConsistency(c)) friction++;
      if (minDays(c) >= 3) friction++;
      if (isIntradayTrailing(c)) friction += 2;
      else if (c.drawdown_type === "trailing") friction++;
      if (c.drawdown_type === null) friction++;
      if (c.daily_drawdown_pct !== null) friction++;
      if (c.rules.consistency_rule === "unknown") friction++;

      parts.push(Math.max(0.1, 1 - friction * 0.18));
      if (friction <= 1) supports.push("Few moving parts — little to get wrong under pressure.");
      else if (friction >= 4) {
        conflicts.push("Several rules stack here, and each one is a separate way to lose the account.");
      }

      if (isForgivingDrawdown(c)) supports.push("The drawdown floor is predictable.");
      if (c.last_verified_at === null) {
        parts.push(0.5);
        conflicts.push("Nothing on this challenge has been verified against the firm's own page yet.");
      }

      return { ratio: blend(parts), supports, conflicts };
    },
  },
};

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export interface ArchetypeMatch {
  archetype: Archetype;
  /** 0..1 — how strongly the trader matches. */
  strength: number;
}

/**
 * Detection floor.
 *
 * Below this an archetype is a coincidence rather than a signal, and letting
 * weak matches through would blur every profile back toward the average — the
 * exact "best overall" ranking this layer exists to replace.
 */
const MATCH_FLOOR = 0.5;

/** At most this many archetypes shape a single profile. */
const MAX_MATCHES = 4;

/**
 * Works out which archetypes a trader is, strongest first.
 *
 * Returns an empty array when the answers do not identify anything — which is
 * a real outcome, not a failure. A trader who says they trade a few times a
 * day with moderate risk and an even P&L has told us they are unremarkable,
 * and the honest response is to fall back to the base weights rather than
 * invent a personality for them.
 */
export function classifyArchetypes(profile: Partial<TraderProfile>): ArchetypeMatch[] {
  return ARCHETYPES.map((id) => ({
    archetype: ARCHETYPE_DEFINITIONS[id],
    strength: ARCHETYPE_DEFINITIONS[id].detect(profile),
  }))
    .filter((m) => m.strength >= MATCH_FLOOR)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, MAX_MATCHES);
}

/**
 * How the matched archetypes reshape the scoring weights.
 *
 * Multipliers are blended by strength rather than applied flat, so a trader
 * who is decisively a swing trader and marginally a news trader gets a model
 * shaped mostly by the first. `resolveWeights` renormalises afterwards, so
 * these never change the total available score — only its distribution.
 */
export function archetypeWeightModifiers(
  matches: ArchetypeMatch[],
): Partial<Record<ScoreCriterion, number>> {
  // With nothing detected, strategy fit has nothing to say — so it claims no
  // weight at all rather than spending its share on a constant. A criterion
  // that scores every challenge identically still dilutes the ones that
  // discriminate, which quietly flattened stated priorities like "static
  // drawdown" when the trader had given no archetype signal.
  if (matches.length === 0) return { archetype_fit: 0 };
  const out: Record<string, number> = {};
  const totalStrength = matches.reduce((sum, m) => sum + m.strength, 0);

  for (const { archetype, strength } of matches) {
    const share = strength / totalStrength;
    for (const [criterion, multiplier] of Object.entries(archetype.weights)) {
      // Pull each multiplier toward 1 by this archetype's share of the profile,
      // so blending two archetypes cannot produce a more extreme model than
      // either one alone.
      const damped = 1 + (multiplier - 1) * share;
      out[criterion] = (out[criterion] ?? 1) * damped;
    }
  }
  return out as Partial<Record<ScoreCriterion, number>>;
}

/**
 * Scores one challenge against the trader's archetypes.
 *
 * This is what the `archetype_fit` criterion reads. It is a first-class
 * criterion rather than a hidden multiplier so that the reasoning shows up in
 * the score breakdown the trader can open — the site's central promise is that
 * every number can be traced back to a rule.
 */
export function scoreArchetypeFit(
  challenge: ChallengeRecord,
  matches: ArchetypeMatch[],
): ArchetypeFit {
  if (matches.length === 0) {
    return {
      ratio: 0.7,
      supports: ["Your answers did not point to a specific strategy profile, so this is scored on the general criteria."],
      conflicts: [],
    };
  }

  const supports: string[] = [];
  const conflicts: string[] = [];
  let weighted = 0;
  let totalStrength = 0;

  for (const { archetype, strength } of matches) {
    const fit = archetype.fit(challenge);
    weighted += fit.ratio * strength;
    totalStrength += strength;
    // Attribute each line to the archetype that raised it, so a trader with
    // several profiles can see which part of how they trade is in tension.
    supports.push(...fit.supports.map((s) => `${archetype.label}: ${s}`));
    conflicts.push(...fit.conflicts.map((s) => `${archetype.label}: ${s}`));
  }

  return {
    ratio: totalStrength > 0 ? weighted / totalStrength : 0.7,
    supports,
    conflicts,
  };
}

/**
 * The trader-facing summary: what this profile must have, would like, and
 * cannot use. Deduplicated across archetypes, strongest archetype first.
 */
export interface FitProfile {
  archetypes: { id: ArchetypeId; label: string; summary: string; strength: number }[];
  mustHave: FitRequirement[];
  avoid: FitRequirement[];
}

export function buildFitProfile(matches: ArchetypeMatch[]): FitProfile {
  const seen = new Set<string>();
  const mustHave: FitRequirement[] = [];
  const avoid: FitRequirement[] = [];

  for (const { archetype } of matches) {
    for (const req of archetype.mustHave) {
      if (seen.has(req.label)) continue;
      seen.add(req.label);
      mustHave.push(req);
    }
  }
  for (const { archetype } of matches) {
    for (const req of archetype.avoid) {
      if (seen.has(req.label)) continue;
      seen.add(req.label);
      avoid.push(req);
    }
  }

  return {
    archetypes: matches.map(({ archetype, strength }) => ({
      id: archetype.id,
      label: archetype.label,
      summary: archetype.summary,
      strength,
    })),
    mustHave,
    avoid,
  };
}

/**
 * Turns the concrete risk-width answer into the older risk-style vocabulary
 * the weighting model already speaks.
 *
 * Asking "how much do you risk per trade" is a question a trader can answer
 * from their own records. Asking whether they are "an aggressive trader" is a
 * question about self-image, and the two answers disagree often enough that
 * the measurable one should win.
 */
export function riskStyleFrom(
  width: TraderProfile["risk_width"],
  stated: TraderProfile["risk_style"],
): TraderProfile["risk_style"] {
  switch (width) {
    case "wide":
      return "aggressive";
    case "tight":
      return "conservative";
    case "moderate":
      return "balanced";
    default:
      return stated ?? null;
  }
}
