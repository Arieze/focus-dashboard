import Select from "../components/Select";
import { useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { State } from "../models";
import type { Update } from "../models";
import { today } from "../domain";
import { formatInTimeZone } from "date-fns-tz";
export default function Focus({
  state,
  update,
  now,
}: {
  state: State;
  update: Update;
  now: number;
}) {
  const [minutes, setMinutes] = useState(25),
    [taskId, setTaskId] = useState("");
  const t = state.timer,
    seconds = t
      ? Math.max(
          0,
          Math.ceil((t.running ? t.endsAt - now : t.remaining) / 1000),
        )
      : minutes * 60;
  const daily = state.sessions
    .filter(
      (s) =>
        formatInTimeZone(s.endedAt, "Europe/Paris", "yyyy-MM-dd") === today(),
    )
    .reduce((a, s) => a + s.minutes, 0);
  const weekly = state.sessions
    .filter((s) => now - s.endedAt < 7 * 86400000)
    .reduce((a, s) => a + s.minutes, 0);
  return (
    <>
      <div className="focus-layout">
        <div>
          <div className="timer">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}
            <span>:</span>
            {String(seconds % 60).padStart(2, "0")}
          </div>
          <small>
            {daily} min aujourd’hui · {weekly} min sur 7 jours
          </small>
        </div>
        <div className="focus-controls">
          <div className="segmented">
            {[25, 5, 50, 10].map((n) => (
              <button
                disabled={!!t}
                className={minutes === n ? "active" : ""}
                onClick={() => setMinutes(n)}
                key={n}
              >
                {n} min
              </button>
            ))}
          </div>
          <label className="custom-time">
            Durée{" "}
            <input
              aria-label="Durée personnalisée"
              type="number"
              min="1"
              max="240"
              disabled={!!t}
              value={minutes}
              onChange={(e) =>
                setMinutes(Math.max(1, Math.min(240, Number(e.target.value))))
              }
            />
          </label>
          <Select
            disabled={!!t}
            aria-label="Tâche de concentration"
            value={t?.taskId || taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">Concentration libre</option>
            {state.tasks
              .filter((t) => !t.done)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
          </Select>
          <div className="actions">
            <button
              className="primary"
              onClick={() =>
                update((s) => {
                  const timer = s.timer;
                  return {
                    ...s,
                    timer: timer
                      ? {
                          ...timer,
                          running: !timer.running,
                          remaining: timer.running
                            ? Math.max(0, timer.endsAt - Date.now())
                            : timer.remaining,
                          endsAt: timer.running
                            ? timer.endsAt
                            : Date.now() + timer.remaining,
                        }
                      : {
                          running: true,
                          remaining: minutes * 60000,
                          endsAt: Date.now() + minutes * 60000,
                          startedAt: Date.now(),
                          duration: minutes,
                          taskId,
                        },
                  };
                })
              }
            >
              {t?.running ? <Pause size={16} /> : <Play size={16} />}{" "}
              {t?.running ? "Pause" : t ? "Reprendre" : "Se concentrer"}
            </button>
            {t && (
              <button
                title="Annuler la session"
                onClick={() => {
                  if (confirm("Annuler cette session sans la comptabiliser ?"))
                    update((s) => ({ ...s, timer: null }));
                }}
              >
                <RotateCcw size={17} />
              </button>
            )}
          </div>
        </div>
      </div>
      {state.sessions.length > 0 && (
        <details>
          <summary>Historique · {state.sessions.length} sessions</summary>
          {state.sessions
            .slice(-10)
            .reverse()
            .map((s) => (
              <p className="hint" key={s.id}>
                {new Date(s.endedAt).toLocaleString("fr-FR")} · {s.minutes} min
                ·{" "}
                {state.tasks.find((t) => t.id === s.taskId)?.title ||
                  "Concentration libre"}
              </p>
            ))}
        </details>
      )}
    </>
  );
}
