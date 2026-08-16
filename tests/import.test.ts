import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppf-import-"));
process.env.DATABASE_PATH = path.join(tmpDir, "test.db");

const { getDb } = await import("@/lib/db");
const { applyImport, parseCsv, planImport } = await import("@/lib/import");

const HEADER =
  "firm_name,challenge_name,markets,account_size,price,profit_target_pct,max_drawdown_pct,drawdown_type,news_trading,consistency_rule,source_url,source_type,confidence,status";

const row = (overrides: Partial<Record<string, string>> = {}) => {
  const defaults: Record<string, string> = {
    firm_name: "Acme Prop",
    challenge_name: "$50K Eval",
    markets: "futures",
    account_size: "50000",
    price: "99",
    profit_target_pct: "8",
    max_drawdown_pct: "6",
    drawdown_type: "static",
    news_trading: "allowed",
    consistency_rule: "not_required",
    source_url: "https://example.invalid/rules",
    source_type: "official_rules",
    confidence: "needs_review",
    status: "published",
  };
  const merged = { ...defaults, ...overrides };
  return HEADER.split(",")
    .map((column) => {
      const value = merged[column] ?? "";
      // Quote like a real spreadsheet export would, so a cell containing a
      // comma stays one cell.
      return value.includes(",") ? `"${value.replace(/"/g, '""')}"` : value;
    })
    .join(",");
};

const csv = (...rows: string[]) => [HEADER, ...rows].join("\n");

beforeAll(() => {
  getDb();
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("csv parsing", () => {
  it("handles quoted fields containing commas and newlines", () => {
    const parsed = parseCsv('a,b\n"one, two","line\nbreak"\n');

    expect(parsed).toEqual([
      ["a", "b"],
      ["one, two", "line\nbreak"],
    ]);
  });

  it("handles escaped quotes and strips a BOM", () => {
    const parsed = parseCsv('﻿a\n"say ""hi"""\n');

    expect(parsed[1][0]).toBe('say "hi"');
  });

  it("ignores blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n\n")).toHaveLength(2);
  });
});

