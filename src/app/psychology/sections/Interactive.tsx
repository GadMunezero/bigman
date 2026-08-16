"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CHECKLIST_ITEMS, HABIT_LEAKS, HABIT_PRESCRIPTIONS } from "../data";
import styles from "../psychology.module.css";
import { useLocalState } from "../useLocalState";

// ---------------------------------------------------------------------------
// Risk gate
// ---------------------------------------------------------------------------

const GATE_CONDITIONS = [
  "Setup matches my defined criteria",
  "Invalidation level is written before entry",
  "Risk amount is fixed and acceptable",
  "I know exactly what would cancel this trade",
];

export function RiskGate() {
  const [mental, setMental] = useState(7);
  const [risk, setRisk] = useState(1);
  const [losses, setLosses] = useState(0);
  const [cooldown, setCooldown] = useState(15);
  const [tradesTaken, setTradesTaken] = useState(0);
  const [tradeCap, setTradeCap] = useState(3);
  const [conditions, setConditions] = useState<boolean[]>(GATE_CONDITIONS.map(() => false));

  const checked = conditions.filter(Boolean).length;

  const { verdict, reasons } = useMemo(() => {
    const found: string[] = [];

    if (mental < 6) found.push("Mental baseline is below 6. Trade half size or stand down.");
    if (risk > 1.5) found.push("Risk is above the discipline zone. Reduce risk before taking the trade.");
    if (losses >= 2) {
      found.push(`Consecutive losses are high. A ${cooldown}-minute cooldown is mandatory before another decision.`);
    }
    if (tradesTaken >= tradeCap) {
      found.push("Daily trade cap is reached. More trades would train impulsive behaviour.");
    }
    if (checked < GATE_CONDITIONS.length) {
      found.push("Every pre-trade condition must be checked before the gate opens.");
    }

    if (losses >= 3 || mental <= 4) {
      if (found.length === 0) found.push("Conditions are unstable. Do not trade until baseline resets.");
      return { verdict: "STOP" as const, reasons: found };
    }
    if (found.length > 0) return { verdict: "WAIT" as const, reasons: found };

    return {
      verdict: "GO" as const,
      reasons: ["All risk, setup and behaviour conditions are defined. Execute only the plan."],
    };
  }, [mental, risk, losses, cooldown, tradesTaken, tradeCap, checked]);

  const toneClass =
    verdict === "GO" ? styles.go : verdict === "WAIT" ? styles.wait : styles.stop;

  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Risk gate — no plan, no trade</h2>
        <p className="lede">
          The gate opens only when your risk, your state and your setup are all defined. It is
          deliberately harder to open than it is to skip a trade.
        </p>
      </div>

      <div className="grid-4">
        <div className="panel">
          <div className="stat-label">Trade permission</div>
          <div className={`stat-value ${toneClass}`}>{verdict}</div>
        </div>
        <div className="panel">
          <div className="stat-label">Risk per trade</div>
          <div className="stat-value">{risk.toFixed(2)}%</div>
        </div>
        <div className="panel">
          <div className="stat-label">Cooldown rule</div>
          <div className="stat-value">{cooldown}m</div>
        </div>
        <div className="panel">
          <div className="stat-label">Daily trade cap</div>
          <div className="stat-value">
            {tradesTaken}/{tradeCap}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <label className="field-label" htmlFor="mental">
            Mental baseline
          </label>
          <div className={styles.rangeRow}>
            <input
              id="mental"
              type="range"
              min={1}
              max={10}
              value={mental}
              onChange={(e) => setMental(Number(e.target.value))}
            />
            <span className={styles.rangeValue}>{mental}/10</span>
          </div>
        </div>

        <div className="panel">
          <label className="field-label" htmlFor="risk">
            Risk per trade
          </label>
          <div className={styles.rangeRow}>
            <input
              id="risk"
              type="range"
              min={0.25}
              max={3}
              step={0.25}
              value={risk}
              onChange={(e) => setRisk(Number(e.target.value))}
            />
            <span className={styles.rangeValue}>{risk.toFixed(2)}%</span>
          </div>
        </div>

        <div className="panel">
          <label className="field-label" htmlFor="losses">
            Consecutive losses today
          </label>
          <select id="losses" value={losses} onChange={(e) => setLosses(Number(e.target.value))}>
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n === 3 ? "3+ losses" : `${n} loss${n === 1 ? "" : "es"}`}
              </option>
            ))}
          </select>
        </div>

        <div className="panel">
          <label className="field-label" htmlFor="cooldown">
            Cooldown after loss
          </label>
          <select id="cooldown" value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))}>
            {[10, 15, 30, 60].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </div>

        <div className="panel">
          <label className="field-label" htmlFor="taken">
            Trades already taken today
          </label>
          <select id="taken" value={tradesTaken} onChange={(e) => setTradesTaken(Number(e.target.value))}>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n === 4 ? "4+ trades" : `${n} trade${n === 1 ? "" : "s"}`}
              </option>
            ))}
          </select>
        </div>

        <div className="panel">
          <label className="field-label" htmlFor="cap">
            Maximum trades allowed
          </label>
          <select id="cap" value={tradeCap} onChange={(e) => setTradeCap(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} trade{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="panel" style={{ border: "1px solid var(--line)" }}>
        <legend className="field-label">Pre-trade conditions</legend>
        <div className="grid-2" style={{ gap: "0.6rem" }}>
          {GATE_CONDITIONS.map((condition, i) => (
            <label key={condition} className={styles.toggle}>
              <input
                type="checkbox"
                checked={conditions[i]}
                onChange={() =>
                  setConditions((prev) => prev.map((v, j) => (i === j ? !v : v)))
                }
              />
              {condition}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="panel">
        <div className="spread">
          <div className={`${styles.gateWord} ${toneClass}`}>{verdict}</div>
          <span className="pill">
            {verdict === "GO"
              ? "Trade allowed by process"
              : verdict === "WAIT"
                ? "System protecting discipline"
                : "Capital protection mode"}
          </span>
        </div>
        <div className="stack-sm" style={{ marginTop: "1rem" }}>
          {reasons.map((reason) => (
            <div
              key={reason}
              className={`${styles.reason} ${verdict === "GO" ? styles.reasonOk : ""}`}
            >
              {reason}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-market checklist
// ---------------------------------------------------------------------------

export function Checklist() {
  const [done, setDone, loaded] = useLocalState<number[]>("ppf_checklist", []);
  const complete = done.length === CHECKLIST_ITEMS.length;

  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Pre-market checklist</h2>
        <p className="lede">
          The checklist is your external brain. It works when you are tired, excited or impatient —
          which is exactly when memory does not.
        </p>
      </div>

      <div className="panel panel-flush">
        {CHECKLIST_ITEMS.map((item, i) => {
          const isDone = done.includes(i);
          return (
            <button
              key={item}
              type="button"
              className={`${styles.checkRow} ${isDone ? styles.checked : ""}`}
              aria-pressed={isDone}
              onClick={() =>
                setDone((prev) => (prev.includes(i) ? prev.filter((v) => v !== i) : [...prev, i]))
              }
            >
              <span className={styles.checkBox}>{isDone ? "✓" : ""}</span>
              <span>{item}</span>
            </button>
          );
        })}
      </div>

      <div className={`panel ${complete ? "panel-accent" : "panel-quiet"}`}>
        <div className="spread">
          <div>
            <strong>{complete ? "Checklist complete." : "Checklist incomplete."}</strong>
            <p className="small muted">
              {loaded
                ? `${done.length} of ${CHECKLIST_ITEMS.length} done. No checklist, no first trade.`
                : "Loading your saved progress…"}
            </p>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setDone([])}>
            Reset for today
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Behaviour log
// ---------------------------------------------------------------------------

interface BehaviourEntry {
  setup: string;
  result: string;
  emotion: number;
  grade: string;
  note: string;
  followed: number;
  total: number;
  time: string;
}

const EXECUTION_CHECKS = [
  "Entry followed plan",
  "Setup criteria fully met",
  "Stop was held",
  "Size stayed consistent",
  "Exit followed plan",
  "No revenge or FOMO",
];

export function BehaviorLog() {
  const [logs, setLogs] = useLocalState<BehaviourEntry[]>("ppf_behaviour_logs", []);
  const [setup, setSetup] = useState("");
  const [result, setResult] = useState("Win");
  const [emotion, setEmotion] = useState(7);
  const [grade, setGrade] = useState("A");
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState<boolean[]>(EXECUTION_CHECKS.map(() => false));
  const [resetSeconds, setResetSeconds] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startReset = (seconds = 90) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResetSeconds(seconds);
    timerRef.current = setInterval(() => {
      setResetSeconds((previous) => {
        if (previous === null || previous <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  };

  const add = () => {
    const followed = checks.filter(Boolean).length;
    setLogs((prev) =>
      [
        {
          setup: setup.trim() || "Unnamed setup",
          result,
          emotion,
          grade,
          note: note.trim() || "No note written.",
          followed,
          total: EXECUTION_CHECKS.length,
          time: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 40),
    );
    setNote("");
    setChecks(EXECUTION_CHECKS.map(() => false));
    startReset(90);
  };

  const recent = logs.slice(0, 5);
  const processScore = recent.length
    ? Math.round(
        (recent.reduce((sum, log) => sum + log.followed / Math.max(log.total, 1), 0) /
          recent.length) *
          100,
      )
    : 0;

  let streak = 0;
  for (const log of logs) {
    if (log.grade !== "A" && log.grade !== "B") break;
    streak += 1;
  }

  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Behaviour log — grade the trader, not the trade</h2>
        <p className="lede">
          A great trade can lose and a bad trade can win. The log records what you did, so money
          cannot teach you the wrong lesson.
        </p>
      </div>

      <div className="grid-3">
        <div className="panel">
          <div className="stat-label">Process score, last 5</div>
          <div className="stat-value">{processScore}%</div>
        </div>
        <div className="panel">
          <div className="stat-label">Discipline streak</div>
          <div className="stat-value">
            {streak} rep{streak === 1 ? "" : "s"}
          </div>
        </div>
        <div className="panel">
          <div className="stat-label">Next-play reset</div>
          <div className="stat-value">
            {resetSeconds === null ? "—" : resetSeconds === 0 ? "GO" : `${resetSeconds}s`}
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ marginTop: "0.75rem" }}
            onClick={() => startReset(90)}
          >
            Start 90s reset
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <label className="field-label" htmlFor="log-setup">
            Setup taken
          </label>
          <input
            id="log-setup"
            className="input"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            placeholder="Name the setup from your plan"
          />
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="log-result">
            Trade outcome
          </label>
          <select id="log-result" value={result} onChange={(e) => setResult(e.target.value)}>
            <option>Win</option>
            <option>Loss</option>
            <option>Breakeven</option>
            <option>No trade (discipline win)</option>
          </select>
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="log-emotion">
            Emotional state at entry
          </label>
          <div className={styles.rangeRow}>
            <input
              id="log-emotion"
              type="range"
              min={1}
              max={10}
              value={emotion}
              onChange={(e) => setEmotion(Number(e.target.value))}
            />
            <span className={styles.rangeValue}>{emotion}/10</span>
          </div>
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="log-grade">
            Process grade
          </label>
          <select id="log-grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {["A", "B", "C", "F"].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="panel" style={{ border: "1px solid var(--line)" }}>
        <legend className="field-label">Execution checks</legend>
        <div className="grid-2" style={{ gap: "0.6rem" }}>
          {EXECUTION_CHECKS.map((check, i) => (
            <label key={check} className={styles.toggle}>
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={() => setChecks((prev) => prev.map((v, j) => (i === j ? !v : v)))}
              />
              {check}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="panel">
        <label className="field-label" htmlFor="log-note">
          One behaviour pattern to remember
        </label>
        <textarea
          id="log-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: I hesitated after the first loss, but did not chase."
        />
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <button type="button" className="btn btn-primary" onClick={add}>
            Add behaviour log
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setLogs([])}>
            Clear logs
          </button>
        </div>
      </div>

      <div className="stack">
        {logs.length === 0 ? (
          <div className="panel panel-quiet small muted">
            No behaviour logs yet. After the next trade, record whether you followed your rules
            under pressure. These stay in your browser.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.time} className={styles.logEntry}>
              <div className={styles.gradeBadge}>{log.grade}</div>
              <div>
                <strong>
                  {log.setup} — {log.result}
                </strong>
                <div className="small muted mono">
                  Emotion {log.emotion}/10 · Rules {log.followed}/{log.total} ·{" "}
                  {new Date(log.time).toLocaleString()}
                </div>
                <p className="small" style={{ marginTop: "0.35rem" }}>
                  {log.note}
                </p>
              </div>
              <span className="pill nowrap">
                {log.grade === "A" || log.grade === "B" ? "Identity rep" : "Review"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Habits coach
// ---------------------------------------------------------------------------

interface HabitEntry {
  habits: string[];
  note: string;
  time: string;
}

export function HabitsCoach() {
  const [logs, setLogs] = useLocalState<HabitEntry[]>("ppf_habit_logs", []);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const weekly = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return logs.filter((log) => new Date(log.time).getTime() >= cutoff);
  }, [logs]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of weekly) {
      for (const habit of log.habits) map.set(habit, (map.get(habit) ?? 0) + 1);
    }
    return map;
  }, [weekly]);

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const disciplineScore = weekly.length
    ? Math.max(0, 100 - weekly.length * 8 - (top ? top[1] * 7 : 0))
    : null;

  const add = () => {
    if (selected.length === 0) {
      setError("Select at least one habit leak first — the tracker needs a named habit to coach.");
      return;
    }
    setError(null);
    setLogs((prev) =>
      [{ habits: selected, note: note.trim() || "No trigger note written.", time: new Date().toISOString() }, ...prev].slice(
        0,
        60,
      ),
    );
    setSelected([]);
    setNote("");
  };

  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Habits coach — the mistake pattern tracker</h2>
        <p className="lede">
          Do not only log trades. Log the habit underneath the trade. A mistake repeated three times
          is not random — it is a training target.
        </p>
      </div>

      <div className="grid-3">
        {HABIT_LEAKS.map((leak) => {
          const isSelected = selected.includes(leak.value);
          return (
            <label
              key={leak.value}
              className={`${styles.habitCard} ${isSelected ? styles.habitChecked : ""}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() =>
                  setSelected((prev) =>
                    prev.includes(leak.value)
                      ? prev.filter((v) => v !== leak.value)
                      : [...prev, leak.value],
                  )
                }
              />
              <span className="pill">{leak.kind}</span>
              <strong>{leak.value}</strong>
              <span className="small muted">{leak.note}</span>
              <span className="small mono" style={{ color: "var(--accent)" }}>
                {counts.get(leak.value) ?? 0} this week
              </span>
            </label>
          );
        })}
      </div>

      <div className="panel">
        <label className="field-label" htmlFor="habit-note">
          What triggered the habit?
        </label>
        <textarea
          id="habit-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: missed the first move, felt behind, entered before confirmation."
        />
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <button type="button" className="btn btn-primary" onClick={add}>
            Log selected habit leak
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setLogs([])}>
            Clear habit logs
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel panel-accent" style={{ display: "grid", placeContent: "center", textAlign: "center", minHeight: "180px" }}>
          <div style={{ fontSize: "3rem", fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
            {disciplineScore ?? "—"}
          </div>
          <div className="stat-label" style={{ marginTop: "0.5rem" }}>
            Weekly discipline score
          </div>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            {weekly.length
              ? `${weekly.length} habit leak${weekly.length === 1 ? "" : "s"} logged in the last 7 days.`
              : "No habit leaks logged this week."}
          </p>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="stat-label">Top leak this week</div>
            <strong style={{ display: "block", marginTop: "0.3rem" }}>
              {top ? `${top[0]} ×${top[1]}` : "No leak logged yet."}
            </strong>
            <p className="small muted" style={{ marginTop: "0.35rem" }}>
              {top
                ? "This is the habit to train first. Do not chase ten fixes — fix the loudest leak."
                : "The tracker will name the habit that needs the most training."}
            </p>
          </div>
          <div className="panel">
            <div className="stat-label">Coach prescription</div>
            <strong style={{ display: "block", marginTop: "0.3rem" }}>
              {top
                ? (HABIT_PRESCRIPTIONS[top[0]] ??
                  "Make the repeated leak impossible to ignore before the session starts.")
                : "Your next rule will appear here."}
            </strong>
          </div>
        </div>
      </div>

      {logs.length > 0 ? (
        <div className="stack">
          {logs.slice(0, 8).map((log) => (
            <div key={log.time} className={styles.logEntry}>
              <div className={styles.gradeBadge}>H</div>
              <div>
                <strong>{log.habits.join(" + ")}</strong>
                <div className="small muted mono">{new Date(log.time).toLocaleString()}</div>
                <p className="small" style={{ marginTop: "0.35rem" }}>
                  {log.note}
                </p>
              </div>
              <span className="pill nowrap">Habit rep</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
