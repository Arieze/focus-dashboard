import type { Animation } from "./sprites";
export function animationFrame(animation: Animation, seconds: number) {
  const total = animation.durations.reduce((a, b) => a + b, 0);
  let time = Math.max(0, seconds * 1000);
  if (animation.loop) time %= total;
  for (let i = 0; i < animation.durations.length; i++) {
    if (time < animation.durations[i]) return i;
    time -= animation.durations[i];
  }
  return animation.durations.length - 1;
}
export const animationDuration = (a: Animation) =>
  a.durations.reduce((x, y) => x + y, 0) / 1000;
