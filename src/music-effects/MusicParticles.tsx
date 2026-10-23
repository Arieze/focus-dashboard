import { useEffect, useRef } from "react";
import { noteSprites, ParticleEmitter, type Playback } from "./particles";
import type { MusicEffectsSettings } from "./settings";

export default function MusicParticles(props: {
  playback: Playback;
  track: string;
  settings: MusicEffectsSettings;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  current.current = props;
  const sync = useRef<() => void>(() => {});
  useEffect(() => {
    const root = layer.current!;
    const animations = new Set<Animation>();
    let intersecting = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const emitter = new ParticleEmitter(
      (p, finish) => {
        const note = document.createElement("span");
        const sprite = noteSprites[p.variant];
        const scale = p.size / sprite.height;
        note.className = "music-note";
        Object.assign(note.style, {
          width: `${sprite.width * scale}px`,
          height: `${p.size}px`,
          left: `${p.x}px`,
          top: `${p.y}px`,
          backgroundColor: ["var(--accent)", "var(--secondary)", "var(--text)"][
            p.color
          ],
          maskImage: `url("${sprite.src}")`,
          maskSize: `${100 * scale}px ${100 * scale}px`,
          maskPosition: `${-sprite.x * scale}px ${-sprite.y * scale}px`,
        });
        root.appendChild(note);
        const animation = note.animate(
          [
            {
              opacity: 0,
              transform: "translate(0, 0) rotate(0deg)",
              offset: 0,
            },
            {
              opacity: 0.62,
              transform: `translate(${p.drift - 3}px, ${-p.rise * 0.25}px) rotate(${-p.rotation / 2}deg)`,
              offset: 0.25,
            },
            {
              opacity: 0.5,
              transform: `translate(${p.drift + 3}px, ${-p.rise * 0.65}px) rotate(${p.rotation / 2}deg)`,
              offset: 0.65,
            },
            {
              opacity: 0,
              transform: `translate(${p.drift}px, ${-p.rise}px) rotate(${p.rotation}deg)`,
              offset: 1,
            },
          ],
          { duration: p.duration, easing: "ease-in-out", fill: "forwards" },
        );
        animations.add(animation);
        const release = () => {
          animations.delete(animation);
          note.remove();
          finish();
        };
        animation.onfinish = release;
        animation.oncancel = release;
      },
      () => {
        for (const animation of animations) animation.cancel();
        animations.clear();
        root.replaceChildren();
      },
    );
    const update = () => {
      const { playback, track, settings } = current.current;
      emitter.update(
        playback,
        track,
        settings,
        intersecting && !document.hidden,
        reduced.matches,
      );
    };
    sync.current = update;
    // Observe the cover, not the animated particles, to avoid visibility feedback.
    const observer = new IntersectionObserver((entries) => {
      intersecting = entries[0]?.isIntersecting ?? false;
      update();
    });
    observer.observe(root.parentElement!);
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    update();
    return () => {
      sync.current = () => {};
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
      emitter.dispose();
    };
  }, []);
  useEffect(
    () => sync.current(),
    [props.playback, props.track, props.settings],
  );
  return <div ref={layer} className="music-particles" aria-hidden="true" />;
}
