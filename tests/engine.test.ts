import { describe, expect, it } from "vitest";
import {
  deriveRequirements,
  getChallengeRecommendations,
  matchLabel,
  PRIMARY_RESULT_THRESHOLD,
  resolveWeights,
} from "@/lib/engine";
import { SCORE_CRITERIA, type TraderProfile } from "@/lib/types";
import { challenge } from "./fixtures";

const baseProfile: Partial<TraderProfile> = {
  market: "futures",
  trading_style: "day_trading",
  holding_period: "hours",
  news_trading: "sometimes",
  overnight_required: "no",
  budget: "100_200",
  desired_account_size: "100000",
  priorities: [],
};

describe("hard filtering", () => {
  it("eliminates a challenge that prohibits something the trader requires", () => {
    const profile = { ...baseProfile, overnight_required: "yes" as const };
    const catalogue = [
      challenge("allows", { rules: { overnight: "allowed" } }),
      challenge("prohibits", { rules: { overnight: "prohibited" } }),
    ];

    const result = getChallengeRecommendations(profile, catalogue);

    expect(result.recommendations.map((r) => r.challenge.id)).toEqual(["allows"]);
    expect(result.eliminated).toHaveLength(1);
    expect(result.eliminated[0].challenge.id).toBe("prohibits");
    expect(result.eliminated[0].eligibility).toBe("eliminated");
  });

  it("never gives an eliminated challenge a score", () => {
    const profile = { ...baseProfile, overnight_required: "yes" as const };
    const catalogue = [challenge("prohibits", { rules: { overnight: "prohibited" } })];

    const result = getChallengeRecommendations(profile, catalogue);

    expect(result.eliminated[0].match_score).toBe(0);
    expect(result.eliminated[0].label).toBeNull();
    expect(result.eliminated[0].score_breakdown).toEqual([]);
  });

  it("removes challenges that do not cover the trader's market", () => {
    const catalogue = [
      challenge("futures", { markets: ["futures"] }),
      challenge("forex", { markets: ["forex"] }),
    ];

    const result = getChallengeRecommendations(baseProfile, catalogue);

    expect(result.recommendations.map((r) => r.challenge.id)).toEqual(["futures"]);
  });

  it("does not filter by market when the trader selected multiple", () => {
    const profile = { ...baseProfile, market: "multiple" as const };
    const catalogue = [
      challenge("futures", { markets: ["futures"] }),
      challenge("forex", { markets: ["forex"] }),
    ];

    expect(getChallengeRecommendations(profile, catalogue).recommendations).toHaveLength(2);
  });

  it("eliminates challenges above the budget ceiling", () => {
    const profile = { ...baseProfile, budget: "under_50" as const };
    const catalogue = [challenge("cheap", { price: 39 }), challenge("dear", { price: 199 })];

    const result = getChallengeRecommendations(profile, catalogue);

    expect(result.recommendations.map((r) => r.challenge.id)).toEqual(["cheap"]);
    expect(result.eliminated[0].eliminations[0].requirement).toBe("budget");
  });

  it("keeps a challenge whose price is unconfirmed rather than guessing it is affordable", () => {
    const profile = { ...baseProfile, budget: "under_50" as const };
    const catalogue = [challenge("unpriced", { price: null })];

    const result = getChallengeRecommendations(profile, catalogue);

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].warnings.join(" ")).toMatch(/price is not confirmed/i);
  });

  it("treats an unconfirmed rule as unconfirmed, not as a prohibition or a permission", () => {
    const profile = { ...baseProfile, overnight_required: "yes" as const };
    const known = challenge("known", { rules: { overnight: "allowed" } });
    const unknown = challenge("unknown", { rules: { overnight: "unknown" } });

    const result = getChallengeRecommendations(profile, [known, unknown]);

    // Survives the filter…
    expect(result.recommendations).toHaveLength(2);
    // …but scores below the confirmed one, and says why.
    const scores = new Map(result.recommendations.map((r) => [r.challenge.id, r.match_score]));
    expect(scores.get("unknown")!).toBeLessThan(scores.get("known")!);

    const warning = result.recommendations
      .find((r) => r.challenge.id === "unknown")!
      .warnings.join(" ");
    expect(warning).toMatch(/not confirmed/i);
  });

  it("infers an overnight requirement from a multi-day holding period", () => {
    const profile = {
      ...baseProfile,
      holding_period: "several_days" as const,
      overnight_required: undefined,
    };
    const requirements = deriveRequirements(profile);

    expect(requirements.needsOvernight).toBe(true);
    expect(requirements.needsWeekend).toBe(true);
  });

  it("respects an explicit 'no' over the inferred overnight requirement", () => {
    const requirements = deriveRequirements({
      ...baseProfile,
      holding_period: "overnight",
      overnight_required: "no",
    });

    expect(requirements.needsOvernight).toBe(false);
  });

  it("eliminates news-prohibited challenges only for frequent news traders", () => {
    const catalogue = [challenge("no-news", { rules: { news_trading: "prohibited" } })];

    const frequent = getChallengeRecommendations(
      { ...baseProfile, news_trading: "frequently" },
      catalogue,
    );
    const rare = getChallengeRecommendations({ ...baseProfile, news_trading: "rarely" }, catalogue);

    expect(frequent.recommendations).toHaveLength(0);
    expect(rare.recommendations).toHaveLength(1);
  });
});

