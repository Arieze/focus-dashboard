import type { MusicEffectsSettings } from "./settings";
export type Playback = "playing" | "paused" | "stopped";
export interface Particle {
  id: number;
  variant: number;
  size: number;
  x: number;
  y: number;
  drift: number;
  rise: number;
  rotation: number;
  duration: number;
  color: number;
}
export const noteSprites = [
  {
    src: "/music-effects/hamuko27/Music-Notes.png",
    x: 10,
    y: 2,
    width: 10,
    height: 26,
  },
  {
    src: "/music-effects/hamuko27/Music-Notes.png",
    x: 34,
    y: 2,
    width: 28,
    height: 26,
  },
  {
    src: "/music-effects/hamuko27/Music-Notes.png",
    x: 70,
    y: 2,
    width: 18,
    height: 26,
  },
  {
    src: "/music-effects/hamuko27/Music-Notes.png",
    x: 8,
    y: 34,
    width: 16,
    height: 26,
  },
  {
    src: "/music-effects/hamuko27/Music-Notes.png",
    x: 44,
    y: 34,
    width: 8,
    height: 26,
  },
];
export const MAX_PARTICLES = 8;
export function makeParticle(id: number, random = Math.random): Particle {
  const side = random() < 0.5;
  return {
    id,
    variant: Math.floor(random() * noteSprites.length),
    size: 8 + Math.floor(random() * 5),
    x: side ? 15 + random() * 7 : 61 + random() * 7,
    y: 24 + random() * 26,
    drift: (random() - 0.5) * 8,
    rise: 18 + random() * 15,
    rotation: (random() - 0.5) * 22,
    duration: 1500 + random() * 1500,
    color: Math.floor(random() * 3),
  };
}
// A single timer, no dashboard updates and no requestAnimationFrame loop.
export class ParticleEmitter {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ids = new Set<number>();
  private nextId = 0;
  private playing = false;
  private track = "";
  constructor(
    private emit: (p: Particle, finish: () => void) => void,
    private clear: () => void,
    private random = Math.random,
  ) {}
  get count() {
    return this.ids.size;
  }
  private spawn() {
    if (!this.playing || this.ids.size >= MAX_PARTICLES) return;
    const id = this.nextId++;
    this.ids.add(id);
    this.emit(makeParticle(id, this.random), () => this.ids.delete(id));
  }
  private schedule() {
    const mean = 550;
    this.timer = setTimeout(
      () => {
        this.timer = undefined;
        this.spawn();
        if (this.playing) this.schedule();
      },
      mean * (0.8 + this.random() * 0.4),
    );
  }
  update(
    playback: Playback,
    track: string,
    settings: MusicEffectsSettings,
    visible: boolean,
    reduced: boolean,
  ) {
    const wasPlaying = this.playing;
    this.playing =
      playback === "playing" && settings.enabled && visible && !reduced;
    const changed = this.track !== "" && track !== this.track;
    this.track = track;
    if (!this.playing) {
      clearTimeout(this.timer);
      this.timer = undefined;
      // Pausing lets existing particles fade naturally; everything else stops now.
      if (playback !== "paused" || !settings.enabled || !visible || reduced) {
        this.clear();
        this.ids.clear();
      }
      return;
    }
    if (changed)
      for (let i = 0, n = 3 + Math.floor(this.random() * 3); i < n; i++)
        this.spawn();
    else if (!wasPlaying) this.spawn();
    if (this.timer === undefined) this.schedule();
  }
  dispose() {
    this.playing = false;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.clear();
    this.ids.clear();
  }
}
