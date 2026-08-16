import { ProsePage } from "@/components/Prose";

export const metadata = {
  title: "Privacy",
  description: "What data this site collects, what it does not, and where it is stored.",
};

export default function PrivacyPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Privacy"
      lede="The short version: an anonymous session id, your questionnaire answers, and which links you clicked. No account required, no personal details asked for."
      sections={[
        {
          heading: "What we store",
          bullets: [
            "An anonymous session id, set as a cookie on your first visit. It is a random value and is not derived from anything about you.",
            "Your questionnaire answers, stored against that session id so your matches persist between visits.",
            "Which challenges you saved.",
            "Funnel events: that a quiz was started or completed, that results were viewed, that an outbound link was clicked, and the position and match score it was shown at.",
            "Reviews you submit, including anything you choose to write in them.",
          ],
        },
        {
          heading: "What we do not store",
          bullets: [
            "Your name, email or phone number, unless you volunteer one in a review or a message to us.",
            "Any trading account credentials or account numbers. Never send us these.",
            "Your behaviour logs, habit leaks or checklist state from the psychology workspace — those stay in your browser's local storage and are never transmitted.",
            "Your practice drill responses. They are sent only to generate the feedback you asked for, and are not written to our database.",
          ],
        },
        {
          heading: "Cookies",
          paragraphs: [
            "One functional cookie holds the anonymous session id. It is what makes the questionnaire work without an account. There are no advertising cookies and no third-party trackers embedded in the site.",
          ],
        },
        {
          heading: "Outbound links",
          paragraphs: [
            "When you click through to a prop firm, that firm's own privacy policy and cookies apply from that point on. We have no control over what they collect.",
          ],
        },
        {
          heading: "Your data",
          paragraphs: [
            "You can clear your trading profile from your profile page at any time, which deletes the stored answers for your session. Clearing your browser cookies detaches you from the session entirely.",
            "To request removal of a review you submitted, or any other data, contact us.",
          ],
        },
      ]}
      footnote="This describes how this software behaves as built. An operator running their own deployment may configure additional analytics; if you are a user of a specific deployment, check with its operator."
    />
  );
}
