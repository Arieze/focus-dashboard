import { weatherSchema, weatherDefaults } from "./weather/settings";
import { z } from "zod";
import {
  musicEffectsSchema,
  musicEffectsDefaults,
} from "./music-effects/settings";
import { companionSchema, companionDefaults } from "./companion/settings";
export const categories = [
  "Personnel",
  "Travail",
  "Informatique",
  "Sport",
  "Projets",
] as const;
const category = z.enum(categories),
  recurrence = z.enum(["none", "daily", "weekly"]),
  day = z.iso.date();
export const taskSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(200),
  description: z.string().default(""),
  date: day,
  priority: z.enum(["Normale", "Haute", "Basse"]),
  category,
  done: z.boolean(),
  recurrence,
  goalId: z.string().default(""),
  completedAt: z.string().optional(),
  seriesId: z.string().optional(),
});
export const eventSchema = z
  .object({
    id: z.string(),
    title: z.string().trim().min(1).max(200),
    date: day,
    endDate: day.optional(),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    allDay: z.boolean(),
    category,
    recurrence,
  })
  .refine((event) => !event.endDate || event.endDate >= event.date, {
    message:
      "La date de fin doit être égale ou postérieure à la date de début.",
    path: ["endDate"],
  });
export const goalSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(200),
  description: z.string(),
  category,
  start: day,
  target: z.union([day, z.literal("")]),
  value: z.number().nonnegative(),
  total: z.number().positive(),
  unit: z.string(),
  mode: z.enum(["manual", "tasks"]),
  done: z.boolean(),
});
export const noteSchema = z.object({
  id: z.string(),
  title: z.string().max(200),
  body: z.string().max(100000),
  category,
  pinned: z.boolean(),
  updatedAt: z.iso.datetime(),
});
export const sessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  startedAt: z.number(),
  endedAt: z.number(),
  minutes: z.number().positive(),
});
export const widgetIds = [
  "calendar",
  "notes",
  "focus",
  "music",
  "projects",
  "shortcuts",
  "weather",
  "markets",
] as const;
export const widgetLabels = {
  calendar: "Agenda",
  notes: "Notes",
  focus: "Concentration",
  music: "Musique",
  projects: "Projets",
  shortcuts: "Raccourcis",
  weather: "Météo",
  markets: "Bourse",
};
export const shortcutSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  items: z
    .array(
      z.object({
        type: z.enum(["url", "folder", "file", "app"]),
        target: z.string().trim().min(1).max(2048),
      }),
    )
    .min(1)
    .max(30),
});
export type Shortcut = z.infer<typeof shortcutSchema>;
export const stateSchema = z.object({
  version: z.literal(1),
  tasks: z.array(taskSchema),
  events: z.array(eventSchema),
  goals: z.array(goalSchema),
  notes: z.array(noteSchema),
  sessions: z.array(sessionSchema),
  shortcuts: z.array(shortcutSchema).default([]),
  settings: z.object({
    weather: weatherSchema,
    musicPlaylist: z.string().max(200).default(""),
    musicEffects: musicEffectsSchema,
    companion: companionSchema,
    widgets: z
      .array(
        z.object({
          id: z.enum(widgetIds),
          visible: z.boolean(),
          height: z.number().min(0).max(1000),
        }),
      )
      .length(widgetIds.length)
      .refine(
        (w) => new Set(w.map((x) => x.id)).size === widgetIds.length,
        "Chaque widget doit apparaître une seule fois.",
      ),
    borderless: z.boolean(),
    autostart: z.boolean(),
    projectsPath: z.string().max(1024).default(""),
    projectPins: z.array(z.string().max(1024)).default([]),
    pcInfo: z.boolean().default(true),
  }),
  timer: z
    .object({
      running: z.boolean(),
      remaining: z.number().nonnegative(),
      endsAt: z.number(),
      startedAt: z.number(),
      duration: z.number().positive(),
      taskId: z.string(),
    })
    .nullable(),
});
export type Task = z.infer<typeof taskSchema>;
export type CalendarEvent = z.infer<typeof eventSchema>;
export type Note = z.infer<typeof noteSchema>;
export type State = z.infer<typeof stateSchema>;
export type Update = (fn: (state: State) => State) => void;
export const initialState: State = {
  version: 1,
  tasks: [],
  events: [],
  goals: [],
  notes: [],
  sessions: [],
  shortcuts: [],
  timer: null,
  settings: {
    weather: weatherDefaults,
    musicPlaylist: "",
    musicEffects: musicEffectsDefaults,
    companion: companionDefaults,
    borderless: false,
    autostart: false,
    projectsPath: "",
    projectPins: [],
    pcInfo: true,
    widgets: widgetIds.map((id) => ({ id, visible: true, height: 0 })),
  },
};
export function parseStoredState(input: unknown): State {
  if (!input || typeof input !== "object") return stateSchema.parse(input);
  const value = structuredClone(input) as Record<string, unknown>;
  const settings = value.settings as Record<string, unknown> | undefined;
  if (settings && Array.isArray(settings.widgets)) {
    const widgets = (
      settings.widgets as { id: string; visible: boolean; height: number }[]
    ).filter((w) => w.id !== "goals" && w.id !== "video" && w.id !== "tasks");
    if (!widgets.some((w) => w.id === "projects"))
      widgets.push({ id: "projects", visible: true, height: 0 });
    if (!widgets.some((w) => w.id === "shortcuts"))
      widgets.push({ id: "shortcuts", visible: true, height: 0 });
    if (!widgets.some((w) => w.id === "weather"))
      widgets.push({ id: "weather", visible: true, height: 0 });
    if (!widgets.some((w) => w.id === "markets"))
      widgets.push({ id: "markets", visible: true, height: 0 });
    settings.widgets = widgets;
    for (const widget of widgets) widget.height = 0;
  }
  return stateSchema.parse(value);
}
