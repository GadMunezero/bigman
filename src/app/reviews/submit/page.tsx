import Link from "next/link";
import { listChallengeRecords } from "@/lib/repo";
import { ReviewForm } from "./ReviewForm";

export const metadata = {
  title: "Share your experience",
  description: "Submit your experience of a prop firm challenge. Every submission is moderated.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SubmitReviewPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initial = Array.isArray(params.challenge) ? params.challenge[0] : params.challenge;

  const challenges = listChallengeRecords().map((challenge) => ({
    id: challenge.id,
    label: `${challenge.firm.name} — ${challenge.name}`,
  }));

  return (
    <div className="shell-narrow section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Reviews</span>
        <h1>Share your experience</h1>
        <p className="lede">
          What you write helps another trader decide. Be specific about what happened rather than
          how it felt — the useful reviews are the concrete ones.
        </p>
      </header>

      <ReviewForm challenges={challenges} initialChallenge={initial} />

      <p className="small muted" style={{ marginTop: "2rem" }}>
        By submitting you agree to our{" "}
        <Link href="/review-policy" style={{ textDecoration: "underline" }}>
          review policy
        </Link>
        . Do not include account numbers, passwords or anyone else&apos;s personal information.
      </p>
    </div>
  );
}
