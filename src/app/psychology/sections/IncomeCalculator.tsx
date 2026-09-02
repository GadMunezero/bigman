"use client";

import { useMemo, useState } from "react";
import styles from "../psychology.module.css";

/**
 * Prop firm income calculator.
 *
 * The point of this tool is not to produce an exciting number — it is to show
 * the trader what their target actually demands of them, and to push back when
 * the inputs describe a psychologically dangerous plan. Every account in the
 * roadmap is generic; no firm names are attached to invented returns.
 */
export function IncomeCalculator() {
  const [goal, setGoal] = useState(5000);
  const [accountSize, setAccountSize] = useState(50_000);
  const [split, setSplit] = useState(80);
  const [monthlyReturn, setMonthlyReturn] = useState(4);
  const [maxAccounts, setMaxAccounts] = useState(10);

  const math = useMemo(() => {
    const grossPerAccount = accountSize * (monthlyReturn / 100);
    const netPerAccount = grossPerAccount * (split / 100);
    const accountsNeeded = netPerAccount > 0 ? Math.ceil(goal / netPerAccount) : Infinity;
    const maxIncome = netPerAccount * maxAccounts;

    return { grossPerAccount, netPerAccount, accountsNeeded, maxIncome };
  }, [goal, accountSize, split, monthlyReturn, maxAccounts]);

  const returnNote =
    monthlyReturn <= 2
      ? "Conservative — the kind of number that survives a bad month."
      : monthlyReturn <= 4
        ? "Realistic — a solid professional range."
        : monthlyReturn <= 6
          ? "Ambitious — achievable in good months, not every month."
          : monthlyReturn <= 10
            ? "Aggressive — possible occasionally, dangerous as a baseline."
            : "Unrealistic as a monthly average. Planning around it tends to end in forced trades.";

  const feasible = math.accountsNeeded <= maxAccounts;
  const buffer = feasible ? Math.round((math.maxIncome / goal - 1) * 100) : 0;

  const psychNote = (() => {
    if (monthlyReturn > 8) {
      return {
        tone: "panel-danger",
        title: "That return target is the psychological trap",
        body: `A ${monthlyReturn}% monthly target pushes you to force trades, hold losers, and revenge-trade drawdowns. Lower the return and add an account instead — the arithmetic lands in the same place, and the behaviour required is far safer.`,
      };
    }
    if (!feasible) {
      return {
        tone: "panel-warn",
        title: "This goal is out of reach at this setup",
        body: `You would need ${math.accountsNeeded} accounts but plan to manage ${maxAccounts}. Lower the goal, raise the account size, or raise the account count. Chasing the gap creates exactly the pressure that destroys the accounts you already have.`,
      };
    }
    if (math.accountsNeeded <= 3 && maxAccounts >= 8) {
      return {
        tone: "panel-accent",
        title: "Strong setup — room to breathe",
        body: `You need ${math.accountsNeeded} of your ${maxAccounts} accounts to hit the target. That buffer means a bad month is not an emergency. Start with ${math.accountsNeeded}, prove consistency, then scale.`,
      };
    }
    return {
      tone: "panel-accent",
      title: "Realistic plan",
      body: `You need ${math.accountsNeeded} accounts at about $${Math.round(math.netPerAccount).toLocaleString("en-US")} each per month. Build in stages: master one account, add a second after a month of consistency, then scale.`,
    };
  })();

  const dailyTarget = goal / 20;

  return (
    <div className="stack-lg">
      <div>
        <h2 className="section-heading">Income calculator</h2>
        <p className="lede">
          What your target actually requires, month after month. The goal is not the biggest number
          — it is the number you can hit without breaking your process.
        </p>
      </div>

      <div className="grid-2">
        <div className="panel stack">
          <h3>Your target</h3>

          <div>
            <label className="field-label" htmlFor="goal">
              Monthly income goal
            </label>
            <div className={styles.rangeRow}>
              <input
                id="goal"
                type="range"
                min={500}
                max={20000}
                step={500}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
              />
              <span className={styles.rangeValue}>${(goal / 1000).toFixed(1)}k</span>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="acct">
              Funded account size
            </label>
            <select
              id="acct"
              value={accountSize}
              onChange={(e) => setAccountSize(Number(e.target.value))}
            >
              {[25_000, 50_000, 100_000, 150_000, 200_000].map((size) => (
                <option key={size} value={size}>
                  ${size.toLocaleString("en-US")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="split">
              Profit split you keep
            </label>
            <div className={styles.rangeRow}>
              <input
                id="split"
                type="range"
                min={40}
                max={90}
                step={5}
                value={split}
                onChange={(e) => setSplit(Number(e.target.value))}
              />
              <span className={styles.rangeValue}>{split}%</span>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="ret">
              Realistic monthly return on account
            </label>
            <div className={styles.rangeRow}>
              <input
                id="ret"
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={monthlyReturn}
                onChange={(e) => setMonthlyReturn(Number(e.target.value))}
              />
              <span className={styles.rangeValue}>{monthlyReturn}%</span>
            </div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              {returnNote}
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="accts">
              Accounts you can realistically manage
            </label>
            <div className={styles.rangeRow}>
              <input
                id="accts"
                type="range"
                min={1}
                max={20}
                value={maxAccounts}
                onChange={(e) => setMaxAccounts(Number(e.target.value))}
              />
              <span className={styles.rangeValue}>{maxAccounts}</span>
            </div>
          </div>
        </div>

        <div className="panel panel-accent stack">
          <h3>What the maths says</h3>

          <div>
            <div className="stat-label">Net per account, per month</div>
            <div className="stat-value" style={{ fontSize: "2.4rem" }}>
              ${Math.round(math.netPerAccount).toLocaleString("en-US")}
            </div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              ${accountSize.toLocaleString("en-US")} × {monthlyReturn}% = $
              {Math.round(math.grossPerAccount).toLocaleString("en-US")} gross → {split}% split
            </p>
          </div>

          <hr className="divider" />

          <div>
            <div className="stat-label">Accounts needed to hit the goal</div>
            <div
              className="stat-value"
              style={{ fontSize: "2.4rem", color: feasible ? "var(--accent)" : "var(--danger)" }}
            >
              {Number.isFinite(math.accountsNeeded) ? math.accountsNeeded : "—"}
            </div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              To reach ${goal.toLocaleString("en-US")}/month
            </p>
          </div>

          <hr className="divider" />

          <div>
            <div className="stat-label">What your maximum accounts actually pay</div>
            <div className="stat-value" style={{ fontSize: "2.4rem" }}>
              ${Math.round(math.maxIncome).toLocaleString("en-US")}
            </div>
          </div>

          <span className={`pill ${feasible ? "pill-accent" : "pill-danger"}`}>
            {feasible
              ? `Achievable — ${buffer}% buffer above goal`
              : "Goal exceeds capacity — adjust return or account count"}
          </span>
        </div>
      </div>

      <div className={`panel ${psychNote.tone}`}>
        <strong>{psychNote.title}</strong>
        <p className="small" style={{ marginTop: "0.4rem" }}>
          {psychNote.body}
        </p>
      </div>

      <div>
        <h3 className="section-heading">The honest reality check</h3>
        <div className="grid-3">
          <div className="panel">
            <div className="stat-label">Daily target</div>
            <div className="stat-value">${Math.round(dailyTarget).toLocaleString("en-US")}</div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              Your goal spread over 20 trading days.
            </p>
          </div>
          <div className="panel">
            <div className="stat-label">Per trade, at four a day</div>
            <div className="stat-value" style={{ color: "var(--info)" }}>
              ${Math.round(dailyTarget / 4).toLocaleString("en-US")}
            </div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              Averaged across all trades, winners and losers.
            </p>
          </div>
          <div className="panel">
            <div className="stat-label">Loss budget, one account</div>
            <div className="stat-value" style={{ color: "var(--danger)" }}>
              ${Math.round(accountSize * 0.05).toLocaleString("en-US")}
            </div>
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              Assuming a 5% drawdown. Check your own challenge&apos;s actual figure.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="section-heading">Your account roadmap</h3>
        <div className="stack-sm">
          {Array.from({ length: Math.min(maxAccounts, 20) }, (_, i) => {
            const cumulative = math.netPerAccount * (i + 1);
            const isGoal = i + 1 === math.accountsNeeded;
            return (
              <div
                key={i}
                className={`panel ${isGoal ? "panel-accent" : ""}`}
                style={{ padding: "0.7rem 1rem", display: "flex", gap: "1rem", alignItems: "center" }}
              >
                <span className="mono small muted">{String(i + 1).padStart(2, "0")}</span>
                <span style={{ flex: 1 }} className="small">
                  Account {i + 1}
                  {isGoal ? (
                    <span style={{ color: "var(--accent)" }}> · goal reached</span>
                  ) : null}
                </span>
                <span className="mono small">
                  +${Math.round(math.netPerAccount).toLocaleString("en-US")}/mo
                </span>
                <span className="pill nowrap">
                  ${Math.round(cumulative).toLocaleString("en-US")} total
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel panel-danger">
        <h3 style={{ color: "var(--danger)" }}>The psychology of scaling traps</h3>
        <div className="stack" style={{ marginTop: "0.75rem" }}>
          <div>
            <strong className="small">Trap 01 — chasing accounts to fix a skill gap</strong>
            <p className="small muted">
              More accounts amplify whatever you already do. Ten accounts with poor discipline is
              ten times the damage. Scale only after the single-account process is documented and
              consistent.
            </p>
          </div>
          <div>
            <strong className="small">Trap 02 — using income projections as motivation fuel</strong>
            <p className="small muted">
              The moment a number becomes an identity goal, every underperforming week becomes a
              psychological threat. Keep targets operational, not identity-based.
            </p>
          </div>
          <div>
            <strong className="small">Trap 03 — ignoring the reset cost</strong>
            <p className="small muted">
              A blown evaluation costs the price of a new one. Three revenge-traded accounts in a
              month can wipe out the profit from your best one. Risk management is also business
              management.
            </p>
          </div>
        </div>
      </div>

      <p className="small muted">
        These are arithmetic projections from the inputs you chose, not forecasts. Nothing here
        predicts that you will pass an evaluation, earn a payout, or achieve any return.
      </p>
    </div>
  );
}
