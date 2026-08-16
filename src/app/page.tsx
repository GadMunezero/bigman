import Link from "next/link";
import styles from "./home.module.css";

export const metadata = {
  title: "Find the prop firm challenge that fits how you trade",
  description:
    "Answer a few questions about your trading style, budget and the rules that matter. We remove the challenges that cannot work for you, score the rest, and show you exactly why each one fits.",
};

const STYLES = [
  {
    href: "/best-prop-firm-challenges-for-scalping",
    title: "Scalper",
    body: "You need execution rules that don't punish frequent trades, and no consistency rule quietly capping your best day.",
  },
  {
    href: "/best-prop-firm-challenges-for-day-trading",
    title: "Day trader",
    body: "The daily loss limit and the drawdown type matter more to you than the headline account size.",
  },
  {
    href: "/best-prop-firm-challenges-for-swing-trading",
    title: "Swing trader",
    body: "Overnight and weekend rules decide this for you. A challenge that prohibits them is not a lower score — it's out.",
  },
  {
    href: "/prop-firm-challenges-allowing-news-trading",
    title: "News trader",
    body: "Firms treat news windows very differently. Some allow it, some restrict it to certain instruments, some prohibit it outright.",
  },
  {
    href: "/challenges",
    title: "Algorithmic trader",
    body: "EA, API and copy trading permissions vary firm to firm, and are often buried in the rules page rather than the sales page.",
  },
  {
    href: "/psychology",
    title: "Every trader",
    body: "The rules only matter if your behaviour survives them. The psychology workspace is built into the product, not bolted on.",
  },
];

const RULE_CHIPS = [
  "Drawdown",
  "Daily loss",
  "Profit target",
  "Consistency",
  "News",
  "Overnight",
  "Weekend",
  "EA",
  "Payout",
  "Platform",
  "Minimum days",
];

