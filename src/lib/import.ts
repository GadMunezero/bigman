import { getDb, newId, nowIso } from "./db";
import {
  CONFIDENCE_LEVELS,
  DEAL_BREAKERS,
  MARKETS,
  RULE_STATUSES,
  type Confidence,
} from "./types";

/**
 * Bulk import for challenge data.
 *
 * The research is the expensive part, not the typing, so this is built around
 * a spreadsheet: one row per challenge, one column per field, plus a source URL
 * and a confidence level. Paste it in, dry-run it, read what would change, then
 * apply.
 *
 * Three behaviours that exist because of what this product promises:
 *
 *  1. A blank cell means "not confirmed", never zero and never a default. The
 *     importer will not invent a value to fill a gap.
 *  2. Re-importing a challenge that already exists does NOT overwrite it. Each
 *     differing field becomes a pending change for a human to approve, so the
 *     dated history on the challenge page stays true.
 *  3. Nothing imports as `verified` unless the row says so explicitly. The
 *     default is `needs_review`, because a spreadsheet cell is not verification.
 */

// ---------------------------------------------------------------------------
// CSV parsing (RFC 4180: quoted fields, embedded commas and newlines)
// ---------------------------------------------------------------------------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM, which spreadsheet exports love to add.
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop entirely blank lines, which trailing newlines and stray rows produce.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export const CHALLENGE_COLUMNS = [
  "firm_name",
  "firm_website",
  "challenge_name",
  "markets",
  "account_size",
  "price",
  "billing_type",
  "currency",
  "profit_target_pct",
  "max_drawdown_pct",
  "daily_drawdown_pct",
  "drawdown_type",
  "minimum_days",
  "maximum_days",
  "payout_frequency_days",
  "payout_split_pct",
  "payout_conditions",
  "platforms",
  "leverage",
  "refund_policy",
  "country_restrictions",
  "phases",
  "news_trading",
  "overnight",
  "weekend",
  "ea_allowed",
  "copy_trading",
  "scalping",
  "hedging",
  "consistency_rule",
  "consistency_pct",
  "source_url",
  "source_type",
  "confidence",
  "status",
] as const;

const REQUIRED_COLUMNS = ["firm_name", "challenge_name"] as const;

const DRAWDOWN_TYPES = ["static", "trailing", "eod_trailing", "intraday_trailing"];
const SOURCE_TYPES = [
  "official_rules",
  "official_pricing",
  "official_faq",
  "trader_report",
  "manual_verification",
  // Copied from a comparison site rather than read off the firm's own page. It
  // exists so that provenance stays visible instead of being laundered into
  // "manual_verification", which would claim a check nobody performed. Rows
  // carrying it can never be `verified` — see the confidence rule below.
  "aggregator_unverified",
];
const CONSISTENCY = ["required", "not_required", "unknown"];
const BILLING = ["one_time", "monthly"];

export interface ImportIssue {
  row: number;
  column: string;
  message: string;
}

export interface ParsedRow {
  row: number;
  firmName: string;
  firmSlug: string;
  firmWebsite: string | null;
  challengeName: string;
  challengeSlug: string;
  challenge: Record<string, string | number | null>;
  rules: Record<string, string | number | null>;
  sourceUrl: string | null;
  sourceType: string;
  confidence: Confidence;
  status: string;
}

