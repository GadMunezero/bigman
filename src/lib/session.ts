import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/middleware";
import { getProfileBySession } from "./repo";
import type { TraderProfile } from "./types";

/**
 * The anonymous session id issued by middleware.
 *
 * Returns null on the very first request of a brand-new visit, before the
 * cookie set by middleware has made a round trip. Callers treat that as
 * "no profile yet", which is the correct behaviour anyway.
 */
export async function getSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** The current visitor's trading profile, or null if they haven't taken the quiz. */
export async function getCurrentProfile(): Promise<TraderProfile | null> {
  const sessionId = await getSessionId();
  if (!sessionId) return null;
  return getProfileBySession(sessionId);
}

/** A profile is usable once the questions that drive hard filters are answered. */
export function isProfileComplete(profile: TraderProfile | null): profile is TraderProfile {
  return Boolean(profile && profile.market && profile.trading_style && profile.budget);
}
