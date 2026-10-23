import { useEffect, useRef } from "react";
import { Sun, Moon, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning, CircleHelp } from "lucide-react";
import { condition } from "./data";
import type { WeatherSettings } from "./settings";
const icons = { sun: Sun, moon: Moon, partly: CloudSun, cloud: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudSnow, storm: CloudLightning, unknown: CircleHelp };
const sheets: Record<string, { frames: number; cell: number; pause?: number }> = {
  sun_rays: { frames: 48, cell: 192 }, rain: { frames: 24, cell: 192 }, snowfall: { frames: 48, cell: 192 }, fog: { frames: 48, cell: 256 }, hail_top: { frames: 24, cell: 128 }, lightning_flash: { frames: 48, cell: 192, pause: 6000 }, wind_gust: { frames: 24, cell: 192, pause: 4000 },
};
const images = new Map<string, HTMLImageElement>();
function getImage(effect: string) {
  let image = images.get(effect);
  if (!image) { image = new Image(); image.src = `/weather/cooked-fx/env_${effect}.png`; images.set(effect, image); }
  return image;
}
export default function WeatherIcon({ code, day = true, wind, settings }: { code: number | null | undefined; day?: boolean; wind?: number | null; settings: WeatherSettings }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const weather = condition(code, day), Icon = icons[weather.icon];
  const effect = weather.effect || (wind != null && wind >= 25 ? "wind_gust" : undefined);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !effect || !settings.animations) return;
    const ctx = canvas.getContext("2d"), sheet = sheets[effect], image = getImage(effect);
    if (!ctx || !sheet) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false, frame = 0, start = 0, previous = -1;
    const draw = (now: number) => {
      if (!start) start = now;
      const elapsed = (now - start) % (sheet.frames / 24 * 1000 + (sheet.pause || 0));
      const index = Math.floor(elapsed / 1000 * 24);
      if (index !== previous) {
        previous = index; ctx.clearRect(0, 0, 96, 96);
        ctx.imageSmoothingEnabled = false;
        if (index < sheet.frames && image.complete && image.naturalWidth) ctx.drawImage(image, index * sheet.cell, 0, sheet.cell, sheet.cell, 0, 0, 96, 96);
      }
      frame = requestAnimationFrame(draw);
    };
    const sync = () => {
      cancelAnimationFrame(frame); start = 0; previous = -1; ctx.clearRect(0, 0, 96, 96);
      if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(canvas); document.addEventListener("visibilitychange", sync); reduced.addEventListener("change", sync);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", sync); reduced.removeEventListener("change", sync); ctx.clearRect(0, 0, 96, 96); };
  }, [effect, settings.animations]);
  return <span className={`weather-icon ${settings.intensity}`} role="img" aria-label={weather.label}><Icon size={30} /><canvas aria-hidden="true" ref={ref} width={96} height={96} /></span>;
}
