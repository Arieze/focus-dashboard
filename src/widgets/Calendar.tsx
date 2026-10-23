import Select from "../components/Select";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  format,
  addMonths,
  startOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  type State,
  type CalendarEvent,
  categories,
  eventSchema,
} from "../models";
import {
  today,
  occurs,
  validateEvent,
  toggleTask,
  eventTimeLabel,
} from "../domain";
import { type Update } from "../models";
import { Modal, Field, Empty } from "../components/ui";
import { categoryColors } from "../categoryColors";
export default function Calendar({
  state,
  update,
}: {
  state: State;
  update: Update;
}) {
  const [selected, setSelected] = useState(today()),
    [month, setMonth] = useState(parseISO(today())),
    [draft, setDraft] = useState<CalendarEvent | null>(null),
    [error, setError] = useState(""),
    [taskTitle, setTaskTitle] = useState("");
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  return (
    <>
      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="section-line">
            <div className="month-nav">
              <button
                title="Mois précédent"
                onClick={() => setMonth(addMonths(month, -1))}
              >
                <ChevronLeft size={18} />
              </button>
              <strong>{format(month, "MMMM yyyy", { locale: fr })}</strong>
              <button
                title="Mois suivant"
                onClick={() => setMonth(addMonths(month, 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
            <div className="calendar-grid">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <span className="weekday" key={i}>
                  {d}
                </span>
              ))}
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const dayCategories = categories.filter((category) =>
                  state.events.some(
                    (e) => e.category === category && occurs(e, key),
                  ),
                );
                const colors = dayCategories.map(
                  (category) => categoryColors[category],
                );
                const background =
                  colors.length === 1
                    ? colors[0]
                    : colors.length > 1
                      ? `linear-gradient(135deg, ${colors.map((color, i) => `${color} ${(i * 100) / colors.length}% ${((i + 1) * 100) / colors.length}%`).join(", ")})`
                      : undefined;
                return (
                  <button
                    key={key}
                    className={[
                      colors.length ? "has-events" : "",
                      key === selected ? "selected" : "",
                      key === today() ? "today" : "",
                      !isSameMonth(d, month) ? "muted" : "",
                    ].join(" ")}
                    style={{ background }}
                    title={dayCategories.join(" · ") || undefined}
                    aria-label={`${format(d, "d MMMM yyyy", { locale: fr })}${dayCategories.length ? " · " + dayCategories.join(", ") : ""}`}
                    aria-pressed={key === selected}
                    onClick={() => setSelected(key)}
                  >
                    <span>{format(d, "d")}</span>
                  </button>
                );
              })}
            </div>
        </div>
        <aside className="calendar-agenda">
          <div className="section-line agenda-label">
            <span>
              {format(parseISO(selected), "EEEE d MMMM", { locale: fr })}
            </span>
            <button
              onClick={() => {
                setError("");
                setDraft({
                  id: crypto.randomUUID(),
                  title: "",
                  date: selected,
                  endDate: selected,
                  start: "09:00",
                  end: "10:00",
                  allDay: false,
                  category: "Personnel",
                  recurrence: "none",
                });
              }}
            >
              <Plus size={16} /> Événement
            </button>
          </div>
          <div>
              {!state.events.some((e) => occurs(e, selected)) ? (
                <Empty>Aucun événement.</Empty>
              ) : (
                state.events
                  .filter((e) => occurs(e, selected))
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .map((e) => (
                    <button
                      className={"event category-" + e.category}
                      style={{ borderColor: categoryColors[e.category] }}
                      key={e.id}
                      onClick={() => {
                        setError("");
                        setDraft(e);
                      }}
                    >
                      <span style={{ color: categoryColors[e.category] }}>
                        {eventTimeLabel(e, selected)}
                      </span>
                      <strong>{e.title}</strong>
                      <small>
                        {e.category}
                        {e.endDate &&
                        e.endDate !== e.date &&
                        e.recurrence === "none"
                          ? ` · ${format(parseISO(e.date), "dd/MM")} – ${format(parseISO(e.endDate), "dd/MM")}`
                          : ""}
                        {e.recurrence !== "none" ? " · ↻" : ""}
                      </small>
                    </button>
                  ))
              )}
          </div>
          <div className="calendar-tasks">
            <div className="section-line">
              <strong>Tâches du jour</strong>
              <button
                type="button"
                title="Supprimer les tâches terminées du jour"
                aria-label="Supprimer les tâches terminées du jour"
                disabled={!state.tasks.some((task) => task.date === selected && task.done)}
                onClick={() => update((s) => ({ ...s, tasks: s.tasks.filter((task) => task.date !== selected || !task.done) }))}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <form
              className="quick"
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskTitle.trim()) return;
                update((s) => ({
                  ...s,
                  tasks: [
                    ...s.tasks,
                    {
                      id: crypto.randomUUID(),
                      title: taskTitle.trim(),
                      description: "",
                      date: selected,
                      priority: "Normale",
                      category: "Personnel",
                      done: false,
                      recurrence: "none",
                      goalId: "",
                    },
                  ],
                }));
                setTaskTitle("");
              }}
            >
              <input
                aria-label="Tâche du jour sélectionné"
                placeholder="Ajouter une tâche…"
                maxLength={200}
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
              <button title="Ajouter une tâche" disabled={!taskTitle.trim()}>
                <Plus size={16} />
              </button>
            </form>
            {state.tasks
              .filter((task) => task.date === selected)
              .map((task) => (
                <div
                  className="calendar-task"
                  key={task.id}
                  style={{ borderLeftColor: categoryColors[task.category] }}
                >
                  <label className="calendar-task-label">
                  <input
                    type="checkbox"
                    aria-label={"Terminer " + task.title}
                    checked={task.done}
                    onChange={() => update((s) => toggleTask(s, task.id))}
                  />
                  <span
                    style={{
                      textDecoration: task.done ? "line-through" : undefined,
                    }}
                  >
                    {task.title}
                  </span>
                  </label>
                  <button
                    type="button"
                    className="calendar-task-delete"
                    title={"Supprimer " + task.title}
                    aria-label={"Supprimer " + task.title}
                    onClick={() => update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== task.id) }))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            {!state.tasks.some((task) => task.date === selected) && (
              <Empty>Aucune tâche.</Empty>
            )}
          </div>
        </aside>
      </div>
      <div className="category-legend">
        {categories.map((category) => (
          <span key={category}>
            <i style={{ background: categoryColors[category] }} />
            {category}
          </span>
        ))}
      </div>
      {draft && (
        <Modal title="Événement · Europe/Paris" onClose={() => setDraft(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const value = validateEvent(eventSchema.parse(draft));
                update((s) => ({
                  ...s,
                  events: [...s.events.filter((x) => x.id !== value.id), value],
                }));
                setDraft(null);
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            <Field label="Titre">
              <input
                autoFocus
                required
                maxLength={200}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Date de début">
                <input
                  type="date"
                  required
                  value={draft.date}
                  onChange={(e) => {
                    const date = e.target.value;
                    const previousEnd = draft.endDate || draft.date;
                    setDraft({
                      ...draft,
                      date,
                      endDate:
                        previousEnd === draft.date || previousEnd < date
                          ? date
                          : previousEnd,
                    });
                  }}
                />
              </Field>
              <Field label="Date de fin (incluse)">
                <input
                  type="date"
                  required
                  min={draft.date}
                  value={draft.endDate || draft.date}
                  onChange={(e) =>
                    setDraft({ ...draft, endDate: e.target.value })
                  }
                />
              </Field>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(e) =>
                  setDraft({ ...draft, allDay: e.target.checked })
                }
              />{" "}
              Toute la journée
            </label>
            {!draft.allDay && (
              <div className="form-grid">
                <Field label="Début">
                  <input
                    type="time"
                    required
                    value={draft.start}
                    onChange={(e) =>
                      setDraft({ ...draft, start: e.target.value })
                    }
                  />
                </Field>
                <Field label="Fin">
                  <input
                    type="time"
                    required
                    value={draft.end}
                    onChange={(e) =>
                      setDraft({ ...draft, end: e.target.value })
                    }
                  />
                </Field>
              </div>
            )}
            <div className="form-grid">
              <Field label="Catégorie">
                <Select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      category: e.target.value as CalendarEvent["category"],
                    })
                  }
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Répétition">
                <Select
                  value={draft.recurrence}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      recurrence: e.target.value as CalendarEvent["recurrence"],
                    })
                  }
                >
                  <option value="none">Aucune</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                </Select>
              </Field>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <p className="hint">
              Modifier ou supprimer un événement récurrent s’applique à toute sa
              série.
            </p>
            <footer>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (
                    confirm("Supprimer cet événement et sa série éventuelle ?")
                  ) {
                    update((s) => ({
                      ...s,
                      events: s.events.filter((e) => e.id !== draft.id),
                    }));
                    setDraft(null);
                  }
                }}
              >
                Supprimer
              </button>
              <button className="primary" disabled={!draft.title.trim()}>
                Enregistrer
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
