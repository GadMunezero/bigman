import { describe, expect, it } from "vitest";
import {
  archetypeWeightModifiers,
  buildFitProfile,
  classifyArchetypes,
  getChallengeRecommendations,
  resolveWeights,
  riskStyleFrom,
} from "@/lib/engine";
import { SCORE_CRITERIA, type TraderProfile } from "@/lib/types";
import { challenge } from "./fixtures";

const base: Partial<TraderProfile> = {
  market: "futures",
  trading_style: "day_trading",
  holding_period: "hours",
  news_trading: "rarely",
  overnight_required: "no",
  budget: "100_200",
  desired_account_size: "100000",
  priorities: [],
};

const ids = (p: Partial<TraderProfile>) => classifyArchetypes(p).map((m) => m.archetype.id);

describe("classification", () => {
  it("identifies a trader from how they trade, not from what they call themselves", () => {
    expect(ids({ ...base, trading_style: "scalping", trade_frequency: "many_daily" })).toContain(
      "scalper",
    );
    expect(ids({ ...base, holding_period: "several_days" })).toContain("swing");
    expect(ids({ ...base, profit_shape: "one_big_day" })).toContain("lumpy_winner");
    expect(ids({ ...base, trade_frequency: "few_monthly" })).toContain("low_frequency");
    expect(ids({ ...base, primary_goal: "fast_payouts" })).toContain("payout_maximiser");
  });

  it("returns nothing when the answers do not describe anything in particular", () => {
    // An unremarkable profile is a real outcome. Inventing a personality for it
    // would reshape the weights on no evidence.
    expect(ids(base)).toEqual([]);
  });

  it("does not assign an archetype on a single vague answer", () => {
    // "Protect the account" and "I am aggressive" are both self-descriptions.
    // Neither is evidence about size per trade on its own.
    expect(ids({ ...base, challenge_approach: "protect" })).toEqual([]);
    expect(ids({ ...base, risk_style: "aggressive" })).toEqual([]);

    // Corroborated, they do classify.
    expect(ids({ ...base, challenge_approach: "protect", risk_width: "tight" })).toContain(
      "low_friction",
    );
    expect(
      ids({ ...base, risk_style: "aggressive", risk_width: "wide" }),
    ).toContain("aggressive_risk");
  });

  it("carries several archetypes at once, strongest first", () => {
    const matches = classifyArchetypes({
      ...base,
      holding_period: "several_days",
      news_trading: "frequently",
      profit_shape: "one_big_day",
      trade_frequency: "few_weekly",
    });

    expect(matches.length).toBeGreaterThan(2);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].strength).toBeGreaterThanOrEqual(matches[i].strength);
    }
  });
});

describe("weighting", () => {
  it("still sums to 100 for every archetype", () => {
    for (const profile of [
      { ...base, trading_style: "scalping" as const, trade_frequency: "many_daily" as const },
      { ...base, profit_shape: "one_big_day" as const },
      { ...base, primary_goal: "cheapest_route" as const },
      { ...base, holding_period: "several_days" as const, news_trading: "frequently" as const },
    ]) {
      const resolved = resolveWeights({
        archetype: archetypeWeightModifiers(classifyArchetypes(profile)),
        approach: profile.challenge_approach,
        priorities: profile.priorities,
      });
      const total = SCORE_CRITERIA.reduce((sum, c) => sum + resolved.weights[c], 0);
      expect(total).toBeCloseTo(100, 6);
    }
  });

  it("gives strategy fit no weight when there is no archetype to reason about", () => {
    // Otherwise it spends 18% of the score on a value identical for every
    // challenge, which dilutes the criteria that actually discriminate.
    const modifiers = archetypeWeightModifiers([]);
    expect(modifiers.archetype_fit).toBe(0);

    const resolved = resolveWeights({ archetype: modifiers });
    expect(resolved.weights.archetype_fit).toBe(0);
  });

  it("blending two archetypes never produces a more extreme model than either alone", () => {
    const scalperOnly = resolveWeights({
      archetype: archetypeWeightModifiers(
        classifyArchetypes({ ...base, trading_style: "scalping" }),
      ),
    }).weights;
    const blended = resolveWeights({
      archetype: archetypeWeightModifiers(
        classifyArchetypes({ ...base, trading_style: "scalping", primary_goal: "fast_payouts" }),
      ),
    }).weights;

    // The scalper model down-weights payout; adding a payout-focused archetype
    // must move it back toward the middle, not past it in either direction.
    expect(blended.payout).toBeGreaterThan(scalperOnly.payout);
  });

  it("prefers the measured risk answer over the self-description", () => {
    expect(riskStyleFrom("wide", "conservative")).toBe("aggressive");
    expect(riskStyleFrom("tight", "aggressive")).toBe("conservative");
    // With nothing measured, the stated answer survives.
    expect(riskStyleFrom(null, "aggressive")).toBe("aggressive");
  });
});

