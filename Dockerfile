# Real server deployment. Next.js in standalone mode with SQLite on a volume.
#
# SQLite is a deliberate constraint here: the app writes (admin edits, rule
# approvals, reviews, outcome journeys), so it needs a host with a persistent
# disk — Railway, Render, Fly.io, a VPS. It will NOT survive on a serverless
# platform whose filesystem resets between invocations. See docs/DEPLOY.md.

# ---- deps: native modules need a toolchain, which the runtime image drops ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* is inlined at build time, not read at runtime, so the public
# URL has to arrive here rather than in `docker run -e`. It is not cosmetic:
# /sitemap.xml and /robots.txt are statically prerendered, and built without
# this they hand search engines a sitemap of http://localhost:3000 URLs. The
# same value also sets `metadataBase`, which is what canonical and Open Graph
# URLs are resolved against on every prerendered page.
#
#   docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain.com .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 DATABASE_PATH=/data/app.db

# tsx runs the schema and seed scripts at boot; better-sqlite3 is the native
# binding both they and the server need.
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=deps /app/node_modules/tsx ./node_modules/tsx
COPY --from=deps /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=deps /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# There is deliberately no `public/` to copy. robots.txt and sitemap.xml are
# route handlers, not static files. Adding `COPY /app/public ./public` back
# fails the build outright while the directory does not exist — create it first
# if you ever add a static asset.

# Needed at runtime, not build time: the schema is applied to the volume on
# first boot and the CSVs are what the seed reads.
COPY --from=build /app/db ./db
COPY --from=build /app/data ./data
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && mkdir -p /data

VOLUME ["/data"]
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
