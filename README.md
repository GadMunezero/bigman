# PropFirm

A personalised **futures prop firm challenge finder**. Not a directory, not a coupon site, not a
top-ten list — a recommendation engine that asks how you trade, removes the challenges that
cannot work for you, scores the rest, and explains every number.

> Tell us how you trade. We'll help you find the challenge that fits.

---

## The core idea

```
ASK → UNDERSTAND → FILTER → MATCH → EXPLAIN → COMPARE → REFER
```

Six to eight questions produce a trading profile. The engine then runs two stages that are
never blended:

1. **Hard filtering.** A challenge that conflicts with a stated requirement is removed
   entirely. If you need overnight positions and a challenge prohibits them, it is not a 72%
   match — it is the wrong challenge, and the results page says so with the reason.
2. **Soft scoring.** Everything that survives is ranked on nine weighted criteria. The weights
   are not fixed: they are reshaped by how you said you want to approach the challenge (pass
   fast / normal pace / protect the account), adjusted again by your risk style, boosted toward
   your stated priorities, and then renormalised to 100 so scores stay comparable between
   traders.

**Deal-breakers are stricter than derived requirements.** A requirement inferred from how you
trade only eliminates on a confirmed prohibition. Something you name as a deal-breaker
eliminates on a restriction too — and "high fees" is measured against the median price of the
challenges matching your market, not an arbitrary number.

**A bigger drawdown is not automatically better.** The engine scores *usable* drawdown: room
relative to the profit target, discounted by the drawdown mechanic (trailing follows your
equity up) and by how hard a daily cap rations it. A 20% intraday-trailing drawdown with a 2%
daily cap against a 20% target can score below an 8% static drawdown with no daily rule
against a 5% target — and it should.

Every recommendation carries reasons, at least one caveat where a real trade-off exists, and
a per-criterion score breakdown. All of it is generated from stored fields and your answers —
nothing is hand-written per challenge or paraphrased by a language model.

---

## Quick start

```bash
git clone https://github.com/GadMunezero/bigman.git
cd bigman
git checkout claude/prop-firm-challenge-finder-frpvmc
npm install
ADMIN_PASSWORD=demo npm run demo
```

Open http://localhost:3000. `npm run demo` recreates the database, loads the
fictional demo catalogue, and starts the dev server in one step.

Requires Node 20 or newer.

**New here, or picking this up later?** Read **[docs/HANDOVER.md](docs/HANDOVER.md)** — what is
built and verified, how to add data and features, and how to host it.

### Clicking around the full catalogue

```bash
ADMIN_PASSWORD=demo npm run catalogue
```

Builds the whole catalogue and starts the dev server: **24 futures firms, 184 challenges** across
nine account sizes (20K to 300K), with official websites applied.

The catalogue is **futures-only**. CFD and forex firms were removed deliberately: the only data
for them was an aggregator export in which 18 of 28 rows carried byte-identical figures. The
questionnaire reads its market options from what is actually published, so it currently offers
Futures alone rather than walking a forex trader through nine questions to a guaranteed
no-match — add CFD data later and the option reappears with no code change. Admin is at
`/admin`.

To put it on a real server, see **[docs/DEPLOY.md](docs/DEPLOY.md)** — there is a Dockerfile
that seeds the catalogue on first boot and a persistent volume for the database.

Two things to expect, both correct behaviour rather than bugs:

- **Scores spread widely**, and low ones are common. The top of the range is challenges whose
  figures are known; the bottom is the 138 rows that have a confirmed product and size but no
  price, and the 103 with no drawdown. They rank last on purpose.
- **Outbound buttons work for 10 of the 24 firms** and say "official link not on file" for the
  rest, because only those ten have a website recorded. Add more in `/admin/firms`.

`npm run db:publish:all` publishes unverified data on purpose and refuses to run with
`NODE_ENV=production`. It is a local convenience, not a deployment step.

### Running it piece by piece

```bash
npm run db:reset          # create an empty database from db/schema.sql
npm run db:seed:demo      # optional: three FICTIONAL firms to exercise the engine
npm run dev
```

The admin area needs a password, and is **disabled** without one:

```bash
ADMIN_PASSWORD=your-password npm run dev
```

Without `ADMIN_PASSWORD` the admin area is **disabled**, not open — a deployment that forgets
to configure it gets a locked door.

### Environment variables

| Variable               | Required | Purpose                                                          |
| ---------------------- | -------- | ---------------------------------------------------------------- |
| `ADMIN_PASSWORD`       | for admin | Enables and gates `/admin`. Unset = admin disabled.              |
| `ADMIN_SECRET`         | no       | Signs admin session cookies. Lets you invalidate sessions without changing the password. |
| `DATABASE_PATH`        | no       | SQLite file location. Defaults to `data/app.db`.                 |
| `NEXT_PUBLIC_SITE_URL` | for prod | Canonical origin, used by the sitemap and metadata.              |
| `ANTHROPIC_API_KEY`    | no       | Generates fresh psychology drill scenarios and feedback. Without it, the drills fall back to a built-in scenario bank and a transparent rubric. |
| `ANTHROPIC_MODEL`      | no       | Overrides the model used for drills.                             |

