import Link from "next/link";
import { ProsePage } from "@/components/Prose";

export const metadata = {
  title: "How it works",
  description:
    "What happens between answering the questionnaire and seeing your challenge matches, and why the order of those steps matters.",
};

export default function HowItWorksPage() {
  return (
    <>
      <ProsePage
        eyebrow="Trust"
        title="How it works"
        lede="Ask, understand, filter, match, explain, compare. In that order."
        sections={[
          {
            heading: "1. You tell us how you trade",
            paragraphs: [
              "About a dozen short questions: your style, how long you hold, whether you trade news, whether you need overnight positions, how you want to approach the challenge, your risk appetite, the drawdown mechanics you can live with, your budget, the account size you want, your platform, and up to three things that matter most to you.",
              "Some questions never appear. A follow-up only shows when your earlier answers make it relevant \u2014 if you trade algorithmically we ask whether automation is a hard requirement, and if you swing trade we ask about weekends. We also skip anything the catalogue already answers: while every challenge on file is futures, asking which market you trade would be a question with one possible answer, so we fill it in instead of asking.",
            ],
          },
          {
            heading: "2. We build a trading profile",
            paragraphs: [
              "Your answers become a structured profile. Some of it is used directly, and some of it implies things you did not have to state — if you hold positions for several days, that implies an overnight requirement and probably a weekend one.",
              "The profile is stored against an anonymous session. No account, no email, no sign-up wall.",
            ],
          },
          {
            heading: "3. We remove what cannot work",
            paragraphs: [
              "Challenges that conflict with a hard requirement are eliminated before anything is scored. Wrong market, prohibits something you need, above your budget — gone, with the reason recorded.",
              "You can always expand the eliminated list on your results page and see exactly why each one was removed.",
            ],
          },
          {
            heading: "4. We score what is left",
            paragraphs: [
              "Everything that survives is scored on eight weighted criteria, with extra weight on whatever you said matters most. The full arithmetic is on the methodology page, and the per-criterion breakdown is on every result.",
            ],
          },
          {
            heading: "5. We explain, and we tell you the catch",
            paragraphs: [
              "Every recommendation shows why it fits, generated from the actual rules we have recorded and the answers you gave — not written by hand per challenge and not paraphrased by a language model.",
              "Every recommendation also shows at least one thing to consider where a real trade-off exists. A result with no caveat is an advertisement, not a recommendation.",
            ],
          },
          {
            heading: "6. You compare and decide",
            paragraphs: [
              "Put your top options side by side. If you have taken the questionnaire, the comparison tells you which one fits you better and explains the gap using the same score breakdowns.",
              "When you click through, you go to the firm's own website. Where we have an affiliate relationship we may earn a commission and the link says so — that happens after the recommendation and has no effect on it.",
            ],
          },
        ]}
      />

      <div className="shell-narrow" style={{ marginBottom: "3rem" }}>
        <div className="panel panel-accent spread">
          <div>
            <strong>About a minute, no account.</strong>
            <p className="small muted">You can change your answers and re-run it any time.</p>
          </div>
          <Link href="/find-my-challenge" className="btn btn-primary">
            Find My Challenge
          </Link>
        </div>
      </div>
    </>
  );
}
