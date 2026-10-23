import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cacheKey, condition, fetchWeather, localHour, readCache, refreshDelay, uvLevel, writeCache, type Cached } from "./data";
import type { WeatherSettings } from "./settings";
import WeatherIcon from "./WeatherIcon";
import "./weather.css";
const value = (n: number | null | undefined, suffix = "") => n == null ? "—" : `${Math.round(n)}${suffix}`;
export function UV({ uv, label }: { uv: number | null | undefined; label: string }) {
  const level = uvLevel(uv);
  return <span className="weather-uv" style={{ color: level?.color }}>{level ? `${label} ${uv!.toFixed(1)} · ${level.label}` : "UV indisponible"}</span>;
}
export default function Weather({ settings, onChange, onOpenSettings }: { settings: WeatherSettings; onChange: (settings: WeatherSettings) => void; onOpenSettings: () => void }) {
  const { location, unit } = settings;
  const key = location ? cacheKey(location, unit) : "";
  const [result, setResult] = useState<{ key: string; cached: Cached | null; error: string; loading: boolean }>({ key: "", cached: null, error: "", loading: false });
  const [revision, setRevision] = useState(0), [clock, setClock] = useState(Date.now());
  const latitude = location?.latitude, longitude = location?.longitude;
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    let disposed = false, pending = false;
    let cached = readCache(key);
    const load = async (force = false) => {
      if (pending || document.hidden) return;
      if (!force && cached && Date.now() - cached.at < refreshDelay) { setResult({ key, cached, error: "", loading: false }); return; }
      pending = true; setResult({ key, cached, error: "", loading: true });
      try { const data = await fetchWeather({ name: "", latitude, longitude }, unit); if (disposed) return; cached = { at: Date.now(), data }; writeCache(key, cached); setResult({ key, cached, error: "", loading: false }); }
      catch { if (!disposed) setResult({ key, cached, error: "Connexion météo indisponible", loading: false }); }
      finally { pending = false; }
    };
    void load(revision > 0);
    const tick = () => { setClock(Date.now()); void load(); };
    const timer = window.setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [key, latitude, longitude, unit, revision]);
  if (!location) return <button onClick={onOpenSettings}>Choisir une ville dans les paramètres</button>;
  const active = result.key === key ? result : { cached: null, loading: true, error: "" };
  const data = active.cached?.data;
  const hour = data ? localHour(data.timezone, new Date(clock)) : "";
  const dayIndex = data?.daily.time.indexOf(hour.slice(0, 10)) ?? -1;
  const hourIndex = data?.hourly.time.indexOf(hour) ?? -1;
  const temp = (n: number | null | undefined) => value(n, unit === "celsius" ? "°C" : "°F");
  const stale = active.cached && clock - active.cached.at >= refreshDelay;
  return <div className="weather-widget">
    <div className="weather-toolbar"><strong>{location.name}</strong><div className="weather-controls"><button aria-pressed={settings.mode === "day"} onClick={() => onChange({ ...settings, mode: "day" })}>Journée</button><button aria-pressed={settings.mode === "three"} onClick={() => onChange({ ...settings, mode: "three" })}>3 jours</button><button title="Actualiser la météo" aria-label="Actualiser la météo" disabled={active.loading} onClick={() => { setClock(Date.now()); setRevision(x => x + 1); }}><RefreshCw size={16} /></button></div></div>
    {active.loading && <p className="hint" role="status">Actualisation…</p>}
    {active.error && <p className="hint" role="status">{active.error}{data ? " · dernières données conservées" : " · réessayez avec le bouton Actualiser"}.</p>}
    {data && <>{settings.mode === "day" ? <>
      <div className="weather-current"><WeatherIcon code={data.current.weather_code} day={data.current.is_day !== 0} wind={data.current.wind_speed_10m} settings={settings} /><div><strong className="weather-temperature">{temp(data.current.temperature_2m)}</strong><div>{condition(data.current.weather_code, data.current.is_day !== 0).label}</div><small>Ressenti {temp(data.current.apparent_temperature)}</small></div><div className="weather-range">Min. {temp(data.daily.temperature_2m_min[dayIndex])}<br />Max. {temp(data.daily.temperature_2m_max[dayIndex])}</div></div>
      <div className="weather-metrics"><span>Humidité <b>{value(data.current.relative_humidity_2m, " %")}</b></span><span>Vent <b>{value(data.current.wind_speed_10m, " km/h")}</b></span><span>Pluie <b>{value(data.hourly.precipitation_probability[hourIndex], " %")}</b></span><span>Précipitations <b>{data.current.precipitation == null ? "—" : `${data.current.precipitation} mm`}</b></span></div>
      <div className="weather-uv-row"><UV label="UV horaire prévu" uv={data.hourly.uv_index[hourIndex]} /><UV label="UV max. du jour" uv={data.daily.uv_index_max[dayIndex]} /></div>
      <div className="weather-hours" aria-label="Prévisions des prochaines heures">{data.hourly.time.map((time, i) => ({ time, i })).filter(x => x.time >= hour).slice(0, 8).map(({ time, i }) => <div className="weather-hour" key={time}><small>{time.slice(11, 16)}{time.slice(0,10) !== hour.slice(0,10) ? " +1j" : ""}</small><WeatherIcon code={data.hourly.weather_code[i]} day={data.hourly.is_day[i] !== 0} settings={settings} /><b>{temp(data.hourly.temperature_2m[i])}</b><small>{value(data.hourly.precipitation_probability[i], " %")}</small></div>)}</div>
    </> : <div className="weather-days">{data.daily.time.slice(0, 3).map((date, i) => <article key={date} className={date === hour.slice(0,10) ? "today" : ""}><strong>{date === hour.slice(0,10) ? "Aujourd’hui" : new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</strong><WeatherIcon code={data.daily.weather_code[i]} settings={settings} /><span>{condition(data.daily.weather_code[i]).label}</span><b>{temp(data.daily.temperature_2m_min[i])} / {temp(data.daily.temperature_2m_max[i])}</b><small>Pluie {value(data.daily.precipitation_probability_max[i], " %")}</small><UV label="UV max." uv={data.daily.uv_index_max[i]} /><small>↑ {data.daily.sunrise[i]?.slice(11,16) || "—"} · ↓ {data.daily.sunset[i]?.slice(11,16) || "—"}</small></article>)}</div>}
      <footer className="weather-footer"><span>{stale || active.error ? "Données non à jour · " : ""}Actualisé {new Intl.DateTimeFormat("fr-FR", { timeZone: data.timezone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(active.cached!.at))} · {data.timezone}</span><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></footer>
    </>}
  </div>;
}
