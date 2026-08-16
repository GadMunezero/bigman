import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * DEMO DATA — FICTIONAL FIRMS ONLY.
 *
 * This seeds the catalogue with invented firms so you can exercise the
 * recommendation engine, the comparison table and the admin screens on a
 * populated database.
 *
 * Every firm here is fictional and named as such. No real prop firm's name,
 * pricing or rules appear anywhere in this file, because attaching invented
 * numbers to a real company would be exactly the kind of fabrication this
 * product refuses to do. Real data belongs in the admin area, entered from the
 * firm's own documentation with a source and a verification date.
 *
 * The dataset is deliberately varied — different drawdown types, some
 * prohibitions, some unconfirmed rules, one challenge with no confirmed price
 * — so the engine's filtering, scoring and honesty paths all get exercised.
 */

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
const schemaPath = path.join(process.cwd(), "db", "schema.sql");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(schemaPath, "utf8"));

const id = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
const today = new Date().toISOString();

interface DemoChallenge {
  name: string;
  markets: string[];
  account_size: number;
  price: number | null;
  profit_target_pct: number | null;
  max_drawdown_pct: number | null;
  daily_drawdown_pct: number | null;
  drawdown_type: string | null;
  minimum_days: number | null;
  payout_frequency_days: number | null;
  payout_split_pct: number | null;
  platforms: string[];
  phases: number;
  rules: Record<string, string | number | null>;
  confidence: Record<string, string>;
}

interface DemoFirm {
  name: string;
  description: string;
  challenges: DemoChallenge[];
}

const FIRMS: DemoFirm[] = [
  {
    name: "Demo Futures Alpha (fictional)",
    description:
      "A fictional firm used for demonstration. Nothing here describes a real company or a real offer.",
    challenges: [
      {
        name: "$50K Evaluation",
        markets: ["futures"],
        account_size: 50_000,
        price: 79,
        profit_target_pct: 6,
        max_drawdown_pct: 4,
        daily_drawdown_pct: 2,
        drawdown_type: "eod_trailing",
        minimum_days: 3,
        payout_frequency_days: 14,
        payout_split_pct: 90,
        platforms: ["NinjaTrader", "TradingView"],
        phases: 1,
        rules: {
          news_trading: "restricted",
          overnight: "prohibited",
          weekend: "prohibited",
          ea_allowed: "restricted",
          copy_trading: "prohibited",
          scalping: "allowed",
          hedging: "unknown",
          consistency_rule: "not_required",
          consistency_pct: null,
        },
        confidence: {
          price: "verified",
          account_size: "verified",
          max_drawdown_pct: "verified",
          profit_target_pct: "verified",
          payout_frequency_days: "trader_reported",
        },
      },
      {
        name: "$100K Evaluation",
        markets: ["futures"],
        account_size: 100_000,
        price: 129,
        profit_target_pct: 6,
        max_drawdown_pct: 4,
        daily_drawdown_pct: 2,
        drawdown_type: "eod_trailing",
        minimum_days: 3,
        payout_frequency_days: 14,
        payout_split_pct: 90,
        platforms: ["NinjaTrader", "TradingView"],
        phases: 1,
        rules: {
          news_trading: "restricted",
          overnight: "prohibited",
          weekend: "prohibited",
          ea_allowed: "restricted",
          copy_trading: "prohibited",
          scalping: "allowed",
          hedging: "unknown",
          consistency_rule: "not_required",
          consistency_pct: null,
        },
        confidence: {
          price: "verified",
          account_size: "verified",
          max_drawdown_pct: "verified",
          profit_target_pct: "verified",
          payout_frequency_days: "verified",
        },
      },
    ],
  },
  {
    name: "Demo Swing Partners (fictional)",
    description:
      "A fictional firm used for demonstration, configured to suit longer holding periods.",
    challenges: [
      {
        name: "$100K Two-Step",
        markets: ["forex", "cfd"],
        account_size: 100_000,
        price: 189,
        profit_target_pct: 8,
        max_drawdown_pct: 10,
        daily_drawdown_pct: 5,
        drawdown_type: "static",
        minimum_days: 5,
        payout_frequency_days: 30,
        payout_split_pct: 80,
        platforms: ["MetaTrader 5", "cTrader"],
        phases: 2,
        rules: {
          news_trading: "allowed",
          overnight: "allowed",
          weekend: "allowed",
          ea_allowed: "allowed",
          copy_trading: "restricted",
          scalping: "restricted",
          hedging: "allowed",
          consistency_rule: "required",
          consistency_pct: 40,
        },
        confidence: {
          price: "verified",
          account_size: "verified",
          max_drawdown_pct: "verified",
          profit_target_pct: "verified",
          payout_frequency_days: "verified",
        },
      },
      {
        name: "$25K Two-Step",
        markets: ["forex", "cfd"],
        account_size: 25_000,
        price: 49,
        profit_target_pct: 8,
        max_drawdown_pct: 10,
        daily_drawdown_pct: 5,
        drawdown_type: "static",
        minimum_days: 5,
        payout_frequency_days: 30,
        payout_split_pct: 80,
        platforms: ["MetaTrader 5", "cTrader"],
        phases: 2,
        rules: {
          news_trading: "allowed",
          overnight: "allowed",
          weekend: "allowed",
          ea_allowed: "allowed",
          copy_trading: "restricted",
          scalping: "restricted",
          hedging: "allowed",
          consistency_rule: "required",
          consistency_pct: 40,
        },
        confidence: {
          price: "verified",
          account_size: "verified",
          max_drawdown_pct: "verified",
          profit_target_pct: "trader_reported",
          payout_frequency_days: "trader_reported",
        },
      },
    ],
  },
  {
    name: "Demo Open Rules Co (fictional)",
    description:
      "A fictional firm used for demonstration, with permissive rules and a higher entry price.",
    challenges: [
      {
        name: "$100K One-Step",
        markets: ["futures", "forex", "crypto"],
        account_size: 100_000,
        price: 249,
        profit_target_pct: 9,
        max_drawdown_pct: 12,
        daily_drawdown_pct: null,
        drawdown_type: "static",
        minimum_days: 0,
        payout_frequency_days: 7,
        payout_split_pct: 85,
        platforms: ["TradingView", "MetaTrader 5"],
        phases: 1,
        rules: {
          news_trading: "allowed",
          overnight: "allowed",
          weekend: "allowed",
          ea_allowed: "allowed",
          copy_trading: "allowed",
          scalping: "allowed",
          hedging: "allowed",
          consistency_rule: "not_required",
          consistency_pct: null,
        },
        confidence: {
          price: "verified",
          account_size: "verified",
          max_drawdown_pct: "verified",
          profit_target_pct: "verified",
          payout_frequency_days: "verified",
        },
      },
      {
        // Deliberately incomplete: exercises the "price not confirmed" and
        // "rule not confirmed" paths end to end.
        name: "$200K Instant",
        markets: ["futures"],
        account_size: 200_000,
        price: null,
        profit_target_pct: null,
        max_drawdown_pct: 5,
        daily_drawdown_pct: 2.5,
        drawdown_type: "intraday_trailing",
        minimum_days: null,
        payout_frequency_days: null,
        payout_split_pct: null,
        platforms: [],
        phases: 0,
        rules: {
          news_trading: "unknown",
          overnight: "unknown",
          weekend: "unknown",
          ea_allowed: "unknown",
          copy_trading: "unknown",
          scalping: "unknown",
          hedging: "unknown",
          consistency_rule: "unknown",
          consistency_pct: null,
        },
        confidence: {
          price: "unknown",
          account_size: "trader_reported",
          max_drawdown_pct: "needs_review",
          profit_target_pct: "unknown",
          payout_frequency_days: "unknown",
        },
      },
    ],
  },
];

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const insertFirm = db.prepare(
  `INSERT INTO firms (id, name, slug, website, description, status)
   VALUES (@id, @name, @slug, @website, @description, 'published')`,
);

