import Select from "../components/Select";
import { useState } from "react";
import { Plus, Pin, Download } from "lucide-react";
import Markdown from "react-markdown";
import { type State, type Note, categories } from "../models";
import type { Update } from "../models";
import { Modal, Field, Empty } from "../components/ui";
import { download } from "../services/storage";
export default function Notes({
  state,
  update,
}: {
  state: State;
  update: Update;
}) {
  const [id, setId] = useState<string | null>(null),
    [preview, setPreview] = useState(false);
  const note = state.notes.find((n) => n.id === id);
  const change = (patch: Partial<Note>) =>
    update((s) => ({
      ...s,
      notes: s.notes.map((n) =>
        n.id === id
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n,
      ),
    }));
  return (
    <>
      <div className="quick">
        <button
          title="Créer une note"
          onClick={() => {
            const n: Note = {
              id: crypto.randomUUID(),
              title: "",
              body: "",
              category: "Personnel",
              pinned: false,
              updatedAt: new Date().toISOString(),
            };
            update((s) => ({ ...s, notes: [n, ...s.notes] }));
            setId(n.id);
            setPreview(false);
          }}
        >
          <Plus size={18} /> Nouvelle note
        </button>
      </div>
      <div className="notes-grid">
        {[...state.notes]
          .sort(
            (a, b) =>
              Number(b.pinned) - Number(a.pinned) ||
              b.updatedAt.localeCompare(a.updatedAt),
          )
          .map((n) => (
            <button
              className="note-card"
              key={n.id}
              onClick={() => {
                setId(n.id);
                setPreview(false);
              }}
            >
              <strong>
                {n.pinned && <Pin size={13} />} {n.title || "Sans titre"}
              </strong>
              <p>{n.body.slice(0, 100) || "Note vide"}</p>
              <small>
                {n.category} ·{" "}
                {new Date(n.updatedAt).toLocaleDateString("fr-FR")}
              </small>
            </button>
          ))}
      </div>
      {!state.notes.length && <Empty>Aucune note.</Empty>}
      {note && (
        <Modal title="Bloc-notes" onClose={() => setId(null)}>
          <Field label="Titre">
            <input
              autoFocus
              maxLength={200}
              placeholder="Sans titre"
              value={note.title}
              onChange={(e) => change({ title: e.target.value })}
            />
          </Field>
          <div className="section-line">
            <Select
              aria-label="Catégorie de la note"
              value={note.category}
              onChange={(e) =>
                change({ category: e.target.value as Note["category"] })
              }
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <button
              className={note.pinned ? "active" : ""}
              onClick={() => change({ pinned: !note.pinned })}
            >
              <Pin size={15} /> Épingler
            </button>
            <button onClick={() => setPreview(!preview)}>
              {preview ? "Éditer" : "Aperçu Markdown"}
            </button>
          </div>
          {preview ? (
            <article className="markdown">
              <Markdown>
                {note.body || "*Aucune note pour le moment.*"}
              </Markdown>
            </article>
          ) : (
            <textarea
              className="note-editor"
              aria-label="Contenu Markdown"
              placeholder="Écrire…"
              maxLength={100000}
              value={note.body}
              onChange={(e) => change({ body: e.target.value })}
            />
          )}
          <p className="hint">Sauvegarde automatique</p>
          <footer>
            <button
              className="danger"
              onClick={() => {
                if (confirm("Supprimer définitivement cette note ?")) {
                  update((s) => ({
                    ...s,
                    notes: s.notes.filter((n) => n.id !== id),
                  }));
                  setId(null);
                }
              }}
            >
              Supprimer
            </button>
            <button
              onClick={() =>
                download(
                  (note.title || "note").replace(/[<>:"/\\|?*]/g, "-") + ".md",
                  `# ${note.title}\n\n${note.body}`,
                  "text/markdown",
                )
              }
            >
              <Download size={15} /> Exporter
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
