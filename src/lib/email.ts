import "server-only";

/**
 * Sending the one email this site sends.
 *
 * Deliberately a `fetch` call against a REST API rather than a provider SDK.
 * The whole integration is one POST, an SDK would be a dependency in the
 * runtime image for that one call, and swapping provider means changing the
 * URL and the body shape in one function rather than uninstalling a package.
 *
 * Resend is the default because its free tier needs no card and allows a
 * custom sending domain, which matters: mail from a domain a recipient
 * recognises is far likelier to reach an inbox than mail from a shared one.
 *
 * NOTHING HERE MAY THROW INTO A REQUEST.
 *
 * A signup that fails because the mail provider is down should still record
 * the subscriber — the row is the consent record and the link can be resent.
 * Every path returns a result object instead of raising, and the caller
 * decides what to tell the person.
 */

export type EmailResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "rejected" | "network"; detail?: string };

const API = "https://api.resend.com/emails";
/** A signup should never hang on a slow third party. */
const TIMEOUT_MS = 8000;

function config(): { key: string; from: string } | null {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) return null;
  return { key, from };
}

/** True when mail is configured, so callers can word themselves honestly. */
export function emailConfigured(): boolean {
  return config() !== null;
}

async function send(to: string, subject: string, text: string, html: string): Promise<EmailResult> {
  const cfg = config();
  if (!cfg) return { sent: false, reason: "not_configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: cfg.from, to: [to], subject, text, html }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // The body carries the reason (unverified domain, bad key, rate limit)
      // and is worth having in the log — it is the difference between "email
      // is broken" and "your domain is not verified yet".
      const detail = await response.text().catch(() => "");
      return { sent: false, reason: "rejected", detail: `${response.status} ${detail.slice(0, 300)}` };
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: "network", detail: (error as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The confirmation email.
 *
 * It contains the link, who it is from, and what to do if it was not you —
 * and nothing else. No offers, no articles, no "while you're here". A
 * confirmation email that already carries marketing is marketing sent without
 * consent, which is the exact thing double opt-in exists to prevent.
 */
export function sendConfirmationEmail(to: string, confirmUrl: string): Promise<EmailResult> {
  const text = [
    "Confirm your subscription",
    "",
    "You (or someone using this address) asked to hear from PropFirm about prop firm",
    "rule changes, trading psychology and discounts.",
    "",
    "Confirm here — nothing is sent until you do:",
    confirmUrl,
    "",
    "If this wasn't you, do nothing. Without that click you are not on the list and",
    "you will not hear from us again.",
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:32rem;margin:0 auto;padding:1.5rem;color:#141413;line-height:1.6">
      <h1 style="font-size:1.35rem;margin:0 0 0.75rem">Confirm your subscription</h1>
      <p style="margin:0 0 1rem">
        You (or someone using this address) asked to hear from PropFirm about prop firm
        rule changes, trading psychology and discounts.
      </p>
      <p style="margin:0 0 1.5rem">
        <a href="${confirmUrl}"
           style="display:inline-block;background:#ffd400;color:#100e00;text-decoration:none;font-weight:600;padding:0.75rem 1.5rem;border-radius:8px">
          Confirm subscription
        </a>
      </p>
      <p style="margin:0 0 1rem;font-size:0.85rem;color:#5c5c58">
        Nothing is sent until you click that link. If this wasn't you, do nothing — without
        the click you are not on the list and you will not hear from us again.
      </p>
      <p style="margin:0;font-size:0.75rem;color:#8a8a84;word-break:break-all">
        If the button does not work, paste this into your browser:<br>${confirmUrl}
      </p>
    </div>`;

  return send(to, "Confirm your subscription", text, html);
}
