import { ProsePage } from "@/components/Prose";

export const metadata = {
  title: "Contact",
  description: "How to reach us, and what is most useful to send.",
};

export default function ContactPage() {
  return (
    <ProsePage
      eyebrow="Contact"
      title="Contact"
      lede="The most valuable thing you can send us is a correction."
      sections={[
        {
          heading: "Reporting wrong data",
          paragraphs: [
            "If a price, drawdown figure, payout term or rule on this site does not match what the firm currently publishes, tell us and include a link to the firm's own page. Corrections go into the review queue, get checked by a person, and are recorded as a dated change on the challenge page once approved.",
          ],
        },
        {
          heading: "Firms",
          paragraphs: [
            "If you operate a prop firm and something about your challenges is recorded incorrectly, send the correction with a link to your own documentation and we will update it on the same terms as any other correction.",
            "We will not remove an accurate negative review, and an affiliate relationship does not change how your rules are recorded.",
          ],
        },
        {
          heading: "Review removal",
          paragraphs: [
            "If you submitted a review and want it taken down, tell us which one and we will remove it.",
          ],
        },
        {
          heading: "Never send us",
          bullets: [
            "Trading account credentials or account numbers.",
            "Payment card details.",
            "Anyone else's personal information.",
          ],
        },
        {
          heading: "Where to send it",
          paragraphs: [
            "This deployment has not had a contact address configured yet. If you are running this site, set one here before launch — a comparison product that cannot receive corrections stops being accurate very quickly.",
          ],
        },
      ]}
    />
  );
}
