import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { instruments, marketCategories } from "./instruments";
import { cachedQuotes, fetchQuote, saveQuotes, type Quote } from "./service";
import "./markets.css";
const interval = 5 * 60 * 1000;
const date = (seconds: number) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(seconds * 1000));
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <span className="market-chart-empty">—</span>;
  const min = Math.min(...points), max = Math.max(...points), range = max - min;
  const line = points.map((v, i) => `${i / (points.length - 1) * 84},${range ? 27 - (v - min) / range * 24 : 15}`).join(" ");
  return <svg className="market-chart" viewBox="0 0 84 30" role="img" aria-label="Évolution intrajournalière"><polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}
export default function Markets() {
  const [quotes, setQuotes] = useState<Record<string, Quote>>(cachedQuotes);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false), [revision, setRevision] = useState(0), [now, setNow] = useState(Date.now());
  const values = useRef(quotes);
  const lastAttempt = useRef(0);
  useEffect(() => {
    let disposed = false, pending = false;
    const refresh = async (force = false) => {
      if (document.hidden || pending || (!force && Date.now() - lastAttempt.current < interval)) return;
      pending = true; lastAttempt.current = Date.now(); setLoading(true); setNow(Date.now());
      const work = [...instruments];
      const worker = async () => {
        while (!disposed && work.length) {
          const instrument = work.shift()!;
          try {
            const quote = await fetchQuote(instrument.symbol);
            if (disposed) return;
            values.current = { ...values.current, [instrument.symbol]: quote };
            setQuotes(values.current); saveQuotes(values.current);
            setErrors(old => { const next = { ...old }; delete next[instrument.symbol]; return next; });
          } catch (error) {
            if (!disposed) setErrors(old => ({ ...old, [instrument.symbol]: String(error) }));
          }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      pending = false;
      if (!disposed) { setLoading(false); setNow(Date.now()); }
    };
    const resume = () => { setNow(Date.now()); void refresh(); };
    void refresh(true);
    const timer = window.setInterval(resume, 60000);
    document.addEventListener("visibilitychange", resume);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", resume); };
  }, [revision]);
  const failed = Object.keys(errors).length;
  return <div className="market-widget">
    <div className="market-toolbar"><span>{instruments.length} valeurs · Variation du jour</span><button disabled={loading} onClick={() => setRevision(v => v + 1)} title="Actualiser les cours" aria-label="Actualiser les cours"><RefreshCw size={15} />{loading ? "Actualisation…" : "Actualiser"}</button></div>
    {failed > 0 && <p className="hint" role="status">{failed} cours indisponible{failed > 1 ? "s" : ""}. Les derniers cours reçus sont conservés.</p>}
    <div className="market-groups">{marketCategories.map(category => <section className="market-group" key={category}>
      <h3>{category}</h3>
      {instruments.filter(x => x.category === category).map(instrument => {
        const quote = quotes[instrument.symbol];
        const change = quote?.previousClose ? (quote.price / quote.previousClose - 1) * 100 : null;
        const stale = !!quote && (now / 1000 - quote.fetchedAt > 600 || !!errors[instrument.symbol]);
        const tone = change == null || change === 0 ? "" : change > 0 ? "positive" : "negative";
        return <div className="market-row" key={instrument.symbol} title={instrument.isin || "Bitcoin au comptant"}>
          <div className="market-name"><strong>{instrument.name}</strong><small>{instrument.symbol} · {instrument.detail}</small></div>
          <div className={`market-trend ${tone}`}>{quote && <Sparkline points={quote.points} />}</div>
          <div className="market-price"><strong>{quote ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: quote.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(quote.price) : "—"}</strong><small title={errors[instrument.symbol] || undefined}>{quote ? `${stale ? "Cache · " : ""}${date(quote.time)}` : errors[instrument.symbol] ? "Indisponible" : loading ? "Chargement…" : "En attente"}</small></div>
          <div className={`market-change ${tone}`} title="Variation par rapport à la clôture précédente du fournisseur">{change == null ? "—" : `${change > 0 ? "+" : ""}${change.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`}</div>
        </div>;
      })}
    </section>)}</div>
    <div className="market-footer">Yahoo Finance · Cours pouvant être différés · Actualisation 5 min · Heures de Paris</div>
  </div>;
}
