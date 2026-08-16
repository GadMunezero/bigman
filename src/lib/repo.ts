import "server-only";
import { getDb, newId, nowIso } from "./db";
import type {
  Challenge,
  ChallengeRecord,
  ChallengeRules,
  Confidence,
  Firm,
  DealBreaker,
  Market,
  Priority,
  ProfileInput,
  TraderProfile,
} from "./types";

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

type ChallengeRow = Omit<Challenge, "markets" | "platforms"> & {
  markets: string;
  platforms: string;
};

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapChallenge(row: ChallengeRow): Challenge {
  return {
    ...row,
    markets: parseJsonArray(row.markets) as Market[],
    platforms: parseJsonArray(row.platforms),
  };
}

/**
 * A challenge with no rules row still needs a rules object — every rule reads
 * `unknown`, which is exactly the honest answer.
 */
function emptyRules(challengeId: string): ChallengeRules {
  return {
    challenge_id: challengeId,
    news_trading: "unknown",
    overnight: "unknown",
    weekend: "unknown",
    ea_allowed: "unknown",
    copy_trading: "unknown",
    scalping: "unknown",
    hedging: "unknown",
    consistency_rule: "unknown",
    consistency_pct: null,
    notes: null,
    updated_at: nowIso(),
  };
}

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

export function listChallengeRecords(
  opts: { includeUnpublished?: boolean } = {},
): ChallengeRecord[] {
  const db = getDb();
  const where = opts.includeUnpublished
    ? ""
    : "WHERE c.status = 'published' AND f.status = 'published'";

  const rows = db
    .prepare(
      `SELECT c.*, f.id AS f_id, f.name AS f_name, f.slug AS f_slug, f.logo_url AS f_logo_url,
              f.website AS f_website, f.description AS f_description, f.status AS f_status,
              f.created_at AS f_created_at, f.updated_at AS f_updated_at
       FROM challenges c
       JOIN firms f ON f.id = c.firm_id
       ${where}
       ORDER BY c.account_size ASC, c.price ASC`,
    )
    .all() as (ChallengeRow & Record<string, unknown>)[];

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  const ruleRows = db
    .prepare(`SELECT * FROM challenge_rules WHERE challenge_id IN (${placeholders})`)
    .all(...ids) as ChallengeRules[];
  const rulesById = new Map(ruleRows.map((r) => [r.challenge_id, r]));

  const confRows = db
    .prepare(
      `SELECT challenge_id, field, confidence FROM field_confidence WHERE challenge_id IN (${placeholders})`,
    )
    .all(...ids) as { challenge_id: string; field: string; confidence: Confidence }[];
  const confByChallenge = new Map<string, Record<string, Confidence>>();
  for (const row of confRows) {
    const bucket = confByChallenge.get(row.challenge_id) ?? {};
    bucket[row.field] = row.confidence;
    confByChallenge.set(row.challenge_id, bucket);
  }

  return rows.map((row) => {
    const firm: Firm = {
      id: row.f_id as string,
      name: row.f_name as string,
      slug: row.f_slug as string,
      logo_url: (row.f_logo_url as string) ?? null,
      website: (row.f_website as string) ?? null,
      description: (row.f_description as string) ?? null,
      status: row.f_status as Firm["status"],
      created_at: row.f_created_at as string,
      updated_at: row.f_updated_at as string,
    };
    return {
      ...mapChallenge(row),
      firm,
      rules: rulesById.get(row.id) ?? emptyRules(row.id),
      confidence: confByChallenge.get(row.id) ?? {},
    };
  });
}

export function getChallengeRecordBySlug(slug: string): ChallengeRecord | null {
  return (
    listChallengeRecords({ includeUnpublished: true }).find((c) => c.slug === slug) ?? null
  );
}

export function getChallengeRecordById(id: string): ChallengeRecord | null {
  return listChallengeRecords({ includeUnpublished: true }).find((c) => c.id === id) ?? null;
}

