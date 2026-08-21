"use client";

import { useId, useState } from "react";
import {
  NEWSLETTER_TOPICS,
  NEWSLETTER_TOPIC_HINTS,
  NEWSLETTER_TOPIC_LABELS,
  type NewsletterTopic,
} from "@/lib/types";

/**
 * Newsletter signup form.
 *
 * Topics are checkboxes rather than a single "subscribe" button because the
 * three things we send are genuinely different: a psychology idea, a firm
 * changing its drawdown rule, and a discount code. Someone who wants the
 * middle one may well not want the last one, and bundling them is how a
 * newsletter earns an unsubscribe.
 *
 * `defaultTopics` lets a placement preselect what fits the page — the
 * psychology page starts with psychology ticked — but every box stays
 * editable. Nothing is subscribed to on the reader's behalf.
 */
export function NewsletterSignup({
  source,
  defaultTopics = [...NEWSLETTER_TOPICS],
  heading = "Get the parts that don't fit in a table",
  blurb = "Trading psychology, prop firm rule changes, and the occasional discount. No fixed schedule — it goes out when there is something worth saying.",
  compact = false,
  onDone,
}: {
  source: string;
  defaultTopics?: NewsletterTopic[];
  heading?: string;
  blurb?: string;
  compact?: boolean;
  onDone?: () => void;
}) {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [topics, setTopics] = useState<NewsletterTopic[]>(defaultTopics);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmPath, setConfirmPath] = useState<string | null>(null);

  const toggle = (topic: NewsletterTopic) =>
    setTopics((current) =>
      current.includes(topic) ? current.filter((t) => t !== topic) : [...current, topic],
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (topics.length === 0) {
      setState("error");
      setMessage("Pick at least one thing to hear about.");
      return;
    }
    setState("sending");
    setMessage(null);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, topics, source, website }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        confirm_path?: string;
      };
      if (!response.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "That did not go through. Try again in a moment.");
        return;
      }
      setState("done");
      setMessage(data.message ?? "Check your email for the confirmation link.");
      setConfirmPath(data.confirm_path ?? null);
      onDone?.();
    } catch {
      setState("error");
      setMessage("That did not go through — check your connection and try again.");
    }
  };

  if (state === "done") {
    return (
      <div className="stack-sm">
        <strong>Almost there.</strong>
        <p className="muted small">{message}</p>
        <p className="muted small">
          Nothing is sent until you click that link. If it never arrives, nobody gets added — which
          is the point.
        </p>
        {/* Development only: the API returns this so the flow can be walked
            end to end before an email provider is wired up. */}
        {confirmPath ? (
          <a className="btn btn-sm" href={confirmPath}>
            Dev only — confirm now
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      {!compact ? (
        <div className="stack-sm">
          <h2 className="section-heading" style={{ margin: 0 }}>
            {heading}
          </h2>
          <p className="muted small">{blurb}</p>
        </div>
      ) : (
        <p className="muted small">{blurb}</p>
      )}

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label">What do you want to hear about?</legend>
        <div className="stack-sm" style={{ marginTop: "0.5rem" }}>
          {NEWSLETTER_TOPICS.map((topic) => (
            <label key={topic} className="row" style={{ alignItems: "flex-start", gap: "0.6rem" }}>
              <input
                type="checkbox"
                checked={topics.includes(topic)}
                onChange={() => toggle(topic)}
                style={{ marginTop: "0.25rem" }}
              />
              <span>
                <span>{NEWSLETTER_TOPIC_LABELS[topic]}</span>
                <br />
                <span className="muted small">{NEWSLETTER_TOPIC_HINTS[topic]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="stack-sm">
        <label className="field-label" htmlFor={`${formId}-email`}>
          Email
        </label>
        <input
          id={`${formId}-email`}
          className="input"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {/* Honeypot: hidden from people, irresistible to form-filling bots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
        <label htmlFor={`${formId}-website`}>Website</label>
        <input
          id={`${formId}-website`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {message ? (
        <p className="field-error" role="alert">
          {message}
        </p>
      ) : null}

      <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send me the confirmation link"}
      </button>

      <p className="muted small">
        Double opt-in — we email you a link and add nobody until it is clicked. Unsubscribe from any
        email in one click. We never sell or share the list.
      </p>
    </form>
  );
}