const insertChallenge = db.prepare(
  `INSERT INTO challenges (id, firm_id, name, slug, markets, account_size, price, currency,
     billing_type, profit_target_pct, max_drawdown_pct, daily_drawdown_pct, drawdown_type,
     minimum_days, maximum_days, payout_frequency_days, payout_split_pct, payout_conditions,
     platforms, phases, status, last_verified_at)
   VALUES (@id, @firm_id, @name, @slug, @markets, @account_size, @price, 'USD',
     'one_time', @profit_target_pct, @max_drawdown_pct, @daily_drawdown_pct, @drawdown_type,
     @minimum_days, NULL, @payout_frequency_days, @payout_split_pct, NULL,
     @platforms, @phases, 'published', @last_verified_at)`,
);

const insertRules = db.prepare(
  `INSERT INTO challenge_rules (challenge_id, news_trading, overnight, weekend, ea_allowed,
     copy_trading, scalping, hedging, consistency_rule, consistency_pct)
   VALUES (@challenge_id, @news_trading, @overnight, @weekend, @ea_allowed, @copy_trading,
     @scalping, @hedging, @consistency_rule, @consistency_pct)`,
);

const insertConfidence = db.prepare(
  `INSERT INTO field_confidence (challenge_id, field, confidence, verified_at)
   VALUES (?, ?, ?, ?)`,
);

const seed = db.transaction(() => {
  // Demo data is replaceable: clear anything a previous run left behind.
  db.prepare(`DELETE FROM firms WHERE name LIKE 'Demo %(fictional)'`).run();

  let firmCount = 0;
  let challengeCount = 0;

  for (const firm of FIRMS) {
    const firmId = id("firm");
    insertFirm.run({
      id: firmId,
      name: firm.name,
      slug: slug(firm.name),
      website: null,
      description: firm.description,
    });
    firmCount += 1;

    for (const challenge of firm.challenges) {
      const challengeId = id("chal");
      insertChallenge.run({
        id: challengeId,
        firm_id: firmId,
        name: challenge.name,
        slug: slug(`${firm.name}-${challenge.name}`),
        markets: JSON.stringify(challenge.markets),
        account_size: challenge.account_size,
        price: challenge.price,
        profit_target_pct: challenge.profit_target_pct,
        max_drawdown_pct: challenge.max_drawdown_pct,
        daily_drawdown_pct: challenge.daily_drawdown_pct,
        drawdown_type: challenge.drawdown_type,
        minimum_days: challenge.minimum_days,
        payout_frequency_days: challenge.payout_frequency_days,
        payout_split_pct: challenge.payout_split_pct,
        platforms: JSON.stringify(challenge.platforms),
        phases: challenge.phases,
        last_verified_at: today,
      });

      insertRules.run({ challenge_id: challengeId, ...challenge.rules });

      for (const [field, level] of Object.entries(challenge.confidence)) {
        insertConfidence.run(challengeId, field, level, level === "verified" ? today : null);
      }

      challengeCount += 1;
    }
  }

  return { firmCount, challengeCount };
});

const { firmCount, challengeCount } = seed();
db.close();

console.log(`Seeded ${firmCount} fictional demo firms and ${challengeCount} challenges.`);
console.log("");
console.log("These firms are INVENTED and exist only to exercise the engine.");
console.log("Delete them before going live, and enter real data through /admin");
console.log("with a source and a verification date for every figure.");
