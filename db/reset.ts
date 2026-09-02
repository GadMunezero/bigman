import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/** Drops the local database file and recreates the schema. Development only. */

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
const schemaPath = path.join(process.cwd(), "db", "schema.sql");

for (const suffix of ["", "-wal", "-shm"]) {
  const file = `${dbPath}${suffix}`;
  if (fs.existsSync(file)) fs.rmSync(file);
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(fs.readFileSync(schemaPath, "utf8"));
db.close();

console.log(`Recreated an empty database at ${dbPath}`);
console.log("Add real firms and challenges through /admin, or run `npm run db:seed:demo`.");
