use sqlx::{sqlite::SqliteConnectOptions, SqlitePool, Row};
use tauri::Manager;
#[derive(Default)]
pub struct Storage(pub tauri::async_runtime::Mutex<Option<SqlitePool>>);
async fn pool(app: &tauri::AppHandle, state: &Storage) -> Result<SqlitePool,String> {
    let mut cached=state.0.lock().await;
    if let Some(pool)=cached.as_ref(){return Ok(pool.clone());}
    let directory=app.path().app_config_dir().map_err(|e|e.to_string())?;
    std::fs::create_dir_all(&directory).map_err(|e|e.to_string())?;
    let options=SqliteConnectOptions::new().filename(directory.join("personal-os.db")).create_if_missing(true).busy_timeout(std::time::Duration::from_secs(5));
    let pool=sqlx::sqlite::SqlitePoolOptions::new().max_connections(1).connect_with(options).await.map_err(|e|e.to_string())?;
    sqlx::raw_sql(concat!(include_str!("../migrations/001_initial.sql"), "\nCREATE TABLE IF NOT EXISTS state_backups(day TEXT PRIMARY KEY,payload TEXT NOT NULL CHECK(json_valid(payload))); DROP TRIGGER IF EXISTS daily_backup;")).execute(&pool).await.map_err(|e|e.to_string())?;
    *cached=Some(pool.clone());Ok(pool)
}
#[tauri::command]
pub async fn load_state(app:tauri::AppHandle,state:tauri::State<'_,Storage>)->Result<Option<String>,String>{
    let pool=pool(&app,&state).await?;
    sqlx::query_scalar("SELECT payload FROM app_state WHERE id=1").fetch_optional(&pool).await.map_err(|e|e.to_string())
}
#[tauri::command]
pub async fn save_state(app:tauri::AppHandle,state:tauri::State<'_,Storage>,payload:String,expected_payload:Option<String>)->Result<(),String>{
    let value:serde_json::Value=serde_json::from_str(&payload).map_err(|e|e.to_string())?;
    if value["version"]!=1 || !value["events"].is_array() || !value["settings"].is_object(){return Err("Données invalides".into());}
    let pool=pool(&app,&state).await?;
    write_state(&pool,&payload,expected_payload.as_deref()).await
}
async fn write_state(pool:&SqlitePool,payload:&str,expected_payload:Option<&str>)->Result<(),String>{
    let mut tx=pool.begin().await.map_err(|e|e.to_string())?;
    let current:Option<String>=sqlx::query_scalar("SELECT payload FROM app_state WHERE id=1").fetch_optional(&mut *tx).await.map_err(|e|e.to_string())?;
    if current.as_deref()==Some(payload){return Ok(());}
    if current.as_deref()!=expected_payload{return Err("Les données ont changé depuis leur chargement. Exportez vos modifications puis rouvrez l’application pour éviter de remplacer une sauvegarde plus récente.".into());}
    sqlx::query("INSERT INTO state_backups(day,payload) SELECT date('now'),payload FROM app_state WHERE id=1 ON CONFLICT(day) DO NOTHING").execute(&mut *tx).await.map_err(|e|e.to_string())?;
    sqlx::query("INSERT INTO app_state(id,payload,updated_at) VALUES(1,?,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at").bind(payload).execute(&mut *tx).await.map_err(|e|e.to_string())?;
    sqlx::query("DELETE FROM state_backups WHERE day<date('now','-30 days')").execute(&mut *tx).await.map_err(|e|e.to_string())?;
    tx.commit().await.map_err(|e|e.to_string())
}
#[tauri::command]
pub async fn state_backups(app:tauri::AppHandle,state:tauri::State<'_,Storage>)->Result<serde_json::Value,String>{
    let pool=pool(&app,&state).await?;
    let rows=sqlx::query("SELECT day,payload FROM state_backups ORDER BY day DESC").fetch_all(&pool).await.map_err(|e|e.to_string())?;
    Ok(serde_json::json!(rows.iter().map(|row|serde_json::json!({"day":row.get::<String,_>("day"),"payload":row.get::<String,_>("payload")})).collect::<Vec<_>>()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calendar_survives_reopening_and_rejects_stale_writes() {
        tauri::async_runtime::block_on(async {
            let path=std::env::temp_dir().join(format!("focus-storage-{}-{}.db",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
            let options=SqliteConnectOptions::new().filename(&path).create_if_missing(true);
            let pool=sqlx::sqlite::SqlitePoolOptions::new().max_connections(1).connect_with(options.clone()).await.unwrap();
            sqlx::raw_sql(concat!(include_str!("../migrations/001_initial.sql"),"\nCREATE TABLE state_backups(day TEXT PRIMARY KEY,payload TEXT NOT NULL CHECK(json_valid(payload)));")).execute(&pool).await.unwrap();
            let empty=r#"{"events":[]}"#;
            let first=r#"{"events":[{"id":"first"}]}"#;
            let latest=r#"{"events":[{"id":"first"},{"id":"second"}]}"#;
            write_state(&pool,first,None).await.unwrap();
            write_state(&pool,latest,Some(first)).await.unwrap();
            assert!(write_state(&pool,empty,Some(first)).await.is_err());
            assert!(write_state(&pool,empty,None).await.is_err());
            write_state(&pool,latest,Some(first)).await.unwrap();
            pool.close().await;
            let reopened=SqlitePool::connect_with(options).await.unwrap();
            let stored:String=sqlx::query_scalar("SELECT payload FROM app_state WHERE id=1").fetch_one(&reopened).await.unwrap();
            assert_eq!(stored,latest);
            let backup:String=sqlx::query_scalar("SELECT payload FROM state_backups").fetch_one(&reopened).await.unwrap();
            assert_eq!(backup,first);
            reopened.close().await;
            std::fs::remove_file(path).unwrap();
        });
    }
}