describe("no-match diagnostics", () => {
  it("reports which requirement blocked the most challenges", () => {
    const profile = { ...baseProfile, overnight_required: "yes" as const, budget: "under_50" as const };
    const catalogue = [
      challenge("a", { rules: { overnight: "prohibited" }, price: 39 }),
      challenge("b", { rules: { overnight: "prohibited" }, price: 39 }),
      challenge("c", { price: 500 }),
    ];

    const result = getChallengeRecommendations(profile, catalogue);

    expect(result.recommendations).toHaveLength(0);
    expect(result.blocking_requirements[0].requirement).toBe("overnight_required");
    expect(result.blocking_requirements[0].blocked).toBe(2);
    expect(result.blocking_requirements[0].label).toBe("Overnight holding");
  });
});

describe("weights", () => {
  it("always sums to 100, with or without priorities", () => {
    const plain = resolveWeights();
    const boosted = resolveWeights({
      priorities: ["fast_payouts", "low_price", "large_drawdown"],
    });

    const total = (weights: Record<string, number>) =>
      SCORE_CRITERIA.reduce((sum, c) => sum + weights[c], 0);

    expect(total(plain.weights)).toBeCloseTo(100, 6);
    expect(total(boosted.weights)).toBeCloseTo(100, 6);
  });

  it("increases the weight of a prioritised criterion relative to the default", () => {
    const plain = resolveWeights();
    const boosted = resolveWeights({ priorities: ["fast_payouts"] });

    expect(boosted.weights.payout).toBeGreaterThan(plain.weights.payout);
    expect(boosted.boosted.has("payout")).toBe(true);
  });

  it("lets a payout priority decide between challenges that differ only on payout", () => {
    // Controlled comparison: everything except payout frequency is identical,
    // so the priority is the only thing that can move the ranking.
    const catalogue = [
      challenge("slow-payout", { payout_frequency_days: 30 }),
      challenge("fast-payout", { payout_frequency_days: 7 }),
    ];

    const withPriority = getChallengeRecommendations(
      { ...baseProfile, priorities: ["fast_payouts"] },
      catalogue,
    );

    expect(withPriority.recommendations[0].challenge.id).toBe("fast-payout");
  });

  it("lets a drawdown priority decide between challenges that differ only on drawdown", () => {
    const catalogue = [
      challenge("tight", { max_drawdown_pct: 5, profit_target_pct: 8, daily_drawdown_pct: null }),
      challenge("roomy", { max_drawdown_pct: 12, profit_target_pct: 8, daily_drawdown_pct: null }),
    ];

    const withPriority = getChallengeRecommendations(
      { ...baseProfile, priorities: ["large_drawdown"] },
      catalogue,
    );

    expect(withPriority.recommendations[0].challenge.id).toBe("roomy");
  });
});

