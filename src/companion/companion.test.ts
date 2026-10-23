import { describe, it, expect } from "vitest";
import { animationFrame } from "./animation";
import { animations } from "./sprites";
import { planJump, landing } from "./navigation";
import { CompanionEngine } from "./engine";
import { companionDefaults } from "./settings";
import { initialState, parseStoredState } from "../models";
const upper = { id: "upper", left: 60, right: 800, y: 200, bottom: 500 };
const lower = { id: "lower", left: 60, right: 800, y: 512, bottom: 850 };
describe("sprite exports", () => {
  it("keeps the long final roll frames and stops non-looping clips", () => {
    expect(animationFrame(animations.roll, 0.46)).toBe(9);
    expect(animationFrame(animations.roll, 0.56)).toBe(10);
    expect(animationFrame(animations.roll, 8)).toBe(10);
    expect(animationFrame(animations.idle, 0.6)).toBe(0);
  });
});
describe("platform navigation", () => {
  it("rejects jumps through widget content or above the maximum apex", () => {
    expect(planJump(200, upper, lower, [upper, lower], 2)).toBeNull();
    expect(planJump(200, lower, upper, [upper, lower], 2)).toBeNull();
  });
  it("solves a reachable unobstructed jump and lands on the first crossed top", () => {
    const other = { ...upper, id: "other", left: 830, right: 1100, y: 180 };
    const jump = planJump(780, upper, other, [upper, other], 1)!;
    expect(jump).not.toBeNull();
    expect(
      upper.y + jump.vy * jump.duration + 440 * jump.duration ** 2,
    ).toBeCloseTo(other.y);
    expect(landing([lower, upper], 200, 190, 550)?.id).toBe("upper");
  });
  it("descends outside a stacked widget, hangs, climbs and stays on the rim", () => {
    const engine = new CompanionEngine({ ...companionDefaults }, () => 0.9);
    engine.setPlatforms([upper, lower]);
    const visited = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      engine.tick(1 / 60, 1080, false);
      visited.add(engine.state);
      if (engine.route?.phase === "drop" && engine.state === "FALLING")
        expect(engine.x).toBeGreaterThan(upper.right);
      if (engine.support === lower.id) break;
    }
    expect([...visited]).toEqual(
      expect.arrayContaining(["WALKING", "FALLING", "HANGING", "CLIMBING"]),
    );
    expect(engine.support).toBe(lower.id);
    expect(engine.y).toBe(lower.y);
  });
  it("follows moved supports and falls when the supporting widget disappears", () => {
    const engine = new CompanionEngine({ ...companionDefaults });
    engine.setPlatforms([upper, lower]);
    engine.setPlatforms([{ ...upper, y: 300, bottom: 600 }, lower]);
    expect(engine.y).toBe(300);
    engine.setPlatforms([lower]);
    expect(engine.state).toBe("FALLING");
    for (let i = 0; i < 120; i++) engine.tick(1 / 60, 1080, false);
    expect(engine.support).toBe(lower.id);
  });
  it("respects reduced motion, random off, reactions off and finishes a celebration", () => {
    const engine = new CompanionEngine({ ...companionDefaults, random: false });
    engine.setPlatforms([upper]);
    const x = engine.x;
    for (let i = 0; i < 600; i++) engine.tick(1 / 60, 1080, false);
    expect(engine.x).toBe(x);
    expect(engine.state).toBe("IDLE");
    engine.react("task-completed");
    engine.tick(1 / 60, 1080, true);
    expect(engine.state).toBe("IDLE");
    engine.react("task-completed");
    engine.tick(1 / 60, 1080, false);
    expect(engine.state).toBe("JUMPING");
    for (let i = 0; i < 120; i++) engine.tick(1 / 60, 1080, false);
    expect(engine.y).toBe(upper.y);
    expect(engine.state).toBe("IDLE");
    engine.settings.reactions = false;
    engine.react("task-completed");
    engine.tick(1 / 60, 1080, false);
    expect(engine.state).toBe("IDLE");
  });
});
it("migrates old saves to fixed companion defaults while preserving activation", () => {
  const old = JSON.parse(JSON.stringify(initialState));
  delete old.settings.companion;
  expect(parseStoredState(old).settings.companion).toEqual(companionDefaults);
  const custom = {
    ...initialState,
    settings: {
      ...initialState.settings,
      companion: {
        enabled: false,
        model: "deymoon",
        size: "large",
        speed: "slow",
        random: false,
        reactions: false,
      },
    },
  };
  expect(
    parseStoredState(JSON.parse(JSON.stringify(custom))).settings.companion,
  ).toEqual({ ...companionDefaults, enabled: false });
});
