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

# The psychology workspace and the calculators are real "use client" React
# components. They never needed a server, so they are bundled and mounted as
# islands rather than rewritten in vanilla JS.
npx esbuild "$D/islands-entry.tsx" --bundle --platform=browser --format=iife \
  --minify-whitespace --minify-syntax --outfile=dist/islands.js \
  --tsconfig=tsconfig.json --log-level=error \
  --define:process.env.NODE_ENV='"production"' --loader:.css=local-css \
  --alias:next/link="./$D/next-link-shim.tsx" \
  --alias:@/components/TrackEvent="./$D/track-event-shim.tsx"

python3 - <<'PY'
import json, os
data = json.load(open("dist/catalogue.json"))
for r in data:
    for k in [k for k in r if k.startswith("f_")]: del r[k]
    # billing_type is kept: a $125/month evaluation and a $69 one-off are not
    # comparable on price alone, so the comparison table has to show which is
    # which rather than putting both in a "Price" row and leaving it there.
    for k in ("created_at", "updated_at", "firm_id"): r.pop(k, None)
    for k in ("created_at", "updated_at", "logo_url", "description", "id"): r["firm"].pop(k, None)
    for k in ("challenge_id", "updated_at", "notes"): r["rules"].pop(k, None)
cat = json.dumps(data, separators=(",", ":")).replace("</", "<\\/")

# globals.css supplies the utility classes the React islands were built
# against (.panel, .btn, .field-label, .grid-3 ...). Inlining the real file
# keeps them identical instead of approximating them.
globals_css = open("src/app/globals.css").read()
islands_css = open("dist/islands.css").read() if os.path.exists("dist/islands.css") else ""

html = (open("tools/standalone/template.html").read()
        .replace("__GLOBALS__", globals_css + "\n" + islands_css)
        .replace("__CATALOGUE__", cat)
        .replace("__ENGINE__", open("dist/engine.js").read())
        .replace("__ISLANDS__", open("dist/islands.js").read()))
open("dist/propfirm-standalone.html", "w").write(html)
print(f"dist/propfirm-standalone.html — {len(html.encode()):,} bytes, {len(data)} challenges")
PY
rm -f dist/catalogue.json dist/engine.js dist/islands.js dist/islands.css