describe("the same rule, opposite verdicts", () => {
  /*
   * This is the whole thesis of the archetype layer. A consistency rule is not
   * good or bad. It is irrelevant to a trader who earns evenly and close to
   * disqualifying for one whose month is made on two days — so the same pair of
   * challenges must rank in opposite orders for the two profiles.
   */
  const strict = challenge("strict", {
    price: 100,
    rules: { consistency_rule: "required", consistency_pct: 30 },
  });
  const open = challenge("open", {
    price: 160,
    rules: { consistency_rule: "not_required" },
  });
  const catalogue = [strict, open];

  it("ranks the no-consistency challenge first for a lumpy earner", () => {
    const result = getChallengeRecommendations(
      { ...base, profit_shape: "one_big_day" },
      catalogue,
    );
    expect(result.recommendations[0].challenge.id).toBe("open");
  });

  it("ranks the cheaper challenge first for an even earner", () => {
    const result = getChallengeRecommendations({ ...base, profit_shape: "even" }, catalogue);
    expect(result.recommendations[0].challenge.id).toBe("strict");
  });

  it("names the conflicting rule in the warnings, not just the score", () => {
    const result = getChallengeRecommendations(
      { ...base, profit_shape: "one_big_day" },
      [strict],
    );
    expect(result.recommendations[0].warnings.join(" ")).toMatch(/consistency/i);
  });
});

describe("archetype conflicts reach the trader", () => {
  it("puts the reasoning in the score breakdown, not in a hidden multiplier", () => {
    const result = getChallengeRecommendations(
      { ...base, trading_style: "scalping", trade_frequency: "many_daily" },
      [challenge("intraday", { drawdown_type: "intraday_trailing" })],
    );

    const fit = result.recommendations[0].score_breakdown.find(
      (b) => b.criterion === "archetype_fit",
    );
    expect(fit).toBeDefined();
    expect(fit!.available).toBeGreaterThan(0);
    expect(fit!.notes.join(" ")).toMatch(/intraday/i);
  });

  it("attributes each note to the archetype that raised it", () => {
    const result = getChallengeRecommendations(
      { ...base, holding_period: "several_days", news_trading: "frequently" },
      [challenge("c", { rules: { news_trading: "prohibited", overnight: "allowed" } })],
    );
    // News trading prohibited is a hard filter for a frequent news trader, so
    // it is eliminated rather than scored — which is itself the right outcome.
    expect(result.recommendations).toHaveLength(0);
    expect(result.eliminated[0].eliminations[0].requirement).toBe("news_trading");
  });

  it("scores an unconfirmed rule below a disclosed permissive one", () => {
    const known = challenge("known", { rules: { overnight: "allowed" } });
    const silent = challenge("silent", { rules: { overnight: "unknown" } });
    const result = getChallengeRecommendations(
      { ...base, holding_period: "several_days", overnight_required: "yes" },
      [silent, known],
    );
    expect(result.recommendations[0].challenge.id).toBe("known");
  });
});

