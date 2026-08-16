"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a single funnel event on mount.
 *
 * Client-side rather than server-side so that a bot fetch or a prefetch does
 * not inflate the numbers, and guarded by a ref so React's development-mode
 * double-invoke does not count a view twice.
 */
export function TrackEvent({
  event,
  challengeId,
}: {
  event: "homepage_view" | "challenge_viewed" | "compare_clicked";
  challengeId?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...(challengeId ? { challenge_id: challengeId } : {}) }),
    }).catch(() => {});
  }, [event, challengeId]);

  return null;
}
