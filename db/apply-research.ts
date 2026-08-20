/**
 * Fills blanks in data/futures-specs.json from a round of published research.
 *
 * This is a script rather than a hand edit for one reason: it **only writes
 * where the field is currently empty**. Every figure already in the specs file
 * came from the source list supplied for this project, and a research pass off
 * secondary pages is a weaker claim than that. So a conflict is reported and
 * skipped, never silently applied — the existing value wins and the
 * disagreement is printed for a human to settle.
 *
 * Provenance is mandatory. Every product touched here gets a `source`, and
 * `secondhand: true` where the figures were read off a comparison or review
 * page rather than the firm's own help centre. That flows through to
 * `source_type: aggregator_unverified`, which the schema will never let be
 * marked verified.
 *
 *   npx tsx db/apply-research.ts            # dry run, writes nothing
 *   npx tsx db/apply-research.ts --apply
 */
import fs from "node:fs";
import path from "node:path";

interface SizeSpec { target?: number; dd?: number; daily?: number; price?: number }
interface Product {
  firm: string;
  product: string;
  sizes: Record<string, SizeSpec>;
  [key: string]: unknown;
}

/** Product-level fields a research pass may fill. */
type ProductPatch = Partial<{
  drawdown_type: string;
  consistency: string;
  consistency_pct: number;
  min_days: number;
  max_days: number;
  split: number;
  news: string;
  overnight: string;
  weekend: string;
  payout_days: number;
  billing: string;
  target_pct: number;
  dd_pct: number;
  daily_pct: number;
  dailyUnknown: boolean;
  source: string;
  source_note: string;
  secondhand: boolean;
  notes: string;
}>;

interface Patch {
  firm: string;
  product: string;
  set?: ProductPatch;
  sizes?: Record<string, SizeSpec>;
  /**
   * Drops `uncertain` because the research turned up real figures.
   *
   * `uncertain` blanks the target, drawdown and daily limit on every size of a
   * product, which is right when a source explicitly declines to pin the
   * product down — and wrong the moment a real figure arrives, because it then
   * throws that figure away silently. Sizes still holding `{}` go on producing
   * blanks by themselves, so nothing is claimed that was not found.
   */
  clearUncertain?: boolean;
}

/*
 * Researched August 2026. Firm domains are unreachable from this environment,
 * so every figure below was read off an indexed page — mostly the firms' own
 * help centres, which is why the URLs point there, but the pages themselves
 * were not opened. Hence `secondhand` on every entry.
 *
 * Figures NOT recorded, and why:
 *   Blue Guardian prices  — only discounted prices were published; computing a
 *                           regular price backwards from a percentage off is a
 *                           derivation, and this file does not derive.
 *   TradeDay prices       — quoted as "roughly $62 to $240 depending on route".
 *   FundedNext prices     — sources mixed discounted and full prices without
 *                           saying which was which.
 *   The Trading Pit 100K  — the drawdown range was given at its endpoints only
 *                           ($2,000 and $4,500). Interpolating the middle is
 *                           exactly the ladder assumption that is wrong often
 *                           enough to matter.
 */
