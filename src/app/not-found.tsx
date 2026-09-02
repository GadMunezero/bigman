import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="shell-narrow section" style={{ textAlign: "center" }}>
      <span className="eyebrow">404</span>
      <h1 style={{ margin: "1rem 0" }}>We couldn&apos;t find that page.</h1>
      <p className="lede" style={{ margin: "0 auto" }}>
        The link may be old, or a challenge may have been archived because the firm withdrew it.
      </p>
      <div className="row" style={{ justifyContent: "center", marginTop: "2rem" }}>
        <Link href="/find-my-challenge" className="btn btn-primary btn-lg">
          Find My Challenge
        </Link>
        <Link href="/challenges" className="btn btn-lg">
          Browse challenges
        </Link>
      </div>
    </div>
  );
}
