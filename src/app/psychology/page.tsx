import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { getCurrentProfile } from "@/lib/session";
import { PsychologyWorkspace } from "./PsychologyWorkspace";

export const metadata = {
  title: "Trading psychology workspace",
  description:
    "A pre-trade risk gate, behaviour log, mistake-pattern tracker, mental models and pressure drills — the behavioural half of passing a prop firm challenge.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PsychologyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  return (
    <div className="shell section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Psychology workspace</span>
        <h1>The challenge is the rules. The hard part is you.</h1>
        <p className="lede">
          Most evaluations are not lost to a bad strategy. They are lost to a moved stop, a revenge
          trade, or size that grew after a good week. This workspace makes those moments visible
          before they cost you an account.
        </p>
      </header>

      {profile ? (
        <div className="panel panel-quiet spread" style={{ marginBottom: "2rem" }}>
          <div>
            <strong>Tuned to your profile</strong>
            <p className="small muted">
              Practice drills use the market and style from your trading profile
              {profile.market ? ` (${profile.market})` : ""}, so the scenarios read like your
              sessions.
            </p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-sm">
            Update profile
          </Link>
        </div>
      ) : (
        <div className="panel panel-accent spread" style={{ marginBottom: "2rem" }}>
          <div>
            <strong>Make the drills yours</strong>
            <p className="small muted">
              Take the questionnaire and the practice scenarios adapt to the market and style you
              actually trade — and you get your challenge matches at the same time.
            </p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-primary">
            Find My Challenge
          </Link>
        </div>
      )}

      <PsychologyWorkspace initialTab={tab} />

      {/* Psychology is pre-ticked here and the other two are not: someone on
          this page came for the behavioural material, and a discount email is
          not what they asked for. Every box stays editable. */}
      <section className="panel" style={{ marginTop: "3rem" }}>
        <NewsletterSignup
          source="psychology"
          defaultTopics={["psychology"]}
          heading="One psychology idea at a time"
          blurb="The drills above are the practice. The email is the part that arrives when you are not looking for it — a single idea about the behavioural half of passing a challenge, sent when there is one worth sending."
        />
      </section>

      <div className="panel panel-quiet" style={{ marginTop: "3rem" }}>
        <p className="small muted">
          Your behaviour logs, habit leaks and checklist state are stored in your browser and never
          sent to us. Drill responses are sent only to generate the feedback you asked for, and are
          not stored. None of this is therapy, medical advice or financial advice.
        </p>
      </div>
    </div>
  );
}
