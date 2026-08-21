import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { NEWSLETTER_TOPICS, NEWSLETTER_TOPIC_HINTS, NEWSLETTER_TOPIC_LABELS } from "@/lib/types";

export const metadata = {
  title: "Newsletter",
  description:
    "Trading psychology, prop firm rule changes and discounts — sent when there is something worth saying, not on a schedule.",
};

export default function NewsletterPage() {
  return (
    <div className="shell-narrow section stack-lg">
      <header className="stack-sm">
        <span className="eyebrow">Newsletter</span>
        <h1>The parts that do not fit in a comparison table</h1>
        <p className="lede">
          The engine can tell you which challenge fits your P&amp;L distribution. It cannot tell you
          what to do the morning after a red day, and it cannot tell you that a firm quietly moved
          its drawdown from end-of-day to intraday last week. That is what this is for.
        </p>
      </header>

      <section className="panel stack">
        <NewsletterSignup source="newsletter-page" />
      </section>

      <section className="stack">
        <h2 className="section-heading">What you are signing up to</h2>
        <div className="stack-sm">
          {NEWSLETTER_TOPICS.map((topic) => (
            <div key={topic} className="panel panel-quiet">
              <strong>{NEWSLETTER_TOPIC_LABELS[topic]}</strong>
              <p className="small muted" style={{ marginTop: "0.35rem" }}>
                {NEWSLETTER_TOPIC_HINTS[topic]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel-quiet stack-sm">
        <h2 className="section-heading" style={{ margin: 0 }}>
          What we do with your address
        </h2>
        <ul className="small muted stack-sm">
          <li>
            We email you a confirmation link and add nobody until it is clicked. If someone types
            your address into the form, you get one email and never hear from us again.
          </li>
          <li>We never sell, rent or share the list, and we do not run ads in it.</li>
          <li>
            Every email has a one-click unsubscribe. Unsubscribing keeps a record that you asked to
            stop, so a later form submission cannot put you back on.
          </li>
          <li>
            Discount emails may earn us a commission. That money is stored in a different part of
            the system from the ranking data and cannot move a single match score — see the{" "}
            <Link href="/affiliate-disclosure">affiliate disclosure</Link>.
          </li>
        </ul>
      </section>
    </div>
  );
}
