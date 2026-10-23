import { z } from "zod";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Location, WeatherSettings } from "./settings";
const number = z.number().nullable();
export const forecastSchema = z.object({
  timezone: z.string(),
  current: z.object({ time: z.string(), temperature_2m: number, apparent_temperature: number, weather_code: number, relative_humidity_2m: number, wind_speed_10m: number, precipitation: number, is_day: number }),
  hourly: z.object({ time: z.array(z.string()), temperature_2m: z.array(number), weather_code: z.array(number), precipitation_probability: z.array(number), uv_index: z.array(number), is_day: z.array(number) }),
  daily: z.object({ time: z.array(z.string()), temperature_2m_min: z.array(number), temperature_2m_max: z.array(number), weather_code: z.array(number), precipitation_probability_max: z.array(number), uv_index_max: z.array(number), sunrise: z.array(z.string().nullable()), sunset: z.array(z.string().nullable()) }),
});
export type Forecast = z.infer<typeof forecastSchema>;
export const cacheSchema = z.object({ at: z.number(), data: forecastSchema });
export type Cached = z.infer<typeof cacheSchema>;
export const refreshDelay = 30 * 60 * 1000;
export function cacheKey(location: Location, unit: string) { return `focus-weather-v1:${location.latitude}:${location.longitude}:${unit}`; }
export function readCache(key: string): Cached | null { try { const result = cacheSchema.safeParse(JSON.parse(localStorage.getItem(key) || "null")); return result.success ? result.data : null; } catch { return null; } }
export function writeCache(key: string, value: Cached) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Weather must remain usable if storage is full. */ } }
async function request(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Service météo indisponible (${response.status})`);
  return response.json();
}
export async function searchCities(query: string): Promise<Location[]> {
  const raw = isTauri() ? await invoke("weather_search", { query }) : await request(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=fr&format=json`);
  const result = z.object({ results: z.array(z.object({ name: z.string(), latitude: z.number(), longitude: z.number(), admin1: z.string().optional(), country: z.string().optional() })).optional() }).parse(raw);
  return (result.results || []).map(x => ({ name: [x.name, x.admin1, x.country].filter(Boolean).join(", "), latitude: x.latitude, longitude: x.longitude }));
}
export async function fetchWeather(location: Location, unit: WeatherSettings["unit"]): Promise<Forecast> {
  const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), temperature_unit: unit, timezone: "auto", forecast_days: "3", wind_speed_unit: "kmh", precipitation_unit: "mm", current: "temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,precipitation,is_day", hourly: "temperature_2m,weather_code,precipitation_probability,uv_index,is_day", daily: "temperature_2m_min,temperature_2m_max,weather_code,precipitation_probability_max,uv_index_max,sunrise,sunset" });
  return forecastSchema.parse(isTauri() ? await invoke("weather_forecast", { latitude: location.latitude, longitude: location.longitude, unit }) : await request(`https://api.open-meteo.com/v1/forecast?${params}`));
}
export function uvLevel(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return value < 3 ? { label: "Faible", color: "#9cd6a7" } : value < 6 ? { label: "Modéré", color: "#edcf72" } : value < 8 ? { label: "Élevé", color: "#ffad70" } : value < 11 ? { label: "Très élevé", color: "#ff8585" } : { label: "Extrême", color: "#d7a4ff" };
}
export function localHour(timezone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find(x => x.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:00`;
}
export type Condition = { label: string; icon: "sun" | "moon" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm" | "unknown"; effect?: string };
export function condition(code: number | null | undefined, day = true): Condition {
  if (code === 0) return { label: day ? "Ciel dégagé" : "Nuit dégagée", icon: day ? "sun" : "moon", effect: day ? "sun_rays" : undefined };
  if (code === 1 || code === 2) return { label: "Éclaircies", icon: "partly" };
  if (code === 3) return { label: "Couvert", icon: "cloud" };
  if (code === 45 || code === 48) return { label: code === 48 ? "Brouillard givrant" : "Brouillard", icon: "fog", effect: "fog" };
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code ?? -1)) return { label: [56,57,66,67].includes(code!) ? "Pluie verglaçante" : [51,53,55].includes(code!) ? "Bruine" : "Pluie", icon: "rain", effect: "rain" };
  if ([71,73,75,77,85,86].includes(code ?? -1)) return { label: "Neige", icon: "snow", effect: "snowfall" };
  if ([95,96,99].includes(code ?? -1)) return { label: code === 95 ? "Orage" : "Orage et grêle", icon: "storm", effect: code === 95 ? "lightning_flash" : "hail_top" };
  return { label: "Conditions indisponibles", icon: "unknown" };
}
