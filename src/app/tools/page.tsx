import Link from "next/link";

export const metadata = {
  title: "Tools",
  description:
    "Free calculators for prop firm traders: turn drawdown percentages into dollar limits, and see what a challenge's profit target really asks of you.",
};

const TOOLS = [
  {
    href: "/find-my-challenge",
    title: "Challenge match",
    body: "The main one. Answer a few questions and get the challenges that fit how you trade, with the reasoning behind every score.",
    primary: true,
  },
  {
    href: "/tools/drawdown-calculator",
    title: "Drawdown calculator",
    body: "Turn a challenge's drawdown percentages into the dollar figures you actually have to respect while trading.",
  },
  {
    href: "/tools/challenge-calculator",
    title: "Challenge calculator",
    body: "See the profit target and the loss budget side by side, and what their ratio implies about how the challenge will feel.",
  },
];

export default function ToolsPage() {
  return (
    <div className="shell section">
      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <span className="eyebrow">Tools</span>
        <h1>Tools</h1>
        <p className="lede">
          Small calculators that make a challenge&apos;s numbers concrete before you buy it.
        </p>
      </header>

      <div className="grid-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className={`panel ${tool.primary ? "panel-accent" : ""}`}
            style={{ display: "grid", gap: "0.5rem", alignContent: "start" }}
          >
            {tool.primary ? <span className="pill pill-accent">Start here</span> : null}
            <h3>{tool.title}</h3>
            <p className="small">{tool.body}</p>
            <span className="small" style={{ color: "var(--accent)" }}>
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
