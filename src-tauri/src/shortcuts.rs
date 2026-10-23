use std::{path::PathBuf, process::Command};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Deserialize;
use serde_json::Value;
use tauri::Manager;
#[cfg(windows)] use std::os::windows::process::CommandExt;

#[derive(Deserialize, serde::Serialize)]
pub struct ShortcutItem { r#type: String, target: String }
#[derive(Deserialize, serde::Serialize)]
pub struct ShortcutGroup { id: String, name: String, items: Vec<ShortcutItem> }

#[tauri::command]
pub async fn shortcut_action(app: tauri::AppHandle, action: String, group: ShortcutGroup) -> Result<Value,String> {
    if !["open","close","status"].contains(&action.as_str()) || group.id.len()!=36 || !group.id.chars().all(|c| c.is_ascii_hexdigit() || c=='-') || group.items.len()>30 {
        return Err("Groupe invalide".into());
    }
    for item in &group.items {
        if item.target.len()>2048 || item.target.contains('\0') {return Err("Chemin invalide".into());}
        if item.r#type=="url" {
            let url=reqwest::Url::parse(&item.target).map_err(|_|"URL invalide")?;
            if !["http","https"].contains(&url.scheme()) || url.host_str().is_none() {return Err("Utilisez une URL HTTP ou HTTPS".into());}
        } else if !["folder","file","app"].contains(&item.r#type.as_str()) {return Err("Type invalide".into());}
    }
    let directory=app.path().app_config_dir().map_err(|e|e.to_string())?.join("shortcut-sessions");
    std::fs::create_dir_all(&directory).map_err(|e|e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        let script=include_str!("shortcuts.ps1");
        let encoded=STANDARD.encode(script.encode_utf16().flat_map(u16::to_le_bytes).collect::<Vec<_>>());
        let windows=std::env::var_os("SystemRoot").ok_or("Windows introuvable")?;
        let mut command=Command::new(PathBuf::from(windows).join("System32/WindowsPowerShell/v1.0/powershell.exe"));
        command.args(["-NoProfile","-NonInteractive","-EncodedCommand",&encoded])
            .env("FOCUS_SHORTCUT_ACTION",action).env("FOCUS_SHORTCUT_GROUP",serde_json::to_string(&group).map_err(|e|e.to_string())?).env("FOCUS_SHORTCUT_DIR",directory);
        #[cfg(windows)] command.creation_flags(0x08000000);
        let output=command.output().map_err(|e|e.to_string())?;
        if !output.status.success() {return Err("Impossible de gérer les raccourcis".into());}
        serde_json::from_slice(&output.stdout).map_err(|_|"Réponse des raccourcis invalide".into())
    }).await.map_err(|e|e.to_string())?
}