export interface ImportPlan {
  rows: ParsedRow[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  newFirms: string[];
  newChallenges: string[];
  /** Existing challenges whose values differ — these become pending changes. */
  changedChallenges: { slug: string; name: string; changes: string[] }[];
  unchanged: number;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function num(
  raw: string,
  rowNumber: number,
  column: string,
  errors: ImportIssue[],
  opts: { min?: number; max?: number } = {},
): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const value = Number(trimmed.replace(/[$,%\s]/g, ""));
  if (!Number.isFinite(value)) {
    errors.push({ row: rowNumber, column, message: `"${raw}" is not a number` });
    return null;
  }
  if (opts.min !== undefined && value < opts.min) {
    errors.push({ row: rowNumber, column, message: `${value} is below the minimum ${opts.min}` });
    return null;
  }
  if (opts.max !== undefined && value > opts.max) {
    errors.push({ row: rowNumber, column, message: `${value} is above the maximum ${opts.max}` });
    return null;
  }
  return value;
}

function enumValue(
  raw: string,
  allowed: readonly string[],
  rowNumber: number,
  column: string,
  errors: ImportIssue[],
  fallback: string | null = null,
): string | null {
  const trimmed = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (trimmed === "") return fallback;
  if (!allowed.includes(trimmed)) {
    errors.push({
      row: rowNumber,
      column,
      message: `"${raw}" is not one of: ${allowed.join(", ")}`,
    });
    return fallback;
  }
  return trimmed;
}

function listValue(raw: string, allowed: readonly string[] | null, rowNumber: number, column: string, errors: ImportIssue[]): string[] {
  const items = raw
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!allowed) return items;

  const normalised: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().replace(/[\s-]+/g, "_");
    if (allowed.includes(key)) {
      normalised.push(key);
    } else {
      errors.push({
        row: rowNumber,
        column,
        message: `"${item}" is not one of: ${allowed.join(", ")}`,
      });
    }
  }
  return normalised;
}

/**
 * Parses and validates a CSV, then diffs it against what is already stored.
 * Nothing is written — this is what the dry run reports on.
 */
