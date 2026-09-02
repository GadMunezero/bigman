import type { AffiliateOffer } from "@/lib/repo";

/**
 * The outbound CTA.
 *
 * Three rules this component exists to enforce:
 *  1. The link always routes through /api/go so the click is attributed after
 *     the recommendation, never before it.
 *  2. The disclosure is rendered next to the button, not buried in a footer.
 *  3. The disclosure describes THIS link, not the site's business model in
 *     general. With no affiliate offer there is no commission, so claiming one
 *     would be a false disclosure — traders reasonably discount advice they
 *     think is paid for, and saying "we may earn" when we do not earn spends
 *     that credibility for nothing. An unpaid link says so.
 *
 * A firm with no offer AND no recorded website has nowhere to send anyone. That
 * renders as a plain statement rather than a button that quietly loops back to
 * the page the trader is already on.
 */
export function AffiliateCta({
  challengeId,
  offer,
  firmName,
  firmWebsite,
  page,
  placement,
  score,
  position,
  label,
}: {
  challengeId: string;
  offer?: AffiliateOffer | null;
  firmName: string;
  firmWebsite?: string | null;
  page: string;
  placement: string;
  score?: number;
  position?: number;
  label?: string;
}) {
  const params = new URLSearchParams({ page, placement });
  if (typeof score === "number") params.set("score", String(score));
  if (typeof position === "number") params.set("position", String(position));

  const sponsored = Boolean(offer?.affiliate_url);
  const hasDestination = sponsored || Boolean(firmWebsite);

  if (!hasDestination) {
    return (
      <div className="stack-sm">
        <p className="small">
          We do not have {firmName}&apos;s official link on file yet, so we are not sending you to a
          page we have not checked.
        </p>
        <p className="small muted">
          Search for the firm directly and confirm the domain before paying for anything.
        </p>
      </div>
    );
  }

  return (
    <div className="stack-sm">
      <a
        className="btn btn-primary"
        href={`/api/go/${challengeId}?${params.toString()}`}
        // "sponsored" is a claim about a commercial relationship. It only
        // belongs on a link where one actually exists.
        rel={sponsored ? "sponsored nofollow noopener" : "nofollow noopener"}
        target="_blank"
      >
        {label ?? `Go to ${firmName}'s official site`}
      </a>

      {offer?.discount ? (
        <p className="small muted">
          Current offer: {offer.discount}
          {offer.code ? (
            <>
              {" · code "}
              <span className="mono">{offer.code}</span>
            </>
          ) : null}
          {offer.expiration ? (
            <> · expires {new Date(offer.expiration).toLocaleDateString("en-US")}</>
          ) : null}
        </p>
      ) : null}

      {sponsored ? (
        <p className="small muted">
          We may earn a commission if you buy through this link. Affiliate relationships do not
          affect your compatibility score.
        </p>
      ) : (
        <p className="small muted">
          This goes straight to {firmName}&apos;s own website. We are not affiliated with them and
          earn nothing if you sign up.
        </p>
      )}
    </div>
  );
}