describe("scoring and explanations", () => {
  it("scores a well-matched, fully verified challenge highly", () => {
    const result = getChallengeRecommendations(baseProfile, [challenge("good")]);

    expect(result.recommendations[0].match_score).toBeGreaterThanOrEqual(
      PRIMARY_RESULT_THRESHOLD,
    );
  });

  it("penalises a challenge whose data is unverified", () => {
    const verified = challenge("verified");
    const unverified = challenge("unverified", {
      confidence: {},
      last_verified_at: null,
      rules: {
        news_trading: "unknown",
        overnight: "unknown",
        weekend: "unknown",
        ea_allowed: "unknown",
        consistency_rule: "unknown",
      },
    });

    const result = getChallengeRecommendations(baseProfile, [verified, unverified]);
    const scores = new Map(result.recommendations.map((r) => [r.challenge.id, r.match_score]));

    expect(scores.get("verified")!).toBeGreaterThan(scores.get("unverified")!);
  });

  it("produces reasons drawn from the trader's own answers", () => {
    const result = getChallengeRecommendations(baseProfile, [challenge("good")]);
    const reasons = result.recommendations[0].reasons.join(" ");

    expect(reasons).toMatch(/futures/i);
    expect(reasons).toMatch(/budget/i);
    expect(reasons).toMatch(/\$100,000 account size/i);
  });

  it("always surfaces a caveat when a real trade-off exists", () => {
    const trailing = challenge("trailing", { drawdown_type: "trailing" });
    const result = getChallengeRecommendations(baseProfile, [trailing]);

    expect(result.recommendations[0].warnings.length).toBeGreaterThan(0);
    expect(result.recommendations[0].warnings.join(" ")).toMatch(/trails your balance/i);
  });

  it("adds a comparative caveat to an option that is worse than the alternative", () => {
    // Healthy drawdown on both, so price is the only real differentiator and
    // no intrinsic caveat pre-empts the comparative one.
    const healthy = { max_drawdown_pct: 12, profit_target_pct: 6, daily_drawdown_pct: null };
    const pricier = challenge("pricier", { ...healthy, price: 150 });
    const cheaper = challenge("cheaper", { ...healthy, price: 60 });

    const result = getChallengeRecommendations(baseProfile, [pricier, cheaper]);
    const byId = new Map(result.recommendations.map((r) => [r.challenge.id, r]));

    expect(byId.get("pricier")!.warnings.join(" ")).toMatch(/costs \$90 more/i);
  });

  it("does not manufacture a caveat for a result that genuinely has none", () => {
    // The alternative here is worse on every compared axis, so there is no real
    // trade-off to report. Inventing one would be fabrication, so we don't.
    const best = challenge("best", { price: 60, payout_frequency_days: 7, max_drawdown_pct: 10 });
    const worse = challenge("worse", { price: 150, payout_frequency_days: 30, max_drawdown_pct: 4 });

    const result = getChallengeRecommendations(baseProfile, [best, worse]);
    const top = result.recommendations[0];

    expect(top.challenge.id).toBe("best");
    expect(top.warnings).toEqual([]);
  });

  it("flags a consistency rule as a caveat", () => {
    const withRule = challenge("consistency", {
      rules: { consistency_rule: "required", consistency_pct: 30 },
    });

    const result = getChallengeRecommendations(baseProfile, [withRule]);

    expect(result.recommendations[0].warnings.join(" ")).toMatch(/consistency rule \(30%\)/i);
  });

  it("breaks score ties deterministically rather than by input order", () => {
    const a = challenge("aaa", { price: 100 });
    const b = challenge("bbb", { price: 100 });

    const forwards = getChallengeRecommendations(baseProfile, [a, b]);
    const backwards = getChallengeRecommendations(baseProfile, [b, a]);

    expect(forwards.recommendations.map((r) => r.challenge.id)).toEqual(
      backwards.recommendations.map((r) => r.challenge.id),
    );
  });

  it("keeps the score breakdown consistent with the headline score", () => {
    const result = getChallengeRecommendations(baseProfile, [challenge("x"), challenge("y")]);

    for (const rec of result.recommendations) {
      const earned = rec.score_breakdown.reduce((sum, b) => sum + b.earned, 0);
      const available = rec.score_breakdown.reduce((sum, b) => sum + b.available, 0);
      expect(Math.round((earned / available) * 100)).toBe(rec.match_score);
    }
  });
});

