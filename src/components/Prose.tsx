export interface ProseSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

/**
 * Shared layout for the trust and legal pages, so they read as one voice and a
 * new policy page is a data change rather than a new bespoke layout.
 */
export function ProsePage({
  eyebrow,
  title,
  lede,
  sections,
  footnote,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  sections: ProseSection[];
  footnote?: string;
}) {
  return (
    <div className="shell-narrow section">
      <header className="stack-sm" style={{ marginBottom: "2.5rem" }}>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </header>

      <div className="stack-lg">
        {sections.map((section, i) => (
          <section key={section.heading ?? `section-${i}`}>
            {section.heading ? (
              <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>{section.heading}</h2>
            ) : null}

            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} style={{ marginBottom: "0.75rem" }}>
                {paragraph}
              </p>
            ))}

            {section.bullets ? (
              <ul className="stack-sm" style={{ marginTop: "0.5rem", paddingLeft: "1.1rem" }}>
                {section.bullets.map((bullet) => (
                  <li key={bullet.slice(0, 40)} style={{ color: "var(--ink-2)" }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {footnote ? (
        <p className="small muted" style={{ marginTop: "3rem" }}>
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
