import "server-only";
import { getDb, newId, nowIso } from "./db";
import type {
  ChallengeJourney,
  ChallengeApproach,
  FailureReason,
  JourneyStage,
  TraderProfile,
} from "./types";

/**
 * The outcome feedback loop.
 *
 * A journey is created the moment a trader clicks through to a challenge,
 * freezing the profile they had at that instant alongside the score and
 * position they saw. Later they can tell us what actually happened.
 *
 * Two deliberate boundaries:
 *
 *  1. Nothing here is imported by `src/lib/engine/`. Outcomes inform a human
 *     decision to retune the weights; they do not silently retune them. An
 *     engine that quietly rewrites itself from self-reported data would be
 *     unauditable, which is the opposite of what this product promises.
 *
 *  2. Every aggregate carries its sample size, and the interpretation helpers
 *     refuse to draw a conclusion below a threshold. Small-sample noise
 *     presented as insight is just a more sophisticated way of making things up.
 */

/** Below this many reports, an aggregate is shown but not interpreted. */
export const MIN_SAMPLE_FOR_SIGNAL = 8;

type JourneyRow = Omit<ChallengeJourney, "profile_snapshot"> & {
  profile_snapshot: string | null;
};

function mapJourney(row: JourneyRow): ChallengeJourney {
  let snapshot: Partial<TraderProfile> | null = null;
  if (row.profile_snapshot) {
    try {
      snapshot = JSON.parse(row.profile_snapshot) as Partial<TraderProfile>;
    } catch {
      snapshot = null;
    }
  }
  return { ...row, profile_snapshot: snapshot };
}

/**
 * Records the moment of choice.
 *
 * Called from the outbound redirect, because that click is the closest signal
 * we have to "this is the one they picked". Returns the existing journey if the
 * same session already clicked the same challenge, so repeated clicks don't
 * inflate the denominator.
 */
export function recordJourneyStart(input: {
  session_id: string | null;
  challenge_id: string;
  profile: Partial<TraderProfile> | null;
  match_score: number | null;
  position: number | null;
}): string {
  const db = getDb();

  if (input.session_id) {
    const existing = db
      .prepare(
        `SELECT id FROM challenge_journeys
         WHERE session_id = ? AND challenge_id = ? LIMIT 1`,
      )
      .get(input.session_id, input.challenge_id) as { id: string } | undefined;
    if (existing) return existing.id;
  }

  const id = newId("jny");
  db.prepare(
    `INSERT INTO challenge_journeys
      (id, session_id, challenge_id, profile_snapshot, match_score, position, stage)
     VALUES (@id, @session_id, @challenge_id, @profile_snapshot, @match_score, @position, 'clicked')`,
  ).run({
    id,
    session_id: input.session_id,
    challenge_id: input.challenge_id,
    profile_snapshot: input.profile ? JSON.stringify(input.profile) : null,
    match_score: input.match_score,
    position: input.position,
  });

  return id;
}

export function listJourneysForSession(sessionId: string): ChallengeJourney[] {
  const rows = getDb()
    .prepare(`SELECT * FROM challenge_journeys WHERE session_id = ? ORDER BY created_at DESC`)
    .all(sessionId) as JourneyRow[];
  return rows.map(mapJourney);
}

export function getJourney(id: string): ChallengeJourney | null {
  const row = getDb()
    .prepare(`SELECT * FROM challenge_journeys WHERE id = ?`)
    .get(id) as JourneyRow | undefined;
  return row ? mapJourney(row) : null;
}

