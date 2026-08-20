import Link from "next/link";
import { ProsePage } from "@/components/Prose";

export const metadata = {
  title: "About",
  description: "Why this exists and what it refuses to be.",
};

export default function AboutPage() {
  return (
    <>
      <ProsePage
        eyebrow="About"
        title="About"
        lede="Other sites hand you sixty companies and a filter bar. We ask what you need first."
        sections={[
          {
            heading: "The problem",
            paragraphs: [
              "Choosing a prop firm challenge is a filtering problem disguised as a shopping problem. Dozens of challenges differ on drawdown type, daily loss rules, consistency requirements, news windows, overnight permissions, payout conditions and platform support — and which of those matter depends entirely on how you trade.",
              "A swing trader and a scalper looking at the same list need almost opposite things from it. A directory cannot tell them apart. So most people end up choosing on price, which is the one criterion least likely to predict whether they can actually trade their strategy inside the rules.",
            ],
          },
          {
            heading: "What we built instead",
            paragraphs: [
              "A recommendation engine. You answer about a dozen questions, we eliminate the challenges that fundamentally cannot work for you, score the rest against your profile, and show you the reasoning behind every number.",
              "The directory, the comparison table, the reviews and the articles all exist to support that. They are not the product.",
            ],
          },
          {
            heading: "What we refuse to do",
            bullets: [
              "Rank by commission. Commercial data is in different tables from the data the engine reads.",
              "Invent figures. Unconfirmed fields say 'not confirmed' instead of showing a plausible guess.",
              "Write or generate reviews.",
              "Show fake user counts, fake payout totals, fake ratings or fake trust badges.",
              "Show an incompatible challenge as a percentage match.",
              "Promise that you will pass, get paid, or make money.",
            ],
          },
          {
            heading: "The psychology half",
            paragraphs: [
              "Picking the right challenge is necessary and not sufficient. Most evaluations are lost to behaviour — a moved stop, a revenge trade, size that grew after a good week — rather than to a bad strategy or the wrong firm.",
              "That is why the psychology workspace is built into the product rather than sold as a separate course: a risk gate that has to be satisfied before a trade, a log that grades the trader rather than the trade, a tracker that names your repeated leak, and drills that let you rehearse the pressure before it costs you an account.",
            ],
          },
        ]}
      />

      <div className="shell-narrow" style={{ marginBottom: "3rem" }}>
        <div className="panel panel-accent spread">
          <div>
            <strong>Tell us how you trade.</strong>
            <p className="small muted">We&apos;ll help you find the challenge that fits.</p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-primary">
            Find My Challenge
          </Link>
        </div>
      </div>
    </>
  );
}
