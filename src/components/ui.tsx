import Link from "next/link";
import type {
  ChallengeRecord,
  ConsistencyStatus,
  CriterionScore,
  RuleStatus,
} from "@/lib/types";
import { CRITERION_LABELS } from "@/lib/types";
import styles from "./ui.module.css";

/** Colour by band. Below 60 we don't dress it up as a good result. */
function ringColor(score: number): string {
  if (score >= 80) return "var(--accent)";
  if (score >= 60) return "var(--warn)";
  return "var(--danger)";
}

export function MatchRing({ score, size = 92 }: { score: number; size?: number }) {
  return (
    <div
      className={styles.ring}
      style={
        {
          "--pct": score,
          "--size": `${size}px`,
          "--ring-color": ringColor(score),
        } as React.CSSProperties
      }
      role="img"
      aria-label={`${score} percent match`}
    >
      <div className={styles.ringInner}>
        <span className={styles.ringValue}>{score}</span>
        <span className={styles.ringUnit}>match</span>
      </div>
    </div>
  );
}

const RULE_TEXT: Record<RuleStatus, string> = {
  allowed: "Allowed",
  restricted: "Restricted",
  prohibited: "Prohibited",
  unknown: "Not confirmed",
};

export function RuleBadge({
  label,
  status,
}: {
  label: string;
  status: RuleStatus | ConsistencyStatus;
}) {
  const normalised: RuleStatus =
    status === "required"
      ? "prohibited"
      : status === "not_required"
        ? "allowed"
        : (status as RuleStatus);

  const text =
    status === "required" ? "Required" : status === "not_required" ? "Not required" : RULE_TEXT[normalised];

  return (
    <span className={`${styles.ruleBadge} ${styles[normalised]}`}>
      {label ? `${label}: ` : ""}
      {text}
    </span>
  );
}

/** Money that is honest about missing data. */
export function Money({ value, currency = "USD" }: { value: number | null; currency?: string }) {
  if (value === null) return <span className="muted">Price not confirmed</span>;
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return (
    <span>
      {symbol}
      {value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
    </span>
  );
}

export function Figure({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="muted">Not confirmed</span>;
  return (
    <span>
      {value}
      {suffix}
    </span>
  );
}

export function AccountSize({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">Not confirmed</span>;
  return <span>${(value / 1000).toLocaleString("en-US")}K</span>;
}

export function LastVerified({ date }: { date: string | null }) {
  if (!date) return <span className="pill">Not verified</span>;
  const formatted = new Date(date).toLocaleDateString("en-US", { dateStyle: "medium" });
  const stale = Date.now() - new Date(date).getTime() > 90 * 24 * 60 * 60 * 1000;
  return (
    <span className={`pill ${stale ? "pill-warn" : ""}`}>
      {stale ? "Needs re-check · " : "Last verified "}
      {formatted}
    </span>
  );
}

export function ReasonList({
  items,
  tone = "positive",
}: {
  items: string[];
  tone?: "positive" | "warning";
}) {
  if (items.length === 0) return null;
  return (
    <ul className={styles.reasons} style={{ listStyle: "none" }}>
      {items.map((item) => (
        <li key={item} className={styles.reason}>
          <span className={`${styles.reasonIcon} ${tone === "warning" ? styles.warnIcon : ""}`}>
            {tone === "warning" ? "!" : "✓"}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ScoreBreakdown({ breakdown }: { breakdown: CriterionScore[] }) {
  const totalEarned = breakdown.reduce((s, b) => s + b.earned, 0);
  const totalAvailable = breakdown.reduce((s, b) => s + b.available, 0);

  return (
    <div>
      {breakdown.map((row) => (
        <div key={row.criterion} className={styles.breakdownRow}>
          <div className="small">
            {CRITERION_LABELS[row.criterion]}
            {row.boosted ? (
              <span className="pill pill-accent" style={{ marginLeft: "0.4rem" }}>
                priority
              </span>
            ) : null}
          </div>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${row.ratio * 100}%` }} />
          </div>
          <div className={styles.breakdownValue}>
            {row.earned.toFixed(1)} / {row.available.toFixed(1)}
          </div>
        </div>
      ))}
      <div className={styles.breakdownRow} style={{ borderTop: "1px solid var(--line-2)" }}>
        <strong className="small">Total</strong>
        <span />
        <strong className={styles.breakdownValue}>
          {totalEarned.toFixed(1)} / {totalAvailable.toFixed(0)}
        </strong>
      </div>
    </div>
  );
}

export function ChallengeCard({
  challenge,
  score,
  href,
}: {
  challenge: ChallengeRecord;
  score?: number;
  href?: string;
}) {
  const url = href ?? `/challenges/${challenge.slug}`;

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3 className={styles.cardTitle}>{challenge.name}</h3>
          <div className={styles.cardFirm}>{challenge.firm.name}</div>
        </div>
        {typeof score === "number" ? (
          <div className={styles.cardScore}>
            <span className={styles.cardScoreValue}>{score}%</span>
            <span className={styles.cardScoreLabel}>match</span>
          </div>
        ) : null}
      </div>

      <div className={styles.specs}>
        <div className={styles.spec}>
          <span className={styles.specLabel}>Account</span>
          <span className={styles.specValue}>
            <AccountSize value={challenge.account_size} />
          </span>
        </div>
        <div className={styles.spec}>
          <span className={styles.specLabel}>Price</span>
          <span className={styles.specValue}>
            <Money value={challenge.price} currency={challenge.currency} />
          </span>
        </div>
        <div className={styles.spec}>
          <span className={styles.specLabel}>Max drawdown</span>
          <span className={styles.specValue}>
            <Figure value={challenge.max_drawdown_pct} suffix="%" />
          </span>
        </div>
        <div className={styles.spec}>
          <span className={styles.specLabel}>Profit target</span>
          <span className={styles.specValue}>
            <Figure value={challenge.profit_target_pct} suffix="%" />
          </span>
        </div>
      </div>

      <div className={styles.cardRules}>
        <RuleBadge label="News" status={challenge.rules.news_trading} />
        <RuleBadge label="Overnight" status={challenge.rules.overnight} />
        <RuleBadge label="Consistency" status={challenge.rules.consistency_rule} />
      </div>

      <div className={styles.cardActions}>
        <Link href={url} className="btn btn-sm">
          View challenge
        </Link>
        <Link href={`/compare?add=${challenge.id}`} className="btn btn-sm">
          Compare
        </Link>
      </div>
    </article>
  );
}
