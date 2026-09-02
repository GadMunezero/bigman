/**
 * Applies the supplied master rules table to data/futures-specs.json.
 *
 * The richest source this project has had: price, profit target, maximum
 * drawdown, drawdown type, profit split, payout cadence, contract limits and
 * activation fee, per firm × program × size. It overwrites, because it is the
 * latest supplied table and the specs file already records that rule — where
 * two supplied lists disagree, the later one wins. Every replacement is
 * printed with the value it displaced.
 *
 * Where the table names a program the file does not have, the product is
 * created. Where it names a size the product lacks, the size is added. Both
 * are reported.
 *
 * What is deliberately NOT applied, and why:
 *
 *   Two blocks in the table have no firm name. One is identifiable with
 *   confidence — its $70.35 and $179.00 fifty-thousand rows match the
 *   DayTraders figures from the previous table exactly — and is applied as
 *   DayTraders. The other (a $130 activation fee across 25K-150K with an 80%
 *   split) matches no firm on file well enough to place, so it is reported
 *   and left out rather than guessed onto the wrong firm.
 *
 *   Ranges stay out of the price column, as everywhere else. "$4,500-$5,000"
 *   for a Tradeify 150K drawdown is two different accounts, and picking an
 *   end states a figure the firm does not publish for that row.
 *
 *   npx tsx db/apply-rules-table.ts            # dry run
 *   npx tsx db/apply-rules-table.ts --apply
 */
import fs from "node:fs";
import path from "node:path";

interface SizeSpec {
  target?: number;
  dd?: number;
  daily?: number;
  price?: number;
  contracts?: string;
  activation_fee?: number;
}
interface Product {
  firm: string;
  product: string;
  program?: string;
  sizes: Record<string, SizeSpec>;
  [key: string]: unknown;
}

/** One row of the supplied table. */
interface Row {
  firm: string;
  product: string;
  size: number;
  price?: number;
  billing?: "one_time" | "monthly";
  target?: number;
  dd?: number;
  ddType?: "static" | "trailing" | "eod_trailing" | "intraday_trailing";
  split?: number;
  payoutDays?: number;
  contracts?: string;
  activation?: number;
  maxPayout?: number;
  platforms?: string;
  /** Instant-funded rows have no evaluation to pass. */
  instant?: boolean;
  note?: string;
}

const TOPSTEP_PLATFORMS = "TopstepX;Quantower";
const LUCID_PLATFORMS =
  "NinjaTrader;TradingView;Tradovate;Quantower;Sierra Chart;Bookmap;ATAS;Jigsaw";
const TRADEIFY_PLATFORMS = "TradingView;Tradovate;WealthCharts";
const MFF_PLATFORMS = "TradingView;NinjaTrader;Tradovate;Quantower";
const FN_PLATFORMS = "TradingView;Tradovate;NinjaTrader";
const APEX_PLATFORMS = "Rithmic;Tradovate;WealthCharts";
const GOAT_PLATFORMS = "TradingView;NinjaTrader";
const TRADEDAY_PLATFORMS = "NinjaTrader;TradingView;Tradovate";
const BG_PLATFORMS = "TradingView;Tradovate;NinjaTrader";

