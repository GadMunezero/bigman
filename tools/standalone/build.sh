#!/usr/bin/env bash
# Builds a single self-contained HTML file: the questionnaire, directory, firm
# pages, comparison and challenge detail, with the REAL engine bundled and the
# published catalogue embedded. No server, no database — it opens from a file.
#
# What it cannot contain: /admin, the outcome feedback loop, and anything else
# that needs a server or writes data. Those still need `npm run catalogue`.
#
#   bash tools/standalone/build.sh  ->  dist/propfirm-standalone.html
set -euo pipefail
cd "$(dirname "$0")/../.."
D=tools/standalone
mkdir -p dist

# `server-only` throws outside a server component, so it is stubbed for this
# one build. The engine itself is pure and needs no stubbing.
npx esbuild "$D/export-data.ts" --bundle --platform=node --format=cjs \
  --alias:server-only="./$D/server-only-stub.js" --external:better-sqlite3 \
  --outfile=.standalone-export.cjs --tsconfig=tsconfig.json --log-level=error
node .standalone-export.cjs > dist/catalogue.json
rm -f .standalone-export.cjs

npx esbuild "$D/browser-entry.ts" --bundle --platform=browser --format=iife \
  --minify --outfile=dist/engine.js --tsconfig=tsconfig.json --log-level=error

python3 - <<'PY'
import json
data = json.load(open("dist/catalogue.json"))
for r in data:
    for k in [k for k in r if k.startswith("f_")]: del r[k]
    for k in ("created_at", "updated_at", "billing_type", "firm_id"): r.pop(k, None)
    for k in ("created_at", "updated_at", "logo_url", "description", "id"): r["firm"].pop(k, None)
    for k in ("challenge_id", "updated_at", "notes"): r["rules"].pop(k, None)
cat = json.dumps(data, separators=(",", ":")).replace("</", "<\\/")
html = (open("tools/standalone/template.html").read()
        .replace("__CATALOGUE__", cat)
        .replace("__ENGINE__", open("dist/engine.js").read()))
open("dist/propfirm-standalone.html", "w").write(html)
print(f"dist/propfirm-standalone.html — {len(html.encode()):,} bytes, {len(data)} challenges")
PY
rm -f dist/catalogue.json dist/engine.js
