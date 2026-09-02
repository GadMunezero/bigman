import { listChallengeRecords, listOffers } from "@/lib/repo";
import { saveOffer } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminDealsPage() {
  const challenges = listChallengeRecords({ includeUnpublished: true });
  const byId = new Map(challenges.map((c) => [c.id, c]));
  const offers = listOffers();

  return (
    <div className="stack-lg">
      <div className="panel panel-quiet">
        <strong>Affiliate data is stored separately from challenge data on purpose.</strong>
        <p className="small muted" style={{ marginTop: "0.4rem" }}>
          Nothing on this page is readable by the recommendation engine. Adding, removing or
          re-pricing an offer cannot change a single match score.
        </p>
      </div>

      <section>
        <h2 className="section-heading">Add or update an offer</h2>
        <form action={saveOffer} className="panel stack">
          <div className="grid-2">
            <div>
              <label className="field-label" htmlFor="challenge_id">
                Challenge
              </label>
              <select id="challenge_id" name="challenge_id" required defaultValue="">
                <option value="" disabled>
                  Select a challenge
                </option>
                {challenges.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {challenge.firm.name} — {challenge.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="affiliate_url">
                Affiliate URL
              </label>
              <input id="affiliate_url" name="affiliate_url" className="input" type="url" required />
            </div>
            <div>
              <label className="field-label" htmlFor="tracking_id">
                Tracking id
              </label>
              <input id="tracking_id" name="tracking_id" className="input" />
            </div>
            <div>
              <label className="field-label" htmlFor="discount">
                Discount text
              </label>
              <input id="discount" name="discount" className="input" placeholder="e.g. 10% off" />
            </div>
            <div>
              <label className="field-label" htmlFor="code">
                Code
              </label>
              <input id="code" name="code" className="input" />
            </div>
            <div>
              <label className="field-label" htmlFor="expiration">
                Expiry date
              </label>
              <input id="expiration" name="expiration" className="input" placeholder="2026-12-31" />
            </div>
          </div>

          <label className="row" style={{ gap: "0.5rem" }}>
            <input
              type="checkbox"
              name="verified"
              value="1"
              style={{ width: 16, height: 16, minHeight: "auto" }}
            />
            <span className="small">
              I have verified this offer and its expiry date on the firm&apos;s own site
            </span>
          </label>
          <p className="small muted" style={{ marginTop: "-0.5rem" }}>
            The expiry date is only stored when this box is ticked. We do not show a countdown we
            cannot stand behind.
          </p>

          <label className="row" style={{ gap: "0.5rem" }}>
            <input
              type="checkbox"
              name="active"
              value="1"
              defaultChecked
              style={{ width: 16, height: 16, minHeight: "auto" }}
            />
            <span className="small">Active</span>
          </label>

          <button type="submit" className="btn btn-primary" style={{ justifySelf: "start" }}>
            Save offer
          </button>
        </form>
      </section>

      <section>
        <h2 className="section-heading">Offers ({offers.length})</h2>
        {offers.length === 0 ? (
          <p className="small muted">
            No offers configured. Challenges without an offer still show an outbound button — it
            sends the trader to the firm&apos;s own website instead.
          </p>
        ) : (
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Challenge</th>
                  <th>Discount</th>
                  <th>Code</th>
                  <th>Expires</th>
                  <th>Active</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => {
                  const challenge = offer.challenge_id ? byId.get(offer.challenge_id) : null;
                  return (
                    <tr key={offer.id}>
                      <td className="small">
                        {challenge ? `${challenge.firm.name} — ${challenge.name}` : "—"}
                      </td>
                      <td className="small">{offer.discount ?? "—"}</td>
                      <td className="small mono">{offer.code ?? "—"}</td>
                      <td className="small mono">{offer.expiration ?? "Not verified"}</td>
                      <td>
                        <span className={`pill ${offer.active ? "pill-accent" : ""}`}>
                          {offer.active ? "active" : "off"}
                        </span>
                      </td>
                      <td className="small mono">
                        {offer.verified_at
                          ? new Date(offer.verified_at).toLocaleDateString("en-US")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
