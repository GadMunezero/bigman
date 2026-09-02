"use client";

import { useState, useTransition } from "react";

export function SaveButton({
  challengeId,
  initialSaved = false,
}: {
  challengeId: string;
  initialSaved?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();

  const toggle = () => {
    start(async () => {
      // Optimistic, then reconciled with the server's answer.
      setSaved((v) => !v);
      try {
        const response = await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challenge_id: challengeId }),
        });
        const data = (await response.json()) as { saved?: boolean };
        if (typeof data.saved === "boolean") setSaved(data.saved);
      } catch {
        setSaved((v) => !v);
      }
    });
  };

  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={toggle}
      aria-pressed={saved}
      disabled={pending}
    >
      {saved ? "♥ Saved" : "♡ Save"}
    </button>
  );
}
