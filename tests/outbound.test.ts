import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppf-outbound-"));
process.env.DATABASE_PATH = path.join(tmpDir, "test.db");

const { getDb } = await import("@/lib/db");
const { hasAnyActiveOffer } = await import("@/lib/repo");

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * The site tells traders that a link is sponsored only when it is. These guard
 * the data half of that promise; the component reads `offer?.affiliate_url` to
 * decide both the rel attribute and the disclosure wording.
 */
describe("outbound link honesty", () => {
  it("reports no monetisation when there are no offers", () => {
    getDb();

    expect(hasAnyActiveOffer()).toBe(false);
  });

  it("does not count an inactive offer as a commercial relationship", () => {
    const db = getDb();
    db.prepare(
      `INSERT INTO affiliate_offers (id, challenge_id, affiliate_url, active)
       VALUES ('off_inactive', NULL, 'https://example.invalid/ref', 0)`,
    ).run();

    // A lapsed deal must not keep the site describing itself as monetised.
    expect(hasAnyActiveOffer()).toBe(false);
  });

  it("reports monetisation once an active offer exists", () => {
    const db = getDb();
    db.prepare(
      `INSERT INTO affiliate_offers (id, challenge_id, affiliate_url, active)
       VALUES ('off_active', NULL, 'https://example.invalid/ref', 1)`,
    ).run();

    expect(hasAnyActiveOffer()).toBe(true);
  });
});
