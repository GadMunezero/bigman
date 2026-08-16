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
    const plain = resolveWeights([]);
    const boosted = resolveWeights(["fast_payouts", "low_price", "large_drawdown"]);

    const total = (weights: Record<string, number>) =>
      SCORE_CRITERIA.reduce((sum, c) => sum + weights[c], 0);

    expect(total(plain.weights)).toBeCloseTo(100, 6);
    expect(total(boosted.weights)).toBeCloseTo(100, 6);
  });

  it("increases the weight of a prioritised criterion relative to the default", () => {
    const plain = resolveWeights([]);
    const boosted = resolveWeights(["fast_payouts"]);

    expect(boosted.weights.payout).toBeGreaterThan(plain.weights.payout);
    expect(boosted.boosted.has("payout")).toBe(true);
  });

  it("lets a priority change the ranking between two otherwise-similar challenges", () => {
    const fastPayout = challenge("fast", { payout_frequency_days: 7, max_drawdown_pct: 4 });
    const bigDrawdown = challenge("roomy", { payout_frequency_days: 30, max_drawdown_pct: 12 });
    const catalogue = [fastPayout, bigDrawdown];

    const payoutFirst = getChallengeRecommendations(
      { ...baseProfile, priorities: ["fast_payouts"] },
      catalogue,
    );
    const drawdownFirst = getChallengeRecommendations(
      { ...baseProfile, priorities: ["large_drawdown"] },
      catalogue,
    );

    expect(payoutFirst.recommendations[0].challenge.id).toBe("fast");
    expect(drawdownFirst.recommendations[0].challenge.id).toBe("roomy");
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
    const pricier = challenge("pricier", { price: 150 });
    const cheaper = challenge("cheaper", { price: 60 });

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
