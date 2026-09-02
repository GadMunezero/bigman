"use client";

import { useState } from "react";

interface Option {
  id: string;
  label: string;
}

export function ReviewForm({
  challenges,
  initialChallenge,
}: {
  challenges: Option[];
  initialChallenge?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");

    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string" && value.trim() !== "") payload[key] = value;
    }

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please check the form and try again.");
        return;
      }

      setStatus("sent");
      setMessage(data.message ?? "Thanks — your review is queued for moderation.");
    } catch {
      setStatus("error");
      setMessage("We couldn't submit your review. Check your connection and try again.");
    }
  };

  if (status === "sent") {
    return (
      <div className="panel panel-accent">
        <h2 style={{ fontSize: "1.25rem" }}>Submitted for moderation</h2>
        <p style={{ marginTop: "0.75rem" }}>{message}</p>
        <p className="small muted" style={{ marginTop: "0.75rem" }}>
          It is not published yet. A moderator reads every submission, and it will only be labelled
          &quot;verified&quot; if you supplied evidence and it checks out.
        </p>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="panel panel-warn">
        <h2 style={{ fontSize: "1.25rem" }}>No challenges to review yet</h2>
        <p className="small" style={{ marginTop: "0.5rem" }}>
          Reviews attach to a specific challenge, and this installation has no published challenges
          loaded.
        </p>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="panel">
        <label className="field-label" htmlFor="challenge_id">
          Which challenge? (required)
        </label>
        <select id="challenge_id" name="challenge_id" defaultValue={initialChallenge ?? ""} required>
          <option value="" disabled>
            Select a challenge
          </option>
          {challenges.map((challenge) => (
            <option key={challenge.id} value={challenge.id}>
              {challenge.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-2">
        <div className="panel">
          <label className="field-label" htmlFor="display_name">
            Display name
          </label>
          <input id="display_name" name="display_name" className="input" maxLength={60} placeholder="Optional" />
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="account_size">
            Account size
          </label>
          <input
            id="account_size"
            name="account_size"
            type="number"
            min={0}
            className="input"
            placeholder="e.g. 50000"
          />
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="trading_style">
            Your trading style
          </label>
          <select id="trading_style" name="trading_style" defaultValue="">
            <option value="">Prefer not to say</option>
            {["scalping", "day_trading", "swing_trading", "news_trading", "algorithmic", "copy_trading", "mixed"].map(
              (style) => (
                <option key={style} value={style}>
                  {style.replace(/_/g, " ")}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="market">
            Market traded
          </label>
          <select id="market" name="market" defaultValue="">
            <option value="">Prefer not to say</option>
            {["futures", "forex", "cfd", "crypto"].map((market) => (
              <option key={market} value={market}>
                {market}
              </option>
            ))}
          </select>
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="rating">
            Overall rating (required)
          </label>
          <select id="rating" name="rating" defaultValue="" required>
            <option value="" disabled>
              Choose
            </option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} / 5
              </option>
            ))}
          </select>
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="passed">
            Did you pass?
          </label>
          <select id="passed" name="passed" defaultValue="">
            <option value="">Prefer not to say</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="in_progress">Still in progress</option>
          </select>
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="received_payout">
            Did you receive a payout?
          </label>
          <select id="received_payout" name="received_payout" defaultValue="">
            <option value="">Prefer not to say</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="payout_days">
            How long did the payout take? (days)
          </label>
          <input id="payout_days" name="payout_days" type="number" min={0} className="input" />
        </div>
      </div>

      <div className="panel">
        <label className="field-label" htmlFor="body">
          How was the experience?
        </label>
        <textarea id="body" name="body" maxLength={5000} placeholder="What actually happened, in your words." />
      </div>

      <div className="grid-2">
        <div className="panel">
          <label className="field-label" htmlFor="liked">
            What did you like?
          </label>
          <textarea id="liked" name="liked" maxLength={2000} />
        </div>
        <div className="panel">
          <label className="field-label" htmlFor="disliked">
            What did you dislike?
          </label>
          <textarea id="disliked" name="disliked" maxLength={2000} />
        </div>
      </div>

      <div className="panel">
        <label className="field-label" htmlFor="evidence_note">
          Evidence (optional)
        </label>
        <textarea
          id="evidence_note"
          name="evidence_note"
          maxLength={1000}
          placeholder="Describe any evidence you can supply if a moderator asks — payout confirmation, dashboard screenshot. Do not paste account numbers or personal details."
        />
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          A review is only labelled &quot;verified&quot; if a moderator has actually checked
          evidence. Without it, your review still publishes — as &quot;trader reported&quot;.
        </p>
      </div>

      {status === "error" ? (
        <p className="field-error" role="alert">
          {message}
        </p>
      ) : null}

      <div className="row">
        <button type="submit" className="btn btn-primary btn-lg" disabled={status === "sending"}>
          {status === "sending" ? "Submitting…" : "Submit for moderation"}
        </button>
      </div>
    </form>
  );
}
