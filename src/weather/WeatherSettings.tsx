import { useRef, useState } from "react";

import { searchCities } from "./data";
import type { Location, WeatherSettings as Preferences } from "./settings";
export function CityPicker({ onSelect }: { onSelect: (location: Location) => void }) {
  const [query, setQuery] = useState(""), [results, setResults] = useState<Location[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const generation = useRef(0);
  return <div className="weather-city-picker">
    <form className="path-picker" onSubmit={async e => { e.preventDefault(); const id = ++generation.current; setBusy(true); setMessage(""); setResults([]); try { const cities = await searchCities(query.trim()); if (id === generation.current) { setResults(cities); if (!cities.length) setMessage("Aucune ville trouvée."); } } catch { if (id === generation.current) setMessage("Recherche indisponible. Réessayez avec une connexion Internet."); } finally { if (id === generation.current) setBusy(false); } }}>
      <input aria-label="Rechercher une ville" placeholder="Rechercher une ville…" value={query} maxLength={100} onChange={e => setQuery(e.target.value)} />
      <button disabled={busy || query.trim().length < 2}>{busy ? "Recherche…" : "Rechercher"}</button>
    </form>
    {results.map(city => <button className="weather-city-result" key={`${city.latitude}:${city.longitude}`} onClick={() => { onSelect(city); setResults([]); setQuery(""); }}>{city.name}</button>)}
    {message && <p role="status" className="hint">{message}</p>}
  </div>;
}
export default function WeatherSettings({ value, onChange }: { value: Preferences; onChange: (value: Preferences) => void }) {
  return <><h3>Météo</h3>{value.location && <p className="hint">{value.location.name}</p>}<CityPicker onSelect={location => onChange({ ...value, location })} />
  </>;
}
