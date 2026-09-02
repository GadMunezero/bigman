import Link from "next/link";
import { ChallengeCalculator } from "../Calculators";

export const metadata = {
  title: "Challenge calculator",
  description:
    "See a prop firm challenge's profit target and maximum loss in dollars, and what the ratio between them implies about how it will trade.",
};

export default function ChallengeCalculatorPage() {
  return (
    <div className="shell section">
      <nav className="small muted" style={{ marginBottom: "1.5rem" }}>
        <Link href="/tools">Tools</Link> · Challenge calculator
      </nav>

      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <h1>Challenge calculator</h1>
        <p className="lede">
          The headline number is the profit target. The number that decides whether you reach it is
          how much loss you are allowed on the way.
        </p>
      </header>

      <ChallengeCalculator />

      <div className="panel panel-accent spread" style={{ marginTop: "2rem" }}>
        <div>
          <strong>Want a recommendation based on how you trade?</strong>
          <p className="small muted">
            We weigh the target-to-drawdown shape alongside the rules that affect your strategy.
          </p>
        </div>
        <Link href="/find-my-challenge" className="btn btn-primary">
          Find My Challenge
        </Link>
      </div>
    </div>
  );
}
