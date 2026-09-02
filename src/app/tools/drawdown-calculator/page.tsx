import Link from "next/link";
import { DrawdownCalculator } from "../Calculators";

export const metadata = {
  title: "Drawdown calculator",
  description:
    "Convert a prop firm challenge's maximum and daily drawdown percentages into the dollar limits you have to trade inside.",
};

export default function DrawdownCalculatorPage() {
  return (
    <div className="shell section">
      <nav className="small muted" style={{ marginBottom: "1.5rem" }}>
        <Link href="/tools">Tools</Link> · Drawdown calculator
      </nav>

      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <h1>Drawdown calculator</h1>
        <p className="lede">
          A challenge lists percentages. You trade dollars. This converts one into the other, and
          shows how many full-limit losing days the account can survive.
        </p>
      </header>

      <DrawdownCalculator />

      <div className="panel panel-quiet" style={{ marginTop: "2rem" }}>
        <p className="small muted">
          Educational only. Trailing drawdown behaves differently from static drawdown — with a
          trailing rule your loss limit moves up as your balance does, so the figures here are the
          starting picture rather than the whole one. Always confirm against the firm&apos;s rules.
        </p>
      </div>

      <div className="panel panel-accent spread" style={{ marginTop: "2rem" }}>
        <div>
          <strong>Want a recommendation based on how you trade?</strong>
          <p className="small muted">Drawdown is one of eight criteria we score.</p>
        </div>
        <Link href="/find-my-challenge" className="btn btn-primary">
          Find My Challenge
        </Link>
      </div>
    </div>
  );
}