const FAQS = [
  {
    q: "How does the matching system work?",
    a: "In two stages. First we remove every challenge that fundamentally conflicts with a requirement you gave us — wrong market, prohibits overnight when you need it, above your budget. Then we score what's left on eight weighted criteria and rank them.",
  },
  {
    q: "How long does it take?",
    a: "Six to eight questions, about a minute. A few follow-up questions only appear when your earlier answers make them relevant.",
  },
  {
    q: "Do I need an account?",
    a: "No. The questionnaire, your results and your match scores all work anonymously. An account only exists to save results across devices.",
  },
  {
    q: "How are challenges ranked?",
    a: "By compatibility with the profile you gave us: trading style, rule compatibility, budget, drawdown, payout, account size, platform and how well-verified our data is. Weights shift toward whatever you told us matters most.",
  },
  {
    q: "Does affiliate commission affect the ranking?",
    a: "No. The ranking engine has no access to commercial data at all — commissions, affiliate links and tracking IDs live in a separate part of the database that the scoring code does not read. Monetisation happens after you've already seen the recommendation.",
  },
  {
    q: "How often is information updated?",
    a: "Every challenge carries a last-verified date, and every field carries a confidence level. Where we haven't confirmed something we say 'not confirmed' rather than guessing. Changes are reviewed by a person before they go live.",
  },
  {
    q: "What does a 94% match mean?",
    a: "That the challenge satisfied 94% of the weighted criteria in your profile — with your priorities weighted more heavily. It is a fit score against your stated preferences, not a quality rating of the firm and not a prediction that you'll pass.",
  },
  {
    q: "Is this financial advice?",
    a: "No. This is a filtering and comparison tool based on information you provide and rules we've recorded. Trading carries substantial risk, and nothing here predicts that you'll pass a challenge or receive a payout.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="shell">
        <div className={styles.hero}>
          <div>
            <span className="pill pill-accent">Personalised challenge matching</span>
            <h1 className={styles.heroTitle}>Which prop firm challenge is right for you?</h1>
            <p className="lede">
              Answer a few questions about your trading style, budget and preferred rules. We&apos;ll
              narrow down the challenges that fit you best — and show you exactly why.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/find-my-challenge" className="btn btn-primary btn-lg">
                Find My Challenge
              </Link>
              <Link href="/how-it-works" className="btn btn-lg">
                How it works
              </Link>
            </div>
            <p className={styles.heroNote}>
              No account needed · about a minute · we explain every score
            </p>
          </div>

          <div className={styles.preview} aria-label="Example of a personalised match">
            <div className={styles.previewCard}>
              <span className="eyebrow">Your trading profile</span>
              <dl className={styles.previewRows}>
                <div className={styles.previewRow}>
                  <dt>Style</dt>
                  <dd>Day trader</dd>
                </div>
                <div className={styles.previewRow}>
                  <dt>Market</dt>
                  <dd>Futures</dd>
                </div>
                <div className={styles.previewRow}>
                  <dt>Overnight</dt>
                  <dd>Not required</dd>
                </div>
                <div className={styles.previewRow}>
                  <dt>News</dt>
                  <dd>Sometimes</dd>
                </div>
                <div className={styles.previewRow}>
                  <dt>Budget</dt>
                  <dd>$100</dd>
                </div>
              </dl>
            </div>

            <span className={styles.arrow} aria-hidden="true">
              ↓
            </span>

            <div className={styles.matchCard}>
              <div className={styles.matchHead}>
                <div>
                  <span className="eyebrow">Your best match</span>
                  <h3 style={{ marginTop: "0.3rem" }}>$100K Challenge</h3>
                </div>
                <span className="pill pill-accent" style={{ marginLeft: "auto" }}>
                  94% match
                </span>
              </div>
              <ul className={styles.matchWhy}>
                <li>
                  <span>✓</span> Fits your trading style
                </li>
                <li>
                  <span>✓</span> Inside your budget
                </li>
                <li>
                  <span>✓</span> News rules compatible
                </li>
                <li>
                  <span>✓</span> Drawdown matches your preference
                </li>
              </ul>
              <p className="small muted" style={{ borderTop: "1px solid var(--line)", paddingTop: "0.7rem" }}>
                Illustration of the results layout. Real matches are generated from your answers and
                from challenge data we have verified.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ problem framing */}
      <section className="shell section">
        <div className="grid-2" style={{ gap: "3rem", alignItems: "center" }}>
          <div className="stack">
            <h2>Stop guessing which challenge to choose.</h2>
            <p className="lede">
              There are dozens of challenges, and they differ on things that decide whether you can
              trade your strategy at all — not just on price.
            </p>
            <div className={styles.ruleChips} style={{ marginTop: "0.5rem" }}>
              {RULE_CHIPS.map((chip) => (
                <span key={chip} className={styles.chip}>
                  {chip}
                </span>
              ))}
            </div>
            <Link href="/find-my-challenge" className="btn btn-primary" style={{ justifySelf: "start", marginTop: "1rem" }}>
              Find My Challenge
            </Link>
          </div>

          <div className="panel panel-quiet stack">
            <span className="eyebrow">The difference</span>
            <p style={{ fontSize: "1.05rem", color: "var(--ink)" }}>
              Other sites hand you sixty companies and a filter bar.
            </p>
            <p style={{ fontSize: "1.05rem", color: "var(--accent)" }}>
              We ask what you need first, then remove what can&apos;t work for you.
            </p>
            <hr className="divider" />
            <p className="small muted">
              A $39 challenge with a consistency rule and no overnight holding can be far harder for
              you than a $79 one without either. Price is one criterion out of eight.
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- how it works */}
      <section className="shell section-tight">
        <h2 className="section-heading">How it works</h2>
        <div className={`grid-3 ${styles.steps}`}>
          <div className={styles.step}>
            <span className={styles.stepNum}>01</span>
            <h3>Tell us how you trade</h3>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              Market, style, holding period, news, overnight, budget, account size and what you care
              about most.
            </p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>02</span>
            <h3>We match you</h3>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              Challenges that conflict with a hard requirement are eliminated outright. The rest are
              scored against your profile, weighted toward your priorities.
            </p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>03</span>
            <h3>Choose your match</h3>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              See your best options, the reason behind every score, and at least one honest caveat
              for each.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- style cards */}
      <section className="shell section">
        <h2 className="section-heading">Your trading style matters</h2>
        <div className="grid-3">
          {STYLES.map((style) => (
            <Link key={style.title} href={style.href} className={styles.styleCard}>
              <h3>{style.title}</h3>
              <p className="small">{style.body}</p>
              <span className="small" style={{ color: "var(--accent)", marginTop: "0.25rem" }}>
                See matching challenges →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- psychology */}
      <section className="shell section-tight">
        <div className="panel panel-accent grid-2" style={{ gap: "2rem", alignItems: "center" }}>
          <div className="stack">
            <span className="eyebrow">Built in, not bolted on</span>
            <h2>The right challenge still needs the right trader.</h2>
            <p>
              Most challenges are not lost to a bad strategy — they&apos;re lost to a moved stop, a
              revenge trade, or size that grew after a good week. The psychology workspace gives you
              a pre-trade risk gate, a behaviour log, a mistake-pattern tracker and a set of drills
              that make those moments rehearsable.
            </p>
            <Link href="/psychology" className="btn" style={{ justifySelf: "start" }}>
              Open the psychology workspace
            </Link>
          </div>
          <div className="grid-2" style={{ gap: "0.6rem" }}>
            {[
              ["Risk gate", "No plan, no trade"],
              ["Behaviour log", "Grade the trader"],
              ["Habits coach", "Name the leak"],
              ["Drills", "Rehearse the pressure"],
            ].map(([title, sub]) => (
              <div key={title} className="panel panel-quiet" style={{ padding: "0.9rem" }}>
                <div className="stat-label">{sub}</div>
                <strong style={{ display: "block", marginTop: "0.3rem" }}>{title}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ preferences */}
      <section className="shell section">
        <div className="grid-2" style={{ gap: "3rem", alignItems: "start" }}>
          <div className="stack">
            <h2>Built around your preferences.</h2>
            <p className="lede">
              This site is going to ask about you before it shows you anything. Each answer either
              removes options or changes how the remaining ones are weighted.
            </p>
            <div className={styles.ruleChips} style={{ marginTop: "0.75rem" }}>
              {[
                "Budget",
                "Trading style",
                "Market",
                "Holding period",
                "News",
                "Overnight",
                "Drawdown",
                "Payout",
                "Platform",
              ].map((chip) => (
                <span key={chip} className={styles.chip}>
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="panel stack">
            <span className="eyebrow">What you get back</span>
            <h3>An explanation, not a verdict</h3>
            <p className="small">
              Every recommendation shows the criteria it earned points on, the points it lost, and
              at least one thing to consider before you buy. If a challenge scored 92, you can open
              the breakdown and see all eight lines that produced it.
            </p>
            <hr className="divider" />
            <p className="small muted">
              And if nothing fits, we say so — and tell you which requirement to relax — rather than
              showing you something that doesn&apos;t work.
            </p>
            <Link href="/methodology" className="btn btn-sm" style={{ justifySelf: "start" }}>
              Read the methodology
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ FAQ */}
      <section className="shell-narrow section">
        <h2 className="section-heading">Frequently asked questions</h2>
        {FAQS.map((faq) => (
          <details key={faq.q} className={styles.faqItem}>
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </section>

      {/* ------------------------------------------------------ final CTA */}
      <section className="shell section-tight">
        <div className={styles.finalCta}>
          <h2 style={{ maxWidth: "18ch" }}>Stop comparing everything. Find what fits you.</h2>
          <Link href="/find-my-challenge" className="btn btn-primary btn-lg">
            Find My Challenge
          </Link>
        </div>
      </section>
    </>
  );
}
