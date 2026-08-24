/**
 * Turns published research about firms' trading rules into an importer CSV.
 *
 * WHY THIS IS NOT AN APPLIER
 *
 * Every other data script in this directory writes what it knows. This one
 * deliberately does not, because rule values are the one kind of data in the
 * catalogue that HARD-FILTERS a trader's results: `news_trading = 'prohibited'`
 * removes a challenge from someone's matches entirely. A wrong value here does
 * not show up as a wrong number on a page — it silently deletes a real option
 * from somebody's list, and they never learn it existed.
 *
 * So this writes a CSV and stops. Running it through `npm run db:import` puts
 * every value in the pending queue at /admin/rules, where a human approves or
 * rejects each one. Nothing reaches a trader unreviewed.
 *
 * WHERE THE VALUES CAME FROM, AND WHAT THAT IS WORTH
 *
 * Not from the firms. Every prop firm domain and help centre is unreachable
 * from the environment this was assembled in — topstep.com, apextraderfunding.com,
 * help.tradeify.co, the lot — so nothing here was read on the page that governs
 * it. These are secondary sources: review sites and comparison blogs, several
 * of which contradict each other and at least one of which contradicted itself
 * inside a single paragraph.
 *
 * That is why every row is `aggregator_unverified` at `needs_review`, which the
 * importer will not let claim `verified` no matter what a spreadsheet says.
 * Treat this as a list of things to go and check, not as findings. Each row
 * carries the page to check it against.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * Where sources disagreed, the field is left empty rather than resolved by
 * picking the more common answer. A blank means "still unknown", which is true
 * and harmless; a guess would look identical to knowledge. The specific
 * disagreements are recorded in CONFLICTS below and printed on every run.
 *
 *   npx tsx db/build-rules-research.ts   ->  data/rules-research.csv
 *   npm run db:import -- data/rules-research.csv          (dry run, prints all)
 *   npm run db:import -- data/rules-research.csv --apply  (queues for review)
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";

type RuleSet = Partial<{
  news_trading: string;
  overnight: string;
  weekend: string;
  ea_allowed: string;
  copy_trading: string;
  scalping: string;
  hedging: string;
  consistency_rule: string;
  consistency_pct: number;
}>;

interface FirmResearch {
  /** The page a reviewer should open to confirm these. */
  source: string;
  /** Applies to every challenge at the firm. */
  firmWide?: RuleSet;
  /**
   * Applies only to challenges whose name starts with this product name.
   * Consistency percentages are nearly always per-product, not per-firm.
   */
  products?: Record<string, RuleSet>;
}

/**
 * Consistency percentages are recorded for the EVALUATION where a source
 * distinguishes evaluation from funded, because that is what a challenge row
 * in this catalogue is. Several firms drop the rule entirely once funded.
 */
