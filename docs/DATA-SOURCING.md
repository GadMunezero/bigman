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

## The aggregator import, and why it is all draft

`data/propfirmmatch-import.csv` holds 50 firms converted from a PropFirmMatch-style
export by `db/convert-propfirmmatch.ts`. Every row carries
`source_type: aggregator_unverified`, `confidence: needs_review` and
`status: draft`. None of it is on the public site, and the importer will refuse
to let any of it be marked `verified` while it still cites an aggregator.

**Treat these numbers as a hypothesis, not a catalogue.** The export failed its
own internal consistency check badly:

- **18 of the 28 CFD rows carry byte-identical figures** — the same $422.40
  price, 10% drawdown, 80% split, 14-day payout, MT5/cTrader platforms. Real
  firms do not converge on identical numbers. That is a filled-down column.
- **8 of the 22 futures rows** likewise share one identical number set.
- **21 of the 54 columns are blank in all 50 rows**, including
  `minimum_trading_days`, `time_limit`, `consistency_rule_evaluation` — and,
  critically, `official_website` and `official_rules_url`. Nothing in the file
  points at the document a firm would actually enforce.
- Every row's `source_type` is the aggregator itself.

So it is loaded the way untrustworthy data should be loaded: visible to an
admin, invisible to a trader, and flagged at every layer. Publishing a row means
opening the firm's own rules page, correcting the figures, setting
`source_type` to an `official_*` value with the URL you read, and only then
moving it out of draft.

### The daily-loss trap in this particular file

20 rows have no daily loss limit. The engine reads a blank
`daily_drawdown_pct` as **"this firm has no daily loss rule"** — which is a
claim, not an absence, and for futures firms it is usually false. The converter
prints the full list on every run. Confirm each one before publishing, because
this single field silently inflates usable drawdown.

---

## Official domains, and why they are recorded separately

`data/firm-websites.csv` holds official domains gathered from search-engine
results, applied with `npm run db:firm-websites -- --apply` (dry run by
default, and it never overwrites a website someone already typed).

These came from **indexed search results, not from opening the pages** — the
research environment cannot reach prop firm domains. That is enough to be worth
recording and not enough to trust blindly. Confirm the domain before publishing
a firm: a lookalike domain in an outbound link is the most damaging error this
catalogue can make, and this industry attracts them.

Two findings from that pass are worth keeping:

- **Alpha Futures is `alpha-futures.com`, hyphenated.** The obvious guess
  (`alphafutures.com`) is wrong. This is the concrete argument against ever
  deriving a domain from a firm's name.
- **Elite Trader Funding indexes as `.app`, and sources disagree on its account
  range** — $10K–$150K in one place, $50K–$300K in another. Flagged in the CSV.
  Do not record either until the firm's own page settles it.

Three firms in that file — Elite Trader Funding, Alpha Futures and Bulenox —
are **not in the catalogue at all**. The supplied export omitted them despite
their being real, active futures firms, which is one more reason not to treat
that export as complete.

---

## The futures product matrix

`data/futures-products.csv` is the real shape of the market: which products each
firm sells, and which sizes each product comes in. `npm run db:futures` expands
it into one challenge row per firm × product × size — 169 rows across 20 firms.

This replaces the guessed ladder below. A generic ladder is always wrong
somewhere: Goat's Sprint Challenge stops at 100K while its Instant Funded runs
to 150K, and nothing derived from a firm's name would ever catch that.

**Read the `evidence` column before trusting a row.**

| Value | Means |
| ----- | ----- |
| `cited` | The source URL was given for this exact product |
| `listed` | Same firm's help centre covers it, cited on a sibling row |
| `assumed` | **No source.** Sizes were stated without a citation — confirm before publishing |

Fifteen of the 43 product lines are `assumed`, including Apex, Take Profit
Trader, Earn2Trade and Lucid. Those are the ones to check first.

### What the expansion carries, and what it refuses to

Where an existing challenge already covers the same **firm and size**, its
price, target and drawdown are carried onto that row only — as a hypothesis
inherited from the unverified aggregator export, not an answer. Every other
size gets no price, no target, no drawdown. 126 of the 169 rows are in that
state.

That is deliberate, and the engine handles it correctly: those rows rank at the
**bottom** (52%, "Weak match") while rows with known figures reach 70%. There is
a test asserting a challenge with unknown figures can never outrank a
comparable known one — without it, the site would silently start recommending
the challenges it knows least about as the catalogue grew.

Instant-funding and direct-funding products get `phases 0` and no profit target
at all, because there is no evaluation to pass — that is an absence, not an
unknown.

---

## One row per account size

A real firm sells the same evaluation at six or seven account sizes. The
imported catalogue has **one challenge per firm**, which makes the account-size
filter nearly useless and makes every firm page read "this firm has 1
challenge". Nobody believes a directory that thinks Apex sells one product.

```bash
npm run db:expand-sizes -- data/account-sizes-worksheet.csv
```

This generates one row per firm per standard size (futures firms get the
25K/50K/75K/100K/150K/250K/300K ladder, CFD firms a different one), skipping
sizes already on file. It carries over what genuinely holds across sizes — the
rulebook, platforms, drawdown type, phase count, profit split — and leaves
**price, profit target and drawdown blank**.

Those three are blank on purpose. They do not scale: a 150K evaluation is not
priced at three times the 50K, and its drawdown is rarely three times either.
Deriving them arithmetically would produce numbers that look right, sit in the
heaviest-weighted criteria, and are wrong for every firm in a different
direction. Read them off the pricing page.

The output is a **worksheet, not an import**. Fill the blanks, then run it
through `npm run db:import` like any other CSV.

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
