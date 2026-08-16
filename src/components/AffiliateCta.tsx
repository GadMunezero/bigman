import type { AffiliateOffer } from "@/lib/repo";

/**
 * The outbound CTA.
 *
 * Two rules this component exists to enforce:
 *  1. The link always routes through /api/go so the click is attributed after
 *     the recommendation, never before it.
 *  2. The disclosure is rendered next to the button, not buried in a footer.
 */
export function AffiliateCta({
  challengeId,
  offer,
  page,
  placement,
  score,
  position,
  label = "View current challenge",
}: {
  challengeId: string;
  offer?: AffiliateOffer | null;
  page: string;
  placement: string;
  score?: number;
  position?: number;
  label?: string;
}) {
  const params = new URLSearchParams({ page, placement });
  if (typeof score === "number") params.set("score", String(score));
  if (typeof position === "number") params.set("position", String(position));

  return (
    <div className="stack-sm">
      <a
        className="btn btn-primary"
        href={`/api/go/${challengeId}?${params.toString()}`}
        rel="sponsored nofollow noopener"
        target="_blank"
      >
        {label}
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

      <p className="small muted">
        We may earn a commission if you buy through this link. Affiliate relationships do not
        affect your compatibility score.
      </p>
    </div>
  );
}
