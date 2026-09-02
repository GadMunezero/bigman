import Link from "next/link";
import { getSubscriberByToken } from "@/lib/repo";
import { unsubscribeAction } from "./actions";

export const metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token, done } = await searchParams;
  const subscriber = token ? getSubscriberByToken(token) : null;

  if (!subscriber) {
    return (
      <div className="shell-narrow section">
        <div className="panel panel-warn stack-sm">
          <h1>That link did not work.</h1>
          <p className="muted small">
            If you are still getting emails, reply to any one of them and we will take the address
            off by hand.
          </p>
          <p>
            <Link className="btn" href="/">
              Back to the site
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (done || subscriber.status === "unsubscribed") {
    return (
      <div className="shell-narrow section stack">
        <header className="stack-sm">
          <span className="eyebrow">Newsletter</span>
          <h1>Done — you are off the list.</h1>
          <p className="lede">
            No more emails. We keep the record that you asked to stop, so a later signup form cannot
            quietly put you back on.
          </p>
        </header>
        <div className="row">
          <Link className="btn btn-primary" href="/find-my-challenge">
            Find my challenge
          </Link>
          <Link className="btn" href="/challenges">
            Browse challenges
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell-narrow section stack">
      <header className="stack-sm">
        <span className="eyebrow">Newsletter</span>
        <h1>Unsubscribe?</h1>
        <p className="lede">
          One press and we stop emailing {subscriber.email}. Nothing else about the site changes —
          your saved challenges and your profile stay exactly as they are.
        </p>
      </header>

      <form action={unsubscribeAction} className="panel stack-sm">
        <input type="hidden" name="token" value={subscriber.token} />
        <button className="btn btn-primary" type="submit">
          Unsubscribe {subscriber.email}
        </button>
        <p className="muted small">
          Changed your mind? Just close this page — nothing happens until you press the button.
        </p>
      </form>
    </div>
  );
}
