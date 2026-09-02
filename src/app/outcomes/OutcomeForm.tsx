"use client";

import { useState } from "react";
import {
  FAILURE_REASONS,
  FAILURE_REASON_LABELS,
  JOURNEY_STAGE_LABELS,
  REPORTABLE_STAGES,
  type FailureReason,
  type JourneyStage,
} from "@/lib/types";

export interface JourneyView {
  id: string;
  challengeName: string;
  firmName: string;
  slug: string;
  matchScore: number | null;
  stage: JourneyStage;
  reported: boolean;
  startedAt: string;
  approach: string | null;
}

export function OutcomeForm({ journey }: { journey: JourneyView }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<JourneyStage>(
    journey.reported ? journey.stage : "in_progress",
  );
  const [failureReason, setFailureReason] = useState<FailureReason | "">("");
  const [fitRating, setFitRating] = useState<string>("");
  const [again, setAgain] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");

    try {
      const response = await fetch("/api/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journey_id: journey.id,
          stage,
          failure_reason: stage === "failed" && failureReason ? failureReason : null,
          fit_rating: fitRating ? Number(fitRating) : null,
          would_choose_again: again || null,
          notes: notes.trim() || null,
        }),
      });
      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
        return;
      }
      setStatus("done");
      setMessage(data.message ?? "Thanks.");
    } catch {
      setStatus("error");
      setMessage("Couldn't save that. Check your connection and try again.");
    }
  };

  if (status === "done") {
    return (
      <div className="panel panel-accent">
        <strong>{journey.challengeName}</strong>
        <p className="small" style={{ marginTop: "0.5rem" }}>
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="spread">
        <div>
          <strong>{journey.challengeName}</strong>
          <div className="small muted">
            {journey.firmName} · started {new Date(journey.startedAt).toLocaleDateString("en-US")}
            {journey.approach ? ` · you wanted to ${journey.approach}` : ""}
          </div>
        </div>
        <div className="row">
          {journey.matchScore !== null ? (
            <span className="pill pill-accent">{journey.matchScore}% match</span>
          ) : null}
          <span className={`pill ${journey.reported ? "pill-info" : ""}`}>
            {JOURNEY_STAGE_LABELS[journey.stage]}
          </span>
        </div>
      </div>

      {!open ? (
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginTop: "1rem" }}
          onClick={() => setOpen(true)}
        >
          {journey.reported ? "Update what happened" : "Tell us what happened"}
        </button>
      ) : (
        <form onSubmit={submit} className="stack" style={{ marginTop: "1.25rem" }}>
          <div>
            <label className="field-label" htmlFor={`stage-${journey.id}`}>
              Where did you get to?
            </label>
            <select
              id={`stage-${journey.id}`}
              value={stage}
              onChange={(e) => setStage(e.target.value as JourneyStage)}
            >
              {REPORTABLE_STAGES.map((option) => (
                <option key={option} value={option}>
                  {JOURNEY_STAGE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          {stage === "failed" ? (
            <div>
              <label className="field-label" htmlFor={`reason-${journey.id}`}>
                What ended it?
              </label>
              <select
                id={`reason-${journey.id}`}
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value as FailureReason)}
              >
                <option value="">Prefer not to say</option>
                {FAILURE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {FAILURE_REASON_LABELS[reason]}
                  </option>
                ))}
              </select>
              <p className="small muted" style={{ marginTop: "0.4rem" }}>
                This is the single most useful field. If traders who wanted stability keep failing
                on drawdown, our weighting is wrong and we need to know.
              </p>
            </div>
          ) : null}

          <div>
            <label className="field-label" htmlFor={`fit-${journey.id}`}>
              In hindsight, how well did this challenge actually suit you?
            </label>
            <select
              id={`fit-${journey.id}`}
              value={fitRating}
              onChange={(e) => setFitRating(e.target.value)}
            >
              <option value="">Prefer not to say</option>
              <option value="5">5 — suited me very well</option>
              <option value="4">4 — mostly suited me</option>
              <option value="3">3 — neither here nor there</option>
              <option value="2">2 — mostly did not suit me</option>
              <option value="1">1 — wrong challenge for me</option>
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor={`again-${journey.id}`}>
              Would you choose it again?
            </label>
            <select id={`again-${journey.id}`} value={again} onChange={(e) => setAgain(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unsure">Unsure</option>
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor={`notes-${journey.id}`}>
              Anything else worth knowing?
            </label>
            <textarea
              id={`notes-${journey.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              placeholder="What surprised you about the rules, the platform, or the payout process?"
            />
          </div>

          {status === "error" ? (
            <p className="field-error" role="alert">
              {message}
            </p>
          ) : null}

          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
              {status === "sending" ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
