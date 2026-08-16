import Link from "next/link";
import { ProsePage } from "@/components/Prose";
import { DEFAULT_WEIGHTS } from "@/lib/engine";
import { CRITERION_LABELS, SCORE_CRITERIA } from "@/lib/types";

export const metadata = {
  title: "Methodology",
  description:
    "Exactly how challenge match scores are calculated: the hard filters, the eight weighted criteria, how priorities change the weighting, and why commission is not an input.",
};

export default function MethodologyPage() {
  return (
    <>
      <ProsePage
        eyebrow="Trust"
        title="Methodology"
        lede="How a match score is produced, in enough detail that you can check our work."
        sections={[
          {
            heading: "Two stages, never blended",
            paragraphs: [
              "Every recommendation goes through hard filtering first and soft scoring second. The order matters. A challenge that conflicts with something you told us you need is removed from consideration entirely — it does not come back as a lower percentage.",
              "This is the single most important design decision in the product. If you need to hold positions overnight and a challenge prohibits it, that challenge is not a 72% match. It is the wrong challenge, and we say so.",
            ],
          },
          {
            heading: "Stage one — hard filters",
            paragraphs: [
              "A challenge is eliminated when it conflicts with a requirement derived from how you say you trade:",
            ],
            bullets: [
              "It does not cover the market you trade.",
              "It prohibits overnight positions and your holding style needs them.",
              "It prohibits weekend holding and you hold across weekends.",
              "It prohibits news trading and you trade news frequently.",
              "It prohibits automated trading and your strategy is automated.",
              "It prohibits copy trading and that is how you trade.",
              "Its price is above the budget ceiling you chose.",
            ],
          },
          {
            heading: "Deal-breakers are stricter than derived requirements",
            paragraphs: [
              "Anything you name as a deal-breaker is applied literally. A derived requirement only eliminates on a confirmed prohibition, because an unconfirmed rule is not evidence of a conflict. A deal-breaker eliminates on a restriction too — if you said you will not accept news restrictions, a challenge that merely restricts news trading is still removed.",
              "Deal-breakers cover trailing drawdown, daily loss limits, news restrictions, minimum trading days, consistency rules, overnight restrictions and high fees. 'High fees' is relative: the threshold is the median price of the challenges matching your market, so it means expensive next to your actual alternatives rather than against an arbitrary number.",
              "Every elimination is shown to you with the reason, so you can always see why a challenge was not recommended.",
            ],
          },
          {
            heading: "What we do with rules we haven't confirmed",
            paragraphs: [
              "Only a confirmed prohibition eliminates a challenge. A rule we have not verified is not evidence of a conflict, so the challenge stays in — but it loses points in scoring, and you get an explicit warning that the rule is unconfirmed and matters to you.",
              "Treating unknown as 'allowed' would be dishonest. Treating it as 'prohibited' would hide real options from you. Scoring it below 'restricted' and telling you about it is the honest middle.",
            ],
          },
          {
            heading: "Stage two — weighted scoring",
            paragraphs: [
              "Surviving challenges are scored on nine criteria. These are the base weights, before your answers reshape them:",
            ],
          },
        ]}
      />

      <div className="shell-narrow" style={{ marginTop: "-2rem", marginBottom: "3rem" }}>
        <div className="panel">
          <dl>
            {SCORE_CRITERIA.map((criterion) => (
              <div key={criterion} className="kv">
                <dt>{CRITERION_LABELS[criterion]}</dt>
                <dd>{DEFAULT_WEIGHTS[criterion]}%</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="stack-lg" style={{ marginTop: "2.5rem" }}>
          <section>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
              How your approach reshapes the model
            </h2>
            <p style={{ marginBottom: "0.75rem" }}>
              The weights above are a starting point, not what anyone is actually scored on. The
              biggest single influence is how you said you want to approach the challenge, because
              a trader racing to a payout and a trader protecting an account are asking genuinely
              different questions of the same catalogue.
            </p>
            <ul className="stack-sm" style={{ paddingLeft: "1.1rem", marginBottom: "0.75rem" }}>
              <li style={{ color: "var(--ink-2)" }}>
                <strong>Pass as quickly as possible</strong> — target and pace weigh far more
                heavily, along with usable drawdown. Payout terms, account size and platform matter
                less, because they do not affect how fast you clear the evaluation.
              </li>
              <li style={{ color: "var(--ink-2)" }}>
                <strong>Pass at a normal pace</strong> — the base weights, unchanged.
              </li>
              <li style={{ color: "var(--ink-2)" }}>
                <strong>Take your time and protect the account</strong> — drawdown mechanics, rule
                compatibility and data confidence weigh more; how quickly the challenge can be
                cleared weighs less.
              </li>
            </ul>
            <p>
              Your risk style then applies a second, smaller adjustment on top. Aggressive shifts
              weight toward room to push; conservative shifts it toward rules you cannot trip over
              by accident.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
              Why a bigger drawdown is not automatically better
            </h2>
            <p style={{ marginBottom: "0.75rem" }}>
              We score <strong>usable</strong> drawdown, not the headline percentage. Three things
              decide how much of that number you can actually spend:
            </p>
            <ul className="stack-sm" style={{ paddingLeft: "1.1rem", marginBottom: "0.75rem" }}>
              <li style={{ color: "var(--ink-2)" }}>
                <strong>Room relative to the target.</strong> 10% of drawdown against a 5% target is
                a very different proposition from 10% against a 20% target.
              </li>
              <li style={{ color: "var(--ink-2)" }}>
                <strong>The drawdown mechanic.</strong> A trailing drawdown follows your equity up,
                so part of the headline figure is never really available to lose.
              </li>
              <li style={{ color: "var(--ink-2)" }}>
                <strong>The daily cap.</strong> A tight daily limit rations the total, so you cannot
                deploy it when you need it.
              </li>
            </ul>
            <p>
              A 20% trailing drawdown with a 2% daily cap against a 20% target can score below an 8%
              static drawdown with no daily rule against a 5% target — and it should. How much the
              size matters against how stable the mechanic is depends on your approach: someone
              protecting an account is scored more on stability, someone sprinting more on room.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
              How your priorities change the weighting
            </h2>
            <p style={{ marginBottom: "0.75rem" }}>
              When you name up to three things that matter most, each one multiplies the weight of
              the criterion it maps to. Fast payouts boosts payout, large drawdown boosts drawdown,
              low price boosts budget, and the rule-related priorities boost rule compatibility.
            </p>
            <p>
              The weights are then renormalised back to a 100-point total. Without that step, a
              trader who picked three priorities would be scored out of a larger total than someone
              who picked one, and their matches would all look worse for no real reason. Scores have
              to mean the same thing across profiles.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>What the bands mean</h2>
            <ul className="stack-sm" style={{ paddingLeft: "1.1rem" }}>
              <li style={{ color: "var(--ink-2)" }}>90–100 — excellent match</li>
              <li style={{ color: "var(--ink-2)" }}>80–89 — strong match</li>
              <li style={{ color: "var(--ink-2)" }}>70–79 — good match</li>
              <li style={{ color: "var(--ink-2)" }}>60–69 — possible match</li>
              <li style={{ color: "var(--ink-2)" }}>
                Below 60 — hidden from your primary results unless you ask to see them
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem" }}>
              A match score measures fit against the preferences you gave us. It is not a quality
              rating of the firm, not a safety rating, and not a prediction that you will pass.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
              Commission is not an input
            </h2>
            <p style={{ marginBottom: "0.75rem" }}>
              Affiliate URLs, tracking IDs, discount codes and commercial terms live in separate
              database tables. The scoring code does not read them — it is not a policy we ask you
              to trust, it is a boundary in the schema. The recommendation is produced first, and
              monetisation happens afterwards when you choose to click through.
            </p>
            <p>
              Clicks are recorded with the position and score a challenge was shown at, so we can
              measure the funnel. That data flows one way: into analytics, never back into ranking.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Where the data comes from</h2>
            <p style={{ marginBottom: "0.75rem" }}>
              Every important field records a confidence level — verified, trader reported, needs
              review, or unknown — and points at the source it came from. Fields we have not
              confirmed render as &quot;not confirmed&quot; rather than being filled with a
              plausible guess.
            </p>
            <p>
              Changes to a challenge&apos;s rules or pricing are recorded as pending until a person
              approves them, and every approved change is kept as history. That is why some
              challenge pages show a &quot;recent changes&quot; section.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
              What we do when nothing fits
            </h2>
            <p>
              If no challenge clears all your hard requirements, we tell you that and show which
              requirement is eliminating the most options. We do not fall back to showing you
              popular challenges that conflict with what you asked for.
            </p>
          </section>
        </div>

        <div className="panel panel-accent spread" style={{ marginTop: "3rem" }}>
          <div>
            <strong>See it work on your own answers.</strong>
            <p className="small muted">Every score comes with its full breakdown.</p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-primary">
            Find My Challenge
          </Link>
        </div>
      </div>
    </>
  );
}