const RESEARCH: Record<string, FirmResearch> = {
  Topstep: {
    source: "https://help.topstep.com/",
    // Sources agree news trading carries no blackout, and that ordinary
    // scalping is fine while latency exploitation and scalping *algorithms*
    // are not. The consistency percentage is left blank: sources give 50% for
    // the Combine and 40% for the Express funded payout window, and this
    // catalogue's rows are Combines.
    firmWide: { news_trading: "allowed", scalping: "allowed", consistency_rule: "required" },
  },

  "Apex Trader Funding": {
    source: "https://apextraderfunding.com/help-center/getting-started/prohibited-activities/",
    // ea_allowed is deliberately absent — see CONFLICTS.
    firmWide: { copy_trading: "allowed", consistency_rule: "required", consistency_pct: 30 },
  },

  "Take Profit Trader": {
    source: "https://takeprofittraderhelp.zendesk.com/",
    // News is unrestricted on the evaluation and restricted on PRO funded
    // accounts (flat one minute either side). "restricted" is the honest value
    // for an account someone is buying in order to get funded.
    firmWide: {
      news_trading: "restricted",
      overnight: "prohibited",
      scalping: "allowed",
      consistency_rule: "required",
      consistency_pct: 50,
    },
  },

  TradeDay: {
    source: "https://tradeday.com/faq/",
    firmWide: {
      overnight: "prohibited",
      ea_allowed: "allowed",
      consistency_rule: "required",
      consistency_pct: 30,
    },
  },

  Earn2Trade: {
    source: "https://help.earn2trade.com/en/articles/3849975-what-is-the-maintain-consistency-rule",
    firmWide: {
      news_trading: "allowed",
      overnight: "prohibited",
      ea_allowed: "allowed",
      scalping: "allowed",
      consistency_rule: "required",
      consistency_pct: 30,
    },
  },

  "My Funded Futures": {
    source: "https://myfundedfutures.com/faq",
    // Consistency is left out entirely: one source says 50%, another says it
    // varies by plan, a third says Pro accounts have none. Three answers is no
    // answer.
    firmWide: { weekend: "prohibited", ea_allowed: "allowed" },
  },

  Tradeify: {
    source: "https://help.tradeify.co/en/collections/15250320-trading-rules",
    firmWide: { news_trading: "allowed", overnight: "prohibited", weekend: "prohibited" },
    products: {
      Growth: { consistency_rule: "required", consistency_pct: 35 },
      Select: { consistency_rule: "required", consistency_pct: 40 },
    },
  },

  "Funded Futures Family": {
    source: "https://intercom.help/funded-futures-family/en/articles/15892353-news-trading-policy",
    // Percentage rises with payout number (40 / 45 / 50), so no single figure
    // describes the account.
    firmWide: {
      news_trading: "allowed",
      overnight: "allowed",
      consistency_rule: "required",
    },
  },

  FuturesElite: {
    source: "https://futureselite.com/faq",
    firmWide: {
      news_trading: "allowed",
      overnight: "allowed",
      weekend: "allowed",
      scalping: "allowed",
      consistency_rule: "required",
    },
  },

  "Lucid Trading": {
    source: "https://lucidtrading.com/general-faq/",
    firmWide: { news_trading: "allowed", overnight: "prohibited", weekend: "prohibited" },
    products: {
      LucidPro: { consistency_rule: "required", consistency_pct: 35 },
      LucidDirect: { consistency_rule: "required", consistency_pct: 20 },
    },
  },

  "Top One Futures": {
    source: "https://toponefutures.com/faq",
    firmWide: { news_trading: "allowed", consistency_rule: "required", consistency_pct: 25 },
  },

  "Goat Funded Futures": {
    source: "https://help.goatfundedfutures.com/en/articles/14095672-what-is-the-consistency-rule-and-how-does-it-affect-my-payout",
    // A two-minute buffer either side of high-impact releases is a restriction,
    // not a ban. EAs are restricted rather than allowed: the same EA must be
    // carried from evaluation to funded, and bought or third-party automation,
    // HFT and martingale are out.
    firmWide: { news_trading: "restricted", ea_allowed: "restricted" },
    products: {
      "EOD Challenge": { consistency_rule: "required", consistency_pct: 50 },
      "Flex Challenge": { consistency_rule: "required", consistency_pct: 50 },
      "Sprint Challenge": { consistency_rule: "not_required" },
      "Instant Funded": {
        overnight: "prohibited",
        consistency_rule: "required",
        consistency_pct: 20,
      },
    },
  },

  "Blue Guardian Futures": {
    source: "https://helpfutures.blueguardian.com/",
    firmWide: { news_trading: "allowed" },
    products: {
      Standard: { consistency_rule: "required", consistency_pct: 40 },
      Reserve: { consistency_rule: "required", consistency_pct: 50 },
    },
  },

  "Blueberry Futures": {
    source: "https://blueberryfutures.com/",
    // Single source, weaker than the rest. Kept because it is specific and
    // uncontradicted, flagged here so a reviewer knows to weigh it accordingly.
    firmWide: { news_trading: "restricted", overnight: "allowed", weekend: "allowed" },
  },
};

