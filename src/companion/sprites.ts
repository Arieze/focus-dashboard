export interface Animation {
  file: string;
  width: number;
  height: number;
  durations: number[];
  loop: boolean;
  anchor: [number, number];
}
const sheet = (
  name: string,
  frames: number,
  duration = 100,
  loop = true,
  anchor: [number, number] = [24, 36],
): Animation => ({
  file: `/companions/default/character_${name}.png`,
  width: 48,
  height: 48,
  durations: Array(frames).fill(duration),
  loop,
  anchor,
});
// PNG exports are authoritative: crouch-idle has 4 frames.
export const animations = {
  idle: sheet("idle-", 6),
  walk: sheet("walk", 8),
  run: sheet("run", 8),
  jump: sheet("jump", 4, 100, false),
  land: sheet("land", 3, 65, false),
  rest: sheet("crouch-idle", 4),
  roll: {
    ...sheet("roll", 11, 50, false),
    durations: [50, 50, 50, 50, 50, 50, 50, 50, 50, 100, 100],
  },
  hang: sheet("ledge-grab", 1, 100, true, [26, 14]),
  climb: sheet("ledge-climb", 5, 100, false),
  airSpin: sheet("air-spin", 8, 65),
};
export type AnimationName = keyof typeof animations;
export const defaultModel = {
  id: "deymoon",
  name: "Deymoon · Character Template",
  animations,
  gravity: 880,
  impulse: 410,
  walkSpeed: 44,
  runSpeed: 85,
};
export async function loadSprites() {
  const entries = await Promise.all(
    Object.entries(animations).map(async ([key, a]) => {
      const img = new Image();
      img.src = a.file;
      await img.decode();
      if (
        img.naturalWidth !== a.width * a.durations.length ||
        img.naturalHeight !== a.height
      )
        throw new Error(`Spritesheet invalide : ${a.file}`);
      return [key, img] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<AnimationName, HTMLImageElement>;
}