describe("the fit profile shown back to the trader", () => {
  it("states what this profile must have and what works against it", () => {
    const profile = buildFitProfile(
      classifyArchetypes({ ...base, trade_frequency: "few_monthly", profit_shape: "one_big_day" }),
    );

    expect(profile.archetypes.map((a) => a.id)).toContain("low_frequency");
    expect(profile.mustHave.map((r) => r.label).join(" ")).toMatch(/minimum trading days/i);
    expect(profile.mustHave.map((r) => r.label).join(" ")).toMatch(/consistency/i);
    // Every requirement carries its reason. A bare list is not checkable.
    for (const req of [...profile.mustHave, ...profile.avoid]) {
      expect(req.because.length).toBeGreaterThan(20);
    }
  });

  it("does not repeat a requirement two archetypes both ask for", () => {
    const profile = buildFitProfile(
      classifyArchetypes({
        ...base,
        holding_period: "several_days",
        trade_frequency: "few_monthly",
        profit_shape: "one_big_day",
        news_trading: "frequently",
      }),
    );
    const labels = [...profile.mustHave, ...profile.avoid].map((r) => r.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("is empty rather than invented when nothing was detected", () => {
    const profile = buildFitProfile(classifyArchetypes(base));
    expect(profile.archetypes).toEqual([]);
    expect(profile.mustHave).toEqual([]);
  });
});

describe("commercial separation survives the new layer", () => {
  it("classifies and scores identically whether or not an affiliate offer exists", () => {
    const profile = { ...base, trading_style: "scalping" as const, profit_shape: "one_big_day" as const };
    const catalogue = [challenge("a"), challenge("b", { price: 220 })];

    const before = getChallengeRecommendations(profile, catalogue);
    // ChallengeRecord has no affiliate fields at all — this asserts the shape
    // rather than trusting the comment saying so.
    for (const rec of before.recommendations) {
      expect(Object.keys(rec.challenge)).not.toContain("affiliate_url");
      expect(Object.keys(rec.challenge)).not.toContain("commission");
    }
  });
});

describe("questionnaire answers survive the round trip", () => {
  /*
   * Guards the shape the quiz posts, not the React component.
   *
   * "No preference" on the platform question used to carry an empty string.
   * The quiz decides whether a question is answered by whether its value is
   * truthy, so that answer read as unanswered and left Continue disabled with
   * no way forward — a dead end mid-questionnaire for anyone who did not mind
   * which platform they used. It reached a browser because every automated
   * walk-through happened to pick a real platform instead.
   */
  it("treats an absent platform preference as no filter, not as a platform", () => {
    const catalogue = [
      challenge("mt5", { platforms: ["MT5"] }),
      challenge("ninja", { platforms: ["NinjaTrader"] }),
    ];

    const noPreference = getChallengeRecommendations({ ...base, platform: null }, catalogue);
    expect(noPreference.recommendations).toHaveLength(2);

    // And a stated preference still ranks the matching one first.
    const stated = getChallengeRecommendations({ ...base, platform: "NinjaTrader" }, catalogue);
    expect(stated.recommendations[0].challenge.id).toBe("ninja");
  });

  it("scores a profile saved before the archetype questions existed", () => {
    // Older rows have null in all four columns. That must fall back to the base
    // weights rather than throwing or classifying on undefined.
    const legacy: Partial<TraderProfile> = {
      ...base,
      trade_frequency: null,
      profit_shape: null,
      risk_width: null,
      primary_goal: null,
    };
    const result = getChallengeRecommendations(legacy, [challenge("a"), challenge("b")]);
    expect(result.recommendations).toHaveLength(2);
    expect(result.fit_profile.archetypes).toEqual([]);
    expect(
      result.recommendations[0].score_breakdown.find((b) => b.criterion === "archetype_fit"),
    ).toBeUndefined();
  });
});
