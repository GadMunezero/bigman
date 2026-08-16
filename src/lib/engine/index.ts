import type {
  ChallengeRecord,
  MatchLabel,
  Recommendation,
  RecommendationResult,
  ScoreCriterion,
  TraderProfile,
} from "../types";
import { buildReasons, buildWarnings, comparativeWarning } from "./explain";
import { deriveRequirements, hardFilter, requirementLabel } from "./requirements";
import { buildContext, scoreChallenge } from "./scoring";
import { resolveWeights } from "./weights";

export * from "./requirements";
export * from "./explain";
export {
  APPROACH_LABELS,
  DEFAULT_WEIGHTS,
  resolveWeights,
  RISK_STYLE_LABELS,
} from "./weights";

/** Score bands. Below 60 is withheld from the primary results by default. */
export function matchLabel(score: number): MatchLabel {
  if (score >= 90) return "Excellent match";
  if (score >= 80) return "Strong match";
  if (score >= 70) return "Good match";
  if (score >= 60) return "Possible match";
  return "Weak match";
}

export const PRIMARY_RESULT_THRESHOLD = 60;

export interface EngineOptions {
  /** Weight overrides, e.g. from the `scoring_weights` table. */
  weightOverrides?: Partial<Record<ScoreCriterion, number>>;
}

/**
 * The recommendation engine.
 *
 * Two stages, in this order and never blended:
 *
 *   1. HARD FILTER — remove challenges that fundamentally conflict with a
 *      stated requirement. An eliminated challenge has no score. It is never
 *      shown as "72% match" with a footnote; it is shown as not compatible,
 *      with the reason.
 *
 *   2. SOFT SCORE — rank what is left on eight weighted criteria, with the
 *      weights boosted toward whatever the trader said matters most.
 *
 * Affiliate data is not an input. Nothing in this file, or anything it calls,
 * reads a commission, an affiliate URL, or a tracking ID.
 */
export function getChallengeRecommendations(
  profile: Partial<TraderProfile>,
  challenges: ChallengeRecord[],
  options: EngineOptions = {},
): RecommendationResult {
  // "High fees" is only meaningful relative to what this trader could otherwise
  // buy, so the threshold is the median price of the challenges that match
  // their market — computed before filtering, since it defines a filter.
  const req = deriveRequirements(profile, {
    highFeeThreshold: medianPrice(challenges, profile.market ?? null),
  });

  const resolved = resolveWeights({
    approach: profile.challenge_approach,
    riskStyle: profile.risk_style,
    priorities: profile.priorities ?? [],
    overrides: options.weightOverrides,
  });

  // ---- Stage 1: hard filtering -------------------------------------------
  const compatible: ChallengeRecord[] = [];
  const eliminated: Recommendation[] = [];
  const blockedCounts = new Map<string, { message: string; blocked: number }>();

  for (const challenge of challenges) {
    const failures = hardFilter(challenge, req);
    if (failures.length === 0) {
      compatible.push(challenge);
      continue;
    }

    for (const failure of failures) {
      const entry = blockedCounts.get(failure.requirement) ?? {
        message: failure.message,
        blocked: 0,
      };
      entry.blocked += 1;
      blockedCounts.set(failure.requirement, entry);
    }

    eliminated.push({
      challenge,
      eligibility: "eliminated",
      match_score: 0,
      label: null,
      reasons: [],
      warnings: [],
      eliminations: failures,
      score_breakdown: [],
    });
  }

  // ---- Stage 2: soft scoring ---------------------------------------------
  // Context is built from survivors only, so "cheap" and "roomy drawdown" are
  // measured against the options the trader can actually buy.
  const ctx = buildContext(compatible);

  const recommendations: Recommendation[] = compatible.map((challenge) => {
    const args = { challenge, profile, req, ctx };
    const { score, breakdown } = scoreChallenge(args, resolved);
    return {
      challenge,
      eligibility: "compatible" as const,
      match_score: score,
      label: matchLabel(score),
      reasons: buildReasons(challenge, profile, req, breakdown),
      warnings: buildWarnings(challenge, profile, req),
      eliminations: [],
      score_breakdown: breakdown,
    };
  });

  recommendations.sort((a, b) => {
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    // Deterministic tiebreak: cheaper first, then by slug so ordering is stable
    // across requests rather than depending on row order.
    const priceA = a.challenge.price ?? Number.POSITIVE_INFINITY;
    const priceB = b.challenge.price ?? Number.POSITIVE_INFINITY;
    if (priceA !== priceB) return priceA - priceB;
    return a.challenge.slug.localeCompare(b.challenge.slug);
  });

  // A recommendation with no caveat looks like an advert. Where a genuine
  // trade-off against the next-best option exists, say it.
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    if (rec.warnings.length > 0) continue;
    const alternative = recommendations[i === 0 ? 1 : 0]?.challenge;
    const comparative = comparativeWarning(rec.challenge, alternative);
    if (comparative) rec.warnings.push(comparative);
  }

  const blocking_requirements = [...blockedCounts.entries()]
    .map(([requirement, value]) => ({
      requirement,
      message: value.message,
      label: requirementLabel(requirement),
      blocked: value.blocked,
    }))
    .sort((a, b) => b.blocked - a.blocked);

  return {
    recommendations,
    eliminated,
    blocking_requirements,
    total_considered: challenges.length,
  };
}

/**
 * Scores one specific challenge against a profile — used on challenge detail
 * and comparison pages, where the trader is asking "how does THIS one fit me?"
 *
 * Note the context: scoring a single challenge in isolation would make every
 * relative criterion meaningless (it would be both the cheapest and the most
 * expensive option). So the full catalogue is passed in and the result for the
 * requested challenge is pulled out, keeping its score identical to the one it
 * received on the results page.
 */
export function scoreOne(
  profile: Partial<TraderProfile>,
  challenge: ChallengeRecord,
  catalogue: ChallengeRecord[],
  options: EngineOptions = {},
): Recommendation {
  const result = getChallengeRecommendations(profile, catalogue, options);
  const found =
    result.recommendations.find((r) => r.challenge.id === challenge.id) ??
    result.eliminated.find((r) => r.challenge.id === challenge.id);

  return (
    found ?? {
      challenge,
      eligibility: "eliminated",
      match_score: 0,
      label: null,
      reasons: [],
      warnings: [],
      eliminations: [
        { requirement: "unavailable", message: "This challenge is not currently published." },
      ],
      score_breakdown: [],
    }
  );
}


/**
 * Median price across the challenges a trader could plausibly buy.
 *
 * Median rather than mean so one very expensive outlier does not drag the
 * "high fee" line upward and quietly let expensive challenges through a filter
 * the trader asked for.
 */
function medianPrice(challenges: ChallengeRecord[], market: string | null): number | null {
  const relevant = challenges.filter(
    (c) =>
      !market ||
      market === "multiple" ||
      c.markets.length === 0 ||
      c.markets.includes(market as never),
  );

  const prices = relevant
    .map((c) => c.price)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  if (prices.length === 0) return null;

  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
}
