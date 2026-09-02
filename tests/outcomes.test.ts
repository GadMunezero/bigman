import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * These exercise the real SQLite layer rather than a mock, because the parts
 * most likely to break are the SQL itself and the session scoping.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppf-outcomes-"));
process.env.DATABASE_PATH = path.join(tmpDir, "test.db");

// Imported after DATABASE_PATH is set, since the connection is created eagerly
// on first use and reads the variable then.
const { getDb, newId } = await import("@/lib/db");
const {
  calibrationSignals,
  listJourneysForSession,
  MIN_SAMPLE_FOR_SIGNAL,
  outcomesByApproach,
  recordJourneyStart,
  reportOutcome,
  scoreCalibration,
} = await import("@/lib/outcomes");

const CHALLENGE_A = "chal_a";
const CHALLENGE_B = "chal_b";

beforeAll(() => {
  const db = getDb();
  const firmId = newId("firm");
  db.prepare(
    `INSERT INTO firms (id, name, slug, status) VALUES (?, 'Test Firm', 'test-firm', 'published')`,
  ).run(firmId);

  for (const id of [CHALLENGE_A, CHALLENGE_B]) {
    db.prepare(
      `INSERT INTO challenges (id, firm_id, name, slug, status)
       VALUES (?, ?, ?, ?, 'published')`,
    ).run(id, firmId, `Challenge ${id}`, id);
  }
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("journey recording", () => {
  it("captures the profile as a frozen snapshot at the moment of choice", () => {
    const id = recordJourneyStart({
      session_id: "s-snapshot",
      challenge_id: CHALLENGE_A,
      profile: { challenge_approach: "pass_fast", market: "futures" },
      match_score: 91,
      position: 1,
    });

    const [journey] = listJourneysForSession("s-snapshot");

    expect(journey.id).toBe(id);
    expect(journey.stage).toBe("clicked");
    expect(journey.match_score).toBe(91);
    expect(journey.profile_snapshot?.challenge_approach).toBe("pass_fast");
    expect(journey.outcome_reported_at).toBeNull();
  });

  it("does not create a second journey when the same session reclicks", () => {
    const first = recordJourneyStart({
      session_id: "s-dupe",
      challenge_id: CHALLENGE_A,
      profile: null,
      match_score: 70,
      position: 1,
    });
    const second = recordJourneyStart({
      session_id: "s-dupe",
      challenge_id: CHALLENGE_A,
      profile: null,
      match_score: 70,
      position: 1,
    });

    expect(second).toBe(first);
    expect(listJourneysForSession("s-dupe")).toHaveLength(1);
  });
});

describe("outcome reporting", () => {
  it("records a reported outcome against the journey", () => {
    const id = recordJourneyStart({
      session_id: "s-report",
      challenge_id: CHALLENGE_A,
      profile: { challenge_approach: "protect" },
      match_score: 84,
      position: 1,
    });

    const ok = reportOutcome(id, "s-report", {
      stage: "failed",
      failure_reason: "max_drawdown",
      fit_rating: 2,
      would_choose_again: "no",
      notes: "Trailing drawdown caught me out.",
    });

    expect(ok).toBe(true);

    const [journey] = listJourneysForSession("s-report");
    expect(journey.stage).toBe("failed");
    expect(journey.failure_reason).toBe("max_drawdown");
    expect(journey.fit_rating).toBe(2);
    expect(journey.outcome_reported_at).not.toBeNull();
  });

  it("refuses to let one session overwrite another's outcome", () => {
    const id = recordJourneyStart({
      session_id: "s-owner",
      challenge_id: CHALLENGE_B,
      profile: null,
      match_score: 60,
      position: 2,
    });

    const attacker = reportOutcome(id, "s-attacker", { stage: "passed" });

    expect(attacker).toBe(false);
    expect(listJourneysForSession("s-owner")[0].stage).toBe("clicked");
  });
});

describe("aggregation", () => {
  it("groups outcomes by the approach the trader chose", () => {
    for (let i = 0; i < 3; i++) {
      const id = recordJourneyStart({
        session_id: `s-fast-${i}`,
        challenge_id: CHALLENGE_A,
        profile: { challenge_approach: "pass_fast" },
        match_score: 90,
        position: 1,
      });
      reportOutcome(id, `s-fast-${i}`, {
        stage: i === 0 ? "failed" : "passed",
        failure_reason: i === 0 ? "time_limit" : null,
        fit_rating: 4,
      });
    }

    const cohort = outcomesByApproach().find((c) => c.approach === "pass_fast");

    expect(cohort).toBeDefined();
    expect(cohort!.summary.passed).toBe(2);
    expect(cohort!.summary.failed).toBe(1);
    expect(cohort!.topFailure).toEqual({ reason: "time_limit", count: 1 });
  });

  it("marks a small sample as not actionable rather than dressing it up as insight", () => {
    const signals = calibrationSignals();
    const small = signals.filter((s) => s.sample < MIN_SAMPLE_FOR_SIGNAL);

    expect(small.length).toBeGreaterThan(0);
    for (const signal of small) {
      expect(signal.actionable).toBe(false);
    }
  });

  it("reports score calibration as unusable until both bands have enough data", () => {
    const calibration = scoreCalibration();

    // Only a handful of rated journeys exist at this point in the suite.
    expect(calibration.actionable).toBe(false);
    expect(calibration.highBand.count + calibration.lowBand.count).toBeGreaterThan(0);
  });

  it("becomes actionable once both bands clear the threshold", () => {
    // High band: scored 80+, rated well. Low band: scored under 80, rated badly.
    for (let i = 0; i < MIN_SAMPLE_FOR_SIGNAL; i++) {
      const high = recordJourneyStart({
        session_id: `s-high-${i}`,
        challenge_id: CHALLENGE_A,
        profile: { challenge_approach: "normal" },
        match_score: 90,
        position: 1,
      });
      reportOutcome(high, `s-high-${i}`, { stage: "passed", fit_rating: 5 });

      const low = recordJourneyStart({
        session_id: `s-low-${i}`,
        challenge_id: CHALLENGE_B,
        profile: { challenge_approach: "normal" },
        match_score: 55,
        position: 8,
      });
      reportOutcome(low, `s-low-${i}`, { stage: "failed", failure_reason: "daily_loss", fit_rating: 2 });
    }

    const calibration = scoreCalibration();

    expect(calibration.actionable).toBe(true);
    expect(calibration.highBand.averageFit).toBeGreaterThan(calibration.lowBand.averageFit!);
  });
});