export function getChallengeRecordsByIds(ids: string[]): ChallengeRecord[] {
  const wanted = new Set(ids);
  const found = listChallengeRecords({ includeUnpublished: true }).filter((c) =>
    wanted.has(c.id),
  );
  // Preserve caller order — comparison columns should appear as selected.
  return ids
    .map((id) => found.find((c) => c.id === id))
    .filter((c): c is ChallengeRecord => Boolean(c));
}

/** Distinct published account sizes, ascending. Drives the questionnaire options. */
export function listAccountSizes(): number[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT account_size FROM challenges
       WHERE status = 'published' AND account_size IS NOT NULL
       ORDER BY account_size ASC`,
    )
    .all() as { account_size: number }[];
  return rows.map((r) => r.account_size);
}

export function listPlatforms(): string[] {
  const set = new Set<string>();
  for (const c of listChallengeRecords()) c.platforms.forEach((p) => set.add(p));
  return [...set].sort();
}

// ---------------------------------------------------------------------------
// Firms
// ---------------------------------------------------------------------------

export function listFirms(opts: { includeUnpublished?: boolean } = {}): Firm[] {
  const db = getDb();
  const where = opts.includeUnpublished ? "" : "WHERE status = 'published'";
  return db.prepare(`SELECT * FROM firms ${where} ORDER BY name ASC`).all() as Firm[];
}

export function getFirmBySlug(slug: string): Firm | null {
  const db = getDb();
  return (db.prepare(`SELECT * FROM firms WHERE slug = ?`).get(slug) as Firm) ?? null;
}

// ---------------------------------------------------------------------------
// Trader profiles
// ---------------------------------------------------------------------------

type ProfileRow = Omit<
  TraderProfile,
  "priorities" | "deal_breakers" | "ea_required" | "weekend_required"
> & {
  priorities: string;
  deal_breakers: string;
  ea_required: number | null;
  weekend_required: number | null;
};

function mapProfile(row: ProfileRow): TraderProfile {
  return {
    ...row,
    priorities: parseJsonArray(row.priorities) as Priority[],
    deal_breakers: parseJsonArray(row.deal_breakers) as DealBreaker[],
    ea_required: row.ea_required === null ? null : row.ea_required === 1,
    weekend_required: row.weekend_required === null ? null : row.weekend_required === 1,
  };
}

export function getProfileBySession(sessionId: string): TraderProfile | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM trader_profiles WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1`,
    )
    .get(sessionId) as ProfileRow | undefined;
  return row ? mapProfile(row) : null;
}

/** Upserts the session's profile. Anonymous sessions are first-class. */
export function saveProfile(sessionId: string, input: ProfileInput): TraderProfile {
  const db = getDb();
  const existing = getProfileBySession(sessionId);
  const merged = { ...existing, ...input };

  const values = {
    market: merged.market ?? null,
    trading_style: merged.trading_style ?? null,
    holding_period: merged.holding_period ?? null,
    news_trading: merged.news_trading ?? null,
    overnight_required: merged.overnight_required ?? null,
    challenge_approach: merged.challenge_approach ?? null,
    risk_style: merged.risk_style ?? null,
    deal_breakers: JSON.stringify(merged.deal_breakers ?? []),
    budget: merged.budget ?? null,
    desired_account_size: merged.desired_account_size ?? null,
    priorities: JSON.stringify(merged.priorities ?? []),
    platform: merged.platform ?? null,
    ea_required: merged.ea_required === null || merged.ea_required === undefined ? null : merged.ea_required ? 1 : 0,
    weekend_required:
      merged.weekend_required === null || merged.weekend_required === undefined
        ? null
        : merged.weekend_required
          ? 1
          : 0,
  };

  if (existing) {
    db.prepare(
      `UPDATE trader_profiles SET market=@market, trading_style=@trading_style,
        holding_period=@holding_period, news_trading=@news_trading,
        overnight_required=@overnight_required, challenge_approach=@challenge_approach,
        risk_style=@risk_style, deal_breakers=@deal_breakers, budget=@budget,
        desired_account_size=@desired_account_size, priorities=@priorities,
        platform=@platform, ea_required=@ea_required, weekend_required=@weekend_required,
        updated_at=@updated_at
       WHERE id=@id`,
    ).run({ ...values, id: existing.id, updated_at: nowIso() });
    return getProfileBySession(sessionId)!;
  }

  db.prepare(
    `INSERT INTO trader_profiles
      (id, session_id, market, trading_style, holding_period, news_trading,
       overnight_required, challenge_approach, risk_style, deal_breakers,
       budget, desired_account_size, priorities, platform,
       ea_required, weekend_required)
     VALUES (@id, @session_id, @market, @trading_style, @holding_period, @news_trading,
       @overnight_required, @challenge_approach, @risk_style, @deal_breakers,
       @budget, @desired_account_size, @priorities, @platform,
       @ea_required, @weekend_required)`,
  ).run({ ...values, id: newId("prof"), session_id: sessionId });

  return getProfileBySession(sessionId)!;
}