---

## Commands

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Development server                                        |
| `npm run build`        | Production build (includes a full typecheck)              |
| `npm start`            | Production server                                         |
| `npm test`             | Engine test suite                                         |
| `npm run typecheck`    | Types only                                                |
| `npm run db:reset`     | Drop and recreate the local database                      |
| `npm run db:seed:demo` | Load the fictional demo catalogue                         |
| `npm run db:template`  | Print the bulk-import CSV column template                 |
| `npm run db:import`    | Import a CSV (dry run by default; `-- file.csv --apply`)  |
| `npm run db:convert`   | Convert a PropFirmMatch-style export into the import template |

---

## About the data

**The repository contains real firm names and real supplied figures, and none of it is
verified.** `data/futures-specs.json` holds 24 futures firms transcribed from supplied research;
every row imports as `needs_review` and `draft`, and nothing reaches a trader until a person
publishes it in `/admin`.

What the repository still refuses to contain is an **invented** figure. Where a price or a
drawdown was not supplied it is blank, and blank renders as "Not confirmed" rather than being
filled with a plausible guess. The separate demo seed (`npm run db:seed:demo`) uses firms named
"(fictional)" for exactly this reason.

Real data goes in through `/admin` or the bulk importer, taken from each firm's own
documentation. See **[docs/DATA-SOURCING.md](docs/DATA-SOURCING.md)** for where each field
lives on a firm's site and the order of work that gets a useful catalogue fastest.

```bash
npm run db:template > data/challenges.csv   # one row per challenge
npm run db:import -- data/challenges.csv    # dry run: reports every problem, writes nothing
npm run db:import -- data/challenges.csv --apply
```

The same thing is available in the browser at `/admin/import`, which shows the plan before you
commit. Three behaviours are enforced by the importer itself:

- A blank cell means **not confirmed** — never zero, and it never erases a stored value.
- Re-importing an existing challenge **does not overwrite it**. Each differing field becomes a
  pending change to approve, which is what keeps the dated history on challenge pages true.
- Nothing imports as `verified` without a source URL. The default is `needs_review`, because a
  spreadsheet cell is not verification.

A **PropFirmMatch-style export** can be converted into that template:

```bash
npm run db:convert -- export.csv data/propfirmmatch-import.csv
npm run db:import -- data/propfirmmatch-import.csv          # dry run
```

The converter turns dollar-denominated futures figures ($3,000 on a $50K
account) into the percentages the schema stores, and stamps every row
`aggregator_unverified` / `needs_review` / `draft`. **An aggregator row can
never be marked `verified`** — the importer rejects it, because a comparison
site is not the document a firm enforces against. Publishing means opening the
firm's own rules page and replacing the figure with a cited one.

### Who runs a firm

Firm pages carry a **"Who runs this firm"** section — chief executive, other
named people, headquarters, founding year, and the source it was recorded from.
When nothing is recorded the page says so explicitly rather than hiding the
section. An anonymous firm is a fact a trader can act on, so it is shown as one;
the copy is careful to note that it may equally mean nobody has researched it
yet. Nothing here is inferred — leadership is typed in by an admin or left empty.

The schema is built for that:

- Every important field carries a **confidence level** — `verified`, `trader_reported`,
  `needs_review` or `unknown`. Unknown fields render as "Not confirmed" rather than being
  filled with a plausible guess, and data confidence is one of the eight scoring criteria.
- Every rule uses the vocabulary `allowed` / `restricted` / `prohibited` / `unknown`.
  **`unknown` never reads as `allowed`.** It does not eliminate a challenge — an unconfirmed
  rule is not evidence of a conflict — but it scores below `restricted` and produces an
  explicit warning when the trader told us that rule matters to them.
- Changes are proposed, reviewed by a person, and only then applied. Every approved change
  is kept as dated history and shown on the challenge page.

---

## Where an outbound click goes

Every "go to the firm" button routes through `/api/go/[challengeId]`, which resolves the
destination *after* the recommendation has been produced and shown:

1. If the challenge has an active affiliate offer, it goes to the affiliate URL. The link is
   marked `rel="sponsored"` and says a commission may be earned.
2. Otherwise it goes to the firm's **own website**, with no `sponsored` marker and copy that
   says plainly: *"This goes straight to their own website. We are not affiliated with them and
   earn nothing if you sign up."*
3. If neither exists, **no button is rendered.** The page says the official link is not on file
   and tells the trader to confirm the domain themselves.

That third case is deliberate. The redirect only ever uses a URL an admin stored against the
firm — it never constructs one from the firm's name. Lookalike domains are common in this
industry, and guessing one would hand a trader to a scam site wearing our recommendation as
endorsement.

The disclosure describes *the link you are looking at*, not the business model in general.
Claiming a commission that is not earned would invite readers to discount the rankings for a
conflict of interest that is not there. `/affiliate-disclosure` reads the offers table and
states the live status; the site-wide footer line is phrased to be true either way, so it never
needs a per-render database read and can never go stale.

---

## Commercial independence

The recommendation engine cannot see commercial data. This is structural, not a promise:

