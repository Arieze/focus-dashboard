import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { type State, type Shortcut, shortcutSchema } from "../models";
import type { Update } from "../models";
import { Modal, Field, Empty } from "../components/ui";
import Select from "../components/Select";
type Result = { active: boolean; messages: string[] };
export default function Shortcuts({
  state,
  update,
}: {
  state: State;
  update: Update;
}) {
  const [draft, setDraft] = useState<Shortcut | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isTauri()) return;
    for (const group of state.shortcuts) {
      void invoke<Result>("shortcut_action", { action: "status", group })
        .then((result) =>
          setActive((a) => ({ ...a, [group.id]: result.active })),
        )
        .catch((e) => setError(String(e)));
    }
  }, [state.shortcuts]);
  const run = async (group: Shortcut, action: string) => {
    setBusy(group.id);
    setError("");
    try {
      const result = await invoke<Result>("shortcut_action", { action, group });
      setActive((a) => ({ ...a, [group.id]: result.active }));
      setError(result.messages.join(" · "));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <div className="section-line">
        <button
          onClick={() => {
            setError("");
            setDraft({ id: crypto.randomUUID(), name: "Travail", items: [] });
          }}
        >
          <Plus size={16} />
          Nouveau groupe
        </button>
      </div>
      {!state.shortcuts.length && (
        <Empty>Créez un groupe de dossiers, liens et applications.</Empty>
      )}
      {state.shortcuts.map((group) => (
        <div className="shortcut-group" key={group.id}>
          <strong>
            {group.name}
            <small>{group.items.length} raccourcis</small>
          </strong>
          <button
            disabled={!isTauri() || !!busy || active[group.id]}
            onClick={() => void run(group, "open")}
          >
            {busy === group.id ? "…" : "Ouvrir"}
          </button>
          <button
            disabled={!isTauri() || !!busy || !active[group.id]}
            onClick={() => void run(group, "close")}
          >
            Fermer
          </button>
          <button
            title="Configurer"
            disabled={!!busy}
            onClick={() => {
              setError("");
              setDraft(structuredClone(group));
            }}
          >
            <Settings2 size={16} />
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {draft && (
        <Modal title="Configurer le groupe" onClose={() => setDraft(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const group = shortcutSchema.parse(draft);
                for (const item of group.items) {
                  if (item.type === "url" && !/^https?:\/\//i.test(item.target))
                    throw Error("Utilisez une URL http:// ou https://.");
                }
                update((s) => ({
                  ...s,
                  shortcuts: s.shortcuts.some((g) => g.id === group.id)
                    ? s.shortcuts.map((g) => (g.id === group.id ? group : g))
                    : [...s.shortcuts, group],
                }));
                setDraft(null);
                setError("");
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            <Field label="Nom">
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            {draft.items.map((item, i) => (
              <div className="shortcut-item" key={i}>
                <Select
                  aria-label="Type de raccourci"
                  value={item.type}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      items: draft.items.map((x, j) =>
                        j === i
                          ? {
                              type: e.target.value as typeof item.type,
                              target: "",
                            }
                          : x,
                      ),
                    })
                  }
                >
                  <option value="url">Page web</option>
                  <option value="folder">Dossier</option>
                  <option value="file">Fichier</option>
                  <option value="app">Application (.exe)</option>
                </Select>
                <input
                  required
                  aria-label="Adresse ou chemin"
                  placeholder={item.type === "url" ? "https://…" : "Chemin…"}
                  value={item.target}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      items: draft.items.map((x, j) =>
                        j === i ? { ...x, target: e.target.value } : x,
                      ),
                    })
                  }
                />
                {item.type !== "url" && (
                  <button
                    type="button"
                    disabled={!isTauri()}
                    onClick={async () => {
                      try {
                        const path = await open({
                          directory: item.type === "folder",
                          multiple: false,
                          filters:
                            item.type === "app"
                              ? [{ name: "Application", extensions: ["exe"] }]
                              : undefined,
                        });
                        if (typeof path === "string")
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  items: current.items.map((x, j) =>
                                    j === i ? { ...x, target: path } : x,
                                  ),
                                }
                              : null,
                          );
                      } catch (e) {
                        setError(String(e));
                      }
                    }}
                  >
                    Choisir…
                  </button>
                )}
                <button
                  type="button"
                  title="Retirer"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      items: draft.items.filter((_, j) => j !== i),
                    })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={draft.items.length >= 30}
              onClick={() =>
                setDraft({
                  ...draft,
                  items: [...draft.items, { type: "url", target: "" }],
                })
              }
            >
              <Plus size={16} />
              Ajouter
            </button>
            <button
              type="button"
              disabled={!isTauri() || draft.items.length >= 30}
              onClick={async () => {
                try {
                  const path = await open({
                    multiple: false,
                    filters: [
                      { name: "Application Windows", extensions: ["exe"] },
                    ],
                  });
                  if (typeof path === "string")
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            items: [
                              ...current.items,
                              { type: "app", target: path },
                            ],
                          }
                        : null,
                    );
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Ajouter une application (.exe)
            </button>
            <p className="hint">
              Les liens s’ouvrent dans un espace Brave dédié. Fermer demande la
              fermeture des fenêtres lancées par ce groupe.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="section-line">
              <button type="submit">Enregistrer</button>
              <button
                type="button"
                disabled={active[draft.id]}
                onClick={() => {
                  update((s) => ({
                    ...s,
                    shortcuts: s.shortcuts.filter((g) => g.id !== draft.id),
                  }));
                  setDraft(null);
                }}
              >
                Supprimer le groupe
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
