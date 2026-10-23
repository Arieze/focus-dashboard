import { beforeEach, expect, it, vi } from "vitest";
import { initialState, type State } from "../models";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeTextFile: vi.fn() }));

let cache: Map<string, string>;
const recoveryKey = "focus-pending-state:v2";
function withEvent(id: string): State {
  return { ...structuredClone(initialState), events: [{
    id, title: id, date: "2026-10-19", start: "09:00", end: "10:00",
    allDay: false, category: "Personnel", recurrence: "none",
  }] };
}
beforeEach(() => {
  vi.resetModules();
  invoke.mockReset();
  cache = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => cache.get(key) ?? null,
    setItem: (key: string, value: string) => cache.set(key, value),
    removeItem: (key: string) => cache.delete(key),
  });
});

it("does not overwrite saved calendar events with an unversioned empty recovery", async () => {
  const saved = withEvent("saved");
  invoke.mockResolvedValue(JSON.stringify(saved));
  cache.set("focus-pending-state", JSON.stringify(initialState));
  const { load } = await import("./storage");
  expect((await load()).events).toEqual(saved.events);
  expect(cache.has("focus-pending-state")).toBe(true);
});

it("loads the database even when the WebView recovery cache is inaccessible", async () => {
  const saved = withEvent("saved");
  invoke.mockResolvedValue(JSON.stringify(saved));
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("Access denied"); } });
  const { load } = await import("./storage");
  expect((await load()).events).toEqual(saved.events);
});

it("restores pending edits only when they follow the database version", async () => {
  const basePayload = JSON.stringify(initialState), edited = withEvent("pending");
  invoke.mockResolvedValue(basePayload);
  cache.set(recoveryKey, JSON.stringify({ basePayload, payloads: [JSON.stringify(edited)] }));
  const { load } = await import("./storage");
  expect((await load()).events).toEqual(edited.events);
});

it("preserves conflicting recovery separately and loads the newer database", async () => {
  const saved = withEvent("newer");
  invoke.mockResolvedValue(JSON.stringify(saved));
  const recovery = JSON.stringify({ basePayload: null, payloads: [JSON.stringify(initialState)] });
  cache.set(recoveryKey, recovery);
  const { load } = await import("./storage");
  expect((await load()).events).toEqual(saved.events);
  expect(cache.has(recoveryKey)).toBe(false);
  expect([...cache.entries()].some(([key, value]) => key.startsWith("focus-recovery:") && value === recovery)).toBe(true);
});

it("recovers the latest queued edit if the app stopped after an intermediate commit", async () => {
  const first = withEvent("first"), latest = withEvent("latest");
  invoke.mockResolvedValue(JSON.stringify(first));
  cache.set(recoveryKey, JSON.stringify({
    basePayload: JSON.stringify(initialState),
    payloads: [JSON.stringify(first), JSON.stringify(latest)],
  }));
  const { load } = await import("./storage");
  expect((await load()).events).toEqual(latest.events);
});

it("never saves defaults after a failed load and permits retrying the load", async () => {
  invoke.mockRejectedValueOnce(new Error("Database busy"));
  const { load, save } = await import("./storage");
  await expect(load()).rejects.toThrow("Database busy");
  await expect(save(initialState)).rejects.toThrow("chargées");
  expect(invoke).toHaveBeenCalledTimes(1);
  invoke.mockResolvedValueOnce(JSON.stringify(withEvent("saved")));
  expect((await load()).events[0].id).toBe("saved");
});

it("serializes edits against the last committed payload and retains failed writes for recovery", async () => {
  const base = JSON.stringify(initialState), first = withEvent("first"), latest = withEvent("latest");
  invoke.mockResolvedValueOnce(base);
  const { load, save } = await import("./storage");
  await load();
  invoke.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Disk unavailable"));
  const a = save(first), b = save(latest);
  await a;
  await expect(b).rejects.toThrow("Disk unavailable");
  const firstWrite = invoke.mock.calls[1][1], lastWrite = invoke.mock.calls[2][1];
  expect(firstWrite.expectedPayload).toBe(base);
  expect(JSON.parse(firstWrite.payload)).toEqual(first);
  expect(lastWrite.expectedPayload).toBe(firstWrite.payload);
  expect(JSON.parse(lastWrite.payload)).toEqual(latest);
  expect(JSON.parse(cache.get(recoveryKey)!)).toEqual({ basePayload: firstWrite.payload, payloads: [lastWrite.payload] });
  invoke.mockResolvedValueOnce(undefined);
  await save(latest);
  expect(cache.has(recoveryKey)).toBe(false);
});
