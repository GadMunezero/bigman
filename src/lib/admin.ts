import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ppf_admin";

/**
 * Admin authentication.
 *
 * Deliberately fail-closed: if ADMIN_PASSWORD is not configured, the admin area
 * is disabled entirely rather than left open. A deployment that forgets to set
 * a password gets a locked door, not an unlocked one.
 *
 * The session cookie holds an HMAC of the password under a server secret, so a
 * stolen cookie does not reveal the password and cookies are invalidated by
 * rotating either value.
 */
export function adminEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function secret(): string {
  // Falling back to the password itself keeps single-variable deployments
  // working; setting ADMIN_SECRET separately lets you rotate sessions alone.
  return process.env.ADMIN_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

export function sessionToken(): string {
  return createHmac("sha256", secret()).update("admin-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  return safeEqual(value, sessionToken());
}
