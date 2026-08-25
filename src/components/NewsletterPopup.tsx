"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { NewsletterSignup } from "./NewsletterSignup";
import styles from "./NewsletterPopup.module.css";

const STORAGE_KEY = "ppf_newsletter";

/** How long a dismissal lasts before the modal may appear again. */
const DISMISS_DAYS = 45;
/** Someone who signs up is never asked again on this device. */
const SUBSCRIBED_DAYS = 3650;
/** Time on the site before it appears, in milliseconds. */
const DELAY_MS = 15_000;

/**
 * Routes where the modal must never appear.
 *
 * The questionnaire is the product, and it is the one place a blocking overlay
 * genuinely costs something: interrupting someone halfway through answering
 * questions about their trading trades a recommendation for a subscriber,
 * which is a bad deal in both directions. The legal pages are excluded for the
 * mirror-image reason — someone reading the privacy policy is deciding whether
 * to trust us, and a pop-up is not the answer to that question.
 */
const SUPPRESSED = [
  "/find-my-challenge",
  "/newsletter",
  "/admin",
  "/privacy",
  "/terms",
  "/cookies",
  "/risk-disclosure",
  "/affiliate-disclosure",
];

type Stored = { state: "dismissed" | "subscribed"; at: number };

function read(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    // Private windows and blocked site data both throw here. A browser that
    // refuses to remember a dismissal must not be shown the modal on every
    // page, so failing to read is treated as "do not show".
    return null;
  }
}

function write(state: Stored["state"]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, at: Date.now() }));
  } catch {
    /* nothing to do — it closes for this page view either way */
  }
}

function suppressedByHistory(): boolean {
  const stored = read();
  if (!stored) return false;
  const days = stored.state === "subscribed" ? SUBSCRIBED_DAYS : DISMISS_DAYS;
  return Date.now() - stored.at < days * 24 * 60 * 60 * 1000;
}

/**
 * The newsletter modal, in the shape most sites use: a centred card over a
 * dimmed backdrop, a short while after someone arrives.
 *
 * There is no account system here, so there is no login to hang it off — it
 * fires on arrival instead, which is what "on login" means on a site nobody
 * signs into.
 *
 * Because it blocks, it is dismissible four ways (×, "No thanks", the
 * backdrop, Escape), it traps focus while open so a keyboard user cannot tab
 * into a page they cannot see, and it puts focus back where it was on close.
 */
export function NewsletterPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dismissed = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const close = useCallback((state: Stored["state"] = "dismissed") => {
    dismissed.current = true;
    setOpen(false);
    write(state);
    returnFocusTo.current?.focus?.();
  }, []);

  useEffect(() => {
    if (dismissed.current) return;
    if (SUPPRESSED.some((prefix) => pathname?.startsWith(prefix))) return;
    if (suppressedByHistory()) return;

    const timer = window.setTimeout(() => {
      if (dismissed.current) return;
      returnFocusTo.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }, DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  // While a modal is open the page behind it must not scroll, or dismissing it
  // drops the reader somewhere they did not choose.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes; Tab is kept inside the dialog.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    // Focus the dialog itself rather than the email box: opening straight into
    // a text field on a phone throws the keyboard up over the whole thing.
    modalRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-modal-title"
        tabIndex={-1}
      >
        <div className={styles.head}>
          <h2 className={styles.title} id="newsletter-modal-title">
            The parts that don&apos;t fit in a comparison table
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={() => close()}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <NewsletterSignup
          source={`modal:${pathname ?? "/"}`}
          compact
          blurb="Trading psychology, prop firm rule changes, and the occasional discount. No schedule — it goes out when there is something worth saying."
          onDone={() => write("subscribed")}
        />

        <button type="button" className={styles.later} onClick={() => close()}>
          No thanks — back to finding a challenge
        </button>
      </div>
    </div>
  );
}
