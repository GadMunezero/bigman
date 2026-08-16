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
              "A challenge is eliminated when it conflicts with a stated requirement:",
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
            heading: "What we do with rules we haven't confirmed",
            paragraphs: [
              "Only a confirmed prohibition eliminates a challenge. A rule we have not verified is not evidence of a conflict, so the challenge stays in — but it loses points in scoring, and you get an explicit warning that the rule is unconfirmed and matters to you.",
              "Treating unknown as 'allowed' would be dishonest. Treating it as 'prohibited' would hide real options from you. Scoring it below 'restricted' and telling you about it is the honest middle.",
            ],
          },
          {
            heading: "Stage two — weighted scoring",
            paragraphs: [
              "Surviving challenges are scored on eight criteria. The default weights are:",
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
