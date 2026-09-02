import Link from "next/link";
import { confirmSubscriber } from "@/lib/repo";
import { NEWSLETTER_TOPIC_LABELS, type NewsletterTopic } from "@/lib/types";

export const metadata = {
  title: "Confirm your subscription",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The second half of double opt-in.
 *
 * The token is the whole credential, and it is deliberately the only thing in
 * the URL — no email address, so a confirmation link pasted into a chat or
 * caught in a server log does not leak who it belongs to. An unknown token
 * gets a plain "this link is not valid" rather than any hint about which part
 * was wrong.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const subscriber = token ? confirmSubscriber(token) : null;

  if (!subscriber || subscriber.status !== "confirmed") {
    return (
      <div className="shell-narrow section">
        <div className="panel panel-warn stack-sm">
          <h1>That link did not work.</h1>
          <p className="muted small">
            Confirmation links are single-purpose and can be broken by an email client that wraps
            long URLs. Sign up again and we will send a fresh one — nothing is lost.
          </p>
          <p>
            <Link className="btn" href="/psychology">
              Back to the site
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const topics = subscriber.topics as NewsletterTopic[];

  return (
    <div className="shell-narrow section stack">
      <header className="stack-sm">
        <span className="eyebrow">Newsletter</span>
        <h1>You are on the list.</h1>
        <p className="lede">
          Confirmed. You will get{" "}
          {topics.length > 0
            ? topics.map((topic) => NEWSLETTER_TOPIC_LABELS[topic] ?? topic).join(", ").toLowerCase()
            : "the newsletter"}{" "}
          — and nothing else.
        </p>
      </header>

      <div className="panel stack-sm">
        <h2 className="section-heading" style={{ margin: 0 }}>
          What happens now
        </h2>
        <p className="small muted">
          There is no fixed schedule. Emails go out when a firm changes a rule that affects what the
          engine recommends, when there is a psychology idea worth one email, or when there is a
          discount worth passing on. If a month is quiet, you hear nothing.
        </p>
        <p className="small muted">
          Every email carries a one-click unsubscribe. You can also{" "}
          <Link href={`/newsletter/unsubscribe?token=${subscriber.token}`}>unsubscribe now</Link> —
          keep that link if you want it.
        </p>
      </div>

      <div className="row">
        <Link className="btn btn-primary" href="/find-my-challenge">
          Find my challenge
        </Link>
        <Link className="btn" href="/psychology">
          Psychology tools
        </Link>
      </div>
    </div>
  );
}
