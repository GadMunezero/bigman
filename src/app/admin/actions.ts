"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkPassword, isAdmin, sessionToken } from "@/lib/admin";
import { getDb, newId, nowIso } from "@/lib/db";
import {
  approveChange,
  moderateReview,
  proposeChange,
  setChangeStatus,
  type ReviewRow,
  type RuleHistoryRow,
} from "@/lib/repo";

/**
 * Every mutating action re-checks admin status server-side. The layout gate is
 * for the UI; this is the actual authorisation boundary, because a server
 * action is a callable endpoint regardless of what the page rendered.
 */
async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Not authorised");
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!checkPassword(password)) {
    return { error: "Incorrect password." };
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  revalidatePath("/admin");
  return {};
}

export async function logout() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Firms
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function saveFirm(formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const values = {
    name,
    slug: slugify(String(formData.get("slug") ?? "") || name),
    website: String(formData.get("website") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    status: String(formData.get("status") ?? "draft"),
    updated_at: nowIso(),
  };

  if (id) {
    db.prepare(
      `UPDATE firms SET name=@name, slug=@slug, website=@website, description=@description,
       status=@status, updated_at=@updated_at WHERE id=@id`,
    ).run({ ...values, id });
  } else {
    db.prepare(
      `INSERT INTO firms (id, name, slug, website, description, status)
       VALUES (@id, @name, @slug, @website, @description, @status)`,
    ).run({ ...values, id: newId("firm") });
  }

  revalidatePath("/admin/firms");
  revalidatePath("/challenges");
}

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function str(formData: FormData, key: string): string | null {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "" ? null : raw;
}

function jsonList(formData: FormData, key: string): string {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return "[]";
  return JSON.stringify(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export async function saveChallenge(formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const firmId = String(formData.get("firm_id") ?? "").trim();
  if (!name || !firmId) throw new Error("Name and firm are required");

  const values = {
    firm_id: firmId,
    name,
    slug: slugify(String(formData.get("slug") ?? "") || name),
    markets: jsonList(formData, "markets"),
    account_size: num(formData, "account_size"),
    price: num(formData, "price"),
    currency: str(formData, "currency") ?? "USD",
    billing_type: str(formData, "billing_type"),
    profit_target_pct: num(formData, "profit_target_pct"),
    max_drawdown_pct: num(formData, "max_drawdown_pct"),
    daily_drawdown_pct: num(formData, "daily_drawdown_pct"),
    drawdown_type: str(formData, "drawdown_type"),
    minimum_days: num(formData, "minimum_days"),
    maximum_days: num(formData, "maximum_days"),
    payout_frequency_days: num(formData, "payout_frequency_days"),
    payout_split_pct: num(formData, "payout_split_pct"),
    payout_conditions: str(formData, "payout_conditions"),
    platforms: jsonList(formData, "platforms"),
    phases: num(formData, "phases"),
    status: String(formData.get("status") ?? "draft"),
    last_verified_at: str(formData, "last_verified_at"),
    updated_at: nowIso(),
  };

  const challengeId = id || newId("chal");

  if (id) {
    db.prepare(
      `UPDATE challenges SET firm_id=@firm_id, name=@name, slug=@slug, markets=@markets,
        account_size=@account_size, price=@price, currency=@currency, billing_type=@billing_type,
        profit_target_pct=@profit_target_pct, max_drawdown_pct=@max_drawdown_pct,
        daily_drawdown_pct=@daily_drawdown_pct, drawdown_type=@drawdown_type,
        minimum_days=@minimum_days, maximum_days=@maximum_days,
        payout_frequency_days=@payout_frequency_days, payout_split_pct=@payout_split_pct,
        payout_conditions=@payout_conditions, platforms=@platforms, phases=@phases,
        status=@status, last_verified_at=@last_verified_at, updated_at=@updated_at
       WHERE id=@id`,
    ).run({ ...values, id });
  } else {
    db.prepare(
      `INSERT INTO challenges (id, firm_id, name, slug, markets, account_size, price, currency,
        billing_type, profit_target_pct, max_drawdown_pct, daily_drawdown_pct, drawdown_type,
        minimum_days, maximum_days, payout_frequency_days, payout_split_pct, payout_conditions,
        platforms, phases, status, last_verified_at)
       VALUES (@id, @firm_id, @name, @slug, @markets, @account_size, @price, @currency,
        @billing_type, @profit_target_pct, @max_drawdown_pct, @daily_drawdown_pct, @drawdown_type,
        @minimum_days, @maximum_days, @payout_frequency_days, @payout_split_pct, @payout_conditions,
        @platforms, @phases, @status, @last_verified_at)`,
    ).run({ ...values, id: challengeId });
  }

  // Rules
  const rules = {
    challenge_id: challengeId,
    news_trading: String(formData.get("news_trading") ?? "unknown"),
    overnight: String(formData.get("overnight") ?? "unknown"),
    weekend: String(formData.get("weekend") ?? "unknown"),
    ea_allowed: String(formData.get("ea_allowed") ?? "unknown"),
    copy_trading: String(formData.get("copy_trading") ?? "unknown"),
    scalping: String(formData.get("scalping") ?? "unknown"),
    hedging: String(formData.get("hedging") ?? "unknown"),
    consistency_rule: String(formData.get("consistency_rule") ?? "unknown"),
    consistency_pct: num(formData, "consistency_pct"),
    notes: str(formData, "rule_notes"),
    updated_at: nowIso(),
  };

  db.prepare(
    `INSERT INTO challenge_rules (challenge_id, news_trading, overnight, weekend, ea_allowed,
      copy_trading, scalping, hedging, consistency_rule, consistency_pct, notes, updated_at)
     VALUES (@challenge_id, @news_trading, @overnight, @weekend, @ea_allowed, @copy_trading,
      @scalping, @hedging, @consistency_rule, @consistency_pct, @notes, @updated_at)
     ON CONFLICT(challenge_id) DO UPDATE SET
      news_trading=excluded.news_trading, overnight=excluded.overnight, weekend=excluded.weekend,
      ea_allowed=excluded.ea_allowed, copy_trading=excluded.copy_trading,
      scalping=excluded.scalping, hedging=excluded.hedging,
      consistency_rule=excluded.consistency_rule, consistency_pct=excluded.consistency_pct,
      notes=excluded.notes, updated_at=excluded.updated_at`,
  ).run(rules);

  // Field confidence — recorded per field so the engine can score how well
  // verified a challenge is, and the UI can say "not confirmed" honestly.
  const confidenceFields = [
    "price",
    "account_size",
    "max_drawdown_pct",
    "profit_target_pct",
    "payout_frequency_days",
  ];
  for (const field of confidenceFields) {
    const level = String(formData.get(`confidence_${field}`) ?? "unknown");
    db.prepare(
      `INSERT INTO field_confidence (challenge_id, field, confidence, verified_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(challenge_id, field) DO UPDATE SET
        confidence=excluded.confidence, verified_at=excluded.verified_at`,
    ).run(challengeId, field, level, level === "verified" ? nowIso() : null);
  }

  revalidatePath("/admin/challenges");
  revalidatePath("/challenges");
}

export async function deleteChallenge(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  getDb().prepare(`DELETE FROM challenges WHERE id = ?`).run(id);
  revalidatePath("/admin/challenges");
  revalidatePath("/challenges");
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function moderate(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ReviewRow["status"];
  const verification = String(formData.get("verification") ?? "") as ReviewRow["verification"] | "";

  if (!id || !status) return;
  moderateReview(id, status, verification || undefined);
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
}

// ---------------------------------------------------------------------------
// Rule changes
// ---------------------------------------------------------------------------

export async function submitChange(formData: FormData) {
  await requireAdmin();
  proposeChange({
    challenge_id: String(formData.get("challenge_id") ?? ""),
    field: String(formData.get("field") ?? ""),
    old_value: str(formData, "old_value"),
    new_value: str(formData, "new_value"),
    notes: str(formData, "notes"),
  });
  revalidatePath("/admin/rules");
}

export async function resolveChange(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id) return;

  if (decision === "approve") approveChange(id);
  else setChangeStatus(id, decision as RuleHistoryRow["status"]);

  revalidatePath("/admin/rules");
  revalidatePath("/challenges");
}

// ---------------------------------------------------------------------------
// Affiliate offers
// ---------------------------------------------------------------------------

export async function saveOffer(formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const id = String(formData.get("id") ?? "").trim();
  const challengeId = String(formData.get("challenge_id") ?? "").trim();
  const url = String(formData.get("affiliate_url") ?? "").trim();
  if (!challengeId || !url) throw new Error("Challenge and affiliate URL are required");

  const firm = db.prepare(`SELECT firm_id FROM challenges WHERE id = ?`).get(challengeId) as
    | { firm_id: string }
    | undefined;

  const values = {
    firm_id: firm?.firm_id ?? null,
    challenge_id: challengeId,
    affiliate_url: url,
    tracking_id: str(formData, "tracking_id"),
    discount: str(formData, "discount"),
    code: str(formData, "code"),
    // An expiry is only stored when it has been verified — we never display an
    // urgency countdown we cannot stand behind.
    expiration: formData.get("verified") ? str(formData, "expiration") : null,
    active: formData.get("active") ? 1 : 0,
    verified_at: formData.get("verified") ? nowIso() : null,
  };

  if (id) {
    db.prepare(
      `UPDATE affiliate_offers SET firm_id=@firm_id, challenge_id=@challenge_id,
        affiliate_url=@affiliate_url, tracking_id=@tracking_id, discount=@discount, code=@code,
        expiration=@expiration, active=@active, verified_at=@verified_at WHERE id=@id`,
    ).run({ ...values, id });
  } else {
    db.prepare(
      `INSERT INTO affiliate_offers (id, firm_id, challenge_id, affiliate_url, tracking_id,
        discount, code, expiration, active, verified_at)
       VALUES (@id, @firm_id, @challenge_id, @affiliate_url, @tracking_id, @discount, @code,
        @expiration, @active, @verified_at)`,
    ).run({ ...values, id: newId("off") });
  }

  revalidatePath("/admin/deals");
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export async function saveArticle(formData: FormData) {
  await requireAdmin();
  const db = getDb();

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");

  const values = {
    slug: slugify(String(formData.get("slug") ?? "") || title),
    title,
    summary: str(formData, "summary"),
    body: str(formData, "body"),
    kind: String(formData.get("kind") ?? "learn"),
    status: String(formData.get("status") ?? "draft"),
    updated_at: nowIso(),
  };

  if (id) {
    db.prepare(
      `UPDATE articles SET slug=@slug, title=@title, summary=@summary, body=@body, kind=@kind,
        status=@status, updated_at=@updated_at WHERE id=@id`,
    ).run({ ...values, id });
  } else {
    db.prepare(
      `INSERT INTO articles (id, slug, title, summary, body, kind, status)
       VALUES (@id, @slug, @title, @summary, @body, @kind, @status)`,
    ).run({ ...values, id: newId("art") });
  }

  revalidatePath("/admin/articles");
  revalidatePath("/learn");
}