/** Disagreements left unresolved, printed on every run so they stay visible. */
const CONFLICTS: string[] = [
  "Apex — automated trading. One source says EAs and bots are prohibited on funded accounts, another says they are allowed if they respect the risk limits. ea_allowed left unknown.",
  "Topstep — consistency percentage. 50% is quoted for the Trading Combine and 40% for the Express funded payout window. Rule recorded as required, percentage left blank.",
  "Lucid Trading — whether a consistency rule exists at all. One page says Lucid does not impose one and then describes per-product percentages two sentences later. The per-product figures are recorded; the blanket claim is not.",
  "My Funded Futures — consistency. Three sources, three answers (50%, varies by plan, none on Pro). Nothing recorded.",
  "TradeDay — news trading. Described as permitted, then as restricted on funded accounts, in the same source. Nothing recorded.",
  "E8 Futures — no usable results at all for its 17 challenges. Still entirely unknown.",
];

const RULE_COLUMNS = [
  "news_trading",
  "overnight",
  "weekend",
  "ea_allowed",
  "copy_trading",
  "scalping",
  "hedging",
  "consistency_rule",
  "consistency_pct",
] as const;

const HEADER = [
  "firm_name",
  "challenge_name",
  ...RULE_COLUMNS,
  "source_url",
  "source_type",
  "confidence",
];

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const db = getDb();
const challenges = db
  .prepare(
    `SELECT c.name challenge_name, f.name firm_name, r.*
       FROM challenges c
       JOIN firms f ON f.id = c.firm_id
       LEFT JOIN challenge_rules r ON r.challenge_id = c.id
      WHERE c.status = 'published'
      ORDER BY f.name, c.name`,
  )
  .all() as Record<string, string | number | null>[];

const rows: string[] = [];
let proposedValues = 0;
let skippedAlreadyKnown = 0;
const perFirm = new Map<string, number>();

for (const challenge of challenges) {
  const firm = String(challenge.firm_name);
  const research = RESEARCH[firm];
  if (!research) continue;

  const name = String(challenge.challenge_name);
  const applicable: RuleSet = { ...research.firmWide };
  for (const [product, rules] of Object.entries(research.products ?? {})) {
    if (name.startsWith(product)) Object.assign(applicable, rules);
  }

  const cells: Record<string, string | number> = {};
  for (const column of RULE_COLUMNS) {
    const proposed = applicable[column];
    if (proposed === undefined) continue;

    // Never propose a change to something already established. A researched
    // guess must not displace a figure someone verified, and re-stating a
    // value that already matches only adds noise to the review queue.
    const current = challenge[column];
    if (current !== null && current !== "unknown") {
      skippedAlreadyKnown++;
      continue;
    }
    cells[column] = proposed;
  }

  if (Object.keys(cells).length === 0) continue;

  proposedValues += Object.keys(cells).length;
  perFirm.set(firm, (perFirm.get(firm) ?? 0) + Object.keys(cells).length);

  rows.push(
    [
      csvCell(firm),
      csvCell(name),
      ...RULE_COLUMNS.map((c) => csvCell(cells[c])),
      csvCell(research.source),
      "aggregator_unverified",
      "needs_review",
    ].join(","),
  );
}

const outPath = path.join(process.cwd(), "data", "rules-research.csv");
fs.writeFileSync(outPath, [HEADER.join(","), ...rows].join("\n"));

console.log(`data/rules-research.csv — ${rows.length} challenges, ${proposedValues} proposed values`);
console.log(`${skippedAlreadyKnown} values left alone because something is already on file.\n`);

console.log("Proposed values by firm:");
for (const [firm, n] of [...perFirm.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${firm.padEnd(24)} ${String(n).padStart(4)}`);
}

console.log("\nLeft unknown because sources disagree:");
for (const conflict of CONFLICTS) console.log(`  - ${conflict}`);

console.log(
  "\nNone of this is verified. Every row is aggregator_unverified at needs_review,\n" +
    "and rule values hard-filter a trader's results, so review before approving:\n\n" +
    "  npm run db:import -- data/rules-research.csv            # dry run\n" +
    "  npm run db:import -- data/rules-research.csv --apply    # queue for /admin/rules\n",
);
