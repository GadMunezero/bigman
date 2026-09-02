import { NextResponse } from "next/server";
import { z } from "zod";
import { emailConfigured, sendConfirmationEmail } from "@/lib/email";
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

  // The link has to be absolute — it is going into an email client, which has
  // no page to resolve a relative path against. Falls back to the request's
  // own origin so a deployment that forgot NEXT_PUBLIC_SITE_URL still sends a
  // working link rather than one pointing at localhost.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
  const confirmUrl = `${origin.replace(/\/$/, "")}/newsletter/confirm?token=${token}`;

  const delivery = emailConfigured()
    ? await sendConfirmationEmail(parsed.data.email, confirmUrl)
    : ({ sent: false, reason: "not_configured" } as const);

  if (!delivery.sent && delivery.reason !== "not_configured") {
    // Logged, not surfaced. The subscriber row exists either way, and telling
    // the browser that delivery failed for THIS address is a way to probe
    // which addresses exist at a provider.
    console.error(`[newsletter] confirmation email failed (${delivery.reason}): ${delivery.detail}`);
  }

  return NextResponse.json({
    ok: true,
    status: "pending",
    // Only outside production, and only when there is no mail provider to
    // carry it. In production this travels by email and nowhere else —
    // returning it to the browser would let anyone confirm an address they
    // merely typed in.
    confirm_path:
      process.env.NODE_ENV === "production" || delivery.sent
        ? undefined
        : `/newsletter/confirm?token=${token}`,
    message: delivery.sent
      ? "Almost there — check your email and click the confirmation link."
      : emailConfigured()
        ? "You're on the list, but the confirmation email could not be sent just now. We'll retry — or get in touch and we'll sort it."
        : "Almost there — check your email and click the confirmation link.",
  });
}