describe("match labels", () => {
  it("maps scores to the documented bands", () => {
    expect(matchLabel(95)).toBe("Excellent match");
    expect(matchLabel(85)).toBe("Strong match");
    expect(matchLabel(75)).toBe("Good match");
    expect(matchLabel(65)).toBe("Possible match");
    expect(matchLabel(30)).toBe("Weak match");
  });
});

describe("commercial independence", () => {
  it("produces identical results regardless of any affiliate data on the record", () => {
    // The engine's input type has no affiliate fields at all, but a stray
    // property must not change the outcome either.
    const plain = challenge("plain");
    const withCommercials = {
      ...challenge("plain"),
      affiliate_url: "https://example.invalid/ref",
      commission: 9999,
    } as unknown as typeof plain;

    const a = getChallengeRecommendations(baseProfile, [plain]);
    const b = getChallengeRecommendations(baseProfile, [withCommercials]);

    expect(b.recommendations[0].match_score).toBe(a.recommendations[0].match_score);
  });
});

describe("deal-breakers", () => {
  it("eliminates a trailing-drawdown challenge outright", () => {
    const profile = { ...baseProfile, deal_breakers: ["trailing_drawdown" as const] };
    const catalogue = [
      challenge("static", { drawdown_type: "static" }),
      challenge("trailing", { drawdown_type: "trailing" }),
    ];

    const result = getChallengeRecommendations(profile, catalogue);

    expect(result.recommendations.map((r) => r.challenge.id)).toEqual(["static"]);
    expect(result.eliminated[0].eliminations[0].requirement).toBe(
      "deal_breaker:trailing_drawdown",
    );
  });

  it("is stricter than a derived requirement: 'restricted' also fails", () => {
    // A news trader is only eliminated by a confirmed prohibition…
    const derived = getChallengeRecommendations(
      { ...baseProfile, news_trading: "frequently" },
      [challenge("restricted", { rules: { news_trading: "restricted" } })],
    );
    expect(derived.recommendations).toHaveLength(1);

    // …but naming news restrictions a deal-breaker removes it.
    const declared = getChallengeRecommendations(
      { ...baseProfile, deal_breakers: ["news_restrictions"] },
      [challenge("restricted", { rules: { news_trading: "restricted" } })],
    );
    expect(declared.recommendations).toHaveLength(0);
  });

  it("eliminates on a daily loss limit, minimum days and consistency rules", () => {
    const catalogue = [challenge("strict", { minimum_days: 10 })];

    const daily = getChallengeRecommendations(
      { ...baseProfile, deal_breakers: ["daily_loss_limit"] },
      catalogue,
    );
    const minDays = getChallengeRecommendations(
      { ...baseProfile, deal_breakers: ["minimum_trading_days"] },
      catalogue,
    );
    const consistency = getChallengeRecommendations(
      { ...baseProfile, deal_breakers: ["consistency_rule"] },
      [challenge("c", { rules: { consistency_rule: "required" } })],
    );

    expect(daily.recommendations).toHaveLength(0);
    expect(minDays.recommendations).toHaveLength(0);
    expect(consistency.recommendations).toHaveLength(0);
  });

  it("treats 'high fees' as relative to what the trader could otherwise buy", () => {
    const profile = { ...baseProfile, deal_breakers: ["high_fees" as const] };
    const catalogue = [
      challenge("cheap", { price: 50 }),
      challenge("mid", { price: 100 }),
      challenge("dear", { price: 190 }),
    ];

    const result = getChallengeRecommendations(profile, catalogue);

    // Median of 50/100/190 is 100, so only the challenge above it is removed.
    expect(result.recommendations.map((r) => r.challenge.id).sort()).toEqual(["cheap", "mid"]);
    expect(result.eliminated[0].challenge.id).toBe("dear");
  });

  it("labels a deal-breaker clearly on the no-match screen", () => {
    const result = getChallengeRecommendations(
      { ...baseProfile, deal_breakers: ["trailing_drawdown"] },
      [challenge("t", { drawdown_type: "trailing" })],
    );

    expect(result.blocking_requirements[0].label).toBe("Deal-breaker: Trailing drawdown");
  });

  it("changes nothing when no deal-breakers are chosen", () => {
    const catalogue = [challenge("a", { drawdown_type: "trailing", minimum_days: 10 })];

    expect(
      getChallengeRecommendations({ ...baseProfile, deal_breakers: [] }, catalogue)
        .recommendations,
    ).toHaveLength(1);
  });
});