describe("validation", () => {
  it("rejects a row missing a required column value", () => {
    const plan = planImport(csv(row({ challenge_name: "" })));

    expect(plan.errors.some((e) => e.column === "challenge_name" && e.row === 2)).toBe(true);
  });

  it("rejects values outside the allowed vocabulary, naming the row", () => {
    const plan = planImport(csv(row({ drawdown_type: "bouncing", news_trading: "maybe" })));

    expect(plan.errors.map((e) => e.column).sort()).toEqual(["drawdown_type", "news_trading"]);
    expect(plan.errors.every((e) => e.row === 2)).toBe(true);
  });

  it("rejects non-numeric and out-of-range numbers", () => {
    const plan = planImport(csv(row({ price: "abc", max_drawdown_pct: "150" })));

    expect(plan.errors.map((e) => e.column).sort()).toEqual(["max_drawdown_pct", "price"]);
  });

  it("accepts money and percent formatting in numeric cells", () => {
    const plan = planImport(csv(row({ price: "$1,299", max_drawdown_pct: "6%" })));

    expect(plan.errors).toHaveLength(0);
    expect(plan.rows[0].challenge.price).toBe(1299);
    expect(plan.rows[0].challenge.max_drawdown_pct).toBe(6);
  });

  it("refuses to accept 'verified' without a source URL", () => {
    const plan = planImport(csv(row({ confidence: "verified", source_url: "" })));

    expect(plan.errors.some((e) => e.column === "source_url")).toBe(true);
  });

  it("refuses to let aggregator-sourced data claim 'verified'", () => {
    const plan = planImport(
      csv(
        row({
          confidence: "verified",
          source_type: "aggregator_unverified",
          source_url: "https://aggregator.invalid/list",
        }),
      ),
    );

    // The source URL is present, so the generic rule is satisfied. This must
    // still fail: a comparison site cannot confer verification.
    expect(plan.errors.some((e) => e.column === "confidence")).toBe(true);
  });

  it("still allows aggregator data in at a lower confidence", () => {
    const plan = planImport(
      csv(row({ confidence: "needs_review", source_type: "aggregator_unverified" })),
    );

    expect(plan.errors).toHaveLength(0);
    expect(plan.rows[0].sourceType).toBe("aggregator_unverified");
  });

  it("catches duplicate challenges within one file", () => {
    const plan = planImport(csv(row(), row()));

    expect(plan.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });

  it("warns rather than errors when a price is blank", () => {
    const plan = planImport(csv(row({ price: "" })));

    expect(plan.errors).toHaveLength(0);
    expect(plan.warnings.some((w) => w.column === "price")).toBe(true);
    expect(plan.rows[0].challenge.price).toBeNull();
  });
});

describe("applying", () => {
  it("creates the firm and challenge, and records the source", () => {
    const plan = planImport(csv(row({ firm_name: "Create Co", challenge_name: "$25K" })));
    const result = applyImport(plan);

    expect(result.firmsCreated).toBe(1);
    expect(result.challengesCreated).toBe(1);
    expect(result.sourcesRecorded).toBe(1);

    const db = getDb();
    const challenge = db
      .prepare(`SELECT * FROM challenges WHERE slug = 'create-co-25k'`)
      .get() as Record<string, unknown>;

    expect(challenge.price).toBe(99);
    expect(challenge.status).toBe("published");
  });

  it("does not overwrite an existing challenge — it queues a pending change", () => {
    applyImport(planImport(csv(row({ firm_name: "Diff Co", challenge_name: "$10K", price: "50" }))));

    const second = applyImport(
      planImport(csv(row({ firm_name: "Diff Co", challenge_name: "$10K", price: "75" }))),
    );

    expect(second.pendingChanges).toBe(1);

    const db = getDb();
    const challenge = db
      .prepare(`SELECT price FROM challenges WHERE slug = 'diff-co-10k'`)
      .get() as { price: number };
    const pending = db
      .prepare(
        `SELECT field, old_value, new_value, status FROM rule_history
         WHERE challenge_id = (SELECT id FROM challenges WHERE slug = 'diff-co-10k')`,
      )
      .all() as { field: string; old_value: string; new_value: string; status: string }[];

    // The live value is untouched until a human approves it.
    expect(challenge.price).toBe(50);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      field: "price",
      old_value: "50",
      new_value: "75",
      status: "pending",
    });
  });

  it("treats a blank cell as 'no information', never as an instruction to erase", () => {
    applyImport(
      planImport(csv(row({ firm_name: "Blank Co", challenge_name: "$5K", price: "40" }))),
    );

    const second = applyImport(
      planImport(csv(row({ firm_name: "Blank Co", challenge_name: "$5K", price: "" }))),
    );

    const db = getDb();
    const challenge = db
      .prepare(`SELECT price FROM challenges WHERE slug = 'blank-co-5k'`)
      .get() as { price: number };

    expect(second.pendingChanges).toBe(0);
    expect(challenge.price).toBe(40);
  });

  it("reports an unchanged re-import as unchanged", () => {
    applyImport(planImport(csv(row({ firm_name: "Same Co", challenge_name: "$1K" }))));
    const second = applyImport(planImport(csv(row({ firm_name: "Same Co", challenge_name: "$1K" }))));

    expect(second.pendingChanges).toBe(0);
    expect(second.unchanged).toBe(1);
  });

  it("refuses to apply a plan that has validation errors", () => {
    const plan = planImport(csv(row({ price: "not-a-number" })));

    expect(() => applyImport(plan)).toThrow(/validation errors/i);
  });

  it("only stamps last_verified_at when the row claims verification", () => {
    applyImport(
      planImport(
        csv(row({ firm_name: "Verified Co", challenge_name: "$2K", confidence: "verified" })),
      ),
    );
    applyImport(
      planImport(
        csv(row({ firm_name: "Unverified Co", challenge_name: "$2K", confidence: "needs_review" })),
      ),
    );

    const db = getDb();
    const verified = db
      .prepare(`SELECT last_verified_at FROM challenges WHERE slug = 'verified-co-2k'`)
      .get() as { last_verified_at: string | null };
    const unverified = db
      .prepare(`SELECT last_verified_at FROM challenges WHERE slug = 'unverified-co-2k'`)
      .get() as { last_verified_at: string | null };

    expect(verified.last_verified_at).not.toBeNull();
    expect(unverified.last_verified_at).toBeNull();
  });
});