const PATCHES: Patch[] = [
  // ---- Top One Futures --------------------------------------------------
  {
    firm: "Top One Futures",
    product: "Elite Evaluation",
    set: {
      source: "https://help.toponefutures.com/en/articles/14595016-elite-access-accounts-overview",
      secondhand: true,
    },
    sizes: {
      "25000": { price: 200, target: 1500, dd: 1000, daily: 625 },
      "50000": { price: 250, target: 3000, dd: 2000, daily: 1250 },
      "100000": { price: 300, target: 6000, dd: 3000, daily: 2500 },
      "150000": { price: 350, target: 9000, dd: 4500, daily: 3750 },
    },
  },

  // ---- Goat Funded Futures ----------------------------------------------
  {
    firm: "Goat Funded Futures",
    product: "EOD Challenge",
    set: {
      consistency: "required",
      consistency_pct: 30,
      payout_days: 7,
      source: "https://help.goatfundedfutures.com/en/articles/14095302-eod-challenge-specifications-rules-and-payouts",
      source_note:
        "Payout eligibility is every 7 winning days; a winning day is at least 0.2% of the starting balance. Minimum payout $500. No activation fee. The 30% cap is on the best day's share of total profit and gates the payout, not the pass.",
      secondhand: true,
    },
    sizes: {
      "50000": { price: 134, target: 3000, dd: 2000 },
      "100000": { price: 264, target: 6000, dd: 3000 },
      "150000": { price: 374, target: 9000, dd: 4500 },
    },
  },
  {
    firm: "Goat Funded Futures",
    product: "Flex Challenge",
    set: {
      target_pct: 6,
      consistency: "not_required",
      source: "https://help.goatfundedfutures.com/en/articles/14888545-flex-challenge-specifications-rules-and-payouts",
      source_note:
        "No daily loss limit and no consistency rule once funded. Default split 80/20, with a 90/10 add-on sold for an extra 20% of the challenge price.",
      secondhand: true,
    },
  },

  // ---- My Funded Futures -------------------------------------------------
  {
    firm: "My Funded Futures",
    product: "Rapid",
    set: {
      split: 90,
      source: "https://myfundedfutures.com/plans/rapid",
      source_note:
        "Daily payouts, no activation fee. One source describes the maximum loss as end-of-day while the supplied product table records intraday trailing — the recorded mechanic was left alone and the disagreement needs settling on the firm's own page.",
      secondhand: true,
    },
    sizes: {
      "25000": { target: 1500, dd: 1000 },
      "50000": { target: 3000, dd: 2000 },
      "100000": { target: 6000, dd: 3000 },
      "150000": { target: 9000, dd: 4500 },
    },
  },
  {
    firm: "My Funded Futures",
    product: "Builder",
    clearUncertain: true,
    set: {
      split: 80,
      min_days: 1,
      drawdown_type: "eod_trailing",
      source: "https://help.myfundedfutures.com/en/articles/14290805-builder-plan-50k-a-comprehensive-guide",
      source_note:
        "The daily loss limit is a soft pause rather than a breach. Only the $50K plan has published figures; the other sizes are on file as sizes alone.",
      secondhand: true,
    },
    sizes: { "50000": { target: 3000, dd: 2000, daily: 1000 } },
  },

  // ---- Blue Guardian Futures ---------------------------------------------
  {
    firm: "Blue Guardian Futures",
    product: "Standard",
    set: { split: 90, source: "https://helpfutures.blueguardian.com/en/articles/15654479-standard-account-rules", secondhand: true },
  },
  {
    firm: "Blue Guardian Futures",
    product: "Reserve",
    set: {
      split: 90,
      consistency: "not_required",
      source: "https://helpfutures.blueguardian.com/en/articles/15678716-reserve-account-rules",
      secondhand: true,
    },
  },
  {
    firm: "Blue Guardian Futures",
    product: "Express",
    set: { split: 90, source: "https://helpfutures.blueguardian.com/en/articles/15772960-payout-policy", secondhand: true },
  },
  {
    firm: "Blue Guardian Futures",
    product: "Direct",
    set: {
      split: 90,
      source: "https://helpfutures.blueguardian.com/en/articles/15679519-direct-account-rules",
      source_note:
        "Payouts carry a 2% processing fee. A payout processed after the 24-business-hour window pays 100% instead of 90% for that request.",
      secondhand: true,
    },
  },

  // ---- FuturesElite -------------------------------------------------------
  {
    firm: "FuturesElite",
    product: "Elite",
    set: {
      split: 80,
      target_pct: 6,
      drawdown_type: "eod_trailing",
      payout_days: 5,
      source: "https://faq.futureselite.com/en/",
      source_note: "No daily loss limit on this plan.",
      secondhand: true,
    },
    sizes: { "50000": { target: 3000, dd: 2000 } },
  },
  {
    firm: "FuturesElite",
    product: "Prime",
    set: {
      split: 80,
      target_pct: 6,
      drawdown_type: "intraday_trailing",
      payout_days: 5,
      source: "https://faq.futureselite.com/en/",
      source_note: "No daily loss limit on this plan.",
      secondhand: true,
    },
    sizes: { "150000": { target: 9000, dd: 4500 } },
  },
  {
    firm: "FuturesElite",
    product: "Instant Challenge",
    set: { split: 80, payout_days: 5, source: "https://faq.futureselite.com/en/", secondhand: true },
  },

  // ---- Apex Trader Funding -----------------------------------------------
  {
    firm: "Apex Trader Funding",
    product: "Evaluation",
    clearUncertain: true,
    set: {
      target_pct: 5,
      split: 90,
      billing: "monthly",
      source: "https://apextraderfunding.com/help-center/evaluation-accounts-ea/intraday-trailing-drawdown-evaluations/",
      source_note:
        "The 5% target is stated by the firm as uniform across every account size. The split is 100% of the first $25,000 and 90/10 after it; 90 is recorded as the ongoing rate. Both end-of-day and intraday trailing variants are sold. An activation fee applies on passing.",
      secondhand: true,
    },
  },

  // ---- Tradeify -----------------------------------------------------------
  {
    firm: "Tradeify",
    product: "Growth",
    set: {
      split: 90,
      consistency: "required",
      consistency_pct: 35,
      source: "https://help.tradeify.co/en/articles/14369021-tradeify-pricing-reference",
      secondhand: true,
    },
  },
  {
    firm: "Tradeify",
    product: "Select",
    set: {
      split: 90,
      consistency: "required",
      consistency_pct: 40,
      source: "https://help.tradeify.co/en/articles/14369021-tradeify-pricing-reference",
      source_note: "The 40% consistency rule applies during the evaluation only and is dropped once funded.",
      secondhand: true,
    },
  },
  {
    firm: "Tradeify",
    product: "Lightning Funded",
    set: {
      split: 90,
      consistency: "required",
      consistency_pct: 30,
      source: "https://help.tradeify.co/en/articles/14369021-tradeify-pricing-reference",
      source_note: "Published as a 20-30% band; the looser end is recorded so the rule is not overstated.",
      secondhand: true,
    },
  },

  // ---- Blueberry Futures --------------------------------------------------
  {
    firm: "Blueberry Futures",
    product: "Ascent EOD",
    set: {
      split: 90,
      billing: "monthly",
      source: "https://blueberryfutures.com/",
      source_note:
        "A monthly subscription, not a one-off: the fee recurs while the account is active, and there are no refunds. No hard daily loss limit — traders set their own in the platform's risk manager. Payout after 5 profitable days, a profitable day being $200.",
      secondhand: true,
    },
    sizes: { "50000": { price: 245 }, "100000": { price: 368 }, "150000": { price: 607, target: 10000, dd: 4500 } },
  },
  {
    firm: "Blueberry Futures",
    product: "Accelerated Trailing",
    set: {
      split: 90,
      billing: "monthly",
      source: "https://blueberryfutures.com/",
      source_note: "A monthly subscription, not a one-off. No hard daily loss limit.",
      secondhand: true,
    },
    sizes: { "25000": { price: 110.4, target: 1500, dd: 1000 }, "50000": { price: 184, target: 3000, dd: 2000 } },
  },

  // ---- TradeDay -----------------------------------------------------------
  {
    firm: "TradeDay",
    product: "Quick Pay EOD",
    set: {
      split: 80,
      consistency: "required",
      consistency_pct: 30,
      billing: "monthly",
      source: "https://tradeday.freshdesk.com/en/support/solutions/articles/103000335937-quick-pay-funded-sim-payout-policy",
      source_note:
        "The split is 50/50 on the first $4,000 of net profit per account and 80/20 above it; 80 is recorded as the ongoing rate. The consistency rule applies during evaluation only. Minimum payout $250, no activation fee.",
      secondhand: true,
    },
  },
  {
    firm: "TradeDay",
    product: "Quick Pay Intraday",
    set: {
      split: 80,
      consistency: "required",
      consistency_pct: 30,
      billing: "monthly",
      source: "https://tradeday.freshdesk.com/en/support/solutions/articles/103000335937-quick-pay-funded-sim-payout-policy",
      source_note: "50/50 on the first $4,000 then 80/20. Consistency applies during evaluation only.",
      secondhand: true,
    },
  },
  {
    firm: "TradeDay",
    product: "Fast Pass",
    set: {
      split: 80,
      consistency: "required",
      consistency_pct: 45,
      billing: "monthly",
      source: "https://tradeday.freshdesk.com/en/support/solutions/articles/103000404096-fast-pass-funded-sim-payout-policy",
      source_note: "Flat 80/20 in funded sim. The consistency rule applies during evaluation only.",
      secondhand: true,
    },
  },

  // ---- Earn2Trade ---------------------------------------------------------
  {
    firm: "Earn2Trade",
    product: "Gauntlet Mini",
    set: {
      split: 80,
      consistency: "required",
      consistency_pct: 30,
      payout_days: 7,
      source: "https://help.earn2trade.com/en/articles/3292341-what-are-the-gauntlet-mini-rules",
      secondhand: true,
    },
    sizes: { "50000": { target: 3000, daily: 1100 } },
  },
  {
    firm: "Earn2Trade",
    product: "Trader Career Path",
    set: { split: 80, source: "https://www.earn2trade.com/", secondhand: true },
  },

  // ---- The5ers Futures ----------------------------------------------------
  {
    firm: "The5ers Futures",
    product: "Day Trade",
    set: {
      target_pct: 6,
      dd_pct: 3,
      split: 80,
      consistency: "required",
      consistency_pct: 30,
      source: "https://the5ers.com/futures-faqs/",
      source_note:
        "Objectives are identical across the Rebate and Basecamp fee structures, which differ only in how you pay: Basecamp is $50 at 25K and $100 at 50K plus an activation fee of $70 and $140 on funding, while Rebate is a one-off fee that returns commissions daily.",
      secondhand: true,
    },
  },
  {
    firm: "The5ers Futures",
    product: "Swing",
    set: {
      target_pct: 6,
      dd_pct: 3,
      split: 80,
      consistency: "required",
      consistency_pct: 30,
      source: "https://the5ers.com/futures-faqs/",
      secondhand: true,
    },
  },

  // ---- The Trading Pit Futures --------------------------------------------
  {
    firm: "The Trading Pit Futures",
    product: "Futures Prime",
    set: {
      split: 80,
      drawdown_type: "eod_trailing",
      consistency: "required",
      consistency_pct: 40,
      max_days: 30,
      overnight: "prohibited",
      source: "https://www.thetradingpit.com/faq/what-are-the-rules-in-futures-trading",
      source_note:
        "Positions are force-closed at 14:55 CT, so overnight holding is not available. High-frequency trading is prohibited. The daily pause runs $1,000-$3,000 by size; only the drawdown endpoints were published per size, so the middle size is left blank rather than interpolated.",
      secondhand: true,
    },
    sizes: { "50000": { dd: 2000 }, "150000": { dd: 4500 } },
  },
  {
    firm: "The Trading Pit Futures",
    product: "Futures Classic",
    set: {
      split: 80,
      drawdown_type: "trailing",
      consistency: "required",
      consistency_pct: 40,
      max_days: 30,
      overnight: "allowed",
      weekend: "prohibited",
      source: "https://www.thetradingpit.com/faq/what-are-the-rules-in-futures-trading",
      source_note: "The trailing floor moves up in real time whenever the closed balance sets a new high.",
      secondhand: true,
    },
  },

  // ---- AquaFutures --------------------------------------------------------
  {
    firm: "AquaFutures",
    product: "Standard Evaluation",
    set: {
      target_pct: 8,
      consistency: "required",
      consistency_pct: 40,
      payout_days: 14,
      drawdown_type: "eod_trailing",
      source: "https://help.aquafutures.io/en/articles/10080201-aquafutures-trading-parameters",
      source_note:
        "No daily loss limit on Standard. Maximum drawdown runs from 6% at the smallest size down to 3.3% at the largest, so it is not recorded as a single figure.",
      secondhand: true,
    },
    sizes: { "25000": { price: 149 }, "50000": { price: 246 }, "100000": { price: 306 } },
  },
  {
    firm: "AquaFutures",
    product: "Beginner",
    clearUncertain: true,
    set: {
      daily_pct: 2.5,
      drawdown_type: "eod_trailing",
      payout_days: 7,
      source: "https://www.proptradingvibes.com/blog/aquafutures-beginner-vs-standard-account",
      source_note:
        "Published as a 6-8% profit target and a maximum drawdown between 6% and 3.3% depending on size, so neither is recorded as a single figure.",
      secondhand: true,
    },
  },
  {
    firm: "AquaFutures",
    product: "Instant Standard",
    set: {
      daily_pct: 2.5,
      dd_pct: 4,
      drawdown_type: "eod_trailing",
      source: "https://www.aquafutures.io/blogs/instant-funding-rules",
      source_note: "The maximum drawdown is 4% at most sizes but 3% on the $100K account.",
      secondhand: true,
    },
  },

  // ---- E8 Futures ---------------------------------------------------------
  {
    firm: "E8 Futures",
    product: "E8 Signature",
    set: {
      target_pct: 6,
      split: 80,
      drawdown_type: "eod_trailing",
      consistency: "required",
      consistency_pct: 35,
      source: "https://helpfutures.e8markets.com/en/articles/11864618-e8-signature-futures",
      source_note:
        "The drawdown is an end-of-day dynamic floor: it moves only at market close, follows the highest end-of-day balance, and locks permanently once it reaches the starting balance. The 35% consistency rule applies to funded accounts.",
      secondhand: true,
    },
    sizes: { "50000": { target: 3000 } },
  },
  {
    firm: "E8 Futures",
    product: "E8 Zero Starter",
    set: {
      source: "https://e8futures.com/e8-zero",
      source_note:
        "NEEDS REVIEW: research describes E8's futures line as Signature-only, with E8 Zero sold for forex and crypto rather than futures. This product came from the supplied table and has been kept rather than deleted, but confirm it exists as a futures account before publishing.",
      secondhand: true,
    },
  },
  {
    firm: "E8 Futures",
    product: "E8 Zero Max",
    set: {
      source: "https://e8futures.com/e8-zero",
      source_note:
        "NEEDS REVIEW: research describes E8's futures line as Signature-only, with E8 Zero sold for forex and crypto rather than futures. Confirm before publishing.",
      secondhand: true,
    },
  },

  // ---- DayTraders ---------------------------------------------------------
  {
    firm: "DayTraders",
    product: "EOD",
    set: {
      split: 100,
      source: "https://daytraders.com/help/articles/9855052-drawdown-threshold-guide-trailing-static-eod",
      source_note:
        "The firm advertises 100% profit retention with no split. Fees are quoted as one-time or monthly depending on the plan chosen.",
      secondhand: true,
    },
    sizes: { "25000": { price: 570, dd: 1000 }, "150000": { price: 825, dd: 6000, daily: 3750 } },
  },
  {
    firm: "DayTraders",
    product: "Static",
    set: { split: 100, source: "https://daytraders.com/help/articles/9855052-drawdown-threshold-guide-trailing-static-eod", secondhand: true },
  },
  {
    firm: "DayTraders",
    product: "Trail",
    set: { split: 100, source: "https://daytraders.com/trailing-drawdown-explained", secondhand: true },
  },
  {
    firm: "DayTraders",
    product: "S2F",
    set: { split: 100, source: "https://daytraders.com/help/articles/9855052-drawdown-threshold-guide-trailing-static-eod", secondhand: true },
  },
  {
    firm: "DayTraders",
    product: "S2L",
    set: { split: 100, source: "https://daytraders.com/", secondhand: true },
  },

  // ---- Goat Funded Futures, remaining plans -------------------------------
  {
    firm: "Goat Funded Futures",
    product: "Sprint Challenge",
    set: {
      target_pct: 6,
      consistency: "not_required",
      source: "https://help.goatfundedfutures.com/en/articles/14523731-what-are-the-specifications-of-each-type-and-account-size",
      source_note: "No consistency rule during the evaluation.",
      secondhand: true,
    },
  },
  {
    firm: "Goat Funded Futures",
    product: "Instant Funded",
    set: {
      daily_pct: 3,
      consistency: "required",
      consistency_pct: 20,
      min_days: 10,
      payout_days: 7,
      source: "https://help.goatfundedfutures.com/en/articles/14095625-what-are-the-instant-funded-specifications",
      source_note:
        "No evaluation. Before a first payout the balance must grow 7%, over at least 7 winning days and 10 calendar days. The daily loss limit is a soft breach that pauses the account until the next session. Profit on any one day is capped at 5% of the balance, after which trading stops for the day.",
      secondhand: true,
    },
  },

  // ---- Top One Futures, remaining plans -----------------------------------
  {
    firm: "Top One Futures",
    product: "Elite Access",
    set: {
      consistency: "required",
      consistency_pct: 40,
      source: "https://damnpropfirms.com/prop-firms/top-one-futures-account-types-plans-compared-2026/",
      source_note:
        "No daily loss limit during the challenge; the 40% consistency rule applies at payout. Sources disagree on this firm's profit targets: one publishes a flat 6% and another a tiered 6% at 25K and 50K, 5% at 75K and 100K, 4% at 150K. The recorded figures follow the first; settle it on the firm's own page before publishing.",
      secondhand: true,
    },
  },
  {
    firm: "Top One Futures",
    product: "Ignite",
    set: {
      consistency: "required",
      consistency_pct: 15,
      drawdown_type: "eod_trailing",
      source: "https://damnpropfirms.com/prop-firms/top-one-futures-account-types-plans-compared-2026/",
      source_note: "No evaluation. The tightest consistency rule the firm sells.",
      secondhand: true,
    },
  },
  {
    firm: "Top One Futures",
    product: "Instant Sim Funded",
    set: {
      split: 90,
      consistency: "required",
      consistency_pct: 20,
      drawdown_type: "eod_trailing",
      source: "https://damnpropfirms.com/prop-firms/top-one-futures-account-types-plans-compared-2026/",
      source_note: "No evaluation; a one-time fee from $167.60 depending on size.",
      secondhand: true,
    },
  },
  {
    firm: "Top One Futures",
    product: "Elite Evaluation",
    set: { split: 90, consistency: "required", consistency_pct: 25 },
  },
  {
    firm: "Top One Futures",
    product: "Elite Daily",
    set: {
      split: 90,
      consistency: "required",
      consistency_pct: 40,
      source: "https://damnpropfirms.com/prop-firms/top-one-futures-account-types-plans-compared-2026/",
      secondhand: true,
    },
  },
  {
    firm: "Top One Futures",
    product: "Instant",
    set: {
      split: 90,
      source: "https://damnpropfirms.com/prop-firms/top-one-futures-account-types-plans-compared-2026/",
      secondhand: true,
    },
  },

  // ---- Ylos Trading -------------------------------------------------------
  {
    firm: "Ylos Trading",
    product: "Standard",
    set: {
      split: 100,
      drawdown_type: "intraday_trailing",
      consistency: "required",
      consistency_pct: 40,
      min_days: 10,
      source: "https://ylostrading.com/",
      source_note:
        "100% split applies to payouts up to $15,000. Funded accounts use a real-time drawdown. A payout needs 10 days each clearing $150. No renewal fees.",
      secondhand: true,
    },
  },
];