describe("approach-driven weighting", () => {
  it("weights pace and drawdown differently for each approach", () => {
    const fast = resolveWeights({ approach: "pass_fast" });
    const normal = resolveWeights({ approach: "normal" });
    const protect = resolveWeights({ approach: "protect" });

    expect(fast.weights.difficulty).toBeGreaterThan(normal.weights.difficulty);
    expect(protect.weights.difficulty).toBeLessThan(normal.weights.difficulty);
    expect(protect.weights.data_confidence).toBeGreaterThan(normal.weights.data_confidence);
  });

  it("keeps every approach and risk style normalised to 100", () => {
    const total = (weights: Record<string, number>) =>
      SCORE_CRITERIA.reduce((sum, c) => sum + weights[c], 0);

    for (const approach of ["pass_fast", "normal", "protect"] as const) {
      for (const riskStyle of ["aggressive", "balanced", "conservative"] as const) {
        const resolved = resolveWeights({
          approach,
          riskStyle,
          priorities: ["low_profit_target", "static_drawdown"],
        });
        expect(total(resolved.weights)).toBeCloseTo(100, 6);
      }
    }
  });

  it("ranks a fast-to-clear challenge first for a sprinter and last for a protector", () => {
    // Same price and account size; they differ only in how they must be passed.
    const quick = challenge("quick", {
      profit_target_pct: 5,
      minimum_days: 0,
      max_drawdown_pct: 6,
      drawdown_type: "trailing",
      phases: 1,
    });
    const steady = challenge("steady", {
      profit_target_pct: 10,
      minimum_days: 10,
      max_drawdown_pct: 10,
      drawdown_type: "static",
      daily_drawdown_pct: null,
      phases: 1,
    });
    const catalogue = [quick, steady];

    const sprinter = getChallengeRecommendations(
      { ...baseProfile, challenge_approach: "pass_fast", risk_style: "aggressive" },
      catalogue,
    );
    const protector = getChallengeRecommendations(
      { ...baseProfile, challenge_approach: "protect", risk_style: "conservative" },
      catalogue,
    );

    expect(sprinter.recommendations[0].challenge.id).toBe("quick");
    expect(protector.recommendations[0].challenge.id).toBe("steady");
  });
});

describe("usable drawdown", () => {
  it("does not treat a bigger headline drawdown as automatically better", () => {
    // 20% sounds far better than 8% — but it trails, it is rationed by a tight
    // daily cap, and the target is twice as large.
    const headline = challenge("headline", {
      max_drawdown_pct: 20,
      profit_target_pct: 20,
      daily_drawdown_pct: 2,
      drawdown_type: "intraday_trailing",
    });
    const honest = challenge("honest", {
      max_drawdown_pct: 8,
      profit_target_pct: 5,
      daily_drawdown_pct: null,
      drawdown_type: "static",
    });

    const result = getChallengeRecommendations(
      { ...baseProfile, priorities: ["large_drawdown"] },
      [headline, honest],
    );

    const scores = new Map(
      result.recommendations.map((r) => [r.challenge.id, r.match_score]),
    );
    expect(scores.get("honest")!).toBeGreaterThan(scores.get("headline")!);
  });

  it("warns when the loss budget is smaller than the required profit", () => {
    const thin = challenge("thin", { max_drawdown_pct: 4, profit_target_pct: 10 });
    const result = getChallengeRecommendations(baseProfile, [thin]);

    expect(result.recommendations[0].warnings.join(" ")).toMatch(
      /less loss budget .* than the profit you must make/i,
    );
  });

  it("prefers stability over size when the trader prioritises static drawdown", () => {
    const roomyTrailing = challenge("roomy", {
      max_drawdown_pct: 14,
      drawdown_type: "trailing",
    });
    const tightStatic = challenge("tight", {
      max_drawdown_pct: 7,
      drawdown_type: "static",
    });

    const result = getChallengeRecommendations(
      { ...baseProfile, priorities: ["static_drawdown"] },
      [roomyTrailing, tightStatic],
    );

    expect(result.recommendations[0].challenge.id).toBe("tight");
  });
});

