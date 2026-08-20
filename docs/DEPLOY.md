# Putting this on a real server

The app is server-rendered Next.js with SQLite. It writes — admin edits, rule
approvals, reviews, outcome journeys — so it needs a host with a **persistent
disk**, not a serverless platform whose filesystem resets between requests.

That rules out plain Vercel/Netlify functions, and rules out free tiers with no
volume — Render's free web services keep nothing between deploys. It rules in
any VPS running Docker, a paid Railway or Render instance with a disk attached,
or one of the free-forever VMs in the guide linked below.

---

> **Hosting it for free on your own domain?** Follow
> **[docs/HOSTING-FREE.md](HOSTING-FREE.md)** instead — Oracle Cloud or Google
> Cloud, a domain you already own, automatic HTTPS, $0/month. This document is the
> platform-agnostic reference.

## The fastest path: Docker

`NEXT_PUBLIC_SITE_URL` is a **build argument**, not a runtime variable — Next.js
inlines `NEXT_PUBLIC_*` at build time and `/sitemap.xml` and `/robots.txt` are
prerendered, so built without it they publish `http://localhost:3000` URLs to
search engines. Changing your domain means rebuilding, not restarting.

```bash
docker build -t propfirm --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain.com .
docker run -d --name propfirm \
  -p 3000:3000 \
  -v propfirm-data:/data \
  -e ADMIN_PASSWORD='choose-a-real-password' \
  -e NEXT_PUBLIC_SITE_URL='https://your-domain.com' \
  propfirm
```

On first boot the entrypoint creates the schema and loads the catalogue — 38
firms and 324 challenges — then starts the server. On every boot after that it
finds an existing database and leaves it alone, so a restart never overwrites
work done in `/admin`.

Everything seeds as **draft**. Add `-e SEED_PUBLISH=1` to publish it on first
boot, which is what a demo wants and what a production deployment must not do
until a human has verified the figures.

The volume is the whole database. Back it up:

```bash
docker run --rm -v propfirm-data:/data -v "$PWD":/backup alpine \
  cp /data/app.db /backup/app-$(date +%F).db
```

---

## Environment

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `ADMIN_PASSWORD` | **yes, in practice** | Enables and gates `/admin`. Unset means admin is **locked**, not open — but then nothing can be verified or published. |
| `DATABASE_PATH` | no | Defaults to `/data/app.db` in the image. |
| `NEXT_PUBLIC_SITE_URL` | for production | Canonical origin for the sitemap, robots and metadata. |
| `ADMIN_SECRET` | no | Signs admin cookies, so sessions can be invalidated without changing the password. |
| `ANTHROPIC_API_KEY` | no | Generates fresh psychology drill scenarios. Without it the drills fall back to a local scenario bank and a transparent rubric. |
| `SEED_PUBLISH` | no | `1` publishes the seeded catalogue on first boot. Demo only. |

---

## Without Docker

Any Node 22 host works:

```bash
npm ci
npm run build
DATABASE_PATH=/var/lib/propfirm/app.db npx tsx db/migrate-or-create.ts
DATABASE_PATH=/var/lib/propfirm/app.db npx tsx db/seed-if-empty.ts
DATABASE_PATH=/var/lib/propfirm/app.db ADMIN_PASSWORD=… npm start
```

`better-sqlite3` is a native module, so the host needs a build toolchain
(`python3`, `make`, `g++`) during `npm ci`. The Dockerfile installs these in a
build stage and ships only the compiled binding.

---

## Before you point traders at it

The catalogue is not verified. Two of the columns that matter most are
substantially empty, and the site says so on every affected page — but a
public deployment is a different promise from a local demo.

1. **Do not set `SEED_PUBLISH=1`.** Publish challenges in `/admin/challenges`
   as you verify them, so the public catalogue only ever contains figures a
   person has checked against the firm's own page.
2. **79 of the 324 challenges have no price, and 176 have no drawdown.**
   They come from a product matrix that listed which plans exist at which
   account sizes, not what they cost. They rank last by design, and there is a
   test enforcing that, but they are not ready to show as recommendations.
3. **All 23 firm websites came from search results, not from opening the
   pages.** Load each one once before a trader clicks it. Several firms run a
   near-identical sister domain for a different product — Goat Funded Futures
   is not Goat Funded Trader — and a lookalike domain in an outbound link is
   the most damaging error this catalogue can make.
4. **The two aggregator rows are templated.** Topstep and Hola Prime Futures
   came from an export whose figures repeat across firms — see
   `docs/DATA-SOURCING.md`. Treat both as a hypothesis.

`/admin/challenges` is the queue for all of this.

---

## Health check

```
GET /            200
GET /challenges  200
GET /admin       200 (login form, or the locked notice when ADMIN_PASSWORD is unset)
```

Point your platform's health check at `/` — it renders without touching a
session or a write.
