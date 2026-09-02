import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * These exercise the real SQLite layer, because the properties worth testing
 * here are consent properties — "an unsubscribed address does not come back
 * confirmed" is a statement about what the SQL does, and a mock would happily
 * agree with whatever the test expected.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppf-newsletter-"));
process.env.DATABASE_PATH = path.join(tmpDir, "test.db");

const {
  confirmSubscriber,
  countSubscribers,
  getSubscriberByToken,
  listSubscribers,
  subscribeToNewsletter,
  unsubscribeByToken,
} = await import("@/lib/repo");

beforeAll(() => {
  // Touching the db forces the schema to be applied before the first test.
  countSubscribers();
});

describe("signup", () => {
  it("starts everyone as pending — a form submission is not consent", () => {
    const { token } = subscribeToNewsletter({ email: "a@example.com", topics: ["psychology"] });
    const subscriber = getSubscriberByToken(token);
    expect(subscriber?.status).toBe("pending");
    expect(subscriber?.confirmed_at).toBeNull();
  });

  it("normalises the address so the same person is not stored twice", () => {
    subscribeToNewsletter({ email: "Case@Example.com", topics: ["deals"] });
    subscribeToNewsletter({ email: "  case@example.com ", topics: ["deals"] });
    expect(listSubscribers().filter((s) => s.email === "case@example.com")).toHaveLength(1);
  });

  it("updates topics on a repeat signup rather than creating a second row", () => {
    const first = subscribeToNewsletter({ email: "topics@example.com", topics: ["psychology"] });
    const second = subscribeToNewsletter({
      email: "topics@example.com",
      topics: ["deals", "rule_changes"],
    });
    expect(second.token).toBe(first.token);
    expect(getSubscriberByToken(first.token)?.topics).toEqual(["deals", "rule_changes"]);
  });

  it("reports an existing confirmed address without changing its status", () => {
    const { token } = subscribeToNewsletter({ email: "known@example.com", topics: ["psychology"] });
    confirmSubscriber(token);

    const again = subscribeToNewsletter({ email: "known@example.com", topics: ["deals"] });
    expect(again.alreadyConfirmed).toBe(true);
    expect(getSubscriberByToken(token)?.status).toBe("confirmed");
  });
});

describe("confirmation", () => {
  it("is idempotent and keeps the original timestamp", () => {
    const { token } = subscribeToNewsletter({ email: "twice@example.com", topics: ["psychology"] });
    const first = confirmSubscriber(token);
    const second = confirmSubscriber(token);
    expect(second?.status).toBe("confirmed");
    expect(second?.confirmed_at).toBe(first?.confirmed_at);
  });

  it("does nothing for a token nobody was issued", () => {
    expect(confirmSubscriber("nl_not_a_real_token")).toBeNull();
  });
});

describe("unsubscribe", () => {
  it("keeps the row, so the request to stop survives", () => {
    const { token } = subscribeToNewsletter({ email: "gone@example.com", topics: ["deals"] });
    confirmSubscriber(token);
    const after = unsubscribeByToken(token);
    expect(after?.status).toBe("unsubscribed");
    expect(after?.unsubscribed_at).not.toBeNull();
    expect(listSubscribers().some((s) => s.email === "gone@example.com")).toBe(true);
  });

  /**
   * The one that matters. Anyone can type anyone's address into the signup
   * form, so a resubscribe must never be enough on its own to start mailing
   * someone who asked to stop — it puts them back to pending and the
   * confirmation link decides.
   */
  it("does not let a later form submission put someone back on the list", () => {
    const { token } = subscribeToNewsletter({ email: "stop@example.com", topics: ["deals"] });
    confirmSubscriber(token);
    unsubscribeByToken(token);

    subscribeToNewsletter({ email: "stop@example.com", topics: ["deals"] });
    expect(getSubscriberByToken(token)?.status).toBe("pending");
  });
});

describe("counts", () => {
  it("reports every status, including the ones with nobody in them", () => {
    const counts = countSubscribers();
    expect(Object.keys(counts).sort()).toEqual([
      "bounced",
      "confirmed",
      "pending",
      "unsubscribed",
    ]);
    expect(counts.confirmed).toBeGreaterThan(0);
  });
});
