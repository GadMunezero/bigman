# Handover

What is built, what is verified, what to do next, and how to put it online.

---

## What this is

A futures prop firm **challenge finder** — a recommendation engine, not a
directory. Twelve questions produce a trading profile; the engine removes the
challenges that cannot work for you, ranks what is left on nine weighted
criteria, and shows the working.

**24 firms · 184 challenges · nine account sizes (20K–300K).**

---

## Verified working

Everything below was checked by running it, not by reading the code.

| Area | State |
| ---- | ----- |
| Test suite | **73 passing** |
| Production build | Compiles clean, full typecheck passes |
| Routes | **26 pages** all return 200 |
| Questionnaire | All 12 questions → results. Verified end to end in a browser |
| Engine | Ranks all 184; "57 of 184 compatible" on a real run |
| Clean rebuild | `db:reset` → import → publish reproduces the catalogue exactly |
| Pending changes | 0 — no import collisions |
| Console errors | None on any page walked |

The pages: home, find-my-challenge (+ results), challenges, challenge detail,
firms, firm detail, compare, reviews, psychology (12 tabs), tools (2
calculators), learn, outcomes, search, saved, profile, how-it-works,
methodology, affiliate-disclosure, about, contact, and the legal set, plus
`/admin` with challenges, import, firms, reviews, rule changes, deals,
articles, the recommendation tester, outcomes and analytics.

### Known gaps, stated plainly

- **138 of 184 challenges have no price.** The source said "varies by
  configuration" for most products. They rank last on purpose.
- **103 have no drawdown figure.** Same reason.
- **14 of 24 firms have no website**, so their outbound buttons say "official
  link not on file" rather than guessing a domain.
- **Nothing is verified.** Every row is `needs_review`. The catalogue is a
  research starting point, not a published product.

---

## Adding data — the normal job

### One firm, a few challenges

Use `/admin/challenges` in the browser. Fastest for small edits.

### A whole product line

Edit `data/futures-specs.json`, then:

```bash
npm run db:futures -- data/futures-specs.json data/futures-catalogue.csv
npm run db:import -- data/futures-catalogue.csv        # dry run, writes nothing
npm run db:import -- data/futures-catalogue.csv --apply
```

The specs file records figures **as the firm states them** — usually dollars
against a named account size. The builder converts to the percentages the
schema stores. Add a product like this:

```json
{
  "firm": "Example Futures",
  "product": "Evaluation",
  "program": "evaluation",
  "drawdown_type": "eod_trailing",
  "consistency": "required",
  "consistency_pct": 40,
  "min_days": 3,
  "split": 90,
  "billing": "one_time",
  "notes": "Anything a trader should know that has no field of its own.",
  "sizes": {
    "50000":  { "target": 3000, "dd": 2000, "daily": 1250, "price": 145 },
    "100000": { "target": 6000, "dd": 3500, "daily": 2500, "price": 255 }
  }
}
```

Four flags carry real meaning:

- `"uncertain": true` — sizes only, no figures. For a product you cannot pin
  down. It still appears; it just never claims numbers.
- `"dailyUnknown": true` — a daily loss limit exists but the figure is not
  published. Without this, a blank reads as **"no daily rule"**, which is a
  claim rather than an absence.
- `"billing": "monthly"` — the fee recurs. The trader gets a caveat saying so.
- `program` — `instant_funding` and `direct_funding` get `phases 0` and no
  profit target, because there is no evaluation to pass.

**Never derive a figure across sizes.** Tradeify Growth is 4% drawdown at 50K
and 3.5% at 100K; Blue Guardian Standard is 6% at 25K and 3.33% at 150K. A
ladder assumed from one size is wrong for the rest, in the criterion the engine
weights most heavily.

### Firm websites

Add the domain in `/admin/firms`, or append to `data/firm-websites.csv` and run
`npm run db:firm-websites -- --apply` (dry run by default; it never overwrites
a value someone typed). **Confirm the domain first** — Alpha Futures is
`alpha-futures.com`, hyphenated, and the obvious guess is wrong.

### Publishing

Everything imports as **draft**. Publish in `/admin/challenges` once you have
checked the figures against the firm's own page. `npm run db:publish:all`
publishes everything at once and refuses to run with `NODE_ENV=production` —
it is a local convenience, not a deployment step.

### Re-importing later

The importer **never overwrites**. A changed field becomes a pending change at
`/admin/rules` for you to approve, and approving writes a dated history entry
that shows on the challenge page. A blank cell means "no new information", not
"delete this".

