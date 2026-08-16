import Link from "next/link";
import { adminEnabled, isAdmin } from "@/lib/admin";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/challenges", label: "Challenges" },
  { href: "/admin/firms", label: "Firms" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/rules", label: "Rule changes" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/tester", label: "Recommendation tester" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!adminEnabled()) {
    return (
      <div className="shell-narrow section">
        <div className="panel panel-warn">
          <h1 style={{ fontSize: "1.5rem" }}>Admin is disabled.</h1>
          <p style={{ marginTop: "1rem" }}>
            No <span className="mono">ADMIN_PASSWORD</span> is configured, so the admin area is
            locked rather than left open.
          </p>
          <p className="small muted" style={{ marginTop: "0.75rem" }}>
            Set <span className="mono">ADMIN_PASSWORD</span> in your environment and restart. Set{" "}
            <span className="mono">ADMIN_SECRET</span> too if you want to be able to invalidate
            sessions without changing the password.
          </p>
        </div>
      </div>
    );
  }

  if (!(await isAdmin())) {
    return (
      <div className="shell-narrow section">
        <header className="stack-sm" style={{ marginBottom: "2rem" }}>
          <span className="eyebrow">Admin</span>
          <h1>Sign in</h1>
        </header>
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="shell section">
      <header className="spread" style={{ marginBottom: "1.5rem" }}>
        <div>
          <span className="eyebrow">Admin</span>
          <h1 style={{ fontSize: "1.75rem" }}>Platform administration</h1>
        </div>
        <Link href="/" className="btn btn-sm">
          View site
        </Link>
      </header>

      <nav
        className="row"
        style={{ gap: "0.35rem", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid var(--line)" }}
        aria-label="Admin sections"
      >
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="btn btn-sm">
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
