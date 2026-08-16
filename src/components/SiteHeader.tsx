"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./SiteHeader.module.css";

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
          <Link href="/" className={styles.logo} aria-label="Home">
            <span className={styles.mark} aria-hidden="true">
              ◧
            </span>
            Challenge&nbsp;Fit
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
