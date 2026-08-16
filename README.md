# Challenge Fit

A personalised **prop firm challenge finder**. Not a directory, not a coupon site, not a
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
2. **Soft scoring.** Everything that survives is ranked on eight weighted criteria, with the
   weights boosted toward whatever you said matters most and then renormalised to 100 so
   scores stay comparable between traders.

Every recommendation carries reasons, at least one caveat where a real trade-off exists, and
a per-criterion score breakdown. All of it is generated from stored fields and your answers —
nothing is hand-written per challenge or paraphrased by a language model.

---

## Quick start

```bash
npm install
npm run db:reset          # create an empty database from db/schema.sql
npm run db:seed:demo      # optional: three FICTIONAL firms to exercise the engine
npm run dev
```

Then open http://localhost:3000.

To use the admin area, set a password first:

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

---

## About the data

**Nothing in this repository contains real prop firm data.** The demo seed uses invented
firms, named "(fictional)", because attaching made-up prices and rules to a real company is
exactly the fabrication this product exists to avoid.

Real data goes in through `/admin`, taken from each firm's own documentation. The schema is
built for that:

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
tests/
  engine.test.ts        Filtering, scoring, weighting, explanations, tie-breaking
```

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
