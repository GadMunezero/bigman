"use client";

import { useState } from "react";
import {
  DESTROYERS,
  GRADES,
  MENTAL_MODELS,
  PRINCIPLES,
  TRAINING_PROTOCOL,
  WINNER_LOSER,
  type ModelCategory,
} from "../data";
import styles from "../psychology.module.css";

const FILTERS: { id: ModelCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "foundation", label: "Foundation" },
  { id: "edge", label: "Edge" },
  { id: "execution", label: "Execution" },
  { id: "identity", label: "Identity" },
];

export function MentalModels() {
  const [filter, setFilter] = useState<ModelCategory | "all">("all");
  const [open, setOpen] = useState<string | null>(null);

  const visible = MENTAL_MODELS.filter((m) => filter === "all" || m.category === filter);

  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Eleven core mental models</h2>
        <p className="lede">
          Each one opens into a short scene: the situation, the mistake, the correction, and the
          rule to carry into the session.
        </p>
      </div>

      <div className="row">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`btn btn-sm ${filter === option.id ? "btn-primary" : ""}`}
            onClick={() => setFilter(option.id)}
            aria-pressed={filter === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={styles.modelGrid}>
        {visible.map((model) => {
          const isOpen = open === model.id;
          return (
            <button
              key={model.id}
              type="button"
              className={`${styles.modelCard} ${isOpen ? styles.modelExpanded : ""}`}
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : model.id)}
            >
              <div className={styles.modelHead}>
                <span className={styles.modelIcon} aria-hidden="true">
                  {model.icon}
                </span>
                <span style={{ flex: 1 }}>
                  <span className="pill">{model.category}</span>
                  <h3 style={{ marginTop: "0.35rem", fontSize: "1rem" }}>{model.title}</h3>
                </span>
                <span className={styles.modelPlus} aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </div>

              <p className={styles.modelTagline}>“{model.tagline}”</p>

              {isOpen ? (
                <div>
                  <div className={styles.comicStrip}>
                    {model.panels.map((panel) => (
                      <div key={panel.kicker} className={styles.comicPanel}>
                        <span className={styles.comicKicker}>{panel.kicker}</span>
                        <p>{panel.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className={styles.speech}>{model.speech}</div>
                  <div className={styles.lessonRow}>
                    <div className={styles.lesson}>
                      <strong>How to apply it</strong>
                      {model.apply}
                    </div>
                    <div className={`${styles.lesson} ${styles.lessonWarn}`}>
                      <strong>Watch out for</strong>
                      {model.warning}
                    </div>
                  </div>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WinnerVsLoser() {
  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Winner vs loser — the identity arena</h2>
        <p className="lede">
          Two traders sit at the same screen. One executes, one reacts. The difference is not
          intelligence — it is identity under pressure.
        </p>
      </div>

      <div className={styles.arena}>
        <div className={styles.side} style={{ "--side": "var(--danger)" } as React.CSSProperties}>
          <span className="pill pill-danger">Red corner</span>
          <h3 style={{ marginTop: "0.6rem" }}>The reactive trader</h3>
          <p className="small" style={{ marginTop: "0.5rem" }}>
            Not a bad person. Just letting emotion drive with no seatbelt.
          </p>
          <div className="stack-sm" style={{ marginTop: "1rem" }}>
            {WINNER_LOSER.reactive.map(([title, body]) => (
              <div key={title} className={styles.trait}>
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.side} style={{ "--side": "var(--accent)" } as React.CSSProperties}>
          <span className="pill pill-accent">Green corner</span>
          <h3 style={{ marginTop: "0.6rem" }}>The professional trader</h3>
          <p className="small" style={{ marginTop: "0.5rem" }}>
            Not emotionless. Feels the pressure and still follows the operating system.
          </p>
          <div className="stack-sm" style={{ marginTop: "1rem" }}>
            {WINNER_LOSER.professional.map(([title, body]) => (
              <div key={title} className={styles.trait}>
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-3">
        {WINNER_LOSER.rounds.map(([loser, winner, line], i) => (
          <div key={line} className="panel">
            <span className="pill">Round {String(i + 1).padStart(2, "0")}</span>
            <div className={styles.versus}>
              <span className={styles.versusPill}>{loser}</span>
              <span className="small muted mono">vs</span>
              <span className={styles.versusPill}>{winner}</span>
            </div>
            <p className="small" style={{ marginTop: "0.75rem", color: "var(--accent)" }}>
              {line}
            </p>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="panel panel-accent">
          <div className="stat-label">Identity contract</div>
          <strong style={{ display: "block", marginTop: "0.4rem", color: "var(--accent)" }}>
            Today I am paid in clean reps first.
          </strong>
          <p className="small" style={{ marginTop: "0.5rem" }}>
            I trade only my written plan, with fixed risk and no emotional edits.
          </p>
        </div>
        <div className="panel panel-warn">
          <div className="stat-label">Emergency reminder</div>
          <strong style={{ display: "block", marginTop: "0.4rem", color: "var(--warn)" }}>
            If I feel urgency, I pause before I participate.
          </strong>
          <p className="small" style={{ marginTop: "0.5rem" }}>
            Urgency is not information. It is arousal. Breathe, reset, and let the next valid setup
            earn attention.
          </p>
        </div>
      </div>
    </div>
  );
}

export function TrainingProtocol() {
  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Daily training protocol</h2>
        <p className="lede">
          The market can be random. Your behaviour cannot be. This turns a session into practice
          reps: prepare, execute, reset, review.
        </p>
      </div>
      <div className="grid-3">
        {TRAINING_PROTOCOL.map((drill) => (
          <div key={drill.title} className="panel">
            <span className="pill">{drill.step}</span>
            <h3 style={{ margin: "0.6rem 0 0.4rem", fontSize: "1rem" }}>{drill.title}</h3>
            <p className="small">{drill.body}</p>
            <p className="small mono" style={{ marginTop: "0.75rem", color: "var(--accent)" }}>
              {drill.line}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TradeGrader() {
  const toneClass: Record<string, string> = {
    accent: "pill-accent",
    info: "pill-info",
    warn: "pill-warn",
    danger: "pill-danger",
    violet: "pill-violet",
  };

  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Post-trade grader</h2>
        <p className="lede">
          The trade is over. Do not ask whether you were paid — ask whether you were professional.
        </p>
      </div>
      <div className="grid-3">
        {GRADES.map((grade) => (
          <div key={grade.grade} className="panel">
            <div style={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1 }}>{grade.grade}</div>
            <h3 style={{ margin: "0.5rem 0 0.4rem", fontSize: "1rem" }}>{grade.title}</h3>
            <p className="small">{grade.body}</p>
            <div className="stack-sm" style={{ marginTop: "0.75rem" }}>
              {grade.points.map((point) => (
                <span key={point} className={`pill ${toneClass[grade.tone] ?? ""}`}>
                  {point}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InversionTool() {
  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Inversion — study the account destroyers</h2>
        <p className="lede">
          Do not only ask how to win. Ask how accounts get destroyed, then refuse the script.
        </p>
      </div>
      <div className="grid-3">
        {DESTROYERS.map((destroyer) => (
          <div key={destroyer.n} className="panel">
            <span className="pill pill-danger">Destroyer {destroyer.n}</span>
            <h3 style={{ margin: "0.6rem 0 0.4rem", fontSize: "1rem" }}>{destroyer.title}</h3>
            <p className="small">{destroyer.body}</p>
            <p className="small mono" style={{ marginTop: "0.75rem", color: "var(--accent)" }}>
              Countermove: {destroyer.counter}
            </p>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="panel">
          <div className="stat-label">Daily danger question</div>
          <strong style={{ display: "block", marginTop: "0.4rem" }}>
            Which destroyer feels most tempting today?
          </strong>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            Name it before the session. The unnamed trigger becomes the one that drives.
          </p>
        </div>
        <div className="panel panel-accent">
          <div className="stat-label">Emergency sentence</div>
          <strong style={{ display: "block", marginTop: "0.4rem", color: "var(--accent)" }}>
            I am allowed to miss trades. I am not allowed to train bad behaviour.
          </strong>
        </div>
      </div>
    </div>
  );
}

const TONE_COLOR: Record<string, string> = {
  info: "var(--info)",
  violet: "var(--violet)",
  accent: "var(--accent)",
  warn: "var(--warn)",
};

export function Principles() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Twelve psychological principles</h2>
        <p className="lede">
          Most edge erosion is psychological, not analytical. Read one before a session — the goal is
          recognition you can reach under pressure, not memorisation.
        </p>
      </div>

      <div className={styles.accordion}>
        {PRINCIPLES.map((principle) => {
          const isOpen = open === principle.n;
          const color = TONE_COLOR[principle.tone] ?? "var(--accent)";

          return (
            <div key={principle.n} className={styles.accordionRow}>
              <button
                type="button"
                className={styles.accordionHead}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : principle.n)}
              >
                <span className={styles.accordionNum}>{principle.n}</span>
                <span style={{ flex: 1 }}>
                  <span className="pill" style={{ color, borderColor: color }}>
                    {principle.tag}
                  </span>
                  <span style={{ display: "block", marginTop: "0.3rem", fontWeight: 600 }}>
                    {principle.title}
                  </span>
                </span>
                <span className={styles.modelPlus} aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen ? (
                <div className={styles.accordionBody}>
                  {principle.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}

                  {principle.contrast ? (
                    <div className={styles.contrast}>
                      <div className={styles.half} style={{ borderColor: "rgba(242,114,111,0.3)" }}>
                        <div className={styles.halfLabel} style={{ color: "var(--danger)" }}>
                          {principle.contrast.badLabel}
                        </div>
                        {principle.contrast.bad.map((item) => (
                          <div key={item} className={styles.halfItem}>
                            {item}
                          </div>
                        ))}
                      </div>
                      <div className={styles.half} style={{ borderColor: "var(--accent-line)" }}>
                        <div className={styles.halfLabel} style={{ color: "var(--accent)" }}>
                          {principle.contrast.goodLabel}
                        </div>
                        {principle.contrast.good.map((item) => (
                          <div key={item} className={styles.halfItem}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {principle.callout ? (
                    <div className={styles.callout} style={{ color }}>
                      {principle.callout}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
