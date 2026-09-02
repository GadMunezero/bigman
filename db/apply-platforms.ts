/**
 * Applies the supplied platform table to every specs file.
 *
 * Platforms are recorded per FIRM, not per product, because that is how the
 * table states them and how the firms actually work — a firm supports a set of
 * platforms and sells several account types on all of them. Where a product
 * genuinely differs, edit that product afterwards; this sets the firm default.
 *
 * This overwrites the abbreviated platform lists that arrived with the master
 * rules table ("TradingView / Tradovate / WealthCharts"), because this table is
 * both later and fuller.
 *
 * Platform support is not decoration. It is a hard filter for an algorithmic
 * trader — permission to run an EA is worthless on a platform your system
 * cannot connect to — and a scored preference for everyone else.
 *
 *   npx tsx db/apply-platforms.ts            # dry run
 *   npx tsx db/apply-platforms.ts --apply
 */
import fs from "node:fs";
import path from "node:path";

interface Product {
  firm: string;
  product: string;
  [key: string]: unknown;
}

interface FirmPlatforms {
  /** Execution platforms, in the order the table lists them. */
  platforms: string[];
  /** Broker or data connection. */
  dataFeed?: string;
  /**
   * Set where the table ends the list with "etc." or similar. The recorded set
   * is then a floor rather than the whole story, and saying so keeps the site
   * from implying a platform is unsupported when the list was simply truncated.
   */
  partial?: boolean;
}

const TABLE: Record<string, FirmPlatforms> = {
  "Lucid Trading": {
    platforms: ["NinjaTrader", "Quantower", "MotiveWave", "Tradovate", "TradingView", "ATAS", "Bookmap", "Jigsaw Daytradr", "MultiCharts", "R Trader Pro", "Sierra Chart", "Tradesea"],
    dataFeed: "EdgeClear, NinjaTrader",
  },
  "My Funded Futures": {
    platforms: ["NinjaTrader", "Quantower", "TradingView", "Tradovate", "ATAS", "Deepcharts", "DeepDom", "Volumetrica Trading"],
    dataFeed: "DXFeed, NinjaTrader",
  },
  Tradeify: {
    platforms: ["NinjaTrader", "Quantower", "R Trader", "Sierra Chart", "Tradesea", "TradingView", "Tradovate", "WealthCharts"],
    dataFeed: "Rithmic, Tradovate, WealthCharts",
  },
  "Top One Futures": {
    platforms: ["NinjaTrader", "TradingView", "Tradovate"],
    dataFeed: "NinjaTrader",
  },
  "FundedNext Futures": {
    platforms: ["NinjaTrader", "TradingView", "Tradovate"],
    dataFeed: "NinjaTrader",
  },
  "Goat Funded Futures": {
    platforms: ["NinjaTrader", "Quantower", "TradingView", "Tradovate", "ATAS", "Deepcharts", "Deepmap", "Tickblaze", "Volumetrica"],
    dataFeed: "CQG, DXFeed, Tickblaze",
  },
  Topstep: {
    platforms: ["TopstepX", "Quantower"],
    dataFeed: "TopstepX own data feed",
  },
  "Traders Launch": {
    platforms: ["Interactive Brokers", "NinjaTrader", "Quantower", "Volumetrica Trading"],
    dataFeed: "Interactive Brokers, NinjaTrader",
  },
  "Apex Trader Funding": {
    platforms: ["NinjaTrader", "Quantower", "TradingView", "Tradovate", "Rithmic", "R Trader Pro", "Sierra Chart", "ATAS", "Bookmap", "Jigsaw", "MotiveWave", "EdgeProX", "Finamark", "VolFix", "WealthCharts"],
    dataFeed: "Rithmic, Tradovate, WealthCharts",
  },
  "Funded Futures Family": {
    platforms: ["NinjaTrader", "TradingView", "Tradovate", "WealthCharts"],
    dataFeed: "NinjaTrader, WealthCharts",
  },
  "E8 Futures": {
    platforms: ["TradingView", "Tradovate"],
    dataFeed: "NinjaTrader",
  },
  FuturesElite: {
    platforms: ["NinjaTrader", "Quantower", "Tradovate", "ATAS", "Deepcharts", "Deepmap", "Volumetrica Trading"],
    dataFeed: "Dorman, DXFeed, EdgeClear, NinjaTrader",
  },
  Earn2Trade: {
    platforms: ["NinjaTrader", "TradingView", "Tradovate", "Quantower", "Rithmic", "R Trader", "R Trader Pro", "Sierra Chart", "ATAS", "Bookmap", "Finamark", "Jigsaw", "MotiveWave", "MultiCharts", "OverCharts", "Photon", "QScalp", "QSI", "Scalp Tool", "Trade Navigator", "Investor/RT", "Inside Edge Trader"],
    dataFeed: "Dorman, EdgeClear, Lunaro Markets, NinjaTrader, Phillip Capital",
  },
  DayTraders: {
    platforms: ["NinjaTrader", "TradingView", "Tradovate", "Quantower", "Rithmic", "R Trader Pro", "Sierra Chart", "ATAS", "Bookmap", "MotiveWave", "Jigsaw"],
    dataFeed: "Rithmic, Tradovate, WealthCharts",
    partial: true,
  },
  TradeDay: {
    platforms: ["NinjaTrader", "TradingView", "Tradovate", "Jigsaw Daytradr", "TradeDayX", "ATAS", "Bookmap", "EdgeProX", "Finamark", "MotiveWave", "MultiCharts", "OverCharts", "Quantower", "R Trader Pro", "Sierra Chart", "VolFix", "WealthCharts"],
    dataFeed: "CQG, Rithmic, NinjaTrader",
  },
  "Take Profit Trader": {
    platforms: ["NinjaTrader", "TradingView", "Tradovate", "Quantower", "R Trader", "ATAS", "Bookmap", "Finamark", "Investor/RT", "Jigsaw", "MotiveWave", "MultiCharts", "Trade Navigator", "VolFix"],
    dataFeed: "CQG, Rithmic",
  },
  "Hola Prime Futures": {
    platforms: ["DX Futures", "NinjaTrader", "TradingView", "Tradovate", "WealthCharts"],
  },
  "The Trading Pit Futures": {
    platforms: ["MotiveWave", "Volumetrica Trading", "Rithmic"],
    dataFeed: "Varies by program",
    partial: true,
  },
  "Blue Guardian Futures": {
    platforms: ["Deepcharts", "NinjaTrader", "TradingView", "Tradovate"],
    dataFeed: "DXFeed, NinjaTrader",
  },
  AquaFutures: {
    platforms: ["Deepcharts", "Tradovate"],
    dataFeed: "CME Group",
  },
  "Blueberry Futures": {
    platforms: ["BlackArrow"],
    dataFeed: "BlackArrow",
  },
  "Ylos Trading": {
    platforms: ["BlackArrow"],
  },
  "The5ers Futures": {
    platforms: ["BlackArrow"],
    dataFeed: "BlackArrow",
  },
};

