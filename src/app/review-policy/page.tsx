import { ProsePage } from "@/components/Prose";

export const metadata = {
  title: "Review policy",
  description:
    "How trader reviews are moderated, what 'verified' means here, and what we will never do with reviews.",
};

export default function ReviewPolicyPage() {
  return (
    <ProsePage
      eyebrow="Trust"
      title="Review policy"
      lede="What happens to a review between you submitting it and anyone else reading it."
      sections={[
        {
          heading: "Everything starts pending",
          paragraphs: [
            "No review publishes automatically. Every submission enters a moderation queue and is read by a person before it appears anywhere on the site.",
          ],
        },
        {
          heading: "What 'verified' means",
          paragraphs: [
            "A review is labelled 'verified trader experience' only when a moderator has actually checked supporting evidence — a payout confirmation, a dashboard screenshot, or similar.",
            "Everything else is labelled 'trader reported'. That label is not an insult; most honest reviews sit there. It just means we are telling you exactly how far the claim has been checked.",
          ],
        },
        {
          heading: "What gets rejected",
          bullets: [
            "Reviews of a firm or challenge the writer clearly has not used.",
            "Submissions containing account numbers, credentials, or another person's personal information.",
            "Coordinated posting, whether positive or negative.",
            "Abuse, threats, or content targeting an individual employee.",
            "Reviews written or paid for by a firm, or by a competitor.",
          ],
        },
        {
          heading: "What we will never do",
          bullets: [
            "Write reviews ourselves or generate them.",
            "Delete a negative review because a firm asked us to.",
            "Let an affiliate relationship influence whether a review is approved.",
            "Aggregate ratings into a headline number until there are enough reviews for that number to mean anything.",
          ],
        },
        {
          heading: "Corrections and removal",
          paragraphs: [
            "If a firm believes a published review is factually wrong, they can contact us with evidence and we will investigate. The outcome may be a correction, a note on the review, or removal — but not silent deletion.",
            "If you submitted a review and want it removed, contact us and we will remove it.",
          ],
        },
      ]}
      footnote="Reviews are individual experiences, not evidence of what will happen to you. A payout someone else received is not a prediction about your account."
    />
  );
}
