import { listFirms } from "@/lib/repo";
import { parseKeyPeople } from "@/lib/types";
import { saveFirm } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminFirmsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const firms = listFirms({ includeUnpublished: true });
  const editing = editId ? firms.find((f) => f.id === editId) : null;

  return (
    <div className="stack-lg">
      <section>
        <h2 className="section-heading">{editing ? `Edit ${editing.name}` : "Add a firm"}</h2>
        <form action={saveFirm} className="panel stack">
          <input type="hidden" name="id" value={editing?.id ?? ""} />

          <div className="grid-2">
            <div>
              <label className="field-label" htmlFor="name">
                Name
              </label>
              <input id="name" name="name" className="input" defaultValue={editing?.name ?? ""} required />
            </div>
            <div>
              <label className="field-label" htmlFor="slug">
                Slug (leave blank to derive from the name)
              </label>
              <input id="slug" name="slug" className="input" defaultValue={editing?.slug ?? ""} />
            </div>
            <div>
              <label className="field-label" htmlFor="website">
                Website
              </label>
              <input id="website" name="website" className="input" defaultValue={editing?.website ?? ""} />
            </div>
            <div>
              <label className="field-label" htmlFor="status">
                Status
              </label>
              <select id="status" name="status" defaultValue={editing?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="ceo">
                Chief executive
              </label>
              <input id="ceo" name="ceo" className="input" defaultValue={editing?.ceo ?? ""} />
            </div>
            <div>
              <label className="field-label" htmlFor="headquarters">
                Headquarters
              </label>
              <input
                id="headquarters"
                name="headquarters"
                className="input"
                defaultValue={editing?.headquarters ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="founded_year">
                Founded (year)
              </label>
              <input
                id="founded_year"
                name="founded_year"
                type="number"
                className="input"
                defaultValue={editing?.founded_year ?? ""}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="leadership_source_url">
                Leadership source URL
              </label>
              <input
                id="leadership_source_url"
                name="leadership_source_url"
                className="input"
                defaultValue={editing?.leadership_source_url ?? ""}
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="key_people">
              Other key people — one per line, as &quot;Name, Role&quot;
            </label>
            <textarea
              id="key_people"
              name="key_people"
              className="input"
              rows={3}
              defaultValue={parseKeyPeople(editing?.key_people)
                .map((p) => (p.role ? `${p.name}, ${p.role}` : p.name))
                .join("\n")}
            />
            <p className="small muted" style={{ marginTop: "0.4rem" }}>
              Leave blank if the firm does not publicly name them. The firm page says &quot;not
              disclosed&quot;, which is worth more to a trader than a name nobody can check.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="description">
              Description
            </label>
            <textarea id="description" name="description" defaultValue={editing?.description ?? ""} />
          </div>

          <div className="row">
            <button type="submit" className="btn btn-primary">
              {editing ? "Save firm" : "Create firm"}
            </button>
            {editing ? (
              <a href="/admin/firms" className="btn btn-ghost">
                Cancel
              </a>
            ) : null}
          </div>
        </form>
      </section>

      <section>
        <h2 className="section-heading">Firms ({firms.length})</h2>
        {firms.length === 0 ? (
          <p className="small muted">No firms yet. Add one above before creating challenges.</p>
        ) : (
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {firms.map((firm) => (
                  <tr key={firm.id}>
                    <td>{firm.name}</td>
                    <td className="mono small">{firm.slug}</td>
                    <td>
                      <span className={`pill ${firm.status === "published" ? "pill-accent" : ""}`}>
                        {firm.status}
                      </span>
                    </td>
                    <td>
                      <a href={`/admin/firms?edit=${firm.id}`} className="btn btn-sm">
                        Edit
                      </a>
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
