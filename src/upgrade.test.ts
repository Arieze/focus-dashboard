import { it, expect } from "vitest";
import { initialState, parseStoredState } from "./models";
it("met à jour la disposition et conserve les données existantes", () => {
  const old = {
    ...structuredClone(initialState),
    goals: [
      {
        id: "g",
        title: "Conservé",
        description: "",
        category: "Projets",
        start: "2026-10-14",
        target: "",
        value: 0,
        total: 1,
        unit: "%",
        mode: "manual",
        done: false,
      },
    ],
    settings: {
      greeting: "Bonjour",
      borderless: false,
      autostart: false,
      widgets: [
        { id: "calendar", visible: true, height: 0 },
        { id: "tasks", visible: false, height: 300 },
        { id: "goals", visible: true, height: 0 },
        { id: "notes", visible: false, height: 0 },
        { id: "focus", visible: true, height: 0 },
        { id: "music", visible: true, height: 0 },
      ],
    },
  };
  const upgraded = parseStoredState(old);
  expect(upgraded.settings.widgets.map((w) => w.id)).toEqual([
    "calendar",
    "notes",
    "focus",
    "music",
    "projects",
    "shortcuts",
    "weather",
    "markets",
  ]);
  expect(upgraded.settings.widgets[1].visible).toBe(false);
  expect(upgraded.goals[0].title).toBe("Conservé");
  expect(upgraded.settings.projectsPath).toBe("");
});
it("retire le widget vidéo des sauvegardes existantes en conservant la disposition", () => {
  const old = structuredClone(initialState);
  const widgets = old.settings.widgets.map((widget) => ({ ...widget }));
  const upgraded = parseStoredState({
    ...old,
    settings: {
      ...old.settings,
      videoPath: "E:\\Videos\\film.mp4",
      widgets: [...widgets, { id: "video", visible: true, height: 340 }],
    },
  });
  expect(upgraded.settings.widgets).toEqual(widgets);
  expect(upgraded.settings).not.toHaveProperty("videoPath");
});
