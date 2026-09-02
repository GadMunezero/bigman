import { ProsePage } from "@/components/Prose";

export const metadata = {
  title: "Risk disclosure",
  description: "The risks of trading and of buying prop firm challenges.",
};

export default function RiskDisclosurePage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Risk disclosure"
      lede="Read this before you spend money on a challenge."
      sections={[
        {
          paragraphs: [
            "Trading leveraged instruments carries a substantial risk of loss and is not suitable for everyone. Most people who attempt prop firm evaluations do not pass them, and many who pass do not go on to earn a payout.",
          ],
        },
        {
          heading: "What a challenge fee actually buys",
          paragraphs: [
            "A challenge fee buys an evaluation attempt, not a funded account and not an income. If you breach a rule, the fee is generally not refunded and the attempt ends. Budget for it as money you can afford to lose outright.",
          ],
        },
        {
          heading: "What this site does not promise",
          bullets: [
            "That you will pass any challenge.",
            "That you will receive a payout, or receive it on any particular timeline.",
            "That any firm listed here is financially sound, well-run, or will still be operating next year.",
            "That the terms we recorded are the terms in force today — firms change rules without notice.",
          ],
        },
        {
          heading: "A high match score is not a green light",
          paragraphs: [
            "A match score says a challenge's rules and terms line up with the preferences you gave us. It says nothing about whether you should be trading at all, whether your strategy has an edge, or whether the firm will honour its obligations.",
            "Do your own due diligence on any firm before paying them.",
          ],
        },
        {
          heading: "If trading is causing you harm",
          paragraphs: [
            "If you are chasing losses, trading money you need, hiding your trading from people close to you, or unable to stop, that is a serious problem and no calculator on this site will fix it. Please seek support from a qualified professional or a gambling-harm service in your country.",
          ],
        },
      ]}
    />
  );
}
