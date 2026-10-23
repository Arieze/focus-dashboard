use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{Manager, PhysicalPosition, PhysicalSize, WindowEvent};

#[derive(Default, Clone, Serialize, Deserialize)]
struct Geometry {
    position: Option<(i32, i32)>,
    size: Option<(u32, u32)>,
}

pub fn install(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let Some(window) = app.get_webview_window("main") else { return Ok(()); };
    let directory = app.path().app_config_dir()?;
    std::fs::create_dir_all(&directory)?;
    let path = directory.join("focus-window.json");
    let geometry: Geometry = std::fs::read(&path).ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default();
    if let Some((width, height)) = geometry.size {
        if (440..=10000).contains(&width) && (600..=10000).contains(&height) {
            let _ = window.set_size(PhysicalSize::new(width, height));
        }
    }
    if let Some((x, y)) = geometry.position {
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
    let cached = Arc::new(Mutex::new(geometry));
    window.on_window_event(move |event| {
        // Use event values only. Never query the native window while handling
        // its events or holding a mutex: those queries can wait on this thread.
        let Ok(mut geometry) = cached.lock() else { return; };
        match event {
            WindowEvent::Moved(position) if position.x > -30000 && position.y > -30000 => {
                geometry.position = Some((position.x, position.y));
            }
            WindowEvent::Resized(size) if size.width >= 440 && size.height >= 600 => {
                geometry.size = Some((size.width, size.height));
            }
            WindowEvent::CloseRequested { .. } => {
                let snapshot = geometry.clone();
                drop(geometry);
                if let Ok(bytes) = serde_json::to_vec(&snapshot) {
                    let _ = std::fs::write(&path, bytes);
                }
            }
            _ => {}
        }
    });
    Ok(())
}