export function clearProfile(sessionId: string): void {
  getDb().prepare(`DELETE FROM trader_profiles WHERE session_id = ?`).run(sessionId);
}

// ---------------------------------------------------------------------------
// Saved challenges
// ---------------------------------------------------------------------------

export function listSaved(sessionId: string): string[] {
  const rows = getDb()
    .prepare(`SELECT challenge_id FROM saved_challenges WHERE session_id = ?`)
    .all(sessionId) as { challenge_id: string }[];
  return rows.map((r) => r.challenge_id);
}

export function toggleSaved(sessionId: string, challengeId: string): boolean {
  const db = getDb();
  const existing = db
    .prepare(`SELECT 1 FROM saved_challenges WHERE session_id = ? AND challenge_id = ?`)
    .get(sessionId, challengeId);
  if (existing) {
    db.prepare(`DELETE FROM saved_challenges WHERE session_id = ? AND challenge_id = ?`).run(
      sessionId,
      challengeId,
    );
    return false;
  }
  db.prepare(`INSERT INTO saved_challenges (session_id, challenge_id) VALUES (?, ?)`).run(
    sessionId,
    challengeId,
  );
  return true;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface ReviewRow {
  id: string;
  challenge_id: string | null;
  firm_id: string | null;
  session_id: string | null;
  display_name: string | null;
  account_size: number | null;
  trading_style: string | null;
  market: string | null;
  rating: number | null;
  passed: string | null;
  received_payout: string | null;
  payout_days: number | null;
  liked: string | null;
  disliked: string | null;
  body: string | null;
  evidence_note: string | null;
  status: "pending" | "approved" | "rejected" | "spam";
  verification: "verified" | "trader_reported";
  created_at: string;
  moderated_at: string | null;
}

export function listReviews(
  opts: { status?: ReviewRow["status"]; challengeId?: string } = {},
): ReviewRow[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    clauses.push("status = ?");
    params.push(opts.status);
  }
  if (opts.challengeId) {
    clauses.push("challenge_id = ?");
    params.push(opts.challengeId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`SELECT * FROM reviews ${where} ORDER BY created_at DESC`)
    .all(...params) as ReviewRow[];
}

export function createReview(input: Partial<ReviewRow>): string {
  const id = newId("rev");
  getDb()
    .prepare(
      `INSERT INTO reviews
        (id, challenge_id, firm_id, session_id, display_name, account_size, trading_style,
         market, rating, passed, received_payout, payout_days, liked, disliked, body,
         evidence_note, status, verification)
       VALUES (@id, @challenge_id, @firm_id, @session_id, @display_name, @account_size,
         @trading_style, @market, @rating, @passed, @received_payout, @payout_days,
         @liked, @disliked, @body, @evidence_note, 'pending', 'trader_reported')`,
    )
    .run({
      id,
      challenge_id: input.challenge_id ?? null,
      firm_id: input.firm_id ?? null,
      session_id: input.session_id ?? null,
      display_name: input.display_name ?? null,
      account_size: input.account_size ?? null,
      trading_style: input.trading_style ?? null,
      market: input.market ?? null,
      rating: input.rating ?? null,
      passed: input.passed ?? null,
      received_payout: input.received_payout ?? null,
      payout_days: input.payout_days ?? null,
      liked: input.liked ?? null,
      disliked: input.disliked ?? null,
      body: input.body ?? null,
      evidence_note: input.evidence_note ?? null,
    });
  return id;
}

export function moderateReview(
  id: string,
  status: ReviewRow["status"],
  verification?: ReviewRow["verification"],
): void {
  const db = getDb();
  if (verification) {
    db.prepare(
      `UPDATE reviews SET status = ?, verification = ?, moderated_at = ? WHERE id = ?`,
    ).run(status, verification, nowIso(), id);
  } else {
    db.prepare(`UPDATE reviews SET status = ?, moderated_at = ? WHERE id = ?`).run(
      status,
      nowIso(),
      id,
    );
  }
}

// ---------------------------------------------------------------------------
// Affiliate offers + click tracking
// ---------------------------------------------------------------------------

export interface AffiliateOffer {
  id: string;
  firm_id: string | null;
  challenge_id: string | null;
  affiliate_url: string;
  tracking_id: string | null;
  discount: string | null;
  code: string | null;
  expiration: string | null;
  active: number;
  verified_at: string | null;
}

export function getOfferForChallenge(challengeId: string): AffiliateOffer | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM affiliate_offers WHERE challenge_id = ? AND active = 1 LIMIT 1`)
      .get(challengeId) as AffiliateOffer) ?? null
  );
}

export function listOffers(): AffiliateOffer[] {
  return getDb().prepare(`SELECT * FROM affiliate_offers`).all() as AffiliateOffer[];
}

export function recordAffiliateClick(data: {
  challenge_id: string | null;
  session_id: string | null;
  page: string | null;
  placement: string | null;
  match_score: number | null;
  position: number | null;
  utm_source: string | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO affiliate_clicks
        (id, challenge_id, session_id, page, placement, match_score, position, utm_source)
       VALUES (@id, @challenge_id, @session_id, @page, @placement, @match_score, @position, @utm_source)`,
    )
    .run({ id: newId("clk"), ...data });
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function trackEvent(
  event: string,
  sessionId: string | null,
  payload?: Record<string, unknown>,
): void {
  getDb()
    .prepare(
      `INSERT INTO analytics_events (id, event, session_id, payload) VALUES (?, ?, ?, ?)`,
    )
    .run(newId("evt"), event, sessionId, payload ? JSON.stringify(payload) : null);
}

