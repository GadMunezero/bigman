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
  layout = "stacked",
  onDone,
}: {
  source: string;
  defaultTopics?: NewsletterTopic[];
  heading?: string;
  blurb?: string;
  compact?: boolean;
  /**
   * "stacked" is the in-page form: a labelled heading, three described topic
   * checkboxes, then the field. "hero" is the pop-up: headline, one line, the
   * field, the button, and the topics reduced to chips underneath.
   */
  layout?: "stacked" | "hero";
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

  /* Honeypot: hidden from people, irresistible to form-filling bots. */
  const honeypot = (
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
  );

  /**
   * The pop-up layout: a short headline, one line of what you get, then the
   * field and the button. Nothing else above the fold.
   *
   * The topic choice survives as a row of chips rather than three labelled
   * checkboxes with hint text. It has to survive in some form — "discounts"
   * is the one that can earn a commission, and bundling it invisibly into a
   * psychology signup is consent by ambush — but on a modal it belongs under
   * the button, not in front of it.
   */
  if (layout === "hero") {
    return (
      <form onSubmit={submit} style={{ display: "grid", gap: "0.85rem", textAlign: "center" }}>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 5vw, 2.1rem)", lineHeight: 1.1, margin: 0 }}>
            {heading}
          </h2>
          <p className="muted small" style={{ margin: "0 auto", maxWidth: "42ch" }}>
            {blurb}
          </p>
        </div>

        <label className="field-label" htmlFor={`${formId}-email`} style={{ display: "none" }}>
          Email
        </label>
        <input
          id={`${formId}-email`}
          className="input"
          type="email"
          required
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{ textAlign: "center" }}
        />

        {honeypot}

        <button
          className="btn btn-primary btn-lg"
          type="submit"
          disabled={state === "sending"}
          style={{ width: "100%" }}
        >
          {state === "sending" ? "Sending…" : "Subscribe"}
        </button>

        {message ? (
          <p className="field-error" role="alert" style={{ margin: 0 }}>
            {message}
          </p>
        ) : null}

        <div style={{ display: "grid", gap: "0.45rem" }}>
          <span className="field-label" style={{ fontSize: "10px" }}>
            Send me
          </span>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", justifyContent: "center" }}
          >
            {NEWSLETTER_TOPICS.map((topic) => {
              const on = topics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  className={on ? "pill pill-accent" : "pill"}
                  aria-pressed={on}
                  onClick={() => toggle(topic)}
                  style={{ cursor: "pointer", border: "1px solid" }}
                >
                  {on ? "✓ " : ""}
                  {NEWSLETTER_TOPIC_LABELS[topic]}
                </button>
              );
            })}
          </div>
        </div>

        {/*
          Four sentences was a wall of grey under a clean form. One line each
          for the three things a reader actually needs: nothing arrives until
          you confirm, leaving is easy, and the discount emails can pay us.
          The last one stays however short this gets — a chip labelled
          "Discounts and offers" is not consent to be marketed at for money
          unless it says so.
        */}
        <p className="muted" style={{ fontSize: "11.5px", margin: 0, lineHeight: 1.55 }}>
          Confirmation link first — nobody is added until you click it. One-click unsubscribe, never
          sold. Discount emails may earn us a commission; it never affects the rankings.
        </p>
      </form>
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
          {/*
            Each row is a two-column grid rather than a flex row: `.row` wraps,
            and in a narrow container — the modal, a phone — the hint text
            pushed the checkbox onto a line of its own, above the label it
            belonged to.
          */}
          {NEWSLETTER_TOPICS.map((topic) => (
            <label
              key={topic}
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr)",
                gap: "0.6rem",
                alignItems: "start",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={topics.includes(topic)}
                onChange={() => toggle(topic)}
                style={{ marginTop: "0.3rem", width: 16, height: 16, minHeight: "auto" }}
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

      {honeypot}

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
