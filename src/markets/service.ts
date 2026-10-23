import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";
const quoteSchema = z.object({
  symbol: z.string(), currency: z.string().regex(/^[A-Z]{3}$/), price: z.number().positive(), previousClose: z.number().positive().nullable(),
  time: z.number().positive(), fetchedAt: z.number().positive(), exchange: z.string(), points: z.array(z.number().positive()).max(500),
});
export type Quote = z.infer<typeof quoteSchema>;
const key = "focus-market-quotes-v1";
export function cachedQuotes(): Record<string, Quote> {
  try {
    const input = JSON.parse(localStorage.getItem(key) || "{}");
    return Object.fromEntries(Object.entries(input).flatMap(([symbol, value]) => {
      const result = quoteSchema.safeParse(value);
      return result.success && result.data.symbol === symbol ? [[symbol, result.data]] : [];
    }));
  } catch { return {}; }
}
export function saveQuotes(quotes: Record<string, Quote>) { try { localStorage.setItem(key, JSON.stringify(quotes)); } catch { /* Cache facultatif. */ } }
export async function fetchQuote(symbol: string): Promise<Quote> {
  if (!isTauri()) throw new Error("Les cours sont disponibles dans l’application Windows.");
  const quote = quoteSchema.parse(await invoke("market_quote", { symbol }));
  if (quote.symbol !== symbol) throw new Error("Cotation inattendue.");
  return quote;
}
