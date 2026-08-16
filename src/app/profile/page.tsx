import Link from "next/link";
import { getCurrentProfile } from "@/lib/session";
import { DEAL_BREAKER_LABELS, PRIORITY_LABELS, type DealBreaker, type Priority } from "@/lib/types";
import { ClearProfileButton } from "./ClearProfileButton";

export const metadata = {
  title: "Your trading profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  market: "Market",
  trading_style: "Trading style",
  holding_period: "Holding period",
  news_trading: "News trading",
  overnight_required: "Overnight required",
  challenge_approach: "Challenge approach",
  risk_style: "Risk style",
  budget: "Budget",
  desired_account_size: "Account size",
  platform: "Platform",
};

function display(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not answered";
  if (key === "desired_account_size") {
    if (value === "no_preference") return "No preference";
    const size = Number(value);
    return Number.isFinite(size) ? `$${(size / 1000).toLocaleString("en-US")}K` : String(value);
  }
  if (key === "budget") {
    const budgets: Record<string, string> = {
      under_50: "Under $50",
      "50_100": "$50 – $100",
      "100_200": "$100 – $200",
      "200_300": "$200 – $300",
      "300_plus": "$300+",
      no_preference: "No preference",
    };
    return budgets[String(value)] ?? String(value);
  }
  return String(value).replace(/_/g, " ");
}

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="shell-narrow section">
        <h1>You haven&apos;t built a trading profile yet.</h1>
        <p className="lede" style={{ marginTop: "1rem" }}>
          Answer six to eight questions and we&apos;ll keep your profile on this device so every
          challenge on the site shows your personal match score.
        </p>
        <Link href="/find-my-challenge" className="btn btn-primary btn-lg" style={{ marginTop: "2rem" }}>
          Find My Challenge
        </Link>
      </div>
    );
  }

  return (
    <div className="shell-narrow section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Your profile</span>
        <h1>Your trading profile</h1>
        <p className="lede">
          This is what the recommendation engine uses. Nothing else about you is stored.
        </p>
      </header>

      <dl className="panel">
        {Object.entries(LABELS).map(([key, label]) => (
          <div key={key} className="kv">
            <dt>{label}</dt>
            <dd>{display(key, (profile as unknown as Record<string, unknown>)[key])}</dd>
          </div>
        ))}
        <div className="kv">
          <dt>Automated trading required</dt>
          <dd>{profile.ea_required === null ? "Not asked" : profile.ea_required ? "Yes" : "No"}</dd>
        </div>
        <div className="kv">
          <dt>Weekend holding required</dt>
          <dd>
            {profile.weekend_required === null ? "Not asked" : profile.weekend_required ? "Yes" : "No"}
          </dd>
        </div>
      </dl>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="stat-label">Your priorities</div>
        <div className="row" style={{ marginTop: "0.6rem" }}>
          {profile.priorities.length === 0 ? (
            <span className="small muted">None selected</span>
          ) : (
            profile.priorities.map((priority: Priority) => (
              <span key={priority} className="pill pill-accent">
                {PRIORITY_LABELS[priority] ?? priority}
              </span>
            ))
          )}
        </div>
        <p className="small muted" style={{ marginTop: "0.75rem" }}>
          Each priority increases the weight of the criterion it maps to, then all weights are
          renormalised to 100.
        </p>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="stat-label">Your deal-breakers</div>
        <div className="row" style={{ marginTop: "0.6rem" }}>
          {profile.deal_breakers.length === 0 ? (
            <span className="small muted">None — nothing is filtered out on this basis</span>
          ) : (
            profile.deal_breakers.map((breaker: DealBreaker) => (
              <span key={breaker} className="pill pill-danger">
                {DEAL_BREAKER_LABELS[breaker] ?? breaker}
              </span>
            ))
          )}
        </div>
        <p className="small muted" style={{ marginTop: "0.75rem" }}>
          These are hard filters. Any challenge that conflicts with one is removed entirely rather
          than ranked lower.
        </p>
      </div>

      <div className="row" style={{ marginTop: "2rem" }}>
        <Link href="/find-my-challenge/results" className="btn btn-primary">
          See my matches
        </Link>
        <Link href="/find-my-challenge" className="btn">
          Retake match
        </Link>
        <ClearProfileButton />
      </div>
    </div>
  );
}
