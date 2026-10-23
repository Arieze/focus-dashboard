import { getCurrentWindow } from "@tauri-apps/api/window";

let pending: Promise<void> = Promise.resolve();

// Serialize mode changes: startup and a settings click must not race.
export function applyWindowMode(borderless: boolean): Promise<void> {
  const operation = pending
    .catch(() => {})
    .then(async () => {
      const window = getCurrentWindow();
      if (borderless) {
        await window.setDecorations(false);
        try {
          await window.setFullscreen(true);
        } catch (error) {
          await window.setDecorations(true).catch(() => {});
          throw error;
        }
      } else {
        await window.setFullscreen(false);
        await window.setDecorations(true);
      }
      globalThis.window.dispatchEvent(new Event("focus-window-layout"));
    });
  pending = operation;
  return operation;
}
