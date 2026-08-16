import { ProsePage } from "@/components/Prose";

export const metadata = {
  title: "Cookies",
  description: "The cookies this site sets and why.",
};

export default function CookiesPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Cookies"
      lede="One functional cookie. No advertising cookies, no third-party trackers."
      sections={[
        {
          heading: "ppf_sid — anonymous session",
          paragraphs: [
            "A random identifier set on your first visit, stored for up to 180 days. It is what lets the questionnaire, your results, your saved challenges and your personalised match scores work without an account.",
            "It is httpOnly, so page scripts cannot read it, and it contains nothing derived from you — no name, no email, no fingerprint.",
          ],
        },
        {
          heading: "Local storage",
          paragraphs: [
            "The psychology workspace stores your behaviour logs, habit leaks and checklist state in your browser's local storage. That is not a cookie and is never sent to our servers. Clearing your browser data removes it.",
          ],
        },
        {
          heading: "Removing it",
          paragraphs: [
            "Clear cookies for this site in your browser. You will get a fresh anonymous session on your next visit, and your previous questionnaire answers will no longer be associated with you.",
          ],
        },
      ]}
    />
  );
}
