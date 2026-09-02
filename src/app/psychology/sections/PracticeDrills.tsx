"use client";

import { useState } from "react";
import { DRILL_CATEGORIES, type DrillCategory } from "../data";
import styles from "../psychology.module.css";

type Rating = "SOLID" | "PARTIAL" | "REACTIVE";

interface Feedback {
  rating: Rating;
  feedback: string;
  source: "model" | "local";
}

const RATING_META: Record<Rating, { label: string; pill: string; note: string }> = {
  SOLID: { label: "✓ Solid", pill: "pill-accent", note: "Process-oriented response" },
  PARTIAL: { label: "◑ Partial", pill: "pill-warn", note: "Mixed — some reactive elements" },
  REACTIVE: { label: "✕ Reactive", pill: "pill-danger", note: "Emotion-driven — needs work" },
};

const MIN_RESPONSE = 20;

export function PracticeDrills() {
  const [category, setCategory] = useState<DrillCategory>("random");
  const [started, setStarted] = useState(false);
  const [scenario, setScenario] = useState("");
  const [scenarioCategory, setScenarioCategory] = useState<string>("");
  const [scenarioSource, setScenarioSource] = useState<"model" | "local">("local");
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState<"scenario" | "feedback" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState({ count: 0, solid: 0, partial: 0, reactive: 0 });
  const [history, setHistory] = useState<{ category: string; rating: Rating }[]>([]);
  const [summary, setSummary] = useState(false);

  const loadDrill = async () => {
    setLoading("scenario");
    setError(null);
    setFeedback(null);
    setResponse("");
    setScenario("");

    try {
      const res = await fetch("/api/psychology/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", category }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { text: string; category: string; source: "model" | "local" };
      setScenario(data.text);
      setScenarioCategory(data.category);
      setScenarioSource(data.source);
    } catch {
      setError("Couldn't load a scenario. Check your connection and try again.");
    } finally {
      setLoading(null);
    }
  };

  const start = async () => {
    setStarted(true);
    setSummary(false);
    setTally({ count: 0, solid: 0, partial: 0, reactive: 0 });
    setHistory([]);
    await loadDrill();
  };

  const submit = async () => {
    setLoading("feedback");
    setError(null);

    try {
      const res = await fetch("/api/psychology/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          category: scenarioCategory || category,
          scenario,
          response,
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Feedback;

      setFeedback(data);
      setTally((prev) => ({
        count: prev.count + 1,
        solid: prev.solid + (data.rating === "SOLID" ? 1 : 0),
        partial: prev.partial + (data.rating === "PARTIAL" ? 1 : 0),
        reactive: prev.reactive + (data.rating === "REACTIVE" ? 1 : 0),
      }));
      setHistory((prev) => [...prev, { category: scenarioCategory, rating: data.rating }]);
    } catch {
      setError("Couldn't evaluate your response. Try submitting again.");
    } finally {
      setLoading(null);
    }
  };

  const ready = response.trim().length >= MIN_RESPONSE;

  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Practice drills</h2>
        <p className="lede">
          Each drill puts you in a pressured trading moment. You answer honestly, and you get read
          back what your own words say about how you handle it. Nothing you write is stored.
        </p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel panel-accent">
          <span className="pill pill-accent">Live practice</span>
          <h3 style={{ margin: "0.6rem 0 0.4rem" }}>Rehearse the moment before it costs you.</h3>
          <p className="small">
            The scenarios adapt to the market and style in your trading profile, so they read like
            your sessions rather than a textbook.
          </p>
        </div>

        <div className="panel">
          <div className="stat-label">This session</div>
          <div className="stat-value">{tally.count}</div>
          <p className="small muted">drills completed</p>
          <div className="grid-3" style={{ marginTop: "1rem", textAlign: "center" }}>
            <div>
              <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1.2rem" }}>
                {tally.solid}
              </div>
              <div className="stat-label">solid</div>
            </div>
            <div>
              <div style={{ color: "var(--warn)", fontWeight: 700, fontSize: "1.2rem" }}>
                {tally.partial}
              </div>
              <div className="stat-label">partial</div>
            </div>
            <div>
              <div style={{ color: "var(--danger)", fontWeight: 700, fontSize: "1.2rem" }}>
                {tally.reactive}
              </div>
              <div className="stat-label">reactive</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="section-heading">Choose a drill category</h3>
        <div className={styles.catGrid}>
          {DRILL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.catBtn} ${category === cat.id ? styles.catActive : ""}`}
              aria-pressed={category === cat.id}
              onClick={() => setCategory(cat.id)}
            >
              <div className={styles.catLabel}>{cat.label}</div>
              <div className={styles.catSub}>{cat.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {!started ? (
        <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
          <button type="button" className="btn btn-primary btn-lg" onClick={start}>
            Start drill session
          </button>
        </div>
      ) : summary ? (
        <SessionSummary tally={tally} history={history} onRestart={start} />
      ) : (
        <div className="stack">
          {loading === "scenario" ? (
            <div className={`panel ${styles.pulse}`} style={{ textAlign: "center" }}>
              <span className="small mono" style={{ color: "var(--info)" }}>
                Building your scenario…
              </span>
            </div>
          ) : scenario ? (
            <>
              <div className="spread">
                <span className="pill pill-info">
                  {DRILL_CATEGORIES.find((c) => c.id === scenarioCategory)?.label ?? "Drill"}
                </span>
                <span className="stat-label">Drill #{tally.count + 1}</span>
              </div>

              <div className={styles.scenario}>{scenario}</div>

              {scenarioSource === "local" ? (
                <p className="small muted">
                  Served from the built-in scenario bank. Configure an API key to generate fresh
                  scenarios each time.
                </p>
              ) : null}
            </>
          ) : null}

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}

          {feedback ? (
            <div className="stack">
              <div className="panel">
                <div className="row">
                  <span className={`pill ${RATING_META[feedback.rating].pill}`}>
                    {RATING_META[feedback.rating].label}
                  </span>
                  <span className="stat-label">{RATING_META[feedback.rating].note}</span>
                </div>
                <p style={{ marginTop: "1rem", lineHeight: 1.75 }}>{feedback.feedback}</p>
              </div>
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={loadDrill}>
                  Next drill →
                </button>
                <button type="button" className="btn" onClick={() => setSummary(true)}>
                  End session
                </button>
              </div>
            </div>
          ) : scenario ? (
            <div className="stack-sm">
              <label className="field-label" htmlFor="drill-response">
                Your honest response — what goes through your mind, and what do you do?
              </label>
              <textarea
                id="drill-response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Be honest. This is practice, not performance. Write what you would actually think and feel."
                style={{ minHeight: "140px" }}
              />
              <div className="row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={submit}
                  disabled={!ready || loading === "feedback"}
                >
                  {loading === "feedback" ? "Reading your response…" : "Submit response"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={loadDrill}>
                  Skip →
                </button>
                {!ready ? (
                  <span className="small muted">
                    {MIN_RESPONSE - response.trim().length} more characters
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SessionSummary({
  tally,
  history,
  onRestart,
}: {
  tally: { count: number; solid: number; partial: number; reactive: number };
  history: { category: string; rating: Rating }[];
  onRestart: () => void;
}) {
  const reactiveByCategory = new Map<string, number>();
  for (const entry of history) {
    if (entry.rating === "REACTIVE") {
      reactiveByCategory.set(entry.category, (reactiveByCategory.get(entry.category) ?? 0) + 1);
    }
  }
  const worst = [...reactiveByCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  const insight =
    tally.count === 0
      ? "No drills completed this session."
      : tally.solid === tally.count
        ? "Clean session — every response was process-oriented. The real test is whether it transfers to live trading, with real money and real pressure."
        : worst
          ? `Your reactive responses clustered around "${DRILL_CATEGORIES.find((c) => c.id === worst[0])?.label ?? worst[0]}" scenarios. That is the current weak point. Drill that category specifically next session — repetition in the area of weakness is how a pattern changes.`
          : `${tally.solid} solid, ${tally.partial} partial, ${tally.reactive} reactive across ${tally.count} drills. The partial responses are where the work is — those are the moments where you had awareness but still let emotion influence the decision.`;

  return (
    <div className="stack">
      <h3 className="section-heading">Session complete</h3>
      <div className="grid-2">
        <div className="panel panel-accent">
          <div className="stat-label">Drills this session</div>
          <div className="stat-value" style={{ fontSize: "3rem" }}>
            {tally.count}
          </div>
          <hr className="divider" style={{ margin: "1rem 0" }} />
          <div className="stack-sm">
            {(
              [
                ["Solid responses", tally.solid, "var(--accent)"],
                ["Partial awareness", tally.partial, "var(--warn)"],
                ["Reactive responses", tally.reactive, "var(--danger)"],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="spread">
                <span className="small muted">{label}</span>
                <strong style={{ color }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Pattern observed</h3>
          <p className="small" style={{ marginTop: "0.75rem", lineHeight: 1.7 }}>
            {insight}
          </p>
        </div>
      </div>
      <button type="button" className="btn btn-primary" onClick={onRestart}>
        New session
      </button>
    </div>
  );
}
