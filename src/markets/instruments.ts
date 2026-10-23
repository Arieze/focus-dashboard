// Exemple public : personnalisez cette liste et SYMBOLS dans le backend.
export const instruments = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", isin: "US78462F1030", category: "ETF", detail: "NYSE Arca · USD" },
  { symbol: "AAPL", name: "Apple", isin: "US0378331005", category: "Actions", detail: "Nasdaq · USD" },
  { symbol: "BTC-EUR", name: "Bitcoin", isin: "", category: "Crypto", detail: "BTC / EUR · 24 h / 24" },
] as const;
export const marketCategories = [...new Set(instruments.map(x => x.category))];