const ROWS: Row[] = [
  // ---- Topstep ------------------------------------------------------------
  ...[[50000, 49, 3000, 2000, "5/50"], [100000, 99, 6000, 3000, "10/100"], [150000, 199, 9000, 4500, "15/150"]].map(
    ([size, price, target, dd, contracts]) => ({
      firm: "Topstep", product: "Trading Combine", size: size as number, price: price as number,
      billing: "monthly" as const, target: target as number, dd: dd as number,
      ddType: "eod_trailing" as const, split: 90, contracts: contracts as string,
      activation: 149, platforms: TOPSTEP_PLATFORMS,
    }),
  ),
  ...[[50000, 95, 3000, 2000, "5/50"], [100000, 149, 6000, 3000, "10/100"], [150000, 229, 9000, 4500, "15/150"]].map(
    ([size, price, target, dd, contracts]) => ({
      firm: "Topstep", product: "Trading Combine No Activation Fee", size: size as number,
      price: price as number, billing: "monthly" as const, target: target as number, dd: dd as number,
      ddType: "eod_trailing" as const, split: 90, contracts: contracts as string,
      activation: 0, platforms: TOPSTEP_PLATFORMS,
    }),
  ),

  // ---- Lucid Trading ------------------------------------------------------
  // The four-size ladder is LucidPro in this table, not LucidFlex as the
  // earlier price table was read. This one is later, so it wins.
  ...[[25000, 65.3, 1250, 1000, "2/20"], [50000, 105.2, 3000, 2000, "4/40"],
      [100000, 215.6, 6000, 3000, "6/60"], [150000, 295.4, 9000, 4500, "10/100"]].map(
    ([size, price, target, dd, contracts]) => ({
      firm: "Lucid Trading", product: "LucidPro", size: size as number, price: price as number,
      billing: "one_time" as const, target: target as number, dd: dd as number,
      ddType: "eod_trailing" as const, split: 90, payoutDays: 5,
      contracts: contracts as string, platforms: LUCID_PLATFORMS,
    }),
  ),

  // ---- Tradeify -----------------------------------------------------------
  ...[[25000, 59.4, 1500, 1000, "1/10"], [50000, 87, 3000, 2000, "4/40"],
      [100000, 153, 6000, 3000, "8/80"]].map(([size, price, target, dd, contracts]) => ({
    firm: "Tradeify", product: "Growth", size: size as number, price: price as number,
    billing: "one_time" as const, target: target as number, dd: dd as number,
    ddType: "eod_trailing" as const, split: 90, contracts: contracts as string,
    platforms: TRADEIFY_PLATFORMS,
  })),
  {
    firm: "Tradeify", product: "Growth", size: 150000, price: 221.4, billing: "one_time",
    target: 9000, ddType: "eod_trailing", split: 90, contracts: "12/120",
    platforms: TRADEIFY_PLATFORMS,
    note: "The 150K drawdown is published as $4,500-$5,000; a range is not a figure, so it is not recorded.",
  },
  ...[[25000, 65.4, 1500, 1000, "1/10"], [50000, 99, 3000, 2000, "4/40"],
      [100000, 159, 6000, 3000, "8/80"]].map(([size, price, target, dd, contracts]) => ({
    firm: "Tradeify", product: "Select", size: size as number, price: price as number,
    billing: "one_time" as const, target: target as number, dd: dd as number,
    ddType: "eod_trailing" as const, split: 90, contracts: contracts as string,
    platforms: TRADEIFY_PLATFORMS,
  })),
  {
    firm: "Tradeify", product: "Select", size: 150000, price: 221.4, billing: "one_time",
    target: 9000, ddType: "eod_trailing", split: 90, contracts: "12/120",
    platforms: TRADEIFY_PLATFORMS,
    note: "The 150K drawdown is published as $4,500-$5,000; a range is not a figure, so it is not recorded.",
  },
  // Lightning is instant-funded: no evaluation, hence no profit target.
  ...[[25000, 207, 1000, "1/10"], [50000, 295.2, 2000, "4/40"],
      [100000, 396, 4000, "8/80"], [150000, 477.6, 5000, "12/120"]].map(
    ([size, price, dd, contracts]) => ({
      firm: "Tradeify", product: "Lightning Funded", size: size as number, price: price as number,
      billing: "one_time" as const, dd: dd as number, ddType: "eod_trailing" as const,
      split: 90, contracts: contracts as string, platforms: TRADEIFY_PLATFORMS, instant: true,
    }),
  ),

  // ---- My Funded Futures --------------------------------------------------
  { firm: "My Funded Futures", product: "Builder", size: 25000, price: 52.5, billing: "monthly",
    target: 1500, dd: 1000, ddType: "eod_trailing", split: 80, payoutDays: 2, platforms: MFF_PLATFORMS },
  // Rapid at 25K is trailing where the larger sizes are end-of-day. That is a
  // per-size mechanic difference, which the schema stores per product — so the
  // 25K row is split out rather than silently flattened.
  { firm: "My Funded Futures", product: "Rapid 25K Trailing", size: 25000, price: 19.99,
    billing: "monthly", target: 1500, dd: 1000, ddType: "trailing", split: 90,
    contracts: "3/30", platforms: MFF_PLATFORMS,
    note: "Split out from the main Rapid plan because this size uses a trailing drawdown while the larger Rapid sizes use end-of-day, and the mechanic is stored per product." },
  { firm: "My Funded Futures", product: "Rapid", size: 50000, price: 78.5, billing: "monthly",
    target: 3000, dd: 2000, ddType: "eod_trailing", split: 90, contracts: "5/50", platforms: MFF_PLATFORMS },
  { firm: "My Funded Futures", product: "Pro", size: 100000, price: 172, billing: "monthly",
    target: 6000, dd: 3000, ddType: "eod_trailing", split: 80, payoutDays: 14,
    contracts: "6/60", platforms: MFF_PLATFORMS },
  { firm: "My Funded Futures", product: "Pro", size: 150000, price: 238.5, billing: "monthly",
    target: 9000, dd: 4500, ddType: "eod_trailing", split: 80, payoutDays: 14,
    contracts: "9/90", platforms: MFF_PLATFORMS },
  { firm: "My Funded Futures", product: "Rapid EOD", size: 50000, price: 125.6, billing: "one_time",
    target: 3000, dd: 2000, ddType: "eod_trailing", split: 90, contracts: "3/30", platforms: MFF_PLATFORMS },

  // ---- FundedNext Futures -------------------------------------------------
  { firm: "FundedNext Futures", product: "Flex", size: 25000, price: 79.99, billing: "one_time",
    target: 1500, dd: 1000, ddType: "eod_trailing", split: 90, payoutDays: 1, platforms: FN_PLATFORMS },
  { firm: "FundedNext Futures", product: "Flex", size: 50000, price: 60.3, billing: "one_time",
    target: 2500, dd: 1500, ddType: "eod_trailing", split: 95, platforms: FN_PLATFORMS },
  { firm: "FundedNext Futures", product: "Flex", size: 100000, price: 112.5, billing: "one_time",
    target: 5000, dd: 2500, ddType: "eod_trailing", split: 95, platforms: FN_PLATFORMS },
  { firm: "FundedNext Futures", product: "Flex", size: 150000, price: 217.8, billing: "one_time",
    target: 8000, dd: 4000, ddType: "eod_trailing", split: 95, platforms: FN_PLATFORMS },
  { firm: "FundedNext Futures", product: "Rapid Pro", size: 50000, price: 149.99, billing: "one_time",
    target: 3000, dd: 2000, ddType: "eod_trailing", split: 90, payoutDays: 3, platforms: FN_PLATFORMS },
  { firm: "FundedNext Futures", product: "Rapid Pro", size: 100000, price: 249.99, billing: "one_time",
    target: 5000, dd: 2500, ddType: "eod_trailing", split: 90, payoutDays: 1, platforms: FN_PLATFORMS },

  // ---- Apex Trader Funding ------------------------------------------------
  ...[[25000, 16.7, 1500, 1000, "4/40"], [50000, 19.7, 3000, 2000, "6/60"],
      [100000, 29.7, 6000, 3000, "14/140"], [150000, 49.7, 9000, 4000, "17/170"],
      [250000, 59.7, 15000, 6500, "27/270"], [300000, 69.7, 20000, 7500, "35/350"]].map(
    ([size, price, target, dd, contracts]) => ({
      firm: "Apex Trader Funding", product: "Evaluation", size: size as number, price: price as number,
      billing: "monthly" as const, target: target as number, dd: dd as number,
      ddType: "intraday_trailing" as const, split: 100, contracts: contracts as string,
      platforms: APEX_PLATFORMS,
    }),
  ),

  // ---- E8 Futures ---------------------------------------------------------
  // The table sells several configurations at the same size, so each is its own
  // product rather than one row overwriting another.
  { firm: "E8 Futures", product: "Challenge", size: 25000, price: 88, billing: "one_time",
    target: 1500, dd: 1000, ddType: "eod_trailing", split: 80, payoutDays: 5 },
  { firm: "E8 Futures", product: "Challenge Daily", size: 50000, price: 115.7, billing: "one_time",
    target: 3000, dd: 1500, ddType: "eod_trailing", split: 80, payoutDays: 1 },
  { firm: "E8 Futures", product: "Challenge", size: 50000, price: 120, billing: "one_time",
    target: 3000, dd: 2000, ddType: "eod_trailing", split: 80, payoutDays: 5 },
  { firm: "E8 Futures", product: "Challenge Daily", size: 100000, price: 180.7, billing: "one_time",
    target: 6500, dd: 3000, ddType: "trailing", split: 80, payoutDays: 1 },
  { firm: "E8 Futures", product: "Challenge", size: 100000, price: 208, billing: "one_time",
    target: 6000, dd: 4000, ddType: "eod_trailing", split: 80, payoutDays: 5 },
  { firm: "E8 Futures", product: "Challenge", size: 150000, price: 312, billing: "one_time",
    target: 9000, dd: 6000, ddType: "eod_trailing", split: 80, payoutDays: 5 },
  { firm: "E8 Futures", product: "Challenge Static", size: 200000, price: 362.7, billing: "one_time",
    target: 13500, dd: 6000, ddType: "static", split: 80, payoutDays: 1 },

  // ---- Goat Funded Futures ------------------------------------------------
  { firm: "Goat Funded Futures", product: "Sprint Challenge", size: 25000, price: 79, billing: "one_time",
    target: 1500, dd: 1000, ddType: "eod_trailing", split: 90, platforms: GOAT_PLATFORMS },
  { firm: "Goat Funded Futures", product: "Sprint Challenge", size: 50000, price: 109, billing: "one_time",
    target: 3000, dd: 2000, ddType: "eod_trailing", split: 90, platforms: GOAT_PLATFORMS },
  { firm: "Goat Funded Futures", product: "Flex Challenge", size: 50000, price: 99, billing: "one_time",
    target: 3000, dd: 2000, ddType: "eod_trailing", split: 80, platforms: GOAT_PLATFORMS },
  { firm: "Goat Funded Futures", product: "Flex Challenge", size: 100000, price: 159, billing: "one_time",
    target: 5000, dd: 3000, ddType: "eod_trailing", split: 80, platforms: GOAT_PLATFORMS,
    note: "The table shows a 90% split on the 100K Flex against 80% on the other Flex sizes; 80 is kept as the plan rate and the discrepancy needs settling." },
  { firm: "Goat Funded Futures", product: "Flex Challenge", size: 150000, price: 299, billing: "one_time",
    target: 9000, dd: 4500, ddType: "eod_trailing", split: 80, platforms: GOAT_PLATFORMS },
  { firm: "Goat Funded Futures", product: "EOD Challenge", size: 100000, price: 132, billing: "one_time",
    target: 6000, dd: 3000, ddType: "eod_trailing", split: 80, platforms: GOAT_PLATFORMS },
  { firm: "Goat Funded Futures", product: "EOD Challenge", size: 150000, price: 185, billing: "one_time",
    target: 9000, dd: 4500, ddType: "eod_trailing", split: 80, platforms: GOAT_PLATFORMS },

  // ---- TradeDay -----------------------------------------------------------
  ...[["Quick Pay Intraday", "intraday_trailing", [[50000, 58.95], [100000, 108], [150000, 162]], 1],
      ["Quick Pay EOD", "eod_trailing", [[50000, 78.75], [100000, 128.25], [150000, 180]], 1],
      ["Fast Pass", "eod_trailing", [[50000, 85.05], [100000, 148.5], [150000, 225]], 5]].flatMap(
    ([product, ddType, rows, payoutDays]) =>
      (rows as number[][]).map(([size, price]) => ({
        firm: "TradeDay", product: product as string, size, price,
        billing: "monthly" as const,
        target: size === 50000 ? 3000 : size === 100000 ? 6000 : 9000,
        dd: size === 50000 ? 2000 : size === 100000 ? 3000 : 4500,
        ddType: ddType as Row["ddType"], split: 80, payoutDays: payoutDays as number,
        maxPayout: 10000, platforms: TRADEDAY_PLATFORMS,
      })),
  ),

  // ---- Funded Futures Family ----------------------------------------------
  ...[["Velocity", [[25000, 15.8], [50000, 25], [100000, 45], [150000, 65]]],
      ["Premier Plus", [[25000, 68.4], [50000, 92.4], [100000, 137.4], [150000, 191.4]]]].flatMap(
    ([product, rows]) =>
      (rows as number[][]).map(([size, price]) => ({
        firm: "Funded Futures Family", product: product as string, size, price,
        billing: "monthly" as const,
        target: size === 25000 ? 1500 : size === 50000 ? 3000 : size === 100000 ? 7000 : 10000,
        dd: size === 25000 ? 1000 : size === 50000 ? 2000 : size === 100000 ? 3250 : 4750,
        ddType: "intraday_trailing" as const,
      })),
  ),

  // ---- Top One Futures ----------------------------------------------------
  { firm: "Top One Futures", product: "Elite Daily", size: 50000, price: 87.2, billing: "monthly",
    target: 3000, dd: 2000, ddType: "eod_trailing", split: 90, payoutDays: 1, contracts: "3/30" },
  { firm: "Top One Futures", product: "Elite Daily", size: 100000, price: 159.2, billing: "monthly",
    target: 6000, dd: 3000, ddType: "eod_trailing", split: 90, payoutDays: 1, contracts: "5/50" },
  { firm: "Top One Futures", product: "Elite Daily", size: 150000, price: 219.6, billing: "monthly",
    target: 9000, dd: 4500, ddType: "eod_trailing", split: 90, payoutDays: 1, contracts: "7/70" },

  // ---- Traders Launch -----------------------------------------------------
  { firm: "Traders Launch", product: "Futures Evaluation", size: 100000, price: 39.2, billing: "one_time",
    target: 2000, dd: 1000, ddType: "eod_trailing", split: 55, payoutDays: 3, contracts: "5" },
  { firm: "Traders Launch", product: "Futures Evaluation", size: 200000, price: 59.2, billing: "one_time",
    target: 3000, dd: 1000, ddType: "eod_trailing", split: 55, payoutDays: 3, contracts: "1/10" },
  { firm: "Traders Launch", product: "Futures Evaluation", size: 300000, price: 111.2, billing: "one_time",
    target: 5000, dd: 2000, ddType: "eod_trailing", split: 55, payoutDays: 3, contracts: "2/20" },
  { firm: "Traders Launch", product: "Futures Evaluation 80% Split", size: 300000, price: 223.2,
    billing: "one_time", target: 5000, dd: 2000, ddType: "eod_trailing", split: 80, payoutDays: 3,
    contracts: "2/20",
    note: "The same size sold at a higher price for a better split — the two are separate products because the split is what you are buying." },

  // ---- FuturesElite -------------------------------------------------------
  { firm: "FuturesElite", product: "Elite", size: 50000, price: 116.35, billing: "one_time",
    target: 3000, dd: 2000, ddType: "eod_trailing", split: 90, payoutDays: 1, contracts: "4/40" },
  { firm: "FuturesElite", product: "Elite", size: 100000, price: 202.4, billing: "one_time",
    target: 6000, dd: 3000, ddType: "eod_trailing", split: 90, payoutDays: 1, contracts: "8/80" },
  { firm: "FuturesElite", product: "Elite", size: 150000, price: 239.85, billing: "one_time",
    target: 9000, dd: 4500, ddType: "eod_trailing", split: 90, payoutDays: 1, contracts: "10/100" },
  { firm: "FuturesElite", product: "Instant Challenge", size: 100000, price: 375.2, billing: "one_time",
    dd: 3000, ddType: "eod_trailing", split: 80, payoutDays: 10, contracts: "8/80", instant: true },

  // ---- Earn2Trade ---------------------------------------------------------
  { firm: "Earn2Trade", product: "Trader Career Path", size: 25000, price: 90, billing: "monthly" },
  { firm: "Earn2Trade", product: "Trader Career Path", size: 50000, price: 114, billing: "monthly" },
  { firm: "Earn2Trade", product: "Trader Career Path", size: 100000, price: 210, billing: "monthly",
    target: 6000, dd: 3500, ddType: "trailing", split: 80, payoutDays: 7, contracts: "12/120" },
  { firm: "Earn2Trade", product: "Gauntlet Mini", size: 50000, price: 102, billing: "monthly" },
  { firm: "Earn2Trade", product: "Gauntlet Mini", size: 100000, price: 189, billing: "monthly" },
  { firm: "Earn2Trade", product: "Gauntlet Mini", size: 150000, price: 225, billing: "monthly" },

  // ---- DayTraders ---------------------------------------------------------
  // The unnamed block is identifiable: its $70.35 and $179.00 rows at 50K match
  // the DayTraders figures in the previous supplied table exactly.
  { firm: "DayTraders", product: "EOD", size: 25000, price: 46.35, billing: "one_time",
    target: 1500, dd: 1500, ddType: "eod_trailing", split: 100, payoutDays: 8, contracts: "6/60" },
  { firm: "DayTraders", product: "Static", size: 50000, price: 40, billing: "one_time",
    target: 3750, dd: 1000, ddType: "static", split: 100, payoutDays: 8, contracts: "6/60" },
  { firm: "DayTraders", product: "Trail", size: 50000, price: 70.35, billing: "one_time",
    target: 3000, dd: 2000, ddType: "intraday_trailing", split: 100, payoutDays: 8, contracts: "10/100" },
  { firm: "DayTraders", product: "Trail 80% Split", size: 50000, price: 179, billing: "one_time",
    target: 3000, dd: 2000, ddType: "intraday_trailing", split: 80, payoutDays: 8, contracts: "2/20" },
  { firm: "DayTraders", product: "S2F", size: 50000, price: 342, billing: "one_time",
    dd: 2500, ddType: "eod_trailing", split: 100, payoutDays: 8, contracts: "10/100", instant: true },
  { firm: "DayTraders", product: "Static", size: 100000, price: 65, billing: "one_time",
    target: 5750, dd: 1500, ddType: "static", split: 100, payoutDays: 8, contracts: "8/80" },
  { firm: "DayTraders", product: "Trail", size: 150000, price: 104.85, billing: "one_time",
    target: 8500, dd: 4500, ddType: "intraday_trailing", split: 100, payoutDays: 8, contracts: "24/240" },
  { firm: "DayTraders", product: "Trail 80% Split", size: 150000, price: 319, billing: "one_time",
    target: 8500, dd: 4500, ddType: "intraday_trailing", split: 80, payoutDays: 8, contracts: "3/30" },
  { firm: "DayTraders", product: "Trail", size: 300000, price: 131.85, billing: "one_time",
    target: 15000, dd: 7000, ddType: "intraday_trailing", split: 100, payoutDays: 8, contracts: "40/400" },
  { firm: "DayTraders", product: "Trail 80% Split", size: 300000, price: 449, billing: "one_time",
    target: 15000, dd: 7000, ddType: "intraday_trailing", split: 80, payoutDays: 8, contracts: "4/40" },

  // ---- Blue Guardian Futures ----------------------------------------------
  { firm: "Blue Guardian Futures", product: "Standard", size: 50000, price: 115.5, billing: "one_time",
    ddType: "trailing", split: 90, payoutDays: 5, platforms: BG_PLATFORMS,
    note: "The supplied price carries an asterisk in the source table, so treat it as provisional." },

  // ---- Blueberry Futures --------------------------------------------------
  ...[[25000, 44.16, 1500, 1000, "1/10"], [50000, 73.6, 3000, 2000, "2/20"],
      [100000, 110.4, 6000, 3000, "6/60"], [150000, 181.6, 10000, 4500, "9/90"]].map(
    ([size, price, target, dd, contracts]) => ({
      firm: "Blueberry Futures", product: "Accelerated Trailing", size: size as number,
      price: price as number, billing: "monthly" as const, target: target as number, dd: dd as number,
      ddType: "intraday_trailing" as const, split: 90, payoutDays: 5, contracts: contracts as string,
    }),
  ),
  ...[[25000, 55.6, 1500, 1000, "1/10"], [50000, 98, 3000, 2000, "2/20"],
      [100000, 147.2, 6000, 3000, "6/60"], [150000, 242.8, 10000, 4500, "9/90"]].map(
    ([size, price, target, dd, contracts]) => ({
      firm: "Blueberry Futures", product: "Ascent EOD", size: size as number,
      price: price as number, billing: "monthly" as const, target: target as number, dd: dd as number,
      ddType: "eod_trailing" as const, split: 90, payoutDays: 5, contracts: contracts as string,
    }),
  ),
];