const PARTIAL_NOTE =
  "The supplied platform list for this firm ends in 'etc.', so the platforms on file are the ones named rather than the complete set — treat an absence here as unrecorded, not unsupported.";

// ---------------------------------------------------------------------------

const apply = process.argv.includes("--apply");
const SPEC_FILES = ["data/futures-specs.json", "data/cfd-specs.json"];

let productsTouched = 0;
const firmsSeen = new Set<string>();
const replaced: string[] = [];
const unmatched = new Set(Object.keys(TABLE));

for (const file of SPEC_FILES) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  const specs = JSON.parse(fs.readFileSync(full, "utf8")) as { products: Product[] };

  for (const product of specs.products) {
    const entry = TABLE[product.firm];
    if (!entry) continue;
    unmatched.delete(product.firm);
    firmsSeen.add(product.firm);

    const platforms = entry.platforms.join(";");
    const before = product.platforms as string | undefined;
    if (before && before !== platforms) {
      replaced.push(`${product.firm} ${product.product}: ${before.split(";").length} platforms -> ${entry.platforms.length}`);
    }
    product.platforms = platforms;
    if (entry.dataFeed) product.data_feed = entry.dataFeed;

    if (entry.partial && !String(product.notes ?? "").includes(PARTIAL_NOTE)) {
      product.notes = product.notes ? `${product.notes} ${PARTIAL_NOTE}` : PARTIAL_NOTE;
    }
    productsTouched++;
  }

  if (apply) fs.writeFileSync(full, JSON.stringify(specs, null, 2) + "\n");
}

console.log(
  `${apply ? "Set" : "Would set"} platforms on ${productsTouched} products across ${firmsSeen.size} firms.`,
);
if (replaced.length) {
  console.log(
    `\nReplaced ${replaced.length} shorter lists that came with the rules table:\n   ` +
      [...new Set(replaced.map((r) => r.split(" ")[0]))].join(", "),
  );
}
if (unmatched.size) {
  console.log(`\n?? ${unmatched.size} firms in the platform table are not in any specs file:\n   ` + [...unmatched].join("\n   "));
}
console.log(apply ? "" : "\nDry run — nothing written. Re-run with --apply.");
