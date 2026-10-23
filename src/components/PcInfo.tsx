import { useEffect, useState } from "react";
import { emitCompanionEvent } from "../companion/events";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { Cpu, MemoryStick, Thermometer, Wifi } from "lucide-react";
interface Metrics {
  monitorConnected: boolean;
  gpuTemperatureC: number | null;
  cpuPowerW: number | null;
  cpuPercent: number | null;
  cpuName: string;
  ramUsedGb: number;
  ramTotalGb: number;
  temperatureC: number | null;
  pingMs: number | null;
  uptimeHours: number;
}
export default function PcInfo({ pingHost }: { pingHost: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null),
    [starting, setStarting] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let wasHot = false;
    let timeout: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const data = await invoke<Metrics>("pc_metrics", { pingHost });
        if (!disposed) {
          setMetrics(data);
          const hot = data.temperatureC !== null && data.temperatureC >= 85;
          if (hot && !wasHot) emitCompanionEvent("cpu-hot");
          wasHot = hot;
          setError("");
        }
      } catch (e) {
        if (!disposed) setError(String(e));
      }
      if (!disposed) timeout = setTimeout(() => void poll(), 5000);
    };
    setStarting(true);
    void invoke("start_hardware_monitor")
      .catch((e) => {
        if (!disposed) setError(String(e));
      })
      .finally(() => {
        if (!disposed) setStarting(false);
      });
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timeout);
    };
  }, [pingHost]);
  return (
    <aside className="pc-info" aria-label="Informations PC">
      <div title={metrics?.cpuName || error || "Charge CPU"}>
        <Cpu size={15} />
        <span>CPU</span>
        <strong>
          {metrics?.cpuPercent == null
            ? "—"
            : Math.round(metrics.cpuPercent) + " %"}
        </strong>
      </div>
      <div title="Mémoire utilisée / totale">
        <MemoryStick size={15} />
        <span>RAM</span>
        <strong>
          {metrics ? `${metrics.ramUsedGb} / ${metrics.ramTotalGb} Go` : "—"}
        </strong>
      </div>
      <div title="Température CPU · Libre Hardware Monitor">
        <Thermometer size={15} />
        <span>CPU °C</span>
        <strong>
          {metrics?.temperatureC == null
            ? "Indisponible"
            : Math.round(metrics.temperatureC) + " °C"}
        </strong>
      </div>
      <div title={"Ping vers " + pingHost}>
        <Wifi size={15} />
        <span>Ping</span>
        <strong>
          {metrics?.pingMs == null ? "—" : metrics.pingMs + " ms"}
        </strong>
      </div>
      {metrics?.cpuPowerW != null && (
        <div title="Puissance CPU · Libre Hardware Monitor">
          <Cpu size={15} />
          <span>CPU W</span>
          <strong>{Math.round(metrics.cpuPowerW)} W</strong>
        </div>
      )}
      {metrics?.gpuTemperatureC != null && (
        <div title="Température GPU · Libre Hardware Monitor">
          <Thermometer size={15} />
          <span>GPU °C</span>
          <strong>{Math.round(metrics.gpuTemperatureC)} °C</strong>
        </div>
      )}
      {isTauri() && metrics && !metrics.monitorConnected && (
        <button
          disabled={starting}
          onClick={async () => {
            setStarting(true);
            try {
              await invoke("start_hardware_monitor");
              setError("");
            } catch (e) {
              setError(String(e));
            } finally {
              setStarting(false);
            }
          }}
        >
          {starting ? "Ouverture…" : "Activer les capteurs"}
        </button>
      )}
      {error && (
        <small className="late" title={error}>
          Mesures indisponibles
        </small>
      )}
    </aside>
  );
}
