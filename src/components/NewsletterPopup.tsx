"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { NewsletterSignup } from "./NewsletterSignup";
import styles from "./NewsletterPopup.module.css";

const STORAGE_KEY = "ppf_newsletter";
const VIEW_KEY = "ppf_views";

/** How long a dismissal lasts before the card may appear again. */
const DISMISS_DAYS = 60;
/** Someone who signs up is never asked again on this device. */
const SUBSCRIBED_DAYS = 3650;

/**
 * Routes where the card must never appear.
 *
 * The questionnaire is the product. Interrupting someone halfway through
 * answering seven questions about their trading to ask for their email is the
 * exact behaviour that makes people close a tab, and it costs a recommendation
 * to gain a subscriber — a bad trade in both directions. The legal pages are
 * excluded for the same reason in reverse: someone reading the privacy policy
 * is checking whether we are trustworthy, and a pop-up is not the answer.
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
    // Private windows and blocked site data both throw here. A reader whose
    // browser refuses to remember the dismissal should still not be nagged, so
    // failing to read is treated as "do not show".
    return null;
  }
}

function write(state: Stored["state"]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, at: Date.now() }));
  } catch {
    /* nothing to do — the card closes for this page view either way */
  }
}

function suppressedByHistory(): boolean {
  const stored = read();
  if (!stored) return false;
  const days = stored.state === "subscribed" ? SUBSCRIBED_DAYS : DISMISS_DAYS;
  return Date.now() - stored.at < days * 24 * 60 * 60 * 1000;
}

/**
 * Newsletter card, shown once a visitor has actually looked around.
 *
 * Two gates before it can appear: at least a second page view this session,
 * and either 45 seconds on the page or two thirds of it scrolled. A first-time
 * arrival who is still deciding whether the site is any use gets nothing.
 */
export function NewsletterPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dismissed = useRef(false);

  const close = useCallback(
    (state: Stored["state"] = "dismissed") => {
      dismissed.current = true;
      setOpen(false);
      write(state);
    },
    [],
  );

  // Count page views per session so the gate below can require more than one.
  useEffect(() => {
    try {
      const n = Number(window.sessionStorage.getItem(VIEW_KEY) ?? "0") + 1;
      window.sessionStorage.setItem(VIEW_KEY, String(n));
    } catch {
      /* ignore */
    }
  }, [pathname]);

  useEffect(() => {
    if (dismissed.current) return;
    if (SUPPRESSED.some((prefix) => pathname?.startsWith(prefix))) return;
    if (suppressedByHistory()) return;

    let views = 0;
    try {
      views = Number(window.sessionStorage.getItem(VIEW_KEY) ?? "0");
    } catch {
      /* ignore */
    }
    if (views < 2) return;

    const show = () => {
      if (dismissed.current) return;
      setOpen(true);
    };

    const timer = window.setTimeout(show, 45_000);

    const scrolledFarEnough = () => {
      const height = document.body.scrollHeight;
      // A page that barely fills the viewport is already "two thirds scrolled"
      // the moment it paints, which would turn the scroll trigger into an
      // on-arrival trigger. Only pages with real content to get through count.
      if (height < window.innerHeight * 1.5) return false;
      return window.scrollY + window.innerHeight > height * 0.66;
    };

    const onScroll = () => {
      if (scrolledFarEnough()) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // A scroll listener only ever hears about the NEXT scroll. Someone who
    // arrives at a restored scroll position, or who scrolls hard while the page
    // is still hydrating, is already past the mark and would never trigger it —
    // so check where they actually are, once, a few seconds in.
    const settle = window.setTimeout(onScroll, 4_000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  // Escape closes it. The card takes no focus, so this listens on the document
  // rather than trapping focus inside a dialog — nothing is being blocked, so
  // nothing needs to be trapped.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <aside className={styles.wrap} role="complementary" aria-label="Newsletter signup">
      <div className={styles.head}>
        <p className={styles.title}>Before you go back to it —</p>
        <button
          type="button"
          className={styles.close}
          onClick={() => close()}
          aria-label="Close newsletter signup"
        >
          ×
        </button>
      </div>

      <NewsletterSignup
        source={`popup:${pathname ?? "/"}`}
        compact
        blurb="Psychology, rule changes and discounts — the things that change after you have picked a challenge. Close this and carry on; it will not ask again for a couple of months."
        onDone={() => write("subscribed")}
      />

      <p style={{ marginTop: "0.75rem" }}>
        <button type="button" className={styles.later} onClick={() => close()}>
          No thanks — back to finding a challenge
        </button>
      </p>
    </aside>
  );
}
