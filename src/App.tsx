import Markets from "./markets/Markets";
import { ChartNoAxesCombined } from "lucide-react";
import Weather from "./weather/Weather";
import { CloudSun } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  CalendarDays,
  StickyNote,
  Timer,
  Music2,
  Settings2,
  GripVertical,
  Leaf,
  FolderOpen,
  PanelsTopLeft,
} from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { applyWindowMode } from "./services/windowMode";

import { initialState, type State, stateSchema } from "./models";
import { completeFocus, today } from "./domain";
import DailyQuote from "./components/DailyQuote";

import { load, save, download } from "./services/storage";

import Calendar from "./widgets/Calendar";
import Shortcuts from "./widgets/Shortcuts";
import Projects from "./widgets/Projects";
import PcInfo from "./components/PcInfo";
import Notes from "./widgets/Notes";
import Focus from "./widgets/Focus";
import Music from "./widgets/Music";
import SettingsPanel from "./components/SettingsPanel";
import Companion from "./companion/Companion";

const labels = {
  calendar: "Agenda",
  projects: "Projets",
  shortcuts: "Raccourcis",
  weather: "Météo",
  markets: "Bourse",
  notes: "Notes",
  focus: "Concentration",
  music: "Musique",
};
const icons = {
  calendar: CalendarDays,
  projects: FolderOpen,
  shortcuts: PanelsTopLeft,
  weather: CloudSun,
  markets: ChartNoAxesCombined,
  notes: StickyNote,
  focus: Timer,
  music: Music2,
};
export default function App() {
  const [state, setState] = useState<State>(initialState),
    [loaded, setLoaded] = useState(false),
    [loadAttempt, setLoadAttempt] = useState(0),
    [loadFailed, setLoadFailed] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Chargement…"),
    [settings, setSettings] = useState(false),
    [dragOver, setDragOver] = useState<string | null>(null),
    [now, setNow] = useState(Date.now()),
    [toast, setToast] = useState("");
  const stateRef = useRef(state);
  const loadedRef = useRef(false);
  loadedRef.current = loaded;
  stateRef.current = state;
  const drag = useRef<(() => void) | null>(null);
  useEffect(() => () => drag.current?.(), []);
  const startDrag = (event: PointerEvent<HTMLElement>, id: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current?.();
    const section = event.currentTarget.closest<HTMLElement>(".widget")!;
    const startY = event.clientY,
      startScroll = window.scrollY;
    let y = startY,
      active = false,
      frame = 0;
    const tick = () => {
      if (active) {
        const edge = 90;
        const speed =
          y < edge
            ? -Math.ceil((edge - y) / 5)
            : y > innerHeight - edge
              ? Math.ceil((y - innerHeight + edge) / 5)
              : 0;
        window.scrollBy(0, speed);
        section.style.transform =
          "translateY(" + (y - startY + window.scrollY - startScroll) + "px)";
        const others = [
          ...document.querySelectorAll<HTMLElement>(".widget[data-widget]"),
        ].filter((el) => el !== section);
        const target = others.find(
          (el) =>
            y <
            el.getBoundingClientRect().top +
              el.getBoundingClientRect().height / 2,
        );
        setDragOver(target?.dataset.widget || "end");
      }
      frame = requestAnimationFrame(tick);
    };
    const onMove = (e: globalThis.PointerEvent) => {
      y = e.clientY;
      if (Math.abs(y - startY) > 5) {
        active = true;
        section.classList.add("widget-dragging");
      }
    };
    const finish = (commit = true) => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      section.style.transform = "";
      section.classList.remove("widget-dragging");
      if (active && commit) {
        const others = [
          ...document.querySelectorAll<HTMLElement>(".widget[data-widget]"),
        ].filter((el) => el !== section);
        const before = others.find(
          (el) =>
            y <
            el.getBoundingClientRect().top +
              el.getBoundingClientRect().height / 2,
        )?.dataset.widget;
        setState((s) => {
          const widgets = s.settings.widgets.filter((w) => w.id !== id);
          const item = s.settings.widgets.find((w) => w.id === id)!;
          const index = before
            ? widgets.findIndex((w) => w.id === before)
            : widgets.length;
          widgets.splice(index, 0, item);
          return { ...s, settings: { ...s.settings, widgets } };
        });
      }
      setDragOver(null);
      drag.current = null;
    };
    const onUp = () => finish();
    const onCancel = () => finish(false);
    drag.current = onCancel;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    frame = requestAnimationFrame(tick);
  };
  const native = isTauri();
  useEffect(() => {
    const listener = (event: Event) =>
      setError((event as CustomEvent<string>).detail);
    window.addEventListener("storage-error", listener);
    return () => window.removeEventListener("storage-error", listener);
  }, []);
  useEffect(() => {
    let disposed = false;
    setLoadFailed(false);
    void load()
      .then((s) => {
        if (disposed) return;
        setState(s);
        setLoaded(true);
        setError("");
        setStatus(
          native ? "Enregistré sur cet appareil" : "Aperçu · non persistant",
        );
        if (native)
          void applyWindowMode(s.settings.borderless).catch((e) => {
            if (!disposed) setError(String(e));
          });
      })
      .catch((e) => {
        if (!disposed) {
          setLoadFailed(true);
          setStatus("Échec du chargement");
          setError("Impossible d’ouvrir les données : " + String(e));
        }
      });
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      disposed = true;
      clearInterval(clock);
    };
  }, [native, loadAttempt]);
  useEffect(() => {
    if (!loaded) return;
    setStatus(native ? "Enregistrement…" : "Aperçu · non persistant");
    {
      void save(state)
        .then(() => {
          setStatus(
            native ? "Enregistré sur cet appareil" : "Aperçu · non persistant",
          );
          setError((previous) =>
            previous.startsWith("Vos modifications restent") ||
            previous.startsWith("Fermeture interrompue")
              ? ""
              : previous,
          );
        })
        .catch((e) => {
          setStatus("Échec de sauvegarde");
          setError(
            "Vos modifications restent en mémoire. Exportez une copie : " +
              String(e),
          );
        });
    }
  }, [state, loaded, native]);
  useEffect(() => {
    if (!native) return;
    let dispose: (() => void) | undefined;
    let disposed = false;
    let closing = false;
    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        event.preventDefault();
        if (disposed) return;
        if (closing) {
          event.preventDefault();
          return;
        }
        closing = true;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          if (loadedRef.current)
            await Promise.race([
              save(stateRef.current),
              new Promise<never>((_, reject) => {
                timeout = setTimeout(
                  () =>
                    reject(
                      new Error(
                        "La sauvegarde ne répond pas. Exportez une copie avant de réessayer.",
                      ),
                    ),
                  8000,
                );
              }),
            ]);
          await getCurrentWindow().destroy();
        } catch (e) {
          event.preventDefault();
          closing = false;
          setError("Fermeture interrompue : " + String(e));
        } finally {
          clearTimeout(timeout);
        }
      })
      .then((fn) => {
        if (disposed) fn();
        else dispose = fn;
      })
      .catch((e) => setError(String(e)));
    return () => {
      disposed = true;
      dispose?.();
    };
  }, [native]);
  useEffect(() => {
    if (!state.timer?.running || state.timer.endsAt > now) return;
    setState((s) => completeFocus(s, Date.now()));
    setToast("Session terminée.");

  }, [now, state.timer]);
  const update = (fn: (s: State) => State) =>
    setState((s) => stateSchema.parse(fn(s)));
  const move = (id: string, direction: number) =>
    update((s) => {
      const widgets = [...s.settings.widgets],
        i = widgets.findIndex((w) => w.id === id),
        j = Math.max(0, Math.min(widgets.length - 1, i + direction));
      const [item] = widgets.splice(i, 1);
      widgets.splice(j, 0, item);
      return { ...s, settings: { ...s.settings, widgets } };
    });
  const content = {
    calendar: <Calendar state={state} update={update} />,
    markets: <Markets />,
    weather: <Weather settings={state.settings.weather} onOpenSettings={() => setSettings(true)} onChange={weather => update(s => ({ ...s, settings: { ...s.settings, weather } }))} />,
    shortcuts: <Shortcuts state={state} update={update} />,
    projects: <Projects state={state} update={update} />,
    notes: <Notes state={state} update={update} />,
    focus: <Focus state={state} update={update} now={now} />,
    music: <Music effects={state.settings.musicEffects} playlistId={state.settings.musicPlaylist} onPlaylistChange={musicPlaylist => update(s => ({ ...s, settings: { ...s.settings, musicPlaylist } }))} />,
  };
  return (
    <main>
      <header className="masthead">
        <div className="brand" data-tauri-drag-region>
          <Leaf size={18} />
          <span>FOCUS DASHBOARD</span>
        </div>
        <nav>
          <span
            className="save-indicator"
            role="status"
            title={status}
            aria-label={status}
          >
            <span className={error ? "dot error-dot" : "dot"} />
          </span>
          <button title="Paramètres" disabled={!loaded} onClick={() => setSettings(true)}>
            <Settings2 size={19} />
          </button>
        </nav>
      </header>
      <section className={state.settings.pcInfo ? "welcome welcome-with-pc" : "welcome"}>
        <div>
          <span className="eyebrow">
            {new Date(now).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Europe/Paris",
            })}
          </span>
          <h1>
            {new Date(now).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Paris",
            })}
          </h1>
        </div>
        <DailyQuote date={today()} />
        {state.settings.pcInfo && <PcInfo pingHost="8.8.8.8" />}
      </section>
      {!native && (
        <div className="notice">Aperçu navigateur · données temporaires</div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
          <button
            onClick={() =>
              download(
                "focus-dashboard-secours.json",
                JSON.stringify(state, null, 2),
              )
            }
          >
            Exporter une copie
          </button>
          <button onClick={() => setError("")}>Fermer</button>
        </div>
      )}
      {toast && (
        <div className="notice" role="status">
          {toast}
          <button onClick={() => setToast("")}>Compris</button>
        </div>
      )}
      {!loaded ? (
        loadFailed ? (
          <button onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Réessayer le chargement</button>
        ) : <p>Ouverture de votre espace…</p>
      ) : (
        <div className={"widgets " + (dragOver === "end" ? "drop-at-end" : "")}>
          {state.settings.widgets
            .filter((w) => w.visible)
            .map((w) => {
              const Icon = icons[w.id];
              return (
                <section
                  key={w.id}
                  data-widget={w.id}
                  className={
                    "widget " + (dragOver === w.id ? "drop-target" : "")
                  }
                  style={{ minHeight: w.height || undefined }}
                >
                  <header
                    className="widget-header widget-handle"
                    onPointerDown={(e) => startDrag(e, w.id)}
                    tabIndex={0}
                    title="Glisser pour déplacer · Alt + flèches"
                    onKeyDown={(e) => {
                      if (
                        e.altKey &&
                        (e.key === "ArrowUp" || e.key === "ArrowDown")
                      ) {
                        e.preventDefault();
                        move(w.id, e.key === "ArrowUp" ? -1 : 1);
                      }
                    }}
                  >
                    <h2>
                      <Icon size={19} />
                      {labels[w.id]}
                    </h2>
                    <GripVertical size={16} className="drag-grip" />
                  </header>
                  {w.visible && content[w.id]}
                </section>
              );
            })}
        </div>
      )}
      {settings && (
        <SettingsPanel
          state={state}
          update={update}
          setError={setError}
          setToast={setToast}
          onClose={() => setSettings(false)}
        />
      )}
      {loaded && <Companion state={state} />}
    </main>
  );
}
