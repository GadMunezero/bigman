/**
 * Creates the schema on a fresh volume, and applies additive migrations to an
 * existing one. Safe to run on every boot: getDb() applies db/schema.sql with
 * CREATE TABLE IF NOT EXISTS and then runs migrate().
 */
import { getDb } from "../src/lib/db";

const db = getDb();
const tables = db
  .prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'`)
  .get() as { n: number };
console.log(`[migrate] schema ready — ${tables.n} tables.`);
