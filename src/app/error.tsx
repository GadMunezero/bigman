"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shell-narrow section" style={{ textAlign: "center" }}>
      <span className="eyebrow">Something went wrong</span>
      <h1 style={{ margin: "1rem 0" }}>We couldn&apos;t finish that request.</h1>
      <p className="lede" style={{ margin: "0 auto" }}>
        Your answers are saved. Try again, and if it keeps failing, retaking the questionnaire
        rebuilds your profile from scratch.
      </p>
      {error.digest ? (
        <p className="small muted mono" style={{ marginTop: "1rem" }}>
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="row" style={{ justifyContent: "center", marginTop: "2rem" }}>
        <button type="button" className="btn btn-primary btn-lg" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn btn-lg">
          Go home
        </Link>
      </div>
    </div>
  );
}
