"use client";

import { useMemo, useState } from "react";

const money = (value: number) =>
  `$${Math.round(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/**
 * Drawdown calculator — turns the percentages on a challenge page into the
 * account figures a trader actually has to respect while trading.
 */
export function DrawdownCalculator() {
  const [accountSize, setAccountSize] = useState(50_000);
  const [maxDrawdown, setMaxDrawdown] = useState(6);
  const [dailyDrawdown, setDailyDrawdown] = useState(3);

  const results = useMemo(() => {
    const maxLoss = accountSize * (maxDrawdown / 100);
    const dailyLoss = accountSize * (dailyDrawdown / 100);
    return {
      maxLoss,
      dailyLoss,
      floor: accountSize - maxLoss,
      dailyFloor: accountSize - dailyLoss,
      daysToBreach: dailyLoss > 0 ? maxLoss / dailyLoss : Infinity,
    };
  }, [accountSize, maxDrawdown, dailyDrawdown]);

  return (
    <div className="grid-2" style={{ alignItems: "start" }}>
      <div className="panel stack">
        <h3>Inputs</h3>
        <div>
          <label className="field-label" htmlFor="dd-size">
            Account size
          </label>
          <input
            id="dd-size"
            type="number"
            className="input"
            min={1000}
            step={1000}
            value={accountSize}
            onChange={(e) => setAccountSize(Math.max(0, Number(e.target.value)))}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="dd-max">
            Maximum drawdown (%)
          </label>
          <input
            id="dd-max"
            type="number"
            className="input"
            min={0}
            max={100}
            step={0.5}
            value={maxDrawdown}
            onChange={(e) => setMaxDrawdown(Math.max(0, Number(e.target.value)))}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="dd-daily">
            Daily drawdown (%)
          </label>
          <input
            id="dd-daily"
            type="number"
            className="input"
            min={0}
            max={100}
            step={0.5}
            value={dailyDrawdown}
            onChange={(e) => setDailyDrawdown(Math.max(0, Number(e.target.value)))}
          />
          <p className="small muted" style={{ marginTop: "0.4rem" }}>
            Set to 0 if your challenge has no daily loss rule.
          </p>
        </div>
      </div>

      <div className="panel panel-accent stack">
        <h3>What that means in dollars</h3>

        <div>
          <div className="stat-label">Maximum total loss</div>
          <div className="stat-value" style={{ fontSize: "2.2rem" }}>
            {money(results.maxLoss)}
          </div>
          <p className="small muted">Account drops below {money(results.floor)} and it is over.</p>
        </div>

        <hr className="divider" />

        <div>
          <div className="stat-label">Maximum daily loss</div>
          <div className="stat-value" style={{ fontSize: "2.2rem", color: "var(--warn)" }}>
            {dailyDrawdown > 0 ? money(results.dailyLoss) : "None"}
          </div>
          {dailyDrawdown > 0 ? (
            <p className="small muted">
              Intraday floor of {money(results.dailyFloor)} from the day&apos;s starting balance.
            </p>
          ) : null}
        </div>

        <hr className="divider" />

        <div>
          <div className="stat-label">Full-limit losing days to breach</div>
          <div className="stat-value" style={{ fontSize: "2.2rem", color: "var(--danger)" }}>
            {Number.isFinite(results.daysToBreach) ? results.daysToBreach.toFixed(1) : "—"}
          </div>
          <p className="small muted">
            {Number.isFinite(results.daysToBreach)
              ? "Consecutive days at the full daily limit before the account is gone. This is the number worth internalising."
              : "No daily limit set, so there is no per-day ceiling on how fast the account can go."}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Challenge calculator — the profit target and the loss budget side by side,
 * because the relationship between them is what actually decides difficulty.
 */
export function ChallengeCalculator() {
  const [accountSize, setAccountSize] = useState(50_000);
  const [profitTarget, setProfitTarget] = useState(8);
  const [maxDrawdown, setMaxDrawdown] = useState(6);

  const results = useMemo(() => {
    const target = accountSize * (profitTarget / 100);
    const maxLoss = accountSize * (maxDrawdown / 100);
    return { target, maxLoss, ratio: maxLoss > 0 ? target / maxLoss : Infinity };
  }, [accountSize, profitTarget, maxDrawdown]);

  const verdict =
    results.ratio <= 1
      ? {
          tone: "panel-accent",
          text: "You have more loss budget than you need in profit. That is the friendlier shape — it gives your variance room to breathe.",
        }
      : results.ratio <= 1.5
        ? {
            tone: "panel-warn",
            text: "The target is moderately larger than your loss budget. Workable, but a single oversized loss costs a disproportionate share of your runway.",
          }
        : {
            tone: "panel-danger",
            text: "The target is much larger than your loss budget. This shape rewards patience and punishes drawdown hard — it is where traders start forcing trades to catch up.",
          };

  return (
    <div className="stack">
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel stack">
          <h3>Inputs</h3>
          <div>
            <label className="field-label" htmlFor="cc-size">
              Account size
            </label>
            <input
              id="cc-size"
              type="number"
              className="input"
              min={1000}
              step={1000}
              value={accountSize}
              onChange={(e) => setAccountSize(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="cc-target">
              Profit target (%)
            </label>
            <input
              id="cc-target"
              type="number"
              className="input"
              min={0}
              step={0.5}
              value={profitTarget}
              onChange={(e) => setProfitTarget(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="cc-dd">
              Maximum drawdown (%)
            </label>
            <input
              id="cc-dd"
              type="number"
              className="input"
              min={0}
              step={0.5}
              value={maxDrawdown}
              onChange={(e) => setMaxDrawdown(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </div>

        <div className="panel panel-accent stack">
          <h3>What the challenge asks of you</h3>
          <div>
            <div className="stat-label">Profit target</div>
            <div className="stat-value" style={{ fontSize: "2.2rem" }}>
              {money(results.target)}
            </div>
          </div>
          <hr className="divider" />
          <div>
            <div className="stat-label">Maximum loss allowed</div>
            <div className="stat-value" style={{ fontSize: "2.2rem", color: "var(--danger)" }}>
              {money(results.maxLoss)}
            </div>
          </div>
          <hr className="divider" />
          <div>
            <div className="stat-label">Target ÷ loss budget</div>
            <div className="stat-value" style={{ fontSize: "2.2rem" }}>
              {Number.isFinite(results.ratio) ? `${results.ratio.toFixed(2)}×` : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className={`panel ${verdict.tone}`}>
        <strong>Reading the ratio</strong>
        <p className="small" style={{ marginTop: "0.4rem" }}>
          {verdict.text}
        </p>
      </div>

      <p className="small muted">
        This is arithmetic on the numbers you entered — it is educational, not a prediction of
        difficulty or of your result. Confirm the actual figures on the firm&apos;s own rules page.
      </p>
    </div>
  );
}
