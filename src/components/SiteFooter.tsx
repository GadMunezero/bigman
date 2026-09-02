import Link from "next/link";
import { BRAND } from "@/lib/brand";

const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/find-my-challenge", label: "Find My Challenge" },
      { href: "/challenges", label: "Browse challenges" },
      { href: "/compare", label: "Compare" },
      { href: "/psychology", label: "Trading psychology" },
      { href: "/tools", label: "Tools" },
      { href: "/outcomes", label: "How did it go?" },
      { href: "/newsletter", label: "Newsletter" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/methodology", label: "Methodology" },
      { href: "/review-policy", label: "Review policy" },
      { href: "/affiliate-disclosure", label: "Affiliate disclosure" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/risk-disclosure", label: "Risk disclosure" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: "4rem" }}>
      <div className="shell" style={{ padding: "3rem 1.5rem 2rem" }}>
        {/*
          The column template lives in globals.css, not inline, because it has
          to change on a narrow screen — an inline style cannot carry a media
          query, and this one demanded a 220px first column plus three more on
          a 390px phone, which pushed the whole page sideways.
        */}
        <div className="footer-grid">
          <div className="stack-sm">
            <strong style={{ fontSize: "1rem" }}>
              {BRAND.name}{" "}
              <span style={{ color: "var(--accent)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {BRAND.tagline}
              </span>
            </strong>
            <p className="small muted" style={{ maxWidth: "34ch" }}>
              Tell us how you trade. We&apos;ll help you find the prop firm challenge that fits.
            </p>
            <Link href="/find-my-challenge" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem", justifySelf: "start" }}>
              Find My Challenge
            </Link>
          </div>

          {GROUPS.map((group) => (
            <nav key={group.title} className="stack-sm" aria-label={group.title}>
              <span className="eyebrow">{group.title}</span>
              {group.links.map((link) => (
                <Link key={link.href} href={link.href} className="small muted">
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <hr className="divider" style={{ margin: "2.5rem 0 1.25rem" }} />

        <div className="stack-sm small muted">
          <p>
            Trading involves substantial risk of loss and is not suitable for everyone. Nothing on
            this site is financial advice, and no result on this site is a prediction that you will
            pass a challenge, receive a payout, or make money.
          </p>
          {/*
            Deliberately true whether or not any affiliate deal exists, so this
            never needs a database read on every page render and can never go
            stale. The live status lives on the disclosure page, which reads it.
          */}
          <p>
            Outbound links go to the firm&apos;s own website. Where we have an affiliate
            relationship the link says so, and commission never affects your compatibility score —
            see our{" "}
            <Link href="/affiliate-disclosure" style={{ textDecoration: "underline" }}>
              affiliate disclosure
            </Link>{" "}
            and{" "}
            <Link href="/methodology" style={{ textDecoration: "underline" }}>
              methodology
            </Link>
            .
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            © {new Date().getFullYear()} {BRAND.name}. Not affiliated with any prop trading firm.
          </p>
        </div>
      </div>
    </footer>
  );
}
