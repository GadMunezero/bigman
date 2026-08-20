# Handover

What is built, what is verified, what to do next, and how to put it online.

---

## What this is

A prop firm **challenge finder** — a recommendation engine, not a
directory. Fourteen questions produce a trading profile; the engine works out
what kind of trader you are, removes the challenges that cannot work for you,
ranks what is left on ten weighted criteria, and shows the working.

**38 firms · 324 challenges · futures and CFDs.**

The questionnaire asks what you trade only when the catalogue covers more than
one market. It was futures-only for a while, and the question was filled in
rather than asked; adding CFDs brought it back with no code change, which is
what the data-driven option list was for.

### The one idea the engine is built on

> The importance of a rule depends on the trader's return distribution, not on
> the rule.

"Is a consistency rule bad?" has no answer. It caps what share of your total
profit one day may contribute. For a trader whose P&L reads +200, +250, +180,
+300 it never binds. For a trader whose month is four flat days and one +$3,000
day, it is the rule that lets them hit the profit target and then blocks the
withdrawal. Same rule, same account, opposite verdicts.

So before anything is scored, `src/lib/engine/archetypes.ts` classifies the
trader — scalper, wide-stop, high R:R, swing, news-dependent, algorithmic,
low-frequency, aggressive, conservative, consistent earner, payout-focused,
lowest-cost, low-friction. Usually several at once, each with a strength. That
reshapes the weights, contributes a `archetype_fit` score, and produces the
"what you need / what works against you" panel at the top of the results.

---

## Verified working

Everything below was checked by running it, not by reading the code.

| Area | State |
| ---- | ----- |
| Test suite | **96 passing** |
| Production build | Compiles clean, full typecheck passes |
| Routes | **28 checked**, all return 200 |
| Questionnaire | All 14 questions → results. Two different traders driven through it in a browser get different archetypes and different top matches |
| Engine | Ranks all 324. A swing/high-R:R/low-frequency trader tops out on Blue Guardian Standard; a scalper/even-earner/payout-focused trader on The Trading Pit Futures Prime — same catalogue, different questions |
| Clean rebuild | `npm run catalogue:build` reproduces the catalogue exactly |
| Container boot | `migrate-or-create` + `seed-if-empty` against an empty volume path gives 38 firms / 324 challenges, all draft; running them again leaves it alone |
| Standalone server | `node .next/standalone/server.js` boots and serves — the mode the Dockerfile runs |
| Pending changes | 0 — no import collisions |
| Firm websites | 23 of 23 futures firms on file; the 15 CFD firms have none yet |
| Console errors | None on any page walked, no failed requests |

**Not verified here: the Docker image itself.** This machine has the Docker CLI
but no daemon, so `docker build` cannot run. The boot sequence the image
executes was verified natively instead, which is the part most likely to be
wrong. Build it once before you rely on it.

The pages: home, find-my-challenge (+ results), challenges, challenge detail,
firms, firm detail, compare, reviews, psychology (12 tabs), tools (2
calculators), learn, outcomes, search, saved, profile, how-it-works,
methodology, affiliate-disclosure, about, contact, and the legal set, plus
`/admin` with challenges, import, firms, reviews, rule changes, deals,
articles, the recommendation tester, outcomes and analytics.

### Known gaps, stated plainly

- **79 of 324 challenges have no price**, and 125 have no profit split. Where
  a firm publishes a range or a promotional price rather than one figure, the
  range is recorded in the row's notes and the price column stays empty. They
  rank last on purpose, and the page says "Price not confirmed" rather than
  showing a sibling size's number.
- **The 105 CFD rows carry prices and nothing else.** The supplied CFD table
  had no targets, drawdowns, splits or rules, so every one of those fields is
  unconfirmed. CFD rows therefore rank below futures rows, which is correct
  behaviour rather than something to tune away — add the rules and they compete
  on merit.
- **Nothing is verified.** Every row is `needs_review`. The catalogue is a
  research starting point, not a published product.
- **Firm websites came from search results, not from opening the pages.** This
  environment has no outbound access to firm domains, so each domain is
  recorded with the reasoning in `data/firm-websites.csv` and none has been
  loaded. Several firms run a near-identical sister domain — Goat Funded
  Futures is not Goat Funded Trader, Blue Guardian Futures is not Blue
  Guardian, Top One Futures is not Top One Trader. Click each one once before
  a trader does.

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
`alpha-futures.com`, hyphenated, and the obvious guess is wrong; AquaFutures is
`.io`, not `.com`; Tradeify is `.co`.

Rows in that file for firms not in the catalogue are marked `NOT IN THE
CATALOGUE` and reported as unmatched on every run. They are kept deliberately —
the research is done for when those firms are added.

### One company, two names

A firm that sells futures under a sub-brand will appear in two sources under two
names. `AquaFunded Futures` and `AquaFutures` were one company (aquafutures.io,
the AquaFunded group's futures division) and produced two firms in the
catalogue until they were merged. The fix has two halves: `data/futures-specs.json`
uses the name the firm actually trades under, and `FIRM_ALIASES` in
`db/convert-propfirmmatch.ts` maps the other spelling onto it so the aggregator
row is dropped rather than imported alongside.

Only add an alias once you have confirmed the two names are one company.
Similar names are usually **different** products: Blue Guardian and Blue
Guardian Futures, Goat Funded Trader and Goat Funded Futures, Top One Trader and
Top One Futures are all separate firms with separate rules.

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

## Adding another market

The pipeline is market-agnostic, and CFDs went in this way — `data/cfd-specs.json`
carries `"market": "cfd"` at the top level and nothing else changed. The
questionnaire's market question reappeared on its own, because its options are
built from what is actually published.

Two fields exist for markets that are not futures: `phases_override`, because
CFD firms routinely sell two- and three-step evaluations where futures is almost
always one, and `currency`, because BrightFunded prices in euros.

For a third market, same shape:

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
| A new trader archetype | `ARCHETYPES` and `ARCHETYPE_DEFINITIONS` in `src/lib/engine/archetypes.ts`. Each one needs a `detect`, a set of weight multipliers, `mustHave`/`avoid` with a reason for each, and a `fit` that scores a challenge and says why |
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
whose filesystem resets between requests, and rules out free tiers without a
volume (Render's free web services spin down and keep nothing).

**To host it for free on your own domain, follow
[docs/HOSTING-FREE.md](HOSTING-FREE.md).** It covers Oracle Cloud's Always Free
ARM VM and Google Cloud's `e2-micro`, both genuinely free indefinitely, with
DNS on any registrar and automatic HTTPS. `deploy/docker-compose.yml` runs the whole
stack; the rest of this section is the manual equivalent.

### Docker (works anywhere)

One thing that is not optional: `NEXT_PUBLIC_SITE_URL` is a **build argument**,
not a runtime variable. Next.js inlines `NEXT_PUBLIC_*` during the build, and
`/sitemap.xml` and `/robots.txt` are prerendered — built without it, they hand
search engines a sitemap full of `http://localhost:3000` URLs. Change your
domain and you must rebuild, not just restart.

```bash
docker build -t propfirm --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain.com .
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
