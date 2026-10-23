import { chooseBehavior, type Behavior } from "./behaviors";
import { animationDuration } from "./animation";
import { animations, defaultModel, type AnimationName } from "./sprites";
import { clamp, landing, planJump } from "./navigation";
import type { Platform } from "./platforms";
import { scales, type CompanionSettings } from "./settings";
import type { CompanionEvent } from "./events";

export type MotionState =
  | "IDLE"
  | "WALKING"
  | "RUNNING"
  | "JUMPING"
  | "FALLING"
  | "LANDING"
  | "CLIMBING"
  | "HANGING"
  | "ROLLING"
  | "TUMBLING"
  | "RESTING";
const clips: Record<MotionState, AnimationName> = {
  IDLE: "idle",
  WALKING: "walk",
  RUNNING: "run",
  JUMPING: "jump",
  FALLING: "jump",
  LANDING: "land",
  CLIMBING: "climb",
  HANGING: "hang",
  ROLLING: "roll",
  TUMBLING: "airSpin",
  RESTING: "rest",
};
const grounded = new Set<MotionState>([
  "IDLE",
  "WALKING",
  "RUNNING",
  "LANDING",
  "ROLLING",
  "RESTING",
]);
export class CompanionEngine {
  state: MotionState = "IDLE";
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  facing = 1;
  elapsed = 0;
  initialized = false;
  support = "";
  platforms: Platform[] = [];
  destination = 0;
  wait = 2;
  route: {
    target: string;
    edge: number;
    side: number;
    phase: "approach" | "drop" | "rise" | "direct";
    source?: string;
    upward?: boolean;
  } | null = null;
  climbStart = { x: 0, y: 0 };
  effect = "";
  effectTime = 0;
  private reaction: CompanionEvent | null = null;
  private cooldown = 0;
  private lastBehavior: Behavior | undefined;
  private residence = 0;
  private lastSupport = "";
  constructor(
    public settings: CompanionSettings,
    private random = Math.random,
  ) {}
  get scale() {
    return scales[this.settings.size];
  }
  get animation() {
    return clips[this.state];
  }
  setState(state: MotionState) {
    this.state = state;
    this.elapsed = 0;
  }
  setPlatforms(platforms: Platform[]) {
    const old = this.platforms.find((p) => p.id === this.support);
    this.platforms = platforms;
    if (!this.initialized && platforms.length) {
      const p = platforms[0];
      this.x =
        p.left +
        18 * this.scale +
        this.random() * Math.max(0, p.right - p.left - 36 * this.scale);
      this.facing = this.random() < 0.5 ? -1 : 1;
      this.wait = 0.2 + this.random() * 1.5;
      this.y = p.y;
      this.support = p.id;
      this.initialized = true;
    } else if (grounded.has(this.state)) {
      const p = platforms.find((p) => p.id === this.support);
      if (p && old) {
        this.x = clamp(
          this.x + p.left - old.left,
          p.left + 16 * this.scale,
          p.right - 16 * this.scale,
        );
        this.y = p.y;
        if (p.left !== old.left || p.y !== old.y || p.right !== old.right) {
          this.route = null;
          this.setState("IDLE");
          this.wait = 1;
        }
      } else if (this.initialized) {
        this.support = "";
        this.vy = 0;
        this.vx = 0;
        this.setState("FALLING");
      }
    }
    if (this.route && !platforms.some((p) => p.id === this.route!.target)) {
      this.route = null;
      if (this.state === "HANGING" || this.state === "CLIMBING") {
        this.vy = 0;
        this.setState("FALLING");
      }
    }
  }
  react(event: CompanionEvent) {
    if (this.settings.reactions && this.cooldown <= 0) this.reaction = event;
  }
  private idle() {
    this.vx = 0;
    this.route = null;
    this.wait = 1.5 + this.random() * 3;
    this.setState("IDLE");
  }
  private decide(p: Platform, viewportWidth: number) {
    const action =
        this.residence > 18
          ? "travel"
          : chooseBehavior(this.random, this.lastBehavior),
      margin = 18 * this.scale;
    this.lastBehavior = action;
    if (action === "travel") {
      const candidates = this.platforms.filter((q) => q.id !== p.id);
      // One-way tops: a deliberate roll can pass through the current widget
      // and land on the next top, without going around the outside.
      const underneath = candidates
        .filter(
          (q) =>
            q.y > p.y + 1 &&
            this.x >= q.left + margin &&
            this.x <= q.right - margin,
        )
        .sort((a, b) => a.y - b.y)[0];
      if (underneath && this.random() < 0.65) {
        const left = Math.max(p.left, underneath.left) + margin;
        const right = Math.min(p.right, underneath.right) - margin;
        const direction = this.random() < 0.5 ? -1 : 1;
        this.destination = clamp(this.x + direction * 48, left, right);
        this.facing = Math.sign(this.destination - this.x) || direction;
        this.route = {
          target: underneath.id,
          source: p.id,
          edge: this.destination,
          side: this.facing,
          phase: "direct",
        };
        this.setState("ROLLING");
        return;
      }
      // First try unobstructed ballistic trajectories to nearby tops.
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      for (const q of candidates) {
        const jump = planJump(this.x, p, q, this.platforms, this.scale);
        if (jump) {
          this.support = "";
          this.vx = jump.vx;
          this.vy = jump.vy;
          if (this.vx) this.facing = Math.sign(this.vx);
          this.setState("JUMPING");
          return;
        }
      }
      // Stacked widgets: descend OUTSIDE their content, catch the next rim, climb.
      const below = candidates
        .filter((q) => q.y >= p.bottom && q.y - p.bottom < 160)
        .sort((a, b) => a.y - b.y)[0];
      const above = candidates
        .filter((q) => q.bottom <= p.y && p.y - q.y < 1400)
        .sort((a, b) => b.y - a.y)[0];
      const neighbors = [above, below].filter((q): q is Platform => !!q);
      if (this.random() < 0.5) neighbors.reverse();
      for (const neighbor of neighbors) {
        for (const side of this.random() < 0.5 ? [-1, 1] : [1, -1]) {
          const edge =
            side < 0
              ? Math.min(p.left, neighbor.left) - 6 * this.scale
              : Math.max(p.right, neighbor.right) + 6 * this.scale;
          if (
            edge < -2 * this.scale ||
            edge > viewportWidth + 2 * this.scale ||
            Math.abs((side < 0 ? neighbor.left : neighbor.right) - edge) >
              15 * this.scale
          )
            continue;
          if (
            this.platforms.some(
              (q) =>
                q.id !== p.id &&
                q.id !== neighbor.id &&
                q.y < Math.max(p.y, neighbor.y) &&
                q.bottom > Math.min(p.y, neighbor.y) &&
                edge > q.left - 5 * this.scale &&
                edge < q.right + 5 * this.scale,
            )
          )
            continue;
          this.route = {
            target: neighbor.id,
            edge,
            side,
            phase: "approach",
            upward: neighbor.y < p.y,
          };
          this.destination = edge;
          this.facing = side;
          this.setState("WALKING");
          return;
        }
      }
    }
    if (action === "rest") {
      this.wait = 3 + this.random() * 4;
      this.setState("RESTING");
      return;
    }
    if (action === "idle" || action === "look") {
      if (action === "look") this.facing *= -1;
      this.idle();
      return;
    }
    this.destination =
      p.left +
      margin +
      this.random() * Math.max(0, p.right - p.left - 2 * margin);
    this.facing = this.destination >= this.x ? 1 : -1;
    if (action === "roll" && Math.abs(this.destination - this.x) > 65)
      this.setState("ROLLING");
    else
      this.setState(
        action === "run" && Math.abs(this.destination - this.x) > 140
          ? "RUNNING"
          : "WALKING",
      );
  }
  tick(delta: number, viewportWidth: number, reduced: boolean) {
    if (!this.initialized) return;
    if (reduced) {
      this.reaction = null;
      if (grounded.has(this.state)) {
        this.route = null;
        this.setState("IDLE");
        return;
      }
    }
    // Fixed upper step prevents tunnelling after slow frames.
    let remaining = Math.min(delta, 0.1);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120);
      this.step(dt, viewportWidth);
      remaining -= dt;
    }
  }
  private step(dt: number, viewportWidth: number) {
    this.elapsed += dt;
    this.cooldown -= dt;
    this.effectTime = Math.max(0, this.effectTime - dt);
    const p = this.platforms.find((p) => p.id === this.support);
    if (p) {
      if (this.lastSupport !== p.id) {
        this.lastSupport = p.id;
        this.residence = 0;
      }
      this.residence += dt;
    }
    if (!this.settings.reactions) this.reaction = null;
    if (
      this.reaction &&
      p &&
      (this.state === "IDLE" || this.state === "RESTING")
    ) {
      const event = this.reaction;
      this.reaction = null;
      this.cooldown = 12;
      this.effect =
        event === "task-completed"
          ? "✦"
          : event === "music-playing"
            ? "♪"
            : event === "agenda-upcoming"
              ? "!"
              : "°";
      this.effectTime = 2;
      if (event === "task-completed") {
        this.support = "";
        this.vx = 0;
        this.vy = -180;
        this.setState("JUMPING");
      } else {
        this.facing *= -1;
        this.wait = 2;
        this.setState(event === "cpu-hot" ? "RESTING" : "IDLE");
      }
      return;
    }
    if (this.state === "IDLE" || this.state === "RESTING") {
      if (p && this.settings.random && this.elapsed > this.wait)
        this.decide(p, viewportWidth);
      return;
    }
    if (this.state === "LANDING") {
      if (this.elapsed >= animationDuration(animations.land)) this.idle();
      return;
    }
    if (this.state === "HANGING" || this.state === "CLIMBING") {
      const target = this.platforms.find((q) => q.id === this.route?.target);
      if (!target || !this.route) {
        this.route = null;
        this.vy = 0;
        this.setState("FALLING");
        return;
      }
      if (this.state === "HANGING") {
        if (this.elapsed > 0.35) {
          this.climbStart = { x: this.x, y: this.y };
          this.setState("CLIMBING");
        }
      } else {
        const progress = Math.min(
          1,
          this.elapsed / animationDuration(animations.climb),
        );
        const end =
          this.route.side < 0
            ? target.left + 18 * this.scale
            : target.right - 18 * this.scale;
        this.x = this.climbStart.x + (end - this.climbStart.x) * progress;
        this.y = this.climbStart.y + (target.y - this.climbStart.y) * progress;
        if (progress === 1) {
          this.support = target.id;
          this.idle();
        }
      }
      return;
    }
    if (
      this.state === "WALKING" ||
      this.state === "RUNNING" ||
      this.state === "ROLLING"
    ) {
      const speed =
        this.state === "WALKING"
          ? defaultModel.walkSpeed
          : defaultModel.runSpeed;
      const distance = this.destination - this.x;
      this.x += Math.sign(distance) * Math.min(Math.abs(distance), speed * dt);
      if (this.state === "ROLLING") {
        if (this.elapsed >= animationDuration(animations.roll)) {
          if (this.route?.phase === "direct") {
            this.support = "";
            this.vx = 0;
            this.vy = 35;
            this.setState("TUMBLING");
          } else this.idle();
        }
      } else if (Math.abs(this.destination - this.x) < 0.1) {
        if (this.route) {
          const target = this.platforms.find(
            (q) => q.id === this.route?.target,
          );
          this.route.phase = this.route.upward ? "rise" : "drop";
          this.support = "";
          this.vx = 0;
          this.vy =
            this.route.upward && target
              ? -Math.sqrt(
                  2 *
                    defaultModel.gravity *
                    (Math.max(0, this.y - target.y) + 48),
                )
              : 0;
          this.setState(this.route.upward ? "JUMPING" : "FALLING");
        } else this.idle();
      }
      return;
    }
    const previousY = this.y;
    if (
      this.state === "TUMBLING" &&
      this.elapsed >= animationDuration(animations.airSpin)
    )
      this.setState("FALLING");
    this.x += this.vx * dt;
    this.y += this.vy * dt + (defaultModel.gravity * dt * dt) / 2;
    this.vy += defaultModel.gravity * dt;
    if (this.vy > 0 && this.state === "JUMPING") this.setState("FALLING");
    const target = this.platforms.find((q) => q.id === this.route?.target);
    if (
      (this.route?.phase === "drop" || this.route?.phase === "rise") &&
      target &&
      this.vy >= 0 &&
      this.y >= target.y + 22 * this.scale
    ) {
      this.y = target.y + 22 * this.scale;
      this.facing = -this.route.side;
      this.vy = 0;
      this.x = this.route.side < 0 ? target.left : target.right;
      this.setState("HANGING");
      return;
    }
    const hit =
      this.vy >= 0
        ? landing(
            this.route?.phase === "direct"
              ? this.platforms.filter((p) => p.id !== this.route?.source)
              : this.platforms,
            this.x,
            previousY,
            this.y,
          )
        : undefined;
    if (hit) {
      this.y = hit.y;
      this.support = hit.id;
      this.vx = 0;
      this.vy = 0;
      this.route = null;
      this.setState("LANDING");
    }
  }
}
