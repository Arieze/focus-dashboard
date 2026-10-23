import type { Platform } from "./platforms";
import { defaultModel } from "./sprites";
export const clamp = (x: number, a: number, b: number) =>
  Math.max(a, Math.min(b, x));
export interface Jump {
  vx: number;
  vy: number;
  duration: number;
  x: number;
  target: string;
}
export function planJump(
  x: number,
  source: Platform,
  target: Platform,
  platforms: Platform[],
  scale: number,
): Jump | null {
  const { gravity: g, impulse } = defaultModel;
  const discriminant = impulse * impulse + 2 * g * (target.y - source.y);
  if (discriminant <= 0) return null;
  const duration = (impulse + Math.sqrt(discriminant)) / g;
  const end = clamp(x, target.left + 18 * scale, target.right - 18 * scale);
  const vx = (end - x) / duration;
  if (Math.abs(vx) > 150 || duration > 1.8) return null;
  for (let t = 0.04; t < duration - 0.02; t += 0.02) {
    const px = x + vx * t,
      py = source.y - impulse * t + (g * t * t) / 2;
    if (
      platforms.some(
        (p) =>
          px > p.left - 5 * scale &&
          px < p.right + 5 * scale &&
          py > p.y + 1 &&
          py - 20 * scale < p.bottom,
      )
    )
      return null;
  }
  return { vx, vy: -impulse, duration, x: end, target: target.id };
}
export function landing(
  platforms: Platform[],
  x: number,
  previousY: number,
  y: number,
) {
  return platforms
    .filter((p) => x >= p.left && x <= p.right && previousY <= p.y && y >= p.y)
    .sort((a, b) => a.y - b.y)[0];
}
