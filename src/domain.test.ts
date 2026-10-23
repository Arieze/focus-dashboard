import { describe, it, expect } from "vitest";
import { initialState, type Task } from "./models";
import {
  toggleTask,
  occurs,
  eventInstant,
  validateEvent,
  importState,
} from "./domain";
import { DisconnectedProvider } from "./services/music";
const task: Task = {
  id: "one",
  title: "Lire",
  description: "",
  date: "2026-10-24",
  priority: "Normale",
  category: "Personnel",
  done: false,
  recurrence: "daily",
  goalId: "",
};
describe("Récurrences", () => {
  it("crée une occurrence unique même après décocher/recocher", () => {
    let s = { ...structuredClone(initialState), tasks: [task] };
    s = toggleTask(s, "one");
    s = toggleTask(s, "one");
    s = toggleTask(s, "one");
    expect(s.tasks).toHaveLength(2);
    expect(s.tasks[1].date).toBe("2026-10-25");
    expect(s.tasks[0].completedAt).toBeDefined();
  });
  it("conserve l’historique et la série", () => {
    let s = toggleTask(
      { ...structuredClone(initialState), tasks: [task] },
      "one",
    );
    s = toggleTask(s, "one:2026-10-25");
    expect(s.tasks[2].id).toBe("one:2026-10-26");
    expect(s.tasks.filter((t) => t.done)).toHaveLength(2);
  });
});
describe("Calendrier Europe/Paris", () => {
  it("respecte les offsets été et hiver", () => {
    expect(eventInstant("2026-07-10", "09:00").toISOString()).toBe(
      "2026-07-10T07:00:00.000Z",
    );
    expect(eventInstant("2026-12-10", "09:00").toISOString()).toBe(
      "2026-12-10T08:00:00.000Z",
    );
  });
  const event = {
    id: "e",
    title: "Sport",
    date: "2026-03-29",
    start: "02:30",
    end: "04:00",
    allDay: false,
    category: "Sport" as const,
    recurrence: "weekly" as const,
  };
  it("rejette une heure inexistante au passage en été", () =>
    expect(() => validateEvent(event)).toThrow());
  it("répète selon les dates civiles", () => {
    expect(occurs(event, "2026-04-05")).toBe(true);
    expect(occurs(event, "2026-04-04")).toBe(false);
    expect(occurs(event, "2026-03-22")).toBe(false);
  });
});
describe("Import", () => {
  it("est idempotent", () => {
    const s = { ...structuredClone(initialState), tasks: [task] };
    expect(importState(importState(initialState, s), s).tasks).toHaveLength(1);
  });
  it("rejette une sauvegarde invalide", () =>
    expect(() => importState(initialState, { version: 2 })).toThrow());
});
it("ne simule pas une connexion musicale", async () =>
  expect((await new DisconnectedProvider().status()).connected).toBe(false));
