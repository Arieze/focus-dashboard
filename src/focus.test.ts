import { it, expect } from "vitest";
import { completeFocus } from "./domain";
import { initialState, type State } from "./models";
const running: State = {
  ...structuredClone(initialState),
  timer: {
    startedAt: 1000,
    endsAt: 1501000,
    remaining: 1500000,
    duration: 25,
    running: true,
    taskId: "task",
  },
};
it("comptabilise une session après veille et une seule fois", () => {
  const completed = completeFocus(running, 9000000);
  expect(completed.timer).toBeNull();
  expect(completed.sessions[0].minutes).toBe(25);
  expect(completeFocus(completed, 10000000).sessions).toHaveLength(1);
});
it("ne termine pas une session en pause", () => {
  const paused = { ...running, timer: { ...running.timer!, running: false } };
  expect(completeFocus(paused, 9000000).sessions).toHaveLength(0);
});
it("ne termine pas une session avant son échéance", () =>
  expect(completeFocus(running, 1001)).toBe(running));
