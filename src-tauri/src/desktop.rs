use std::path::{Path,PathBuf};
use std::process::Command;
use serde::Serialize;
use serde_json::Value;
use base64::{engine::general_purpose::STANDARD,Engine};
#[cfg(windows)]use std::os::windows::process::CommandExt;

#[tauri::command]
pub async fn pc_metrics(ping_host:String)->Result<Value,String>{
  if ping_host.len()>253 || ping_host.is_empty() || !ping_host.chars().all(|c|c.is_ascii_alphanumeric()||c=='.'||c=='-'){return Err("Adresse de ping invalide".into());}
  tauri::async_runtime::spawn_blocking(move||{
    let script=include_str!("pc_metrics.ps1");
    let bytes:Vec<u8>=script.encode_utf16().flat_map(|v|v.to_le_bytes()).collect();
    let windows=std::env::var_os("SystemRoot").ok_or("Windows introuvable")?;
    let exe=PathBuf::from(windows).join("System32/WindowsPowerShell/v1.0/powershell.exe");
    let mut command=Command::new(exe);
    command.args(["-NoProfile","-NonInteractive","-EncodedCommand",&STANDARD.encode(bytes)]).env("FOCUS_PING_HOST",ping_host);
    #[cfg(windows)]command.creation_flags(0x08000000);
    let output=command.output().map_err(|_|"Mesures PC indisponibles")?;
    if !output.status.success(){return Err("Mesures PC indisponibles".into());}
    serde_json::from_slice(&output.stdout).map_err(|_|"Réponse des mesures invalide".into())
  }).await.map_err(|e|e.to_string())?
}

fn resolve(root:&str,relative:&str)->Result<(PathBuf,PathBuf),String>{
  if root.trim().is_empty(){return Err("Choisissez votre dossier de projets dans les paramètres".into());}
  let root=Path::new(root).canonicalize().map_err(|_|"Dossier de projets introuvable")?;
  if !root.is_dir(){return Err("Choisissez un dossier".into());}
  let target=root.join(relative).canonicalize().map_err(|_|"Dossier introuvable")?;
  if !target.is_dir()||!target.starts_with(&root){return Err("Dossier hors de l’espace projets".into());}
  Ok((root,target))
}
#[derive(Serialize)]pub struct ProjectFolder {name:String,relative:String}
#[tauri::command]
pub fn project_folders(root:String,relative:String)->Result<Vec<ProjectFolder>,String>{
  let (root,target)=resolve(&root,&relative)?;
  let mut folders=Vec::new();
  for entry in std::fs::read_dir(target).map_err(|_|"Dossier inaccessible")?{
    let Ok(entry)=entry else{continue};let path=entry.path();
    if !path.is_dir(){continue;}
    let Ok(canonical)=path.canonicalize() else{continue};
    if !canonical.starts_with(&root){continue;}
    let name=entry.file_name().to_string_lossy().into_owned();if name.starts_with('.') {continue;}
    folders.push(ProjectFolder{name,relative:canonical.strip_prefix(&root).unwrap().to_string_lossy().into_owned()});
  }
  folders.sort_by_key(|f|f.name.to_lowercase());Ok(folders)
}
#[tauri::command]
pub fn open_project(root:String,relative:String)->Result<(),String>{
  let (_,target)=resolve(&root,&relative)?;
  let windows=std::env::var_os("SystemRoot").ok_or("Windows introuvable")?;
  let path=target.to_string_lossy();
  let display=if let Some(unc)=path.strip_prefix(r"\\?\UNC\"){format!(r"\\{unc}")}else{path.trim_start_matches(r"\\?\").to_string()};
  Command::new(PathBuf::from(windows).join("explorer.exe")).arg(display).spawn().map_err(|_|"Impossible d’ouvrir le dossier")?;
  Ok(())
}

#[tauri::command]
pub async fn start_hardware_monitor()->Result<(),String>{
  tauri::async_runtime::spawn_blocking(||{
    let path = std::env::var_os("FOCUS_HARDWARE_MONITOR")
      .map(PathBuf::from)
      .or_else(|| std::env::var_os("ProgramFiles").map(|root| PathBuf::from(root).join("LibreHardwareMonitor/LibreHardwareMonitor.exe")))
      .filter(|path| path.is_file())
      .ok_or("Libre Hardware Monitor introuvable. Installez-le ou définissez FOCUS_HARDWARE_MONITOR.")?;
    let windows=std::env::var_os("SystemRoot").ok_or("Windows introuvable")?;
    let mut command=Command::new(PathBuf::from(windows).join("System32/WindowsPowerShell/v1.0/powershell.exe"));
    command.env("FOCUS_HARDWARE_MONITOR", &path);
    command.args(["-NoProfile","-NonInteractive","-Command",r"$ErrorActionPreference='Stop'; if (-not (Get-Process LibreHardwareMonitor -ErrorAction SilentlyContinue)) {Start-Process -FilePath $env:FOCUS_HARDWARE_MONITOR -WorkingDirectory (Split-Path -LiteralPath $env:FOCUS_HARDWARE_MONITOR) -Verb RunAs -WindowStyle Hidden}"]);
    #[cfg(windows)]command.creation_flags(0x08000000);
    let status=command.status().map_err(|_|"Lancement impossible")?;
    if status.success(){Ok(())}else{Err("Lancement du moniteur annulé ou refusé".into())}
  }).await.map_err(|e|e.to_string())?
}
