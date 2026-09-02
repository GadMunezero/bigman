"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClearProfileButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const clear = async () => {
    setBusy(true);
    try {
      await fetch("/api/profile", { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>
        Delete my profile
      </button>
    );
  }

  return (
    <span className="row" style={{ gap: "0.5rem" }}>
      <span className="small muted">Delete your saved answers?</span>
      <button type="button" className="btn btn-sm" onClick={clear} disabled={busy}>
        {busy ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </span>
  );
}