- `affiliate_offers`, `affiliate_clicks` and their repository functions are separate from
  everything `src/lib/engine/` reads.
- The engine's input type (`ChallengeRecord`) has no affiliate fields at all.
- Affiliate URLs are resolved in exactly one place, `/api/go/[challengeId]`, which runs after
  the recommendation has already been produced and shown.
- Clicks are recorded with the match score and position they were shown at, so the funnel can
  be measured. That data flows into analytics only, never back into ranking.

There is a test asserting that scores are unchanged by the presence of commercial fields on a
record.

---

## Layout

```
db/
  schema.sql            Challenge-centric schema: firms, challenges, rules, confidence,
                        sources, rule history, reviews, affiliate tables, analytics
  seed-demo.ts          Fictional demo catalogue
src/
  lib/
    engine/
      requirements.ts   Derives hard requirements and applies the hard filters
      scoring.ts        The eight criterion scorers and aggregation
      weights.ts        Default weights, priority boosting, renormalisation
      explain.ts        Reasons, caveats and audience fit, derived from stored fields
      index.ts          getChallengeRecommendations — the two-stage entry point
    repo.ts             All database access
    types.ts            Domain vocabulary
  app/
    find-my-challenge/  The questionnaire and results — the product
    psychology/         The trading psychology workspace
    challenges/ compare/ firms/ reviews/ tools/ learn/
    admin/              Challenges, firms, moderation, rule changes, deals, articles,
                        analytics, and the recommendation tester
    outcomes.ts         The feedback loop: journeys, aggregation, calibration
tests/
  engine.test.ts        Filtering, scoring, weighting, explanations, tie-breaking
  outcomes.test.ts      Journey recording, session scoping, small-sample honesty
```

---

## The feedback loop

The long-term advantage is not catalogue size — it is knowing which challenge suited which
kind of trader, and eventually whether it worked out.

A **journey** is created the moment a trader clicks through to a challenge. It freezes the
profile they had at that instant, along with the score and position they were shown. Later
they can report what happened at `/outcomes`: how far they got, what ended it if it failed,
how well it suited them in hindsight, and whether they would choose it again.

The profile is a frozen snapshot rather than a foreign key, deliberately. Profiles change when
someone retakes the questionnaire, and the question this answers is *"did this challenge work
for the person who chose it"*.

`/admin/outcomes` turns that into calibration signal — pass rates by approach, the most common
failure reason per cohort, and whether the match score actually predicted satisfaction. Two
rules govern it:

- **Outcomes never adjust the scoring automatically.** They surface for a human to review. An
  engine that silently rewrites itself from self-reported data is one nobody can audit, which
  is the opposite of what the methodology page promises.
- **Small samples are labelled, not dressed up.** Below eight resolved reports an aggregate is
  shown but explicitly marked "too small to act on". Self-reported outcomes are also heavily
  self-selected — traders who fail are less likely to come back and say so — so they are
  treated as a signal about our matching, never published as a statistic about a firm.

---

## The psychology workspace

`/psychology` is the behavioural half of passing a challenge, built into the product rather
than sold separately. Most evaluations are lost to a moved stop, a revenge trade, or size
that grew after a good week — not to picking the wrong firm.

Twelve tabs: mental models, winner vs loser, a pre-trade risk gate that has to be satisfied
before the gate opens, a behaviour log that grades the trader rather than the trade, a
mistake-pattern tracker that names your loudest leak, a pre-market checklist, a training
protocol, a post-trade grader, an inversion tool, twelve psychological principles, an income
calculator that pushes back on dangerous targets, and pressure drills.

Two things worth knowing:

- **Your logs never leave your browser.** Behaviour logs, habit leaks and checklist state live
  in `localStorage`. There is no reason for a trader's private notes about their own
  psychology to reach a server, so they don't.
- **Drills run server-side.** Scenario generation and feedback go through
  `/api/psychology/drill` so no API key is ever exposed to the browser. Without a key the
  endpoint still works, serving from a local scenario bank and evaluating with a rubric that
  tells you it is a rubric.

Drill scenarios adapt to the market and style in your trading profile, which is the seam
between the two halves of the product.

---

## Legal posture

The site never promises that you will pass a challenge, receive a payout, or make money.
A match score is a fit measurement against preferences you supplied — not a quality rating of
a firm, not a safety rating, and not a prediction. Reviews start as `pending` and are only
labelled "verified" when a moderator has actually checked evidence. There is no fabricated
social proof anywhere: no invented user counts, payout totals, ratings or trust badges.

---

## Status

Working end to end: the questionnaire, the engine, results with breakdowns and the no-match
diagnostic, the directory, challenge and firm pages, comparison with a personalised verdict,
reviews with moderation, the tools, the psychology workspace, the SEO landing pages, the
trust pages, the full admin area including the recommendation tester, analytics, sitemap and
robots.

Not built: user accounts with email sign-in (the product deliberately works anonymously, and
the profile/saved pages are session-based), automated source fetching and change detection
(the schema and admin review flow for it exist, but nothing is scraping yet), and the alerts
system (the tables anticipate it; there is no delivery mechanism).