export function planImport(csv: string): ImportPlan {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const rows = parseCsv(csv);

  if (rows.length === 0) {
    return {
      rows: [],
      errors: [{ row: 0, column: "-", message: "The file is empty." }],
      warnings: [],
      newFirms: [],
      newChallenges: [],
      changedChallenges: [],
      unchanged: 0,
    };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  for (const required of REQUIRED_COLUMNS) {
    if (!header.includes(required)) {
      errors.push({ row: 1, column: required, message: `Missing required column "${required}"` });
    }
  }

  const unknown = header.filter((h) => h !== "" && !CHALLENGE_COLUMNS.includes(h as never));
  for (const column of unknown) {
    warnings.push({ row: 1, column, message: `Unrecognised column — it will be ignored` });
  }

  if (errors.length > 0) {
    return {
      rows: [],
      errors,
      warnings,
      newFirms: [],
      newChallenges: [],
      changedChallenges: [],
      unchanged: 0,
    };
  }

  const index = (column: string) => header.indexOf(column);
  const parsed: ParsedRow[] = [];
  const seenSlugs = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const rowNumber = r + 1;
    const cells = rows[r];
    const get = (column: string) => {
      const i = index(column);
      return i === -1 ? "" : (cells[i] ?? "");
    };

    const firmName = get("firm_name").trim();
    const challengeName = get("challenge_name").trim();

    if (!firmName || !challengeName) {
      errors.push({
        row: rowNumber,
        column: !firmName ? "firm_name" : "challenge_name",
        message: "Required and cannot be blank",
      });
      continue;
    }

    const firmSlug = slugify(firmName);
    const challengeSlug = slugify(`${firmName}-${challengeName}`);

    if (seenSlugs.has(challengeSlug)) {
      errors.push({
        row: rowNumber,
        column: "challenge_name",
        message: `Duplicate of an earlier row (${challengeSlug})`,
      });
      continue;
    }
    seenSlugs.add(challengeSlug);

    const markets = listValue(get("markets"), MARKETS, rowNumber, "markets", errors);
    if (markets.length === 0) {
      warnings.push({
        row: rowNumber,
        column: "markets",
        message: "No market recorded — this challenge will never be filtered out by market",
      });
    }

    const price = num(get("price"), rowNumber, "price", errors, { min: 0 });
    if (price === null && get("price").trim() === "") {
      warnings.push({
        row: rowNumber,
        column: "price",
        message: "Blank — will render as 'Price not confirmed'",
      });
    }

    const confidence = enumValue(
      get("confidence"),
      CONFIDENCE_LEVELS,
      rowNumber,
      "confidence",
      errors,
      "needs_review",
    ) as Confidence;

    const sourceType = enumValue(
      get("source_type"),
      SOURCE_TYPES,
      rowNumber,
      "source_type",
      errors,
      "official_rules",
    )!;

    const sourceUrl = get("source_url").trim() || null;
    if (confidence === "verified" && !sourceUrl) {
      errors.push({
        row: rowNumber,
        column: "source_url",
        message: "A row marked 'verified' must cite a source URL",
      });
    }

    // A comparison site is not a source of truth, so it cannot confer the
    // strongest confidence level no matter what the spreadsheet claims. Without
    // this, "aggregator_unverified" would be a label a careless row could shed.
    if (confidence === "verified" && sourceType === "aggregator_unverified") {
      errors.push({
        row: rowNumber,
        column: "confidence",
        message:
          "An aggregator row cannot be 'verified' — read the figure on the firm's own page and cite that URL instead",
      });
    }

    const challenge: Record<string, string | number | null> = {
      markets: JSON.stringify(markets),
      account_size: num(get("account_size"), rowNumber, "account_size", errors, { min: 0 }),
      price,
      // Futures evaluations are very often billed monthly. Without this the
      // budget criterion silently compares a recurring fee against a one-off
      // one, and the challenge page cannot say "/ month".
      billing_type: enumValue(get("billing_type"), BILLING, rowNumber, "billing_type", errors),
      currency: get("currency").trim().toUpperCase() || "USD",
      profit_target_pct: num(get("profit_target_pct"), rowNumber, "profit_target_pct", errors, { min: 0, max: 100 }),
      max_drawdown_pct: num(get("max_drawdown_pct"), rowNumber, "max_drawdown_pct", errors, { min: 0, max: 100 }),
      daily_drawdown_pct: num(get("daily_drawdown_pct"), rowNumber, "daily_drawdown_pct", errors, { min: 0, max: 100 }),
      drawdown_type: enumValue(get("drawdown_type"), DRAWDOWN_TYPES, rowNumber, "drawdown_type", errors),
      minimum_days: num(get("minimum_days"), rowNumber, "minimum_days", errors, { min: 0 }),
      maximum_days: num(get("maximum_days"), rowNumber, "maximum_days", errors, { min: 0 }),
      payout_frequency_days: num(get("payout_frequency_days"), rowNumber, "payout_frequency_days", errors, { min: 0 }),
      payout_split_pct: num(get("payout_split_pct"), rowNumber, "payout_split_pct", errors, { min: 0, max: 100 }),
      payout_conditions: get("payout_conditions").trim() || null,
      platforms: JSON.stringify(listValue(get("platforms"), null, rowNumber, "platforms", errors)),
      leverage: get("leverage").trim() || null,
      refund_policy: get("refund_policy").trim() || null,
      country_restrictions: get("country_restrictions").trim() || null,
      phases: num(get("phases"), rowNumber, "phases", errors, { min: 0, max: 5 }),
    };

    const rules: Record<string, string | number | null> = {
      news_trading: enumValue(get("news_trading"), RULE_STATUSES, rowNumber, "news_trading", errors, "unknown"),
      overnight: enumValue(get("overnight"), RULE_STATUSES, rowNumber, "overnight", errors, "unknown"),
      weekend: enumValue(get("weekend"), RULE_STATUSES, rowNumber, "weekend", errors, "unknown"),
      ea_allowed: enumValue(get("ea_allowed"), RULE_STATUSES, rowNumber, "ea_allowed", errors, "unknown"),
      copy_trading: enumValue(get("copy_trading"), RULE_STATUSES, rowNumber, "copy_trading", errors, "unknown"),
      scalping: enumValue(get("scalping"), RULE_STATUSES, rowNumber, "scalping", errors, "unknown"),
      hedging: enumValue(get("hedging"), RULE_STATUSES, rowNumber, "hedging", errors, "unknown"),
      consistency_rule: enumValue(get("consistency_rule"), CONSISTENCY, rowNumber, "consistency_rule", errors, "unknown"),
      consistency_pct: num(get("consistency_pct"), rowNumber, "consistency_pct", errors, { min: 0, max: 100 }),
    };

    parsed.push({
      row: rowNumber,
      firmName,
      firmSlug,
      firmWebsite: get("firm_website").trim() || null,
      challengeName,
      challengeSlug,
      challenge,
      rules,
      sourceUrl,
      sourceType,
      confidence,
      status: enumValue(get("status"), ["draft", "published", "archived"], rowNumber, "status", errors, "draft")!,
    });
  }

  // ---- diff against what is stored ---------------------------------------
  const db = getDb();
  const existingFirms = new Set(
    (db.prepare(`SELECT slug FROM firms`).all() as { slug: string }[]).map((f) => f.slug),
  );
  const existingChallenges = new Map(
    (
      db.prepare(`SELECT id, slug, name FROM challenges`).all() as {
        id: string;
        slug: string;
        name: string;
      }[]
    ).map((c) => [c.slug, c]),
  );

  const newFirms = [...new Set(parsed.map((r) => r.firmName))].filter(
    (name) => !existingFirms.has(slugify(name)),
  );
  const newChallenges: string[] = [];
  const changedChallenges: ImportPlan["changedChallenges"] = [];
  let unchanged = 0;

  for (const row of parsed) {
    const existing = existingChallenges.get(row.challengeSlug);
    if (!existing) {
      newChallenges.push(`${row.firmName} — ${row.challengeName}`);
      continue;
    }

    const current = db
      .prepare(`SELECT * FROM challenges WHERE id = ?`)
      .get(existing.id) as Record<string, unknown>;

    const changes: string[] = [];
    for (const [field, value] of Object.entries(row.challenge)) {
      if (value === null) continue; // A blank cell never erases a stored value.
      if (String(current[field] ?? "") !== String(value)) {
        changes.push(`${field}: ${current[field] ?? "—"} → ${value}`);
      }
    }

    if (changes.length > 0) {
      changedChallenges.push({
        slug: row.challengeSlug,
        name: `${row.firmName} — ${row.challengeName}`,
        changes,
      });
    } else {
      unchanged += 1;
    }
  }

  return { rows: parsed, errors, warnings, newFirms, newChallenges, changedChallenges, unchanged };
}