/**
 * The block in the table with no firm name, a $130 activation fee and a 75K
 * size. Reported rather than placed: no firm on file matches it closely enough,
 * and putting a whole price ladder on the wrong firm is worse than leaving it
 * out.
 */
const UNPLACED =
  "One block in the supplied table has no firm name: 25K/50K/75K/100K/150K at $90-$216 a month, " +
  "80% split, EOD trailing, $130 activation fee, payouts after a buffer. No firm on file matches " +
  "it well enough to place. Name the firm and it goes straight in.";

// ---------------------------------------------------------------------------

const apply = process.argv.includes("--apply");
const specsPath = path.join(process.cwd(), "data", "futures-specs.json");
const specs = JSON.parse(fs.readFileSync(specsPath, "utf8")) as {
  _comment: string[];
  products: Product[];
};

const changed: string[] = [];
const newProducts: string[] = [];
const newSizes: string[] = [];
const notes: string[] = [];

const setProduct = (product: Product, key: string, value: unknown, label: string) => {
  const before = product[key];
  if (before === value) return;
  product[key] = value;
  changed.push(
    `${product.firm} ${product.product}.${label}: ${before === undefined ? "(unset)" : JSON.stringify(before)} -> ${JSON.stringify(value)}`,
  );
};

const setSize = (product: Product, sizeKey: string, key: keyof SizeSpec, value: unknown) => {
  const size = product.sizes[sizeKey];
  const before = size[key];
  if (before === value) return;
  (size as Record<string, unknown>)[key] = value;
  changed.push(
    `${product.firm} ${product.product} $${Number(sizeKey) / 1000}K.${key}: ${before === undefined ? "(blank)" : String(before)} -> ${String(value)}`,
  );
};

