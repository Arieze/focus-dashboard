import { useEffect, useRef, useState } from "react";
import type { State } from "../models";
import { CompanionEngine } from "./engine";
import { loadSprites, animations } from "./sprites";
import { animationFrame } from "./animation";
import { observePlatforms } from "./platforms";
import { emitCompanionEvent, subscribeCompanionEvents } from "./events";

export default function Companion({ state }: { state: State }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<CompanionEngine | null>(null);
  const settings = useRef(state.settings.companion);
  settings.current = state.settings.companion;
  const previous = useRef(state.tasks);
  const [error, setError] = useState("");
  useEffect(() => {
    if (engine.current) {
      engine.current.settings = settings.current;
      engine.current.setPlatforms(engine.current.platforms);
    }
  }, [state.settings.companion.size]);
  useEffect(() => {
    if (
      state.tasks.some(
        (t) =>
          t.done &&
          previous.current.some((old) => old.id === t.id && !old.done),
      )
    )
      emitCompanionEvent("task-completed");
    previous.current = state.tasks;
  }, [state.tasks]);
  useEffect(() => {
    if (!state.settings.companion.enabled) return;
    const el = canvas.current!;
    const context = el.getContext("2d");
    if (!context) return;
    const motion = new CompanionEngine(settings.current);
    engine.current = motion;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false,
      frame = 0,
      last = 0,
      dragging = false;
    let sprites: Awaited<ReturnType<typeof loadSprites>> | null = null;
    const stopObserving = observePlatforms((platforms, isDragging) => {
      dragging = isDragging;
      if (!dragging) motion.setPlatforms(platforms);
    });
    const unsubscribe = subscribeCompanionEvents((event) =>
      motion.react(event),
    );
    const render = (time: number) => {
      frame = 0;
      if (disposed || document.hidden || !sprites) return;
      motion.settings = settings.current;
      const dt = last ? (time - last) / 1000 : 0;
      last = time;
      if (!dragging) motion.tick(dt, innerWidth, media.matches);
      const scale = motion.scale,
        size = 48 * scale;
      if (el.width !== size) {
        el.width = size;
        el.height = size;
      }
      context.clearRect(0, 0, size, size);
      context.imageSmoothingEnabled = false;
      const animation = media.matches ? "idle" : motion.animation;
      const a = animations[animation];
      const index = animationFrame(
        a,
        media.matches ? 0 : motion.state === "FALLING" ? 0.4 : motion.elapsed,
      );
      el.style.transform = `translate3d(${Math.round(motion.x - scrollX - 24 * scale)}px,${motion.y - scrollY - 36 * scale}px,0)`;
      el.style.visibility =
        motion.initialized && !dragging ? "visible" : "hidden";
      el.dataset.state = motion.state;
      el.dataset.platform = motion.support;
      context.save();
      context.translate(24 * scale, 36 * scale);
      context.scale(motion.facing * scale, scale);
      // Preserve each source frame's internal motion; normalize only climb's foot baseline.
      const anchorY =
        animation === "climb"
          ? [40, 36, 35, 34, 30][index]
          : animation === "hang"
            ? 36
            : a.anchor[1];
      context.drawImage(
        sprites[animation],
        index * a.width,
        0,
        a.width,
        a.height,
        -a.anchor[0],
        -anchorY,
        a.width,
        a.height,
      );
      context.restore();
      if (
        motion.effectTime > 0 &&
        settings.current.reactions &&
        !media.matches
      ) {
        context.fillStyle = "#a6d8b4";
        context.font = `${10 * scale}px sans-serif`;
        context.fillText(motion.effect, 32 * scale, 12 * scale);
      }
      frame = requestAnimationFrame(render);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (!document.hidden && sprites) frame = requestAnimationFrame(render);
    };
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    void loadSprites()
      .then((loaded) => {
        if (!disposed) {
          sprites = loaded;
          setError("");
          resume();
        }
      })
      .catch((e) => {
        if (!disposed) setError(String(e));
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      stopObserving();
      unsubscribe();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
      engine.current = null;
    };
  }, [state.settings.companion.enabled]);
  useEffect(() => {
    window.dispatchEvent(new Event("focus-window-layout"));
  }, [state.settings.borderless]);
  if (!state.settings.companion.enabled) return null;
  return (
    <>
      <div className="companion-layer" aria-hidden="true">
        <canvas ref={canvas} />
      </div>
      {error && (
        <p className="hint" role="status">
          Compagnon indisponible : {error}
        </p>
      )}
    </>
  );
}
