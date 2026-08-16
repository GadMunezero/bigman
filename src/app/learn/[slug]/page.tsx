import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article not found" };
  return { title: article.title, description: article.summary ?? undefined };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <div className="shell-narrow section">
      <nav className="small muted" style={{ marginBottom: "1.5rem" }}>
        <Link href="/learn">Learn</Link>
      </nav>

      <header className="stack-sm" style={{ marginBottom: "2rem" }}>
        <h1>{article.title}</h1>
        {article.summary ? <p className="lede">{article.summary}</p> : null}
        <p className="small muted">
          Updated {new Date(article.updated_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
        </p>
      </header>

      {/* Article bodies are plain text authored in the admin area — rendered as
          paragraphs rather than as HTML, so stored content can never inject markup. */}
      <div className="stack">
        {(article.body ?? "")
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
      </div>

      <div className="panel panel-accent spread" style={{ marginTop: "3rem" }}>
        <div>
          <strong>Want a recommendation based on YOUR trading style?</strong>
          <p className="small muted">
            We remove what cannot work for you, score the rest, and explain every number.
          </p>
        </div>
        <Link href="/find-my-challenge" className="btn btn-primary">
          Find My Challenge
        </Link>
      </div>
    </div>
  );
}
