use tauri::Manager;

mod markets;
mod weather;
mod music;
mod storage;
mod desktop;
mod shortcuts;
mod window_geometry;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window)=app.get_webview_window("main") {let _=window.unminimize();let _=window.show();let _=window.set_focus();}
        }))
        .manage(storage::Storage::default())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![markets::market_quote,weather::weather_search,weather::weather_forecast,storage::load_state,storage::save_state,storage::state_backups,music::music_request,music::music_albums,music::music_play_album,desktop::pc_metrics,desktop::start_hardware_monitor,desktop::project_folders,desktop::open_project,shortcuts::shortcut_action])
        .setup(|app| {
            window_geometry::install(app)?;
            tauri::async_runtime::spawn(async {
                if music::music_request("status".into(), None).await.is_err() {
                    let _ = music::music_request("launch".into(), None).await;
                }
            });
            // Recover a window whose saved monitor has been disconnected.
            if let Some(window) = app.get_webview_window("main") {
                if let (Ok(position), Ok(size), Ok(monitors)) = (window.outer_position(), window.outer_size(), window.available_monitors()) {
                    let visible = monitors.iter().any(|m| {
                        let p = m.position(); let s = m.size();
                        position.x < p.x + s.width as i32 && position.x + size.width as i32 > p.x &&
                        position.y < p.y + s.height as i32 && position.y + size.height as i32 > p.y
                    });
                    if !visible { let _ = window.center(); }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Impossible de démarrer Focus Dashboard");
}
