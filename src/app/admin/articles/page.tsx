import Link from "next/link";
import { getDb } from "@/lib/db";
import type { ArticleRow } from "@/lib/repo";
import { saveArticle } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminArticlesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;

  // Admin sees drafts too, so it reads the table directly rather than going
  // through the published-only repository helper.
  const articles = getDb()
    .prepare(`SELECT * FROM articles ORDER BY updated_at DESC`)
    .all() as ArticleRow[];
  const editing = editId ? articles.find((a) => a.id === editId) : null;

  return (
    <div className="stack-lg">
      <section>
        <h2 className="section-heading">{editing ? `Edit: ${editing.title}` : "New article"}</h2>
        <form action={saveArticle} className="panel stack">
          <input type="hidden" name="id" value={editing?.id ?? ""} />

          <div className="grid-2">
            <div>
              <label className="field-label" htmlFor="title">
                Title
              </label>
              <input id="title" name="title" className="input" defaultValue={editing?.title ?? ""} required />
            </div>
            <div>
              <label className="field-label" htmlFor="slug">
                Slug
              </label>
              <input id="slug" name="slug" className="input" defaultValue={editing?.slug ?? ""} />
            </div>
            <div>
              <label className="field-label" htmlFor="kind">
                Kind
              </label>
              <select id="kind" name="kind" defaultValue={editing?.kind ?? "learn"}>
                <option value="learn">Learn article</option>
                <option value="landing">Landing page</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="status">
                Status
              </label>
              <select id="status" name="status" defaultValue={editing?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="summary">
              Summary
            </label>
            <input id="summary" name="summary" className="input" defaultValue={editing?.summary ?? ""} />
          </div>

          <div>
            <label className="field-label" htmlFor="body">
              Body
            </label>
            <textarea
              id="body"
              name="body"
              style={{ minHeight: "320px" }}
              defaultValue={editing?.body ?? ""}
              placeholder="Plain text. Separate paragraphs with a blank line — the body is rendered as paragraphs, not as HTML."
            />
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              Every article should end by pointing back at the questionnaire — that is what the
              content is for.
            </p>
          </div>

          <div className="row">
            <button type="submit" className="btn btn-primary">
              {editing ? "Save article" : "Create article"}
            </button>
            {editing ? (
              <Link href="/admin/articles" className="btn btn-ghost">
                Cancel
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section>
        <h2 className="section-heading">Articles ({articles.length})</h2>
        {articles.length === 0 ? (
          <p className="small muted">No articles yet.</p>
        ) : (
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id}>
                    <td>{article.title}</td>
                    <td className="small mono">{article.slug}</td>
                    <td className="small">{article.kind}</td>
                    <td>
                      <span className={`pill ${article.status === "published" ? "pill-accent" : ""}`}>
                        {article.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/articles?edit=${article.id}`} className="btn btn-sm">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
