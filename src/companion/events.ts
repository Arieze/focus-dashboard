export type CompanionEvent =
  "task-completed" | "music-playing" | "agenda-upcoming" | "cpu-hot";
const bus = new EventTarget();
export const emitCompanionEvent = (type: CompanionEvent) =>
  bus.dispatchEvent(new CustomEvent("reaction", { detail: type }));
export function subscribeCompanionEvents(fn: (type: CompanionEvent) => void) {
  const listener = (e: Event) => fn((e as CustomEvent<CompanionEvent>).detail);
  bus.addEventListener("reaction", listener);
  return () => bus.removeEventListener("reaction", listener);
}