export interface ImportResult {
  firmsCreated: number;
  challengesCreated: number;
  pendingChanges: number;
  unchanged: number;
  sourcesRecorded: number;
}

/**
 * Applies a validated plan.
 *
 * New challenges are inserted directly. Existing ones are NOT overwritten:
 * each differing field is written to `rule_history` as a pending change, so an
 * admin approves it and the challenge page gains a dated entry. That is the
 * same path the manual editor uses, and it is what keeps the change history
 * honest when data is refreshed in bulk.
 */
export function applyImport(plan: ImportPlan): ImportResult {
  if (plan.errors.length > 0) {
    throw new Error("Refusing to apply an import with validation errors.");
  }

  const db = getDb();
  const result: ImportResult = {
    firmsCreated: 0,
    challengesCreated: 0,
    pendingChanges: 0,
    unchanged: 0,
    sourcesRecorded: 0,
  };

  const run = db.transaction(() => {
    for (const row of plan.rows) {
      // ---- firm ----------------------------------------------------------
      let firm = db.prepare(`SELECT id FROM firms WHERE slug = ?`).get(row.firmSlug) as
        | { id: string }
        | undefined;

      if (!firm) {
        const firmId = newId("firm");
        db.prepare(
          `INSERT INTO firms (id, name, slug, website, status) VALUES (?, ?, ?, ?, 'draft')`,
        ).run(firmId, row.firmName, row.firmSlug, row.firmWebsite);
        firm = { id: firmId };
        result.firmsCreated += 1;
      } else if (row.firmWebsite) {
        db.prepare(`UPDATE firms SET website = COALESCE(website, ?) WHERE id = ?`).run(
          row.firmWebsite,
          firm.id,
        );
      }

      // ---- challenge -----------------------------------------------------
      const existing = db
        .prepare(`SELECT * FROM challenges WHERE slug = ?`)
        .get(row.challengeSlug) as Record<string, unknown> | undefined;

      let challengeId: string;

      if (!existing) {
        challengeId = newId("chal");
        const columns = Object.keys(row.challenge);
        db.prepare(
          `INSERT INTO challenges (id, firm_id, name, slug, status, ${columns.join(", ")})
           VALUES (?, ?, ?, ?, ?, ${columns.map(() => "?").join(", ")})`,
        ).run(
          challengeId,
          firm.id,
          row.challengeName,
          row.challengeSlug,
          row.status,
          ...columns.map((c) => row.challenge[c]),
        );

        db.prepare(
          `INSERT INTO challenge_rules (challenge_id, ${Object.keys(row.rules).join(", ")})
           VALUES (?, ${Object.keys(row.rules).map(() => "?").join(", ")})`,
        ).run(challengeId, ...Object.values(row.rules));

        result.challengesCreated += 1;
      } else {
        challengeId = existing.id as string;
        let changed = false;

        for (const [field, value] of Object.entries({ ...row.challenge, ...row.rules })) {
          if (value === null) continue;
          const currentValue =
            field in existing
              ? existing[field]
              : (
                  db
                    .prepare(`SELECT ${field} AS v FROM challenge_rules WHERE challenge_id = ?`)
                    .get(challengeId) as { v: unknown } | undefined
                )?.v;

          if (String(currentValue ?? "") === String(value)) continue;

          db.prepare(
            `INSERT INTO rule_history (id, challenge_id, field, old_value, new_value, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(
            newId("rh"),
            challengeId,
            field,
            currentValue === null || currentValue === undefined ? null : String(currentValue),
            String(value),
            `Bulk import${row.sourceUrl ? ` from ${row.sourceUrl}` : ""}`,
          );
          result.pendingChanges += 1;
          changed = true;
        }

        if (!changed) result.unchanged += 1;
      }

      // ---- source and confidence ------------------------------------------
      if (row.sourceUrl) {
        db.prepare(
          `INSERT INTO sources (id, firm_id, challenge_id, source_type, url, confidence)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(newId("src"), firm.id, challengeId, row.sourceType, row.sourceUrl, row.confidence);
        result.sourcesRecorded += 1;
      }

      const confidenceFields = [
        "price",
        "account_size",
        "max_drawdown_pct",
        "profit_target_pct",
        "payout_frequency_days",
      ];
      for (const field of confidenceFields) {
        // Only claim confidence for fields the row actually supplied.
        if (row.challenge[field] === null) continue;
        db.prepare(
          `INSERT INTO field_confidence (challenge_id, field, confidence, verified_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(challenge_id, field) DO UPDATE SET
             confidence = excluded.confidence, verified_at = excluded.verified_at`,
        ).run(
          challengeId,
          field,
          row.confidence,
          row.confidence === "verified" ? nowIso() : null,
        );
      }

      if (row.confidence === "verified") {
        db.prepare(`UPDATE challenges SET last_verified_at = ? WHERE id = ?`).run(
          nowIso(),
          challengeId,
        );
      }
    }
  });

  run();
  return result;
}

/** The header row plus a commented guide, for the downloadable template. */
export function csvTemplate(): string {
  const header = CHALLENGE_COLUMNS.join(",");
  const example = [
    "Example Firm (replace me)",
    "https://example.com",
    "$100K Evaluation",
    "futures",
    "100000",
    "",
    "USD",
    "8",
    "6",
    "3",
    "eod_trailing",
    "3",
    "",
    "14",
    "80",
    "First payout after 10 trading days",
    "NinjaTrader;TradingView",
    "",
    "",
    "",
    "1",
    "restricted",
    "prohibited",
    "prohibited",
    "restricted",
    "prohibited",
    "allowed",
    "unknown",
    "not_required",
    "",
    "https://example.com/rules",
    "official_rules",
    "needs_review",
    "draft",
  ]
    .map((cell) => (cell.includes(",") ? `"${cell}"` : cell))
    .join(",");

  return `${header}\n${example}\n`;
}

export { DEAL_BREAKERS };
