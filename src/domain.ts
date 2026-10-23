import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays, format, parseISO, differenceInCalendarDays } from "date-fns";
import { type CalendarEvent, type State, parseStoredState } from "./models";
export const today = () =>
  formatInTimeZone(new Date(), "Europe/Paris", "yyyy-MM-dd");
export const nextDay = (day: string, n = 1) =>
  format(addDays(parseISO(day), n), "yyyy-MM-dd");
export function occurs(event: CalendarEvent, day: string) {
  const delta = differenceInCalendarDays(parseISO(day), parseISO(event.date));
  if (delta < 0) return false;
  const span = differenceInCalendarDays(
    parseISO(event.endDate || event.date),
    parseISO(event.date),
  );
  const offset =
    event.recurrence === "daily"
      ? 0
      : event.recurrence === "weekly"
        ? delta % 7
        : delta;
  return offset <= span;
}
export function eventTimeLabel(event: CalendarEvent, day: string) {
  if (event.allDay) return "Journée";
  const span = differenceInCalendarDays(
    parseISO(event.endDate || event.date),
    parseISO(event.date),
  );
  if (span === 0) return `${event.start}–${event.end}`;
  const delta = differenceInCalendarDays(parseISO(day), parseISO(event.date));
  const offset =
    event.recurrence === "daily"
      ? 0
      : event.recurrence === "weekly"
        ? delta % 7
        : delta;
  if (offset === 0) return `Dès ${event.start}`;
  if (offset === span) return `Jusqu’à ${event.end}`;
  return "Journée";
}
export function toggleTask(
  state: State,
  id: string,
  now = new Date().toISOString(),
): State {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return state;
  const tasks = state.tasks.map((t) =>
    t.id === id
      ? { ...t, done: !t.done, completedAt: t.done ? undefined : now }
      : t,
  );
  if (!task.done && task.recurrence !== "none") {
    const date = nextDay(task.date, task.recurrence === "daily" ? 1 : 7),
      seriesId = task.seriesId || task.id;
    const newId = `${seriesId}:${date}`;
    if (!tasks.some((t) => t.id === newId))
      tasks.push({
        ...task,
        id: newId,
        seriesId,
        date,
        done: false,
        completedAt: undefined,
      });
  }
  return { ...state, tasks };
}
export function importState(current: State, input: unknown): State {
  const incoming = parseStoredState(input);
  incoming.events.forEach(validateEvent);
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [
    ...new Map([...a, ...b].map((item) => [item.id, item])).values(),
  ];
  return {
    ...current,
    tasks: merge(current.tasks, incoming.tasks),
    events: merge(current.events, incoming.events),
    goals: merge(current.goals, incoming.goals),
    notes: merge(current.notes, incoming.notes),
    sessions: merge(current.sessions, incoming.sessions),
    shortcuts: merge(current.shortcuts, incoming.shortcuts),
  };
}
export function eventInstant(day: string, time: string) {
  return fromZonedTime(`${day}T${time}:00`, "Europe/Paris");
}
export function completeFocus(state: State, now: number): State {
  const timer = state.timer;
  if (!timer?.running || timer.endsAt > now) return state;
  const id = `focus:${timer.startedAt}`;
  return {
    ...state,
    timer: null,
    sessions: state.sessions.some((s) => s.id === id)
      ? state.sessions
      : [
          ...state.sessions,
          {
            id,
            taskId: timer.taskId,
            startedAt: timer.startedAt,
            endedAt: timer.endsAt,
            minutes: timer.duration,
          },
        ],
  };
}
export function validateEvent(event: CalendarEvent) {
  const endDate = event.endDate || event.date;
  if (endDate < event.date)
    throw Error(
      "La date de fin doit être égale ou postérieure à la date de début.",
    );
  if (!event.allDay) {
    if (
      !/^\d{2}:\d{2}$/.test(event.start) ||
      !/^\d{2}:\d{2}$/.test(event.end) ||
      (endDate === event.date && event.end <= event.start)
    )
      throw Error("La fin doit être après le début.");
    if (
      formatInTimeZone(
        eventInstant(event.date, event.start),
        "Europe/Paris",
        "HH:mm",
      ) !== event.start ||
      formatInTimeZone(
        eventInstant(endDate, event.end),
        "Europe/Paris",
        "HH:mm",
      ) !== event.end
    )
      throw Error("Cette heure n’existe pas lors du changement d’heure.");
  }
  return event;
}
