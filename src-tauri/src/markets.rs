use serde_json::{json, Value};
use std::{collections::HashMap, sync::{Mutex, OnceLock}, time::{Duration, SystemTime, UNIX_EPOCH}};

const SYMBOLS: &[&str] = &["SPY", "AAPL", "BTC-EUR"];
static CACHE: OnceLock<Mutex<HashMap<String, (u64, Value)>>> = OnceLock::new();
fn timestamp() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() }

#[tauri::command]
pub async fn market_quote(symbol: String) -> Result<Value, String> {
    if !SYMBOLS.contains(&symbol.as_str()) { return Err("Valeur non autorisée".into()); }
    let cache = CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    if let Some((at, quote)) = cache.lock().map_err(|_| "Cache indisponible")?.get(&symbol) {
        if timestamp().saturating_sub(*at) < 60 { return Ok(quote.clone()); }
    }
    let client = reqwest::Client::builder().timeout(Duration::from_secs(12))
        .redirect(reqwest::redirect::Policy::none()).user_agent("FocusDashboard/0.8.0 personal market viewer")
        .build().map_err(|_| "Connexion impossible")?;
    let response = client.get(format!("https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"))
        .query(&[("range", "1d"), ("interval", "5m"), ("includePrePost", "false")])
        .send().await.map_err(|_| "Connexion aux cours indisponible")?;
    if !response.status().is_success() { return Err(format!("Cours indisponible (HTTP {})", response.status().as_u16())); }
    let raw: Value = response.json().await.map_err(|_| "Réponse de cotation invalide")?;
    let result = raw["chart"]["result"].as_array().and_then(|a| a.first()).ok_or("Cotation indisponible")?;
    let meta = &result["meta"];
    if meta["symbol"].as_str() != Some(symbol.as_str()) { return Err("Symbole de cotation inattendu".into()); }
    let price = meta["regularMarketPrice"].as_f64().filter(|x| x.is_finite() && *x > 0.0).ok_or("Cours manquant")?;
    let time = meta["regularMarketTime"].as_u64().filter(|x| *x > 0).ok_or("Heure de cotation manquante")?;
    let currency = meta["currency"].as_str().filter(|x| ["EUR", "USD"].contains(x)).ok_or("Devise inattendue")?;
    let previous = meta["previousClose"].as_f64().or_else(|| meta["chartPreviousClose"].as_f64()).filter(|x| x.is_finite() && *x > 0.0);
    let points: Vec<f64> = result["indicators"]["quote"][0]["close"].as_array().map(|a| a.iter().take(500).filter_map(|v| v.as_f64().filter(|x| x.is_finite() && *x > 0.0)).collect()).unwrap_or_default();
    let now = timestamp();
    let quote = json!({"symbol":symbol,"currency":currency,"price":price,"previousClose":previous,"time":time,"fetchedAt":now,"exchange":meta["exchangeName"].as_str().unwrap_or(""),"points":points});
    cache.lock().map_err(|_| "Cache indisponible")?.insert(symbol, (now, quote.clone()));
    Ok(quote)
}
