import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Single SQLite connection, created lazily and cached across hot reloads.
 *
 * SQLite is the right call for this MVP: the read pattern is "load every
 * published challenge and score it in memory", which is a handful of
 * kilobytes. The repository layer in `repo.ts` is the only thing that touches
 * this module, so swapping in Postgres later is a contained change.
 */

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

declare global {
  // eslint-disable-next-line no-var
  var __ppf_db: Database.Database | undefined;
}

/**
 * Columns added after the first release.
 *
 * `CREATE TABLE IF NOT EXISTS` is a no-op on an existing database, so new
 * columns would silently never appear on a deployment that already has data.
 * Each entry is applied only when the column is genuinely absent, which keeps
 * this idempotent and safe to run on every boot.
 */
const ADDED_COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: "firms", column: "founded_year", definition: "INTEGER" },
  { table: "firms", column: "headquarters", definition: "TEXT" },
  { table: "firms", column: "ceo", definition: "TEXT" },
  { table: "firms", column: "key_people", definition: "TEXT NOT NULL DEFAULT '[]'" },
  { table: "firms", column: "leadership_source_url", definition: "TEXT" },
  { table: "challenges", column: "leverage", definition: "TEXT" },
  { table: "challenges", column: "refund_policy", definition: "TEXT" },
  { table: "challenges", column: "country_restrictions", definition: "TEXT" },
  { table: "trader_profiles", column: "challenge_approach", definition: "TEXT" },
  { table: "trader_profiles", column: "risk_style", definition: "TEXT" },
  // The four measured answers the archetype classifier reads. A profile saved
  // before these existed keeps working — they read as null, no archetype is
  // detected, and the engine falls back to the base weights.
  { table: "trader_profiles", column: "trade_frequency", definition: "TEXT" },
  { table: "trader_profiles", column: "profit_shape", definition: "TEXT" },
  { table: "trader_profiles", column: "risk_width", definition: "TEXT" },
  { table: "trader_profiles", column: "primary_goal", definition: "TEXT" },
  {
    table: "trader_profiles",
    column: "deal_breakers",
    definition: "TEXT NOT NULL DEFAULT '[]'",
  },
];

function migrate(db: Database.Database): void {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (columns.some((c) => c.name === column)) continue;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  widenSourceTypeCheck(db);
}

/**
 * SQLite cannot alter a CHECK constraint in place, so widening the source_type
 * vocabulary means rebuilding the table. Databases created before
 * `aggregator_unverified` existed would otherwise reject those rows at write
 * time — after the importer had already reported a clean plan.
 */
function widenSourceTypeCheck(db: Database.Database): void {
  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sources'`)
    .get() as { sql: string } | undefined;
  if (!row || row.sql.includes("aggregator_unverified")) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN;
    CREATE TABLE sources_rebuilt (
      id           TEXT PRIMARY KEY,
      firm_id      TEXT REFERENCES firms(id) ON DELETE CASCADE,
      challenge_id TEXT REFERENCES challenges(id) ON DELETE CASCADE,
      source_type  TEXT NOT NULL
                   CHECK (source_type IN ('official_rules','official_pricing','official_faq','trader_report','manual_verification','aggregator_unverified')),
      url          TEXT,
      title        TEXT,
      retrieved_at TEXT NOT NULL DEFAULT (datetime('now')),
      confidence   TEXT NOT NULL DEFAULT 'needs_review'
                   CHECK (confidence IN ('verified','trader_reported','needs_review','unknown'))
    );
    INSERT INTO sources_rebuilt SELECT id, firm_id, challenge_id, source_type, url, title, retrieved_at, confidence FROM sources;
    DROP TABLE sources;
    ALTER TABLE sources_rebuilt RENAME TO sources;
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

function create(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
  migrate(db);
  return db;
}

export function getDb(): Database.Database {
  if (!global.__ppf_db) global.__ppf_db = create();
  return global.__ppf_db;
}

/** Short, URL-safe, collision-resistant enough for this scale. */
export function newId(prefix = ""): string {
  const raw = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return prefix ? `${prefix}_${raw}` : raw;
}

export function nowIso(): string {
  return new Date().toISOString();
}
