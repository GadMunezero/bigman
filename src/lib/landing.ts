import type { ChallengeRecord } from "./types";

/**
 * SEO landing pages.
 *
 * Each one is a real filter over the catalogue plus an explanation of the
 * criteria it used — not a thin page of duplicated text. If no challenge in
 * the catalogue matches, the page says so rather than padding itself out.
 */
export interface LandingConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  /** Plain-language statement of what qualified a challenge for this page. */
  criteria: string[];
  matches: (challenge: ChallengeRecord) => boolean;
  /** How to order the qualifying challenges, best-first for this page's premise. */
  rank?: (a: ChallengeRecord, b: ChallengeRecord) => number;
  emptyNote: string;
}

const byPrice = (a: ChallengeRecord, b: ChallengeRecord) =>
  (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);

const byDrawdown = (a: ChallengeRecord, b: ChallengeRecord) =>
  (b.max_drawdown_pct ?? -1) - (a.max_drawdown_pct ?? -1);

export const LANDING_PAGES: LandingConfig[] = [
  {
    slug: "best-prop-firm-challenges-for-scalping",
    title: "Prop firm challenges for scalping",
    metaTitle: "Prop firm challenges for scalping",
    metaDescription:
      "Challenges whose recorded rules permit scalping, ranked against the criteria explained on the page. Scalping bans and consistency rules are the two things that catch scalpers out.",
    intro: [
      "Scalping gets restricted more often than traders expect, and rarely on the sales page. The two rules that matter most are whether scalping is permitted at all, and whether a consistency rule quietly caps how much of your profit can come from your best day — which is exactly the shape a high-frequency edge produces.",
      "The challenges below have scalping recorded as permitted. That is a filter on our recorded data, not a judgement about which firm is best.",
    ],
    criteria: [
      "Scalping is recorded as allowed, not restricted, prohibited or unconfirmed.",
      "Ordered with the lower entry price first, since scalpers often run several accounts.",
    ],
    matches: (c) => c.rules.scalping === "allowed",
    rank: byPrice,
    emptyNote:
      "No challenge in the catalogue currently has scalping confirmed as allowed. That usually means the rule has not been verified yet rather than that every firm prohibits it.",
  },
  {
    slug: "best-prop-firm-challenges-for-day-trading",
    title: "Prop firm challenges for day trading",
    metaTitle: "Prop firm challenges for day trading",
    metaDescription:
      "Challenges suited to intraday traders, filtered on daily loss rules and drawdown type — the two rules that decide how an intraday session actually feels.",
    intro: [
      "If you are flat by the close, overnight and weekend rules do not constrain you at all. What constrains you is the daily loss limit and the drawdown type: a trailing drawdown moves your loss floor up behind your unrealised profit, which is a very different experience from a static one.",
      "This page filters for challenges with a recorded drawdown figure and lists whether each has a daily loss rule, so you can pick the shape that suits how you trade a session.",
    ],
    criteria: [
      "A maximum drawdown figure is recorded.",
      "Overnight rules are not used as a filter, since intraday traders are not affected by them.",
      "Ordered by roomier drawdown first.",
    ],
    matches: (c) => c.max_drawdown_pct !== null,
    rank: byDrawdown,
    emptyNote: "No challenge in the catalogue has a confirmed drawdown figure yet.",
  },
  {
    slug: "best-prop-firm-challenges-for-swing-trading",
    title: "Prop firm challenges for swing trading",
    metaTitle: "Prop firm challenges for swing trading",
    metaDescription:
      "Challenges that permit holding positions overnight — the single rule that decides whether a swing strategy is possible at all.",
    intro: [
      "For a swing trader this is not a preference, it is a gate. A challenge that prohibits overnight positions cannot run your strategy at any price, which is why our engine eliminates those outright rather than scoring them lower.",
      "Everything below has overnight holding recorded as permitted. Check the weekend rule separately — some firms allow overnight but close positions before the weekend.",
    ],
    criteria: [
      "Overnight holding is recorded as allowed.",
      "Weekend holding is shown per challenge but not used as a filter, since not every swing trade crosses a weekend.",
      "Ordered by roomier drawdown first, since multi-day positions need more room.",
    ],
    matches: (c) => c.rules.overnight === "allowed",
    rank: byDrawdown,
    emptyNote:
      "No challenge in the catalogue currently has overnight holding confirmed as allowed.",
  },
  {
    slug: "prop-firm-challenges-with-no-consistency-rule",
    title: "Prop firm challenges with no consistency rule",
    metaTitle: "Prop firm challenges with no consistency rule",
    metaDescription:
      "Challenges recorded as having no consistency requirement, so a single strong day does not put your payout at risk.",
    intro: [
      "A consistency rule caps how much of your total profit may come from your best day — often around 20% to 50%. It is one of the most common reasons a trader passes the profit target and still cannot withdraw.",
      "It penalises exactly the traders whose edge is concentrated: news traders, breakout traders, and anyone whose month is made by a handful of sessions.",
    ],
    criteria: [
      "The consistency rule is recorded as not required — not merely unconfirmed.",
      "Ordered by lower entry price first.",
    ],
    matches: (c) => c.rules.consistency_rule === "not_required",
    rank: byPrice,
    emptyNote:
      "No challenge in the catalogue is currently confirmed as having no consistency rule. An unconfirmed rule is not the same as an absent one, so nothing is listed here.",
  },
  {
    slug: "prop-firm-challenges-allowing-news-trading",
    title: "Prop firm challenges that allow news trading",
    metaTitle: "Prop firm challenges that allow news trading",
    metaDescription:
      "Challenges recorded as permitting trading around major economic releases, with the restriction status shown for each.",
    intro: [
      "Firms treat news windows very differently. Some permit it outright, some restrict it to certain instruments or block a window either side of a release, and some prohibit it and will void an account that trades through one.",
      "The distinction between 'allowed' and 'restricted' matters here more than almost anywhere else, so it is shown on every card rather than collapsed into a yes.",
    ],
    criteria: [
      "News trading is recorded as allowed.",
      "Challenges where news trading is restricted are excluded, because a restriction usually means a blackout window you must plan around.",
    ],
    matches: (c) => c.rules.news_trading === "allowed",
    rank: byPrice,
    emptyNote:
      "No challenge in the catalogue currently has news trading confirmed as allowed without restriction.",
  },
  {
    slug: "prop-firm-challenges-allowing-overnight-trading",
    title: "Prop firm challenges that allow overnight positions",
    metaTitle: "Prop firm challenges that allow overnight positions",
    metaDescription:
      "Challenges recorded as permitting positions to be held overnight, with weekend rules shown separately.",
    intro: [
      "Holding overnight and holding over a weekend are two different permissions, and plenty of firms grant the first and not the second. If your strategy needs both, check each challenge's weekend rule as well.",
      "Futures traders should also check the daily reset time, since a 'day' for drawdown purposes may not end when your session does.",
    ],
    criteria: [
      "Overnight holding is recorded as allowed.",
      "Weekend status is displayed but not filtered on.",
    ],
    matches: (c) => c.rules.overnight === "allowed",
    rank: byPrice,
    emptyNote: "No challenge in the catalogue currently has overnight holding confirmed as allowed.",
  },
  {
    slug: "best-100k-prop-firm-challenges",
    title: "$100K prop firm challenges",
    metaTitle: "$100K prop firm challenges",
    metaDescription:
      "Every $100,000 challenge in our catalogue, with price, drawdown, profit target and the rules that decide whether you can trade your strategy.",
    intro: [
      "$100K is the size most traders converge on: large enough that a realistic monthly return is meaningful, small enough that the entry fee is recoverable.",
      "At the same size, the rules are what separate these — drawdown type, daily loss, consistency and payout terms will differ far more than the headline number suggests.",
    ],
    criteria: [
      "Account size is recorded as exactly $100,000.",
      "Ordered by lower entry price first.",
    ],
    matches: (c) => c.account_size === 100_000,
    rank: byPrice,
    emptyNote: "No $100,000 challenge is currently recorded in the catalogue.",
  },
  {
    slug: "best-prop-firm-challenges-under-100",
    title: "Prop firm challenges under $100",
    metaTitle: "Prop firm challenges under $100",
    metaDescription:
      "Challenges with a confirmed entry price below $100 — and why the cheapest option is not automatically the one that fits you.",
    intro: [
      "A low entry fee is a real advantage, particularly if you expect to need more than one attempt. But price is one criterion out of eight in our scoring, and it is the one least likely to predict whether you can actually trade your strategy inside the rules.",
      "A $39 challenge with a consistency rule and no overnight holding can be far harder for a specific trader than a $79 one with neither.",
    ],
    criteria: [
      "A confirmed entry price below $100. Challenges whose price we have not verified are excluded rather than assumed cheap.",
      "Ordered by lower price first.",
    ],
    matches: (c) => c.price !== null && c.price < 100,
    rank: byPrice,
    emptyNote:
      "No challenge in the catalogue currently has a confirmed price under $100. Unconfirmed prices are excluded from this page on purpose.",
  },
];

export function getLandingConfig(slug: string): LandingConfig | null {
  return LANDING_PAGES.find((page) => page.slug === slug) ?? null;
}