// ---------------------------------------------------------------------------

const apply = process.argv.includes("--apply");
const specsPath = path.join(process.cwd(), "data", "futures-specs.json");
const specs = JSON.parse(fs.readFileSync(specsPath, "utf8")) as {
  _comment: string[];
  products: Product[];
};

let filled = 0;
const conflicts: string[] = [];
const missing: string[] = [];
const cleared: string[] = [];

for (const patch of PATCHES) {
  const product = specs.products.find(
    (p) => p.firm === patch.firm && p.product === patch.product,
  );
  if (!product) {
    missing.push(`${patch.firm} — ${patch.product}`);
    continue;
  }

  if (patch.clearUncertain && product.uncertain) {
    delete product.uncertain;
    cleared.push(`${patch.firm} — ${patch.product}`);
  }

  for (const [key, value] of Object.entries(patch.set ?? {})) {
    const current = product[key];
    if (current === undefined || current === null || current === "") {
      product[key] = value;
      filled++;
    } else if (current !== value) {
      conflicts.push(`${patch.firm} ${patch.product}.${key}: keeping ${JSON.stringify(current)}, research said ${JSON.stringify(value)}`);
    }
  }

  for (const [sizeKey, sizePatch] of Object.entries(patch.sizes ?? {})) {
    const size = product.sizes[sizeKey];
    if (!size) {
      missing.push(`${patch.firm} — ${patch.product} has no ${sizeKey} size`);
      continue;
    }
    for (const [key, value] of Object.entries(sizePatch) as [keyof SizeSpec, number][]) {
      if (size[key] === undefined) {
        size[key] = value;
        filled++;
      } else if (size[key] !== value) {
        conflicts.push(`${patch.firm} ${patch.product} ${sizeKey}.${key}: keeping ${size[key]}, research said ${value}`);
      }
    }
  }
}

console.log(`${apply ? "Filled" : "Would fill"} ${filled} empty fields across ${PATCHES.length} products.`);

if (cleared.length) {
  console.log(
    `\nDropped \`uncertain\` on ${cleared.length} products that now have real figures:\n   ` +
      cleared.join("\n   "),
  );
}

if (conflicts.length) {
  console.log(
    `\n!! ${conflicts.length} conflicts. The existing value was KEPT in every case —\n` +
      `   the supplied product tables outrank a search pass. Settle these on the\n` +
      `   firm's own page:\n   ` + conflicts.join("\n   "),
  );
}
if (missing.length) {
  console.log(`\n?? ${missing.length} patches matched nothing:\n   ` + missing.join("\n   "));
}

if (apply) {
  fs.writeFileSync(specsPath, JSON.stringify(specs, null, 2) + "\n");
  console.log(`\nWrote ${specsPath}. Rebuild with: npm run db:futures -- data/futures-specs.json data/futures-catalogue.csv`);
} else {
  console.log("\nDry run — nothing written. Re-run with --apply.");
}
