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

function create(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
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