export function reportOutcome(
  id: string,
  sessionId: string,
  input: {
    stage: JourneyStage;
    failure_reason?: FailureReason | null;
    fit_rating?: number | null;
    would_choose_again?: "yes" | "no" | "unsure" | null;
    notes?: string | null;
  },
): boolean {
  const db = getDb();

  // Scoped to the session so one visitor cannot rewrite another's outcome.
  const result = db
    .prepare(
      `UPDATE challenge_journeys
       SET stage = @stage, failure_reason = @failure_reason, fit_rating = @fit_rating,
           would_choose_again = @would_choose_again, notes = @notes,
           updated_at = @now, outcome_reported_at = @now
       WHERE id = @id AND session_id = @session_id`,
    )
    .run({
      id,
      session_id: sessionId,
      stage: input.stage,
      failure_reason: input.failure_reason ?? null,
      fit_rating: input.fit_rating ?? null,
      would_choose_again: input.would_choose_again ?? null,
      notes: input.notes ?? null,
      now: nowIso(),
    });

  return result.changes > 0;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface OutcomeSummary {
  reported: number;
  passed: number;
  failed: number;
  inProgress: number;
  abandoned: number;
  paidOut: number;
  /** Mean 1-5 fit rating among those who gave one. */
  averageFit: number | null;
  wouldChooseAgainPct: number | null;
}

function summarise(journeys: ChallengeJourney[]): OutcomeSummary {
  const reported = journeys.filter((j) => j.outcome_reported_at !== null);
  const ratings = reported.map((j) => j.fit_rating).filter((r): r is number => r !== null);
  const decided = reported.filter((j) => j.would_choose_again === "yes" || j.would_choose_again === "no");

  return {
    reported: reported.length,
    passed: reported.filter((j) => j.stage === "passed" || j.stage === "funded" || j.stage === "paid_out").length,
    failed: reported.filter((j) => j.stage === "failed").length,
    inProgress: reported.filter((j) => j.stage === "in_progress" || j.stage === "purchased").length,
    abandoned: reported.filter((j) => j.stage === "abandoned").length,
    paidOut: reported.filter((j) => j.stage === "paid_out").length,
    averageFit: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    wouldChooseAgainPct: decided.length
      ? (decided.filter((j) => j.would_choose_again === "yes").length / decided.length) * 100
      : null,
  };
}

export function allJourneys(): ChallengeJourney[] {
  const rows = getDb()
    .prepare(`SELECT * FROM challenge_journeys ORDER BY created_at DESC`)
    .all() as JourneyRow[];
  return rows.map(mapJourney);
}

export interface ChallengeOutcomes {
  challenge_id: string;
  clicks: number;
  summary: OutcomeSummary;
}

export function outcomesByChallenge(): ChallengeOutcomes[] {
  const grouped = new Map<string, ChallengeJourney[]>();
  for (const journey of allJourneys()) {
    const bucket = grouped.get(journey.challenge_id) ?? [];
    bucket.push(journey);
    grouped.set(journey.challenge_id, bucket);
  }

  return [...grouped.entries()]
    .map(([challenge_id, journeys]) => ({
      challenge_id,
      clicks: journeys.length,
      summary: summarise(journeys),
    }))
    .sort((a, b) => b.summary.reported - a.summary.reported || b.clicks - a.clicks);
}

export interface ApproachOutcomes {
  approach: ChallengeApproach | "unknown";
  summary: OutcomeSummary;
  /** Most common reason this cohort failed, with its count. */
  topFailure: { reason: FailureReason; count: number } | null;
}

/**
 * Outcomes grouped by the approach the trader chose.
 *
 * This is the cross-section the product is actually built to learn from: did
 * the people who said "pass as fast as possible" get what they wanted from the
 * challenges we sent them, and when they failed, did they fail on the thing our
 * scoring claimed to protect them from?
 */
export function outcomesByApproach(): ApproachOutcomes[] {
  const grouped = new Map<string, ChallengeJourney[]>();
  for (const journey of allJourneys()) {
    const approach = journey.profile_snapshot?.challenge_approach ?? "unknown";
    const bucket = grouped.get(approach) ?? [];
    bucket.push(journey);
    grouped.set(approach, bucket);
  }

  return [...grouped.entries()].map(([approach, journeys]) => {
    const failures = new Map<FailureReason, number>();
    for (const journey of journeys) {
      if (journey.stage === "failed" && journey.failure_reason) {
        failures.set(journey.failure_reason, (failures.get(journey.failure_reason) ?? 0) + 1);
      }
    }
    const top = [...failures.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      approach: approach as ChallengeApproach | "unknown",
      summary: summarise(journeys),
      topFailure: top ? { reason: top[0], count: top[1] } : null,
    };
  });
}

export interface CalibrationSignal {
  headline: string;
  detail: string;
  sample: number;
  /** True when the sample is large enough to act on. */
  actionable: boolean;
}

/**
 * Turns the aggregates into statements an operator can act on — or an explicit
 * "not enough data yet", which is the honest answer most of the time early on.
 */
export function calibrationSignals(): CalibrationSignal[] {
  const signals: CalibrationSignal[] = [];
  const byApproach = outcomesByApproach();

  for (const cohort of byApproach) {
    if (cohort.approach === "unknown") continue;

    const { summary, topFailure } = cohort;
    const decided = summary.passed + summary.failed;
    const label =
      cohort.approach === "pass_fast"
        ? "pass as quickly as possible"
        : cohort.approach === "protect"
          ? "take their time and protect the account"
          : "pass at a normal pace";

    if (decided === 0) continue;

    const passRate = Math.round((summary.passed / decided) * 100);
    const actionable = decided >= MIN_SAMPLE_FOR_SIGNAL;

    signals.push({
      headline: `Traders who chose to ${label} passed ${passRate}% of the time`,
      detail: topFailure
        ? `Most common failure: ${topFailure.reason.replace(/_/g, " ")} (${topFailure.count} of ${summary.failed}).`
        : "No failure reasons recorded for this cohort yet.",
      sample: decided,
      actionable,
    });

    // The specific check worth having: a cohort our scoring is supposed to
    // protect, failing on the exact mechanic it weights against.
    if (
      cohort.approach === "protect" &&
      topFailure &&
      (topFailure.reason === "max_drawdown" || topFailure.reason === "daily_loss")
    ) {
      signals.push({
        headline: "Conservative traders are still failing on drawdown mechanics",
        detail:
          "The 'protect the account' weighting is meant to steer this cohort toward stable drawdown. If this persists, the stability weighting is too low relative to room.",
        sample: topFailure.count,
        actionable: topFailure.count >= MIN_SAMPLE_FOR_SIGNAL,
      });
    }
  }

  return signals;
}

/**
 * Did the score we showed actually predict satisfaction?
 *
 * Compares mean fit rating for high-scoring versus low-scoring recommendations.
 * If they are indistinguishable, the score is not measuring anything useful and
 * that is worth knowing.
 */
export function scoreCalibration(): {
  highBand: { count: number; averageFit: number | null };
  lowBand: { count: number; averageFit: number | null };
  actionable: boolean;
} {
  const rated = allJourneys().filter(
    (j) => j.fit_rating !== null && j.match_score !== null,
  );

  const mean = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  const high = rated.filter((j) => j.match_score! >= 80).map((j) => j.fit_rating!);
  const low = rated.filter((j) => j.match_score! < 80).map((j) => j.fit_rating!);

  return {
    highBand: { count: high.length, averageFit: mean(high) },
    lowBand: { count: low.length, averageFit: mean(low) },
    actionable: high.length >= MIN_SAMPLE_FOR_SIGNAL && low.length >= MIN_SAMPLE_FOR_SIGNAL,
  };
}
