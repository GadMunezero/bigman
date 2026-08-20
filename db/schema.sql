-- Personalized Prop Firm Challenge Finder — schema
--
-- Design notes:
--  * The database is CHALLENGE-centric, not firm-centric. A trader chooses a
--    challenge; a firm is just who sells it.
--  * Every commercially meaningful field carries a confidence level and points
--    at a source. Unknown data stays NULL and renders as "Not confirmed" —
--    it is never silently filled in.
--  * Affiliate data lives in its own table and is never read by the
--    recommendation engine.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Firms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS firms (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  website       TEXT,
  description   TEXT,
  -- Who runs the firm, and how much of that is on the record. A trader handing
  -- a firm money is entitled to know whether anyone's name is attached to it;
  -- an anonymous team is itself a finding, so `leadership_source_url` being
  -- empty renders as "not disclosed" rather than being hidden.
  founded_year  INTEGER,
  headquarters  TEXT,
  ceo           TEXT,
  key_people    TEXT NOT NULL DEFAULT '[]',
  leadership_source_url TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'archived')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenges (
  id                TEXT PRIMARY KEY,
  firm_id           TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,

  -- Markets this challenge can be traded on, stored as a JSON array of
  -- market codes: ["futures"], ["forex","cfd"], ...
  markets           TEXT NOT NULL DEFAULT '[]',

  account_size      INTEGER,          -- in account currency units
  price             REAL,             -- NULL means "price not confirmed"
  currency          TEXT NOT NULL DEFAULT 'USD',
  billing_type      TEXT CHECK (billing_type IN ('one_time', 'monthly', NULL)),

  profit_target_pct REAL,
  max_drawdown_pct  REAL,
  daily_drawdown_pct REAL,            -- NULL means no daily loss rule
  drawdown_type     TEXT CHECK (drawdown_type IN ('static', 'trailing', 'eod_trailing', 'intraday_trailing', NULL)),

  minimum_days      INTEGER,
  maximum_days      INTEGER,          -- NULL means unlimited

  payout_frequency_days INTEGER,      -- e.g. 14 = biweekly
  payout_split_pct  REAL,
  payout_conditions TEXT,

  -- JSON array of platform codes: ["ninjatrader","tradingview"]
  platforms         TEXT NOT NULL DEFAULT '[]',

  leverage          TEXT,             -- e.g. "1:30" or "50:1 intraday"
  refund_policy     TEXT,             -- whether/when the fee is refunded
  country_restrictions TEXT,          -- countries the firm will not onboard

  phases            INTEGER,          -- 1 = one-step, 2 = two-step, 0 = instant funding

  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
  last_verified_at  TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_challenges_firm ON challenges(firm_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_size ON challenges(account_size);

-- ---------------------------------------------------------------------------
-- Challenge rules
--
-- Every rule uses the same vocabulary so the engine can reason about them
-- uniformly: 'allowed' | 'restricted' | 'prohibited' | 'unknown'.
-- 'unknown' is a first-class value — it must never be treated as 'allowed'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenge_rules (
  challenge_id     TEXT PRIMARY KEY REFERENCES challenges(id) ON DELETE CASCADE,
  news_trading     TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (news_trading IN ('allowed','restricted','prohibited','unknown')),
  overnight        TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (overnight IN ('allowed','restricted','prohibited','unknown')),
  weekend          TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (weekend IN ('allowed','restricted','prohibited','unknown')),
  ea_allowed       TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (ea_allowed IN ('allowed','restricted','prohibited','unknown')),
  copy_trading     TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (copy_trading IN ('allowed','restricted','prohibited','unknown')),
  scalping         TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (scalping IN ('allowed','restricted','prohibited','unknown')),
  hedging          TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (hedging IN ('allowed','restricted','prohibited','unknown')),
  consistency_rule TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (consistency_rule IN ('required','not_required','unknown')),
  consistency_pct  REAL,
  notes            TEXT,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Field-level data confidence
--
-- One row per (challenge, field). Absence of a row means "unknown".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_confidence (
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  field        TEXT NOT NULL,
  confidence   TEXT NOT NULL
               CHECK (confidence IN ('verified','trader_reported','needs_review','unknown')),
  source_id    TEXT REFERENCES sources(id) ON DELETE SET NULL,
  verified_at  TEXT,
  PRIMARY KEY (challenge_id, field)
);

-- ---------------------------------------------------------------------------
-- Sources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sources (
  id           TEXT PRIMARY KEY,
  firm_id      TEXT REFERENCES firms(id) ON DELETE CASCADE,
  challenge_id TEXT REFERENCES challenges(id) ON DELETE CASCADE,
  source_type  TEXT NOT NULL
               CHECK (source_type IN ('official_rules','official_pricing','official_faq','trader_report','manual_verification','aggregator_unverified')),
  url          TEXT,
  title        TEXT,
  retrieved_at TEXT NOT NULL DEFAULT (datetime('now')),
  confidence   TEXT NOT NULL DEFAULT 'needs_review'
               CHECK (confidence IN ('verified','trader_reported','needs_review','unknown'))
);

-- ---------------------------------------------------------------------------
-- Rule history — an append-only audit trail. Nothing is overwritten in place
-- without a row landing here first.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rule_history (
  id           TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  field        TEXT NOT NULL,
  old_value    TEXT,
  new_value    TEXT,
  source_id    TEXT REFERENCES sources(id) ON DELETE SET NULL,
  changed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected','investigating')),
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_rule_history_challenge ON rule_history(challenge_id);
CREATE INDEX IF NOT EXISTS idx_rule_history_status ON rule_history(status);

-- ---------------------------------------------------------------------------
-- Trader profiles — the questionnaire output. Works without an account:
-- an anonymous session_id is enough.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trader_profiles (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT,
  session_id          TEXT NOT NULL,
  market              TEXT,
  trading_style       TEXT,
  holding_period      TEXT,
  news_trading        TEXT,
  overnight_required  TEXT,
  challenge_approach  TEXT,           -- pass_fast | normal | protect
  risk_style          TEXT,           -- aggressive | balanced | conservative; derived from risk_width
  -- The four measured answers the archetype classifier reads. Each one decides
  -- a specific rule rather than a general preference: frequency decides whether
  -- minimum trading days bind, profit_shape decides whether a consistency rule
  -- can ever bind, risk_width decides whether a daily loss limit fits, and
  -- primary_goal decides whether payout cadence or entry price wins a tie.
  trade_frequency     TEXT,           -- many_daily | few_daily | few_weekly | few_monthly
  profit_shape        TEXT,           -- one_big_day | mixed | even | unsure
  risk_width          TEXT,           -- wide | moderate | tight | unsure
  primary_goal        TEXT,           -- get_funded | fast_payouts | cheapest_route | long_term_seat
  deal_breakers       TEXT NOT NULL DEFAULT '[]',  -- JSON array; these hard-filter
  budget              TEXT,
  desired_account_size TEXT,
  priorities          TEXT NOT NULL DEFAULT '[]',  -- JSON array
  platform            TEXT,
  ea_required         INTEGER,   -- 0/1/NULL
  weekend_required    INTEGER,   -- 0/1/NULL
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_session ON trader_profiles(session_id);

-- ---------------------------------------------------------------------------
-- Reviews — everything starts pending. Nothing is ever auto-published.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id             TEXT PRIMARY KEY,
  challenge_id   TEXT REFERENCES challenges(id) ON DELETE SET NULL,
  firm_id        TEXT REFERENCES firms(id) ON DELETE SET NULL,
  session_id     TEXT,
  display_name   TEXT,
  account_size   INTEGER,
  trading_style  TEXT,
  market         TEXT,
  rating         INTEGER CHECK (rating BETWEEN 1 AND 5),
  passed         TEXT CHECK (passed IN ('yes','no','in_progress',NULL)),
  received_payout TEXT CHECK (received_payout IN ('yes','no','not_applicable',NULL)),
  payout_days    INTEGER,
  liked          TEXT,
  disliked       TEXT,
  body           TEXT,
  evidence_note  TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','spam')),
  verification   TEXT NOT NULL DEFAULT 'trader_reported'
                 CHECK (verification IN ('verified','trader_reported')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  moderated_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_challenge ON reviews(challenge_id);

-- ---------------------------------------------------------------------------
-- Affiliate data — deliberately separate from everything the engine reads.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliate_offers (
  id           TEXT PRIMARY KEY,
  firm_id      TEXT REFERENCES firms(id) ON DELETE CASCADE,
  challenge_id TEXT REFERENCES challenges(id) ON DELETE CASCADE,
  affiliate_url TEXT NOT NULL,
  tracking_id  TEXT,
  discount     TEXT,
  code         TEXT,
  expiration   TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  verified_at  TEXT
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id           TEXT PRIMARY KEY,
  challenge_id TEXT,
  session_id   TEXT,
  page         TEXT,
  placement    TEXT,
  match_score  INTEGER,
  position     INTEGER,
  utm_source   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clicks_created ON affiliate_clicks(created_at);

-- ---------------------------------------------------------------------------
-- Analytics funnel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
  id         TEXT PRIMARY KEY,
  event      TEXT NOT NULL,
  session_id TEXT,
  payload    TEXT,           -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_name ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);

-- ---------------------------------------------------------------------------
-- Saved challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_challenges (
  session_id   TEXT NOT NULL,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (session_id, challenge_id)
);

-- ---------------------------------------------------------------------------
-- Articles (learn + SEO landing pages)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  summary    TEXT,
  body       TEXT,
  kind       TEXT NOT NULL DEFAULT 'learn' CHECK (kind IN ('learn','landing')),
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Configurable scoring weights. The engine reads these at request time so the
-- algorithm can be tuned without a deploy.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scoring_weights (
  key    TEXT PRIMARY KEY,
  weight REAL NOT NULL
);

-- ---------------------------------------------------------------------------
-- Challenge journeys — the outcome feedback loop.
--
-- A row is created the moment a trader clicks through to a challenge, capturing
-- the profile they had AT THAT MOMENT along with the score and position it was
-- shown at. The trader can later report what actually happened.
--
-- The profile is a frozen JSON snapshot, not a foreign key: profiles change
-- when someone retakes the questionnaire, and the question this table answers
-- is "did this challenge work for the person who chose it".
--
-- Nothing here is read by the recommendation engine. It is measurement, and it
-- informs a human decision to retune weights — it does not silently retune them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenge_journeys (
  id                  TEXT PRIMARY KEY,
  session_id          TEXT,
  challenge_id        TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  profile_snapshot    TEXT,          -- JSON
  match_score         INTEGER,
  position            INTEGER,
  stage               TEXT NOT NULL DEFAULT 'clicked'
                      CHECK (stage IN ('clicked','purchased','in_progress','passed',
                                       'failed','funded','paid_out','abandoned')),
  failure_reason      TEXT CHECK (failure_reason IN ('max_drawdown','daily_loss','time_limit',
                                       'consistency_rule','other_rule_violation',
                                       'lost_motivation','other', NULL)),
  fit_rating          INTEGER CHECK (fit_rating BETWEEN 1 AND 5),
  would_choose_again  TEXT CHECK (would_choose_again IN ('yes','no','unsure', NULL)),
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  outcome_reported_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_journeys_session ON challenge_journeys(session_id);
CREATE INDEX IF NOT EXISTS idx_journeys_challenge ON challenge_journeys(challenge_id);
CREATE INDEX IF NOT EXISTS idx_journeys_stage ON challenge_journeys(stage);