for (const row of ROWS) {
  let product = specs.products.find((p) => p.firm === row.firm && p.product === row.product);

  if (!product) {
    product = {
      firm: row.firm,
      product: row.product,
      program: row.instant ? "instant_funding" : "evaluation",
      sizes: {},
      source: "Supplied master rules table",
      secondhand: true,
    } as Product;
    specs.products.push(product);
    newProducts.push(`${row.firm} — ${row.product}`);
  }

  // An instant-funded product has no evaluation, so it must not carry a target.
  if (row.instant && product.program !== "instant_funding") {
    setProduct(product, "program", "instant_funding", "program");
  }

  if (row.ddType) setProduct(product, "drawdown_type", row.ddType, "drawdown_type");
  if (row.split !== undefined) setProduct(product, "split", row.split, "split");
  if (row.payoutDays !== undefined) setProduct(product, "payout_days", row.payoutDays, "payout_days");
  if (row.billing) setProduct(product, "billing", row.billing, "billing");
  if (row.maxPayout !== undefined) setProduct(product, "max_payout", row.maxPayout, "max_payout");
  if (row.platforms) setProduct(product, "platforms", row.platforms, "platforms");

  if (row.note && !String(product.notes ?? "").includes(row.note)) {
    product.notes = product.notes ? `${product.notes} ${row.note}` : row.note;
    notes.push(`${row.firm} ${row.product}: ${row.note}`);
  }

  const sizeKey = String(row.size);
  if (!product.sizes[sizeKey]) {
    product.sizes[sizeKey] = {};
    newSizes.push(`${row.firm} ${row.product} $${row.size / 1000}K`);
  }

  if (row.price !== undefined) setSize(product, sizeKey, "price", row.price);
  if (row.target !== undefined) setSize(product, sizeKey, "target", row.target);
  if (row.dd !== undefined) setSize(product, sizeKey, "dd", row.dd);
  if (row.contracts) setSize(product, sizeKey, "contracts", row.contracts);
  if (row.activation !== undefined) setSize(product, sizeKey, "activation_fee", row.activation);
}

console.log(`${apply ? "Applied" : "Would apply"} ${changed.length} field changes from the master rules table.`);
if (newProducts.length) console.log(`\nCreated ${newProducts.length} products the file did not have:\n   ` + newProducts.join("\n   "));
if (newSizes.length) console.log(`\nAdded ${newSizes.length} sizes:\n   ` + newSizes.join("\n   "));
if (notes.length) console.log(`\n${notes.length} notes recorded:\n   ` + notes.map((n) => n.slice(0, 160)).join("\n   "));
console.log(`\n?? ${UNPLACED}`);

if (apply) {
  fs.writeFileSync(specsPath, JSON.stringify(specs, null, 2) + "\n");
  console.log(`\nWrote ${specsPath}.`);
} else {
  console.log("\nDry run — nothing written. Re-run with --apply.");
}
