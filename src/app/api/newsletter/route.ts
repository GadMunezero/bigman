import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribeToNewsletter, trackEvent } from "@/lib/repo";
import { getSessionId } from "@/lib/session";
import { NEWSLETTER_TOPICS } from "@/lib/types";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email().max(254),
  topics: z
    .array(z.enum(NEWSLETTER_TOPICS as unknown as [string, ...string[]]))
    .min(1)
    .max(NEWSLETTER_TOPICS.length),
  source: z.string().max(60).optional(),
  /**
   * Honeypot. A real person never sees this field, so anything in it is a bot.
   * Cheaper and less hostile than a CAPTCHA, and it costs a subscriber nothing.
   */
  website: z.string().max(200).optional(),
});

/**
 * Newsletter signup.
 *
 * Two things this route deliberately does NOT do:
 *
 *   It never says whether an address is already subscribed. The response is
 *   identical for a new address, a pending one and a confirmed one — otherwise
 *   the form becomes a way to check whether a particular person is on the
 *   list, and anyone can type anyone's address into it.
 *
 *   It never marks anyone confirmed. Signing up creates a `pending` row and
 *   nothing else; confirmation happens when someone clicks the link sent to
 *   that address. Until an email provider is wired up, that link is returned
 *   here so it can be sent by hand — see docs/NEWSLETTER.md.
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That does not look like a valid email address.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // Silently accept and drop: a bot told there is a honeypot fills a different
  // field next time.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true, status: "pending" });
  }

  const { token } = subscribeToNewsletter({
    email: parsed.data.email,
    topics: parsed.data.topics,
    source: parsed.data.source ?? null,
  });

  trackEvent("newsletter_signup", await getSessionId(), {
    source: parsed.data.source ?? null,
    topics: parsed.data.topics.join(","),
  });

  return NextResponse.json({
    ok: true,
    status: "pending",
    // Only in development. In production this must travel by email and nowhere
    // else — returning it to the browser would let anyone confirm an address
    // they merely typed in.
    confirm_path: process.env.NODE_ENV === "production" ? undefined : `/newsletter/confirm?token=${token}`,
    message: "Almost there — check your email and click the confirmation link.",
  });
}
