#!/bin/sh
# Applies the schema and seeds the catalogue before the server starts.
# Both steps are no-ops when the volume already holds a populated database, so
# restarts never clobber work done in /admin.
set -e

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "[boot] ADMIN_PASSWORD is not set — /admin will be locked, not open."
fi

echo "[boot] database: ${DATABASE_PATH:-/data/app.db}"
./node_modules/.bin/tsx db/migrate-or-create.ts
./node_modules/.bin/tsx db/seed-if-empty.ts

exec "$@"
