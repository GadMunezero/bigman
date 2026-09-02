import Link from "next/link";
import { listChallengeRecords, listFirms } from "@/lib/repo";

export const metadata = {
  title: "Futures prop firms",
  description:
    "Every futures prop firm in the catalogue, with how many challenges each one offers, the account sizes they cover and what the cheapest entry costs.",
};

export const dynamic = "force-dynamic";

const fmtSize = (n: number) => (n >= 1000 ? `$${n / 1000}K` : `$${n}`);

export default async function FirmsPage() {
  const firms = listFirms();
  const challenges = listChallengeRecords();

  // Firms with nothing published are omitted rather than shown as empty
  // shells — a firm page with no challenges tells a trader nothing.
  const rows = firms
    .map((firm) => {
      const mine = challenges.filter((c) => c.firm_id === firm.id);
      const sizes = mine
        .map((c) => c.account_size)
        .filter((n): n is number => typeof n === "number");
      const prices = mine.map((c) => c.price).filter((n): n is number => typeof n === "number");
      return { firm, count: mine.length, sizes, prices };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.firm.name.localeCompare(b.firm.name));

  return (
    <div className="shell section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Firms</span>
        <h1>Futures prop firms</h1>
        <p className="lede">
          {rows.length} firm{rows.length === 1 ? "" : "s"} and {challenges.length} challenges.
          Counts and ranges are computed from what is actually on file, so they never imply
          coverage we do not have.
        </p>
      </header>

      <div className="grid-auto">
        {rows.map(({ firm, count, sizes, prices }) => (
          <article key={firm.id} className="panel stack-sm">
            <h2 style={{ fontSize: "1.05rem", margin: 0 }}>
              <Link href={`/firms/${firm.slug}`}>{firm.name}</Link>
            </h2>
            <p className="small muted" style={{ margin: 0 }}>
              {count} challenge{count === 1 ? "" : "s"}
              {sizes.length > 0
                ? ` · ${fmtSize(Math.min(...sizes))} – ${fmtSize(Math.max(...sizes))}`
                : ""}
              {prices.length > 0 ? ` · from $${Math.min(...prices)}` : ""}
            </p>
            <div className="row" style={{ gap: "0.35rem" }}>
              {firm.website ? (
                <span className="pill pill-accent">Official site on file</span>
              ) : (
                <span className="pill">No official site on file</span>
              )}
              {prices.length === 0 ? <span className="pill">Pricing not confirmed</span> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="panel panel-accent spread" style={{ marginTop: "2.5rem" }}>
        <div>
          <strong>Not sure which firm suits you?</strong>
          <p className="small muted" style={{ marginTop: "0.35rem" }}>
            The firm matters less than the specific challenge. Tell us how you trade and we&apos;ll
            rank the individual challenges instead.
          </p>
        </div>
        <Link href="/find-my-challenge" className="btn btn-primary">
          Find My Challenge
        </Link>
      </div>
    </div>
  );
}