export function eventCounts(): { event: string; count: number }[] {
  return getDb()
    .prepare(
      `SELECT event, COUNT(*) AS count FROM analytics_events GROUP BY event ORDER BY count DESC`,
    )
    .all() as { event: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Rule history / pending changes
// ---------------------------------------------------------------------------

export interface RuleHistoryRow {
  id: string;
  challenge_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  source_id: string | null;
  changed_at: string;
  verified_at: string | null;
  status: "pending" | "approved" | "rejected" | "investigating";
  notes: string | null;
}

export function listRuleHistory(
  opts: { challengeId?: string; status?: RuleHistoryRow["status"] } = {},
): RuleHistoryRow[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.challengeId) {
    clauses.push("challenge_id = ?");
    params.push(opts.challengeId);
  }
  if (opts.status) {
    clauses.push("status = ?");
    params.push(opts.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`SELECT * FROM rule_history ${where} ORDER BY changed_at DESC`)
    .all(...params) as RuleHistoryRow[];
}

/**
 * Records a proposed field change. Nothing is applied to the live challenge
 * until an admin approves it — uncertain data never auto-publishes.
 */
export function proposeChange(input: {
  challenge_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  source_id?: string | null;
  notes?: string | null;
}): string {
  const id = newId("rh");
  getDb()
    .prepare(
      `INSERT INTO rule_history (id, challenge_id, field, old_value, new_value, source_id, notes)
       VALUES (@id, @challenge_id, @field, @old_value, @new_value, @source_id, @notes)`,
    )
    .run({
      id,
      ...input,
      source_id: input.source_id ?? null,
      notes: input.notes ?? null,
    });
  return id;
}

const CHALLENGE_COLUMNS = new Set([
  "account_size",
  "price",
  "profit_target_pct",
  "max_drawdown_pct",
  "daily_drawdown_pct",
  "drawdown_type",
  "minimum_days",
  "maximum_days",
  "payout_frequency_days",
  "payout_split_pct",
  "payout_conditions",
  "phases",
]);

const RULE_COLUMNS = new Set([
  "news_trading",
  "overnight",
  "weekend",
  "ea_allowed",
  "copy_trading",
  "scalping",
  "hedging",
  "consistency_rule",
  "consistency_pct",
]);

/** Applies an approved change to the live record and stamps the history row. */
export function approveChange(id: string): void {
  const db = getDb();
  const change = db.prepare(`SELECT * FROM rule_history WHERE id = ?`).get(id) as
    | RuleHistoryRow
    | undefined;
  if (!change || change.status === "approved") return;

  // Column names are validated against an allowlist — never interpolated raw.
  if (CHALLENGE_COLUMNS.has(change.field)) {
    db.prepare(
      `UPDATE challenges SET ${change.field} = ?, updated_at = ?, last_verified_at = ? WHERE id = ?`,
    ).run(change.new_value, nowIso(), nowIso(), change.challenge_id);
  } else if (RULE_COLUMNS.has(change.field)) {
    db.prepare(
      `INSERT INTO challenge_rules (challenge_id, ${change.field}) VALUES (?, ?)
       ON CONFLICT(challenge_id) DO UPDATE SET ${change.field} = excluded.${change.field}, updated_at = ?`,
    ).run(change.challenge_id, change.new_value, nowIso());
  }

  db.prepare(`UPDATE rule_history SET status = 'approved', verified_at = ? WHERE id = ?`).run(
    nowIso(),
    id,
  );
}

export function setChangeStatus(id: string, status: RuleHistoryRow["status"]): void {
  getDb().prepare(`UPDATE rule_history SET status = ? WHERE id = ?`).run(status, id);
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
  kind: "learn" | "landing";
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
}

export function listArticles(kind?: ArticleRow["kind"]): ArticleRow[] {
  const where = kind ? `WHERE status = 'published' AND kind = ?` : `WHERE status = 'published'`;
  const params = kind ? [kind] : [];
  return getDb()
    .prepare(`SELECT * FROM articles ${where} ORDER BY updated_at DESC`)
    .all(...params) as ArticleRow[];
}

export function getArticle(slug: string): ArticleRow | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM articles WHERE slug = ? AND status = 'published'`)
      .get(slug) as ArticleRow) ?? null
  );
}

// ---------------------------------------------------------------------------
// Admin counters
// ---------------------------------------------------------------------------

export function adminOverview() {
  const db = getDb();
  const one = (sql: string, ...params: unknown[]) =>
    (db.prepare(sql).get(...params) as { n: number }).n;
  return {
    challenges: one(`SELECT COUNT(*) AS n FROM challenges`),
    publishedChallenges: one(`SELECT COUNT(*) AS n FROM challenges WHERE status='published'`),
    firms: one(`SELECT COUNT(*) AS n FROM firms`),
    pendingReviews: one(`SELECT COUNT(*) AS n FROM reviews WHERE status='pending'`),
    pendingChanges: one(`SELECT COUNT(*) AS n FROM rule_history WHERE status='pending'`),
    affiliateClicks: one(`SELECT COUNT(*) AS n FROM affiliate_clicks`),
    quizStarts: one(`SELECT COUNT(*) AS n FROM analytics_events WHERE event='quiz_started'`),
    quizCompletions: one(
      `SELECT COUNT(*) AS n FROM analytics_events WHERE event='quiz_completed'`,
    ),
    resultsViewed: one(`SELECT COUNT(*) AS n FROM analytics_events WHERE event='results_viewed'`),
  };
}
