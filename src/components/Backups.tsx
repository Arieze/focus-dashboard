import { useState } from "react";
import { backups, download } from "../services/storage";
import { today } from "../domain";
import { parseStoredState, type State } from "../models";
import type { Update } from "../models";
export default function Backups({
  state,
  update,
  onError,
}: {
  state: State;
  update: Update;
  onError: (message: string) => void;
}) {
  const [items, setItems] = useState<{ day: string; payload: string }[] | null>(
    null,
  );
  return (
    <div>
      <button
        onClick={async () => {
          try {
            setItems(await backups());
          } catch (e) {
            onError(String(e));
          }
        }}
      >
        Sauvegardes automatiques
      </button>
      {items && (
        <div className="backup-list">
          {!items.length ? (
            <p className="hint">
              Une copie par jour est conservée avant la première modification,
              pendant 30 jours.
            </p>
          ) : (
            items.map((item) => (
              <div className="section-line" key={item.day}>
                <span>{item.day}</span>
                <button
                  onClick={async () => {
                    try {
                      const restored = parseStoredState(
                        JSON.parse(item.payload),
                      );
                      if (
                        !confirm(
                          "Restaurer cette copie ? Les données actuelles seront remplacées.",
                        )
                      )
                        return;
                      if (
                        !(await download(
                          `focus-dashboard-avant-restauration-${today()}.json`,
                          JSON.stringify(state, null, 2),
                        ))
                      )
                        return;
                      update((s) => ({
                        ...restored,
                        settings: s.settings,
                        timer: null,
                      }));
                      setItems(null);
                    } catch (e) {
                      onError("Restauration refusée : " + String(e));
                    }
                  }}
                >
                  Restaurer
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
