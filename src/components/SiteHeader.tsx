"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import styles from "./SiteHeader.module.css";

/**
 * The mark: a yellow disc with a black open book, echoing the full logo.
 * Drawn as inline SVG rather than a raster so it stays crisp at 30px and needs
 * no network request.
 */
function BrandMark() {
  return (
    <svg
      className={styles.mark}
      viewBox="0 0 32 32"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="16" fill="var(--accent)" />
      {/* Open book: two pages meeting at a central spine. */}
      <path
        d="M16 10.6c-2.1-1.5-4.6-2.2-7.1-2.1-.6 0-1 .5-1 1.1v11.2c0 .6.5 1.1 1.1 1.1 2.4-.1 4.8.6 6.8 2 .1.1.3.1.4 0 2-1.4 4.4-2.1 6.8-2 .6 0 1.1-.5 1.1-1.1V9.6c0-.6-.4-1.1-1-1.1-2.5-.1-5 .6-7.1 2.1Z"
        fill="#000"
      />
      <path d="M15.1 11.4h1.8v11.6h-1.8z" fill="var(--accent)" />
    </svg>
  );
}

const NAV = [
  { href: "/find-my-challenge", label: "Find My Challenge" },
  { href: "/challenges", label: "Challenges" },
  { href: "/compare", label: "Compare" },
  { href: "/psychology", label: "Psychology" },
  { href: "/reviews", label: "Reviews" },
  { href: "/tools", label: "Tools" },
  { href: "/learn", label: "Learn" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Navigating away should always close the menu.
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={styles.header}>
      <div className="shell">
        <div className={styles.bar}>
          <Link href="/" className={styles.logo} aria-label={`${BRAND.name} — home`}>
            <BrandMark />
            <span className={styles.wordmark}>
              <span className={styles.name}>{BRAND.name}</span>
              <span className={styles.tagline}>{BRAND.tagline}</span>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Primary">
            {NAV.filter((item) => item.href !== "/find-my-challenge").map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.link} ${isActive(item.href) ? styles.linkActive : ""}`}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.right}>
            <Link href="/search" className={`${styles.link} ${styles.desktopOnly}`}>
              Search
            </Link>
            <Link href="/find-my-challenge" className="btn btn-primary btn-sm">
              Find My Challenge
            </Link>
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
            </button>
          </div>
        </div>

        <div
          id="mobile-nav"
          className={`${styles.mobilePanel} ${open ? styles.mobileOpen : ""}`}
          hidden={!open}
        >
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.mobileLink}>
              {item.label}
            </Link>
          ))}
          <Link href="/saved" className={styles.mobileLink}>
            Saved
          </Link>
          <Link href="/outcomes" className={styles.mobileLink}>
            How did it go?
          </Link>
          <Link href="/profile" className={styles.mobileLink}>
            Your profile
          </Link>
          <Link href="/search" className={styles.mobileLink}>
            Search
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Mobile-only sticky primary CTA, hidden on the questionnaire itself. */
export function StickyCta() {
  const pathname = usePathname();
  if (pathname.startsWith("/find-my-challenge")) return null;

  return (
    <Link href="/find-my-challenge" className={`btn btn-primary btn-lg ${styles.stickyCta}`}>
      Find My Challenge
    </Link>
  );
}
