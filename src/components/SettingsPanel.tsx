import WeatherSettings from "../weather/WeatherSettings";

import CompanionSettings from "../companion/CompanionSettings";
import { isTauri } from "@tauri-apps/api/core";
import { applyWindowMode } from "../services/windowMode";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import {
  initialState,
  parseStoredState,
  widgetLabels,
  type State,
} from "../models";
import { open as chooseFolder } from "@tauri-apps/plugin-dialog";

import { importState, today } from "../domain";
import { download } from "../services/storage";

import { Modal } from "./ui";
import Backups from "./Backups";
import type { Update } from "../models";
export default function SettingsPanel({
  state,
  update,
  setError,
  setToast,
  onClose,
}: {
  state: State;
  update: Update;
  setError: (s: string) => void;
  setToast: (s: string) => void;
  onClose: () => void;
}) {
  const native = isTauri();

  return (
    <Modal title="Paramètres" onClose={() => onClose()}>
      <h3>Widgets</h3>
      <div className="widget-toggles">
        {state.settings.widgets.map((w) => (
          <div key={w.id} className="widget-setting">
            <label className="check">
              <input
                type="checkbox"
                checked={w.visible}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      widgets: s.settings.widgets.map((x) =>
                        x.id === w.id ? { ...x, visible: e.target.checked } : x,
                      ),
                    },
                  }))
                }
              />
              {widgetLabels[w.id]}
            </label>
          </div>
        ))}
      </div>
      <CompanionSettings
        value={state.settings.companion}
        onChange={(companion) =>
          update((s) => ({ ...s, settings: { ...s.settings, companion } }))
        }
      />
      <h3>Effets visuels musicaux</h3>
      <div className="companion-enable-row">
        <label className="check">
          <input
            type="checkbox"
            checked={state.settings.musicEffects.enabled}
            onChange={(e) =>
              update((s) => ({
                ...s,
                settings: {
                  ...s.settings,
                  musicEffects: {
                    ...s.settings.musicEffects,
                    enabled: e.target.checked,
                  },
                },
              }))
            }
          />
          Notes autour de la pochette
        </label>
      </div>
      <WeatherSettings value={state.settings.weather} onChange={weather => update(s => ({ ...s, settings: { ...s.settings, weather } }))} />
      <h3>Projets</h3>
      <div className="path-picker">
        <input
          aria-label="Chemin des projets"
          value={state.settings.projectsPath}
          maxLength={1024}
          onChange={(e) =>
            update((s) => ({
              ...s,
              settings: {
                ...s.settings,
                projectsPath: e.target.value,
                projectPins: [],
              },
            }))
          }
        />
        <button
          disabled={!native}
          onClick={async () => {
            try {
              const path = await chooseFolder({
                directory: true,
                multiple: false,
                defaultPath: state.settings.projectsPath,
              });
              if (typeof path === "string")
                update((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    projectsPath: path,
                    projectPins: [],
                  },
                }));
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Choisir…
        </button>
      </div>
      <h3>Informations PC</h3>
      <label className="check">
        <input
          type="checkbox"
          checked={state.settings.pcInfo}
          onChange={(e) =>
            update((s) => ({
              ...s,
              settings: { ...s.settings, pcInfo: e.target.checked },
            }))
          }
        />{" "}
        Afficher à côté de l’heure
      </label>
      <h3>Fenêtre Windows</h3>
      <label className="check">
        <input
          type="checkbox"
          disabled={!native}
          checked={state.settings.borderless}
          onChange={async (e) => {
            const checked = e.target.checked;
            try {
              await applyWindowMode(checked);
              update((s) => ({
                ...s,
                settings: { ...s.settings, borderless: checked },
              }));
            } catch (e) {
              setError(String(e));
            }
          }}
        />{" "}
        Plein écran sans bordures
      </label>
      <label className="check">
        <input
          type="checkbox"
          disabled={!native}
          checked={state.settings.autostart}
          onChange={async (e) => {
            const checked = e.target.checked;
            try {
              await (checked ? enable() : disable());
              update((s) => ({
                ...s,
                settings: { ...s.settings, autostart: checked },
              }));
            } catch (e) {
              setError(String(e));
            }
          }}
        />{" "}
        Ouvrir avec Windows
      </label>
      <h3>Données et sauvegardes</h3>
      <div className="actions">
        <button
          onClick={() =>
            download(
              `focus-dashboard-${today()}.json`,
              JSON.stringify(state, null, 2),
            )
          }
        >
          Exporter JSON
        </button>
        <label className="file-button">
          Importer JSON
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 10000000)
                  throw Error("Fichier trop volumineux (10 Mo maximum).");
                const incoming = parseStoredState(
                  JSON.parse(await file.text()),
                );
                if (
                  confirm(
                    "Fusionner cette sauvegarde avec les données actuelles ?",
                  )
                ) {
                  const backedUp = await download(
                    `focus-dashboard-avant-import-${today()}.json`,
                    JSON.stringify(state, null, 2),
                  );
                  if (!backedUp) return;
                  update((s) => importState(s, incoming));
                  setToast("Sauvegarde fusionnée.");
                }
              } catch (e) {
                setError("Import refusé : " + String(e));
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <Backups state={state} update={update} onError={setError} />
      <footer>
        <button
          onClick={() =>
            update((s) => ({
              ...s,
              settings: {
                ...s.settings,
                widgets: initialState.settings.widgets,
              },
            }))
          }
        >
          Réinitialiser la disposition
        </button>
        <button className="primary" onClick={() => onClose()}>
          Terminé
        </button>
      </footer>
    </Modal>
  );
}