One trap worth knowing: if two sources describe the same challenge, whichever
imports **first** owns the row and the second sits in the pending queue. That
is why `db/seed-if-empty.ts` loads the specs file before the aggregator file.

---

## Adding CFDs or another market later

The pipeline is market-agnostic. Create `data/cfd-specs.json` in the same shape
with `"market": "cfd"` at the top level, then:

```bash
npm run db:futures -- data/cfd-specs.json data/cfd-catalogue.csv
npm run db:import -- data/cfd-catalogue.csv --apply
```

The questionnaire reads its market options from what is actually published, so
**the CFD option reappears on its own** — no code change. Two differences to
plan for: CFD firms publish percentages rather than dollars (use `target_pct`,
`dd_pct`, `daily_pct` at product level), and two-step evaluations are common,
which futures rarely has.

---

## Adding features

| Change | Where |
| ------ | ----- |
| A new scoring criterion | `SCORE_CRITERIA` in `src/lib/types.ts`, a scorer in `src/lib/engine/scoring.ts`, a weight in `weights.ts` — weights renormalise to 100 automatically |
| A new questionnaire question | `buildQuestions()` in `src/app/find-my-challenge/Quiz.tsx`, plus the field on `TraderProfile` |
| A new hard filter | `deriveRequirements()` and `hardFilter()` in `src/lib/engine/requirements.ts` |
| A new challenge field | `db/schema.sql`, `ADDED_COLUMNS` in `src/lib/db.ts` (idempotent migration), `CHALLENGE_COLUMNS` in `src/lib/import.ts`, then the pages that show it |
| New copy or pages | `src/app/` — ordinary Next.js App Router |

Two rules the codebase enforces and that are worth keeping:

1. **The engine cannot see commercial data.** Affiliate tables are separate and
   `ChallengeRecord` has no affiliate fields. There is a test asserting scores
   are unchanged by their presence.
2. **Unknown never scores better than disclosed.** An unrecorded drawdown
   mechanic is scored as the harshest known one, so a firm that publishes
   nothing never outranks one that publishes a hard rule.

Run `npm test` before committing. The suite is fast and covers the filtering,
scoring, weighting and honesty guarantees.

---

## Hosting it online

The app writes — admin edits, rule approvals, reviews, outcome journeys — so it
needs a host with a **persistent disk**. That rules out serverless platforms
whose filesystem resets between requests, and rules in Railway, Render, Fly.io,
or any VPS.

### Docker (works anywhere)

```bash
docker build -t propfirm .
docker run -d --name propfirm \
  -p 3000:3000 \
  -v propfirm-data:/data \
  -e ADMIN_PASSWORD='pick-a-real-password' \
  -e NEXT_PUBLIC_SITE_URL='https://your-domain.com' \
  propfirm
```

First boot creates the schema and loads the catalogue, then starts the server.
Every boot after that finds an existing database and leaves it alone, so a
restart never overwrites work done in `/admin`.

Everything seeds as draft. Add `-e SEED_PUBLISH=1` **only** for a demo.

### Railway or Render, from the repo

Both detect the Dockerfile. You need to:

1. Point them at this repo and branch.
2. Attach a **persistent volume mounted at `/data`**. Without it the database
   resets on every deploy.
3. Set `ADMIN_PASSWORD` and `NEXT_PUBLIC_SITE_URL`.
4. Point the health check at `/`, which renders without a session or a write.

### Backups

The volume is the entire database:

```bash
docker run --rm -v propfirm-data:/data -v "$PWD":/backup alpine \
  cp /data/app.db /backup/app-$(date +%F).db
```

### Before real traders see it

1. **Do not set `SEED_PUBLISH=1`.** Publish challenges in `/admin/challenges`
   as you verify them.
2. Fill in the missing prices and drawdowns, or leave those rows unpublished.
3. Add firm websites so outbound links work.
4. Set a real `ADMIN_PASSWORD`. Without one, `/admin` is **locked**, not open —
   but then nothing can be verified or published either.

Full detail in **[docs/DEPLOY.md](DEPLOY.md)**.

---

## Where things live

```
data/futures-specs.json     The source of truth for futures products
data/firm-websites.csv      Official domains, applied by a script
db/build-futures-catalogue.ts   specs -> import CSV (dollar -> percent)
db/seed-if-empty.ts         First-boot seeding, safe on every restart
src/lib/engine/             Filtering, scoring, weighting, explanations
src/lib/import.ts           Bulk import, validation, pending changes
src/app/                    Pages
docs/DATA-SOURCING.md       How to research and record a firm honestly
docs/DEPLOY.md              Hosting detail
```
