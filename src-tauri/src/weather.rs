use serde_json::Value;
use std::time::Duration;

async fn get(url: &str, params: &[(&str, String)]) -> Result<Value, String> {
    reqwest::Client::builder().timeout(Duration::from_secs(15)).build().map_err(|e| e.to_string())?
        .get(url).query(params).send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn weather_search(query: String) -> Result<Value, String> {
    let query = query.trim();
    if query.chars().count() < 2 || query.len() > 200 { return Err("Nom de ville invalide".into()); }
    get("https://geocoding-api.open-meteo.com/v1/search", &[("name", query.into()), ("count", "5".into()), ("language", "fr".into()), ("format", "json".into())]).await
}
#[tauri::command]
pub async fn weather_forecast(latitude: f64, longitude: f64, unit: String) -> Result<Value, String> {
    if !latitude.is_finite() || !longitude.is_finite() || !(-90.0..=90.0).contains(&latitude) || !(-180.0..=180.0).contains(&longitude) || !["celsius", "fahrenheit"].contains(&unit.as_str()) { return Err("Localisation ou unité invalide".into()); }
    get("https://api.open-meteo.com/v1/forecast", &[
        ("latitude", latitude.to_string()), ("longitude", longitude.to_string()), ("temperature_unit", unit),
        ("timezone", "auto".into()), ("forecast_days", "3".into()), ("wind_speed_unit", "kmh".into()), ("precipitation_unit", "mm".into()),
        ("current", "temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,precipitation,is_day".into()),
        ("hourly", "temperature_2m,weather_code,precipitation_probability,uv_index,is_day".into()),
        ("daily", "temperature_2m_min,temperature_2m_max,weather_code,precipitation_probability_max,uv_index_max,sunrise,sunset".into())
    ]).await
}
