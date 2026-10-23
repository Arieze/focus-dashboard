import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  FolderOpen,
  ArrowUp,
  ExternalLink,
  Star,
  RefreshCw,
} from "lucide-react";
import type { State } from "../models";
import type { Update } from "../models";
interface Folder {
  name: string;
  relative: string;
}
export default function Projects({
  state,
  update,
}: {
  state: State;
  update: Update;
}) {
  const [relative, setRelative] = useState(""),
    [folders, setFolders] = useState<Folder[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0);
  const root = state.settings.projectsPath;
  useEffect(() => {
    setRelative("");
  }, [root]);
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    setLoading(true);
    void invoke<Folder[]>("project_folders", { root, relative })
      .then((items) => {
        if (!disposed) {
          setFolders(items);
          setError("");
        }
      })
      .catch((e) => {
        if (!disposed) {
          setFolders([]);
          setError(String(e));
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [root, relative, revision]);
  const open = async (path: string) => {
    try {
      await invoke("open_project", { root, relative: path });
    } catch (e) {
      setError(String(e));
    }
  };
  const pin = (path: string) =>
    update((s) => ({
      ...s,
      settings: {
        ...s.settings,
        projectPins: s.settings.projectPins.includes(path)
          ? s.settings.projectPins.filter((p) => p !== path)
          : [...s.settings.projectPins, path],
      },
    }));
  return (
    <>
      <div className="section-line">
        <div className="project-path" title={root + "\\" + relative}>
          <button
            title="Dossier parent"
            disabled={!relative}
            onClick={() =>
              setRelative(relative.split(/[\\/]/).slice(0, -1).join("\\"))
            }
          >
            <ArrowUp size={16} />
          </button>
          <button onClick={() => setRelative("")} title={root}>
            Projets
          </button>
          {relative && <span>{relative}</span>}
        </div>
        <div>
          <button
            title="Ouvrir ce dossier"
            disabled={!isTauri()}
            onClick={() => void open(relative)}
          >
            <ExternalLink size={16} />
          </button>
          <button title="Actualiser" onClick={() => setRevision((n) => n + 1)}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      {state.settings.projectPins.length > 0 && (
        <div className="project-pins">
          {state.settings.projectPins.map((path) => (
            <span className="project-pin" key={path}>
              <button title={path} onClick={() => void open(path)}>
                <Star size={12} />
                {path.split(/[\\/]/).at(-1)}
              </button>
              <button title="Retirer le favori" onClick={() => pin(path)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="project-folders">
        {folders.map((folder) => (
          <div className="project-folder" key={folder.relative}>
            <button
              className="grow"
              onClick={() => setRelative(folder.relative)}
            >
              <FolderOpen size={17} />
              <span>{folder.name}</span>
            </button>
            <button
              title="Épingler"
              className={
                state.settings.projectPins.includes(folder.relative)
                  ? "active"
                  : ""
              }
              onClick={() => pin(folder.relative)}
            >
              <Star size={14} />
            </button>
            <button
              title="Ouvrir dans l’Explorateur"
              onClick={() => void open(folder.relative)}
            >
              <ExternalLink size={14} />
            </button>
          </div>
        ))}
      </div>
      {loading && <p className="empty">Chargement…</p>}
      {!loading && !folders.length && !error && (
        <p className="empty">
          {isTauri()
            ? "Aucun sous-dossier."
            : "Dossiers disponibles dans l’application Windows."}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
