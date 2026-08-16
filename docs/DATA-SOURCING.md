# Sourcing challenge data

The engine is only as useful as the catalogue. This is how to fill it without
turning the site into another directory of half-remembered numbers.

---

## The rule that decides everything else

**A blank cell is always better than a guess.**

The product's whole claim is that a match score is auditable — that every number
came from somewhere and you can check it. One invented drawdown figure breaks
that, and nobody can tell which one it was. So:

- If you cannot find a figure, leave the cell empty. It renders as "Not
  confirmed", it costs the challenge points on the data-confidence criterion,
  and the trader is told. That is the honest outcome.
- Never copy a competitor's database. Aggregators are wrong often enough that
  their errors would become your errors, with no source to trace them back to.
  Use them to discover *which firms exist*, then verify against the firm.

---

## Where each field actually lives

Firms scatter this across four or five pages. In rough order of reliability:

| Where | What you'll find there |
| ----- | ---------------------- |
| **Rules / trading rules page** | Drawdown type, daily loss, consistency rule, news and overnight policy, EA and copy-trading permissions, minimum days |
| **Pricing / plans page** | Price, account sizes, profit target, phase count, profit split |
| **FAQ** | Payout frequency and conditions, refund policy, platform list |
| **Terms and conditions** | Country restrictions, the fine print that contradicts the marketing page |
| **Dashboard screenshots / trader reports** | Only as `trader_reported`, never as `verified` |

When the marketing page and the rules page disagree, **the rules page wins** —
that is the document the firm will enforce against.

---

## The fields that actually change recommendations

If you are time-boxed, get these right first. They drive hard filters and the
heaviest-weighted criteria:

1. **`markets`** — wrong market means the challenge is eliminated for the wrong
   people, or shown to people who cannot trade it.
2. **`drawdown_type`** — static versus trailing is the single biggest driver of
   usable drawdown. `eod_trailing` and `intraday_trailing` behave very
   differently; do not collapse them into "trailing" if the firm distinguishes.
3. **`max_drawdown_pct` and `profit_target_pct`** — scored as a ratio, so one
   without the other is much less useful.
4. **`daily_drawdown_pct`** — leave blank *only* if the firm genuinely has no
   daily rule. Blank means "no daily loss rule" to the engine, so an unknown
   daily rule should be researched, not skipped.
5. **`consistency_rule`** — the most common reason a passing trader cannot
   withdraw, and a deal-breaker option.
6. **`news_trading` and `overnight`** — both are deal-breakers and hard filters.

### `restricted` versus `prohibited`

This distinction carries real weight, so do not flatten it:

- **`prohibited`** — you may not do this at all. Eliminates the challenge for
  anyone who needs it.
- **`restricted`** — allowed with conditions: a blackout window around news, a
  size cap, approval required. Scores at half credit, and still eliminates for
  someone who named it a deal-breaker.
- **`unknown`** — you could not find it. Never reads as allowed.

---

## Workflow

### 1. Get the template

```bash
npm run db:template > data/challenges.csv
```

Open it in a spreadsheet. One row per **challenge**, not per firm — a firm with
five account sizes is five rows.

### 2. Research one firm at a time

Fill the row from the firm's own pages. Put the URL you actually read in
`source_url` and set `source_type` to match (`official_rules`,
`official_pricing`, `official_faq`, `trader_report`, `manual_verification`).

Leave `confidence` as `needs_review` while you work. Only set `verified` once
you have read the figure on the firm's own page — and the importer will reject
a `verified` row that has no `source_url`.

### 3. Dry run

```bash
npm run db:import -- data/challenges.csv
```

This writes nothing. It reports every validation error with a row and column
number, every warning, and exactly what would be created or changed.

### 4. Apply

```bash
npm run db:import -- data/challenges.csv --apply
```

Or paste the same CSV into **`/admin/import`**, which shows the same plan in the
browser before you commit.

### 5. Review and publish

New firms and challenges land as **draft**. Nothing appears on the public site
until you publish it in `/admin/challenges`. That is deliberate — it gives you a
chance to look at the challenge page and see whether the generated "who is this
for" copy actually makes sense.

---

## Refreshing data later

Re-import the same CSV after a firm changes its rules. **The importer will not
overwrite anything.** Every differing field becomes a pending change at
`/admin/rules`, where you approve or reject it. Approving writes the new value
*and* a dated history entry that shows on the public challenge page.

This is why the "recent changes" section on a challenge page can be trusted: it
is a byproduct of how data gets updated, not something maintained by hand.

A blank cell in a re-import never erases a stored value — it means "no new
information", not "delete this".

---

## Suggested order of work

1. **Pick a lane first.** Futures-only or forex/CFD-only beats a thin spread
   across everything. The engine gets better with depth in one market, because
   the relative scoring (cheapest, roomiest drawdown) is computed within the
   options a trader can actually buy.
2. **Ten firms done properly** beats sixty done badly. A trader who gets one
   wrong figure never trusts the site again.
3. **Re-verify quarterly.** Challenges show a last-verified date and warn after
   90 days. That warning is doing real work — do not let it become permanent
   wallpaper.

---

## The futures lane: research roster

`data/futures-firms-roster.csv` is the **discovery output** for the futures lane —
sixteen firms confirmed to be listed on PropFirmMatch. It is a to-do list, not
data. Every pricing, drawdown and rule cell is deliberately absent, because none
of it has been read off a firm's own page yet.

The `candidate_official_site_UNVERIFIED` column is exactly what it says. Those
domains have not been opened and confirmed. Check the domain before you trust a
single figure you read on it — prop firm names attract lookalike domains, and a
wrong site would poison the whole row.

To work through it:

1. Open the firm's own rules page and pricing page. Not the PropFirmMatch page —
   that is only how the firm got onto this list.
2. Add one row per **account size** to your import CSV (`npm run db:template`).
   A firm with six account sizes is six rows.
3. Record the URL you actually read in `source_url`, leave `confidence` at
   `needs_review`, and leave `status` at `draft`.
4. Mark the firm `researched=yes` in the roster so the next session knows.

Futures firms have two quirks worth watching for:

- **Monthly subscription pricing.** Many futures evaluations bill monthly until
  you pass or cancel, unlike the one-off fee common in forex/CFD. `price` is a
  single number, so record the monthly figure and say so in `payout_conditions`
  or the challenge name — otherwise the budget criterion compares a recurring
  fee against a one-off one and gets it wrong.
- **Dollar-denominated limits.** Futures firms usually publish targets and
  drawdowns in dollars, not percent. The schema stores percentages, so convert
  against the account size and double-check the arithmetic — a $3,000 drawdown
  on a $50K account is 6%, and getting that wrong silently corrupts the single
  most heavily weighted criterion in the engine.

Firms offering **both static and trailing** evaluations (Elite Trader Funding is
one) are separate challenges, not one challenge with a footnote. Split them.

---

## What this repository will never contain

**No invented pricing or rules for a real company.** Ever. The demo seed uses
firms explicitly named "(fictional)" for exactly this reason. Attaching made-up
numbers to a real firm is the failure this product exists to avoid, and it would
be indistinguishable from the sites it is meant to beat.

Real firm *names* may appear in research scaffolding like the roster above —
knowing that Topstep exists and sells futures evaluations is not a claim about
what Topstep charges. The line is between naming a company and characterising
it. Names are fine. Numbers require a source URL.