describe("difficulty criterion", () => {
  it("rewards a low profit target when the trader prioritises one", () => {
    const easy = challenge("easy", { profit_target_pct: 5 });
    const hard = challenge("hard", { profit_target_pct: 15 });

    const result = getChallengeRecommendations(
      { ...baseProfile, priorities: ["low_profit_target"] },
      [easy, hard],
    );

    expect(result.recommendations[0].challenge.id).toBe("easy");
    expect(result.recommendations[0].reasons.join(" ")).toMatch(/5% profit target/i);
  });

  it("warns a sprinter about minimum days and two-step evaluations", () => {
    const slow = challenge("slow", { minimum_days: 15, phases: 2 });
    const result = getChallengeRecommendations(
      { ...baseProfile, challenge_approach: "pass_fast" },
      [slow],
    );

    const warnings = result.recommendations[0].warnings.join(" ");
    expect(warnings).toMatch(/at least 15 trading days/i);
    expect(warnings).toMatch(/two-step evaluation/i);
  });
});

describe("unconfirmed data never outranks confirmed data", () => {
  /*
   * The catalogue is filled progressively: a firm's product line arrives before
   * its per-size pricing does, so hundreds of challenges legitimately sit there
   * with no price, target or drawdown recorded yet.
   *
   * Those must rank BELOW an otherwise comparable challenge whose figures are
   * known. If a blank row could win, the site would be recommending the
   * challenges it knows least about — the exact opposite of what a trader is
   * here for, and it would happen silently as the catalogue grew.
   */
  it("ranks a challenge with unknown figures below a comparable known one", () => {
    const known = challenge("known", {
      price: 150,
      profit_target_pct: 8,
      max_drawdown_pct: 6,
      daily_drawdown_pct: 3,
      drawdown_type: "static",
    });
    const unknown = challenge("unknown", {
      price: null,
      profit_target_pct: null,
      max_drawdown_pct: null,
      daily_drawdown_pct: null,
      drawdown_type: null,
    });

    const result = getChallengeRecommendations(baseProfile, [known, unknown]);

    const scores = new Map(result.recommendations.map((r) => [r.challenge.id, r.match_score]));

    expect(scores.get("known")!).toBeGreaterThan(scores.get("unknown")!);
  });
});

describe("recurring pricing is disclosed, not silently averaged", () => {
  /*
   * Several futures firms bill monthly. The budget criterion compares a single
   * price field, so a $170/month evaluation and a $170 one-off score
   * identically on cost. Reweighting price by an assumed number of months would
   * bury a guess inside the score; saying so in a caveat keeps the number
   * auditable and still warns the trader.
   */
  it("warns when a challenge is billed monthly", () => {
    const monthly = challenge("monthly", { price: 170, billing_type: "monthly" });
    const oneOff = challenge("one-off", { price: 170, billing_type: "one_time" });

    const result = getChallengeRecommendations(baseProfile, [monthly, oneOff]);
    const warningsFor = (id: string) =>
      result.recommendations.find((r) => r.challenge.id === id)!.warnings.join(" ");

    expect(warningsFor("monthly")).toMatch(/charged monthly/i);
    expect(warningsFor("one-off")).not.toMatch(/charged monthly/i);
  });
});
