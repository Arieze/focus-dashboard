import { afterEach, expect, it, vi } from "vitest";
import { ParticleEmitter, makeParticle, type Particle } from "./particles";
import { musicEffectsDefaults } from "./settings";
import { initialState, parseStoredState } from "../models";
afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers();
  const particles: Particle[] = [];
  const finish: (() => void)[] = [];
  const clear = vi.fn();
  const emitter = new ParticleEmitter(
    (p, done) => {
      particles.push(p);
      finish.push(done);
    },
    clear,
    () => 0.5,
  );
  return { emitter, particles, finish, clear };
}
it("emits only during playback, drains in pause, resumes and clears on stop", () => {
  const { emitter, particles, finish, clear } = setup();
  emitter.update("playing", "a", musicEffectsDefaults, true, false);
  vi.advanceTimersByTime(1100);
  expect(particles.length).toBe(3);
  emitter.update("paused", "a", musicEffectsDefaults, true, false);
  vi.advanceTimersByTime(5000);
  expect(particles.length).toBe(3);
  expect(clear).not.toHaveBeenCalled();
  finish.forEach((fn) => fn());
  expect(emitter.count).toBe(0);
  emitter.update("playing", "a", musicEffectsDefaults, true, false);
  expect(emitter.count).toBe(1);
  emitter.update("stopped", "a", musicEffectsDefaults, true, false);
  expect(emitter.count).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
  expect(clear).toHaveBeenCalledOnce();
});
it("bursts on track change without exceeding eight notes or duplicating timers", () => {
  const { emitter } = setup();
  emitter.update("playing", "a", musicEffectsDefaults, true, false);
  emitter.update("playing", "b", musicEffectsDefaults, true, false);
  expect(emitter.count).toBe(5);
  emitter.update("playing", "c", musicEffectsDefaults, true, false);
  expect(emitter.count).toBe(8);
  vi.advanceTimersByTime(20000);
  expect(emitter.count).toBe(8);
  expect(vi.getTimerCount()).toBe(1);
  emitter.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it("cleans up when disabled, hidden, reduced motion or unmounted", () => {
  const { emitter, clear } = setup();
  for (const reason of ["disabled", "hidden", "reduced"]) {
    emitter.update("playing", "a", musicEffectsDefaults, true, false);
    emitter.update(
      "playing",
      "a",
      { ...musicEffectsDefaults, enabled: reason !== "disabled" },
      reason !== "hidden",
      reason === "reduced",
    );
    expect(emitter.count).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  }
  expect(clear).toHaveBeenCalledTimes(3);
  emitter.dispose();
});
it("keeps a fixed density, small notes and lifetimes within the specification", () => {
    const { emitter, particles } = setup();
    emitter.update("playing", "a", { enabled: true }, true, false);
    vi.advanceTimersByTime(1100);
    expect(particles.length).toBe(3);
    emitter.dispose();
  for (let i = 0; i < 100; i++) {
    const p = makeParticle(i);
    expect(p.size).toBeGreaterThanOrEqual(8);
    expect(p.size).toBeLessThanOrEqual(12);
    expect(p.duration).toBeGreaterThanOrEqual(1500);
    expect(p.duration).toBeLessThanOrEqual(3000);
  }
});
it("migrates existing saves and round-trips effect preferences", () => {
  const legacy = JSON.parse(JSON.stringify(initialState));
  delete legacy.settings.musicEffects;
  expect(parseStoredState(legacy).settings.musicEffects).toEqual(
    musicEffectsDefaults,
  );
  legacy.settings.musicEffects = { enabled: false, density: "high" };
  expect(
    parseStoredState(JSON.parse(JSON.stringify(legacy))).settings.musicEffects,
  ).toEqual({ enabled: false });
});
