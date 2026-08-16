import Link from "next/link";
import { ProsePage } from "@/components/Prose";

export const metadata = {
  title: "Affiliate disclosure",
  description:
    "How this site makes money, and the specific architectural reason commission cannot affect your match score.",
};

export default function AffiliateDisclosurePage() {
  return (
    <>
      <ProsePage
        eyebrow="Trust"
        title="Affiliate disclosure"
        lede="We earn commission on some outbound links. Here is exactly what that does and does not affect."
        sections={[
          {
            heading: "How we make money",
            paragraphs: [
              "When you click through to a prop firm from this site and buy a challenge, we may receive a commission from that firm. It costs you nothing extra, and in some cases a discount code we have negotiated makes it cheaper.",
              "Not every challenge on this site has an affiliate relationship. Challenges without one are listed, scored and recommended on exactly the same terms as challenges with one. If we have no affiliate link, the outbound button sends you to the firm's own website instead.",
            ],
          },
          {
            heading: "Why commission cannot affect your score",
            paragraphs: [
              "This is a structural claim, not a promise of good intentions. Affiliate URLs, tracking IDs, commission terms and discount codes live in separate database tables from the challenge data. The recommendation engine does not read those tables at all.",
              "A challenge's score is produced from your answers and from its recorded specifications and rules. There is no code path from a commercial term to a ranking position.",
            ],
          },
          {
            heading: "What we do track",
            paragraphs: [
              "When you click an outbound link we record which challenge it was, which page and placement it came from, the match score and position it was shown at, and your anonymous session id. That is how we measure whether the product actually helps people.",
              "That data flows into analytics only. It never flows back into scoring.",
            ],
          },
          {
            heading: "What we will not do",
            bullets: [
              "Rank a challenge higher because it pays more.",
              "Hide a challenge because it pays nothing.",
              "Present an affiliate link as anything other than an affiliate link.",
              "Invent a discount, or show an expiry date we have not confirmed.",
              "Let a commercial relationship change how a rule is recorded.",
            ],
          },
        ]}
      />

      <div className="shell-narrow" style={{ marginBottom: "3rem" }}>
        <div className="panel panel-quiet">
          <p className="small muted">
            If you would rather not send us a commission, that is entirely reasonable: use the
            recommendation, then go to the firm&apos;s site directly. The{" "}
            <Link href="/methodology" style={{ textDecoration: "underline" }}>
              methodology
            </Link>{" "}
            page explains everything you need to check the result yourself.
          </p>
        </div>
      </div>
    </>
  );
}
