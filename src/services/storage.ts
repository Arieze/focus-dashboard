import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  initialState,
  stateSchema,
  parseStoredState,
  type State,
} from "../models";
import { save as chooseFile } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

let queue = Promise.resolve();
const recoveryKey = "focus-pending-state:v2";
let persistedPayload: string | null | undefined;
const pending: { payload: string }[] = [];

function cachePending() {
  try {
    if (pending.length) {
      localStorage.setItem(recoveryKey, JSON.stringify({
        basePayload: persistedPayload,
        payloads: pending.map((entry) => entry.payload),
      }));
    } else {
      localStorage.removeItem(recoveryKey);
    }
  } catch {
    /* SQLite remains the primary store if the recovery cache is unavailable. */
  }
}

export async function load(): Promise<State> {
  if (!isTauri()) return structuredClone(initialState);
  const payload = await invoke<string | null>("load_state");
  const saved = payload ? parseStoredState(JSON.parse(payload)) : structuredClone(initialState);
  let restored = saved;
  try {
    const recovery = localStorage.getItem(recoveryKey);
    if (recovery) {
      const journal = JSON.parse(recovery);
      if (Array.isArray(journal.payloads) && journal.payloads.length &&
        journal.payloads.every((entry: unknown) => typeof entry === "string") &&
        (journal.basePayload === payload || journal.payloads.includes(payload))) {
        restored = parseStoredState(JSON.parse(journal.payloads.at(-1)));
      } else {
        // Preserve a conflicting recovery, but never replay it over unrelated data.
        localStorage.setItem("focus-recovery:" + Date.now(), recovery);
        localStorage.removeItem(recoveryKey);
      }
    } else if (payload === null) {
      const legacy = localStorage.getItem("focus-pending-state");
      if (legacy) restored = parseStoredState(JSON.parse(legacy));
    }
  } catch {
    /* Invalid or inaccessible recovery must not prevent loading the database. */
  }
  persistedPayload = payload;
  return restored;
}
export function save(state: State) {
  const payload = JSON.stringify(stateSchema.parse(state));
  if (!isTauri()) return Promise.resolve();
  if (persistedPayload === undefined) {
    return Promise.reject(new Error("Les données doivent être chargées avant leur sauvegarde."));
  }
  const entry = { payload };
  pending.push(entry);
  cachePending();
  const write = queue
    .catch(() => {})
    .then(async () => {
      await invoke("save_state", { payload, expectedPayload: persistedPayload });
      persistedPayload = payload;
      pending.splice(0, pending.indexOf(entry) + 1);
      cachePending();
    });
  queue = write;
  return write;
}
export async function download(
  name: string,
  text: string,
  type = "application/json",
) {
  if (isTauri()) {
    try {
      const path = await chooseFile({
        defaultPath: name,
        filters: [
          {
            name: type === "text/markdown" ? "Markdown" : "Sauvegarde JSON",
            extensions: [type === "text/markdown" ? "md" : "json"],
          },
        ],
      });
      if (!path) return false;
      await writeTextFile(path, text);
      return true;
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("storage-error", {
          detail: "Export impossible : " + String(error),
        }),
      );
      return false;
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
export async function backups() {
  return isTauri()
    ? invoke<{ day: string; payload: string }[]>("state_backups")
    : [];
}
