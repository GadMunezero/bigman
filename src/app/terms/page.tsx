import { ProsePage } from "@/components/Prose";

export const metadata = {
  title: "Terms",
  description: "Terms of use for this site.",
};

export default function TermsPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Terms"
      lede="Plain terms for using this site."
      sections={[
        {
          heading: "What this site is",
          paragraphs: [
            "An information and comparison tool. It helps you filter prop firm challenges against preferences you supply, and explains the reasoning behind each result.",
            "It is not a broker, not a prop firm, and not affiliated with any prop trading firm. We do not fund accounts, run evaluations, process payouts, or intervene in any dispute between you and a firm.",
          ],
        },
        {
          heading: "Not advice",
          paragraphs: [
            "Nothing here is financial, investment, legal or tax advice. A match score is a fit measurement against preferences you told us, not a recommendation to buy and not a judgement of a firm's quality or solvency.",
            "You are responsible for your own decisions, including verifying a challenge's terms with the firm before you pay for it.",
          ],
        },
        {
          heading: "Accuracy",
          paragraphs: [
            "We record where each figure came from and when it was last verified, and we mark unconfirmed fields as unconfirmed rather than guessing. Even so, firms change their rules and pricing frequently and without notice. The firm's own documentation is always the authority.",
            "If you spot something wrong, tell us — corrections are the most useful thing you can send us.",
          ],
        },
        {
          heading: "Acceptable use",
          bullets: [
            "Do not submit false reviews, or reviews you were paid to write.",
            "Do not scrape the site at a volume that degrades it for others.",
            "Do not attempt to interfere with the recommendation engine, the moderation queue, or other users' data.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "The site is provided as-is. To the fullest extent permitted by law, we are not liable for trading losses, failed evaluations, unpaid payouts, or any decision you make based on information here.",
          ],
        },
        {
          heading: "Changes",
          paragraphs: [
            "These terms may change. Continuing to use the site after a change means you accept the current version.",
          ],
        },
      ]}
    />
  );
}
