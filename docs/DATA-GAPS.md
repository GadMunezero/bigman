# What the catalogue does not know

A survey of every empty field across 38 firms and 324 challenges, ordered by
how much filling it would change what the engine recommends. Regenerate the
numbers and the worksheets at any time with `npm run db:gaps`.

The short version: **the trading rules are the big gap.** Prices are in decent
shape. The fields that decide whether a challenge suits a particular kind of
trader are almost entirely unknown, which means the archetype layer is running
on a fraction of the evidence it was built to use.

## 1. Trading rules — 97% to 100% unknown

| Field | Unknown | Why it matters |
| --- | --- | --- |
| `scalping` | 324 / 324 | The scalper archetype has nothing to filter on |
| `ea_allowed` | 323 / 324 | Same for the algorithmic archetype |
| `copy_trading` | 323 / 324 | |
| `hedging` | 323 / 324 | |
| `news_trading` | 314 / 324 | The news-dependent archetype's single most important rule |
| `weekend` | 314 / 324 | |
| `overnight` | 312 / 324 | Decides whether a swing trader can use the account at all |
| `consistency_rule` | 167 / 324 | Punishes the one-big-day trader, helps nobody else |
| `consistency_pct` | 188 / 324 | |

This is the highest-value hour of work available. A firm's own FAQ or rules
page usually answers all nine questions at once, and one firm's answers
typically cover ten to twenty challenge rows.

**Worksheet:** `data/gaps-rules.csv`. Allowed values are `allowed`,
`restricted`, `prohibited` for the flags and `required` / `not_required` for
`consistency_rule`. Leave a cell empty if you could not find out — an empty
cell changes nothing, and a guess is worse than a gap.

## 2. The fifteen CFD firms — prices only, nothing else

These came in through a price table and have no rules, no drawdown figures, no
profit targets and no website on file:

Alpha Capital · AquaFunded · Atmos Funded · Blue Guardian · BrightFunded ·
Crypto Fund Trader · E8 Markets · FundedElite · FundedNext · FundingPips ·
Goat Funded Trader · Hola Prime · Maven · Moneta Funded · The5ers

105 challenge rows between them. Their pages currently say "not confirmed" for
almost everything, which is honest but not useful. The missing website is worth
fixing first: without it the outbound button cannot link anywhere.

## 3. Fields missing across the board

| Field | Missing | Note |
| --- | --- | --- |
| `leverage` | 324 / 324 | Never collected by any importer |
| `refund_policy` | 324 / 324 | Never collected |
| `country_restrictions` | 324 / 324 | Never collected |
| `last_verified_at` | 324 / 324 | Nothing has been verified against a firm's own page |
| `maximum_days` | 309 / 324 | Most futures evaluations have no deadline, so blank is often correct |
| `minimum_days` | 268 / 324 | Blank is often correct for the same reason |
| `daily_drawdown_pct` | 293 / 324 | Many futures accounts genuinely have none |
| `payout_frequency_days` | 217 / 324 | Real gap — the payout criterion scores these as unknown |
| `max_drawdown_pct` | 176 / 324 | Real gap, and it feeds `usableDrawdown` |
| `profit_target_pct` | 169 / 324 | Real gap |
| `payout_split_pct` | 125 / 324 | Real gap |
| `drawdown_type` | 118 / 324 | Real gap — scored as the harshest known type when absent |
| `platforms` | 105 / 324 | |
| `price` | 79 / 324 | |

A blank is not always a gap. No deadline, no daily loss limit and no minimum
days are all real properties of many futures accounts, and the engine reads
them correctly. The rows marked "real gap" are the ones where we simply do not
know.

**Worksheet:** `data/gaps-challenges.csv`.

## 4. Company details — nothing, for every firm

`ceo`, `key_people`, `headquarters`, `founded_year`, `description` and
`logo_url` are empty for all 38 firms.

This was populated once and lost: the information had no file in the repo, so
it lived only in a database that `db:reset` rebuilds from scratch. It now has a
home — `data/firm-profiles.csv`, applied by `npm run db:firm-profiles` inside
the catalogue pipeline, so it survives a rebuild.

**Worksheet:** `data/gaps-firms.csv`. Fill it in, save it as
`data/firm-profiles.csv`, and run `npm run db:firm-profiles -- --apply`.

Naming a person as the CEO of a prop firm is a claim about a real, identifiable
individual. `leadership_source_url` is not optional in practice — put the page
you read it on, and if you cannot find one, leave the name out.

## How to fill a worksheet

1. `npm run db:gaps` — writes the three CSVs from the current database.
2. Open one, fill in what you can find on the **firm's own pages**. An
   aggregator is fine for finding a page; it is not a source to copy from.
3. Put the page you read in `source_url`, and set `confidence` to `verified`
   only when you read the figure on the firm's own site. The importer rejects
   `verified` without a URL, and refuses to let aggregator-sourced rows claim
   it at all.
4. Dry run first: `npm run db:import -- data/gaps-challenges.csv`. It prints
   every change it would make and writes nothing.
5. `npm run db:import -- data/gaps-challenges.csv --apply`. Nothing is
   overwritten — changes are queued for review at `/admin/rules`.

Leaving a cell blank is always safe. A blank means "this row has no opinion",
and every stored value it touches is left exactly as it was.

## Two things worth knowing about the data as it stands

**One block from the supplied rules table has no firm name.** Sizes
25K/50K/75K/100K/150K, $90–$216 a month, 80% split, EOD trailing drawdown, $130
activation fee, payouts after a buffer. No firm on file matches it well enough
to place it. Name the firm and it goes straight in.

**Seven challenges are priced in EUR**, and the rest in USD. The budget
criterion compares the numbers directly, so a EUR price is currently treated as
though it were dollars.
