use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::time::Duration;
use serde::Serialize;
use std::collections::BTreeMap;
fn client()->Result<reqwest::Client,String>{reqwest::Client::builder().timeout(Duration::from_secs(5)).redirect(reqwest::redirect::Policy::none()).no_proxy().build().map_err(|e|e.to_string())}
const BASE:&str="http://127.0.0.1:8880/api";
#[derive(Serialize)]#[serde(rename_all="camelCase")]
pub struct Album {title:String,artist:String,playlist_id:String,index:u64,tracks:u64,items:Vec<AlbumTrack>}
#[derive(Serialize)]#[serde(rename_all="camelCase")]
pub struct AlbumTrack {title:String,duration:String,playlist_id:String,index:u64,#[serde(skip)]disc:u32,#[serde(skip)]track:Option<u32>}
fn metadata_number(value:&str)->Option<u32>{
  let digits:String=value.trim().chars().take_while(|c|c.is_ascii_digit()).collect();
  digits.parse::<u32>().ok().filter(|n|*n>0)
}
fn filename_track(value:&str)->Option<u32>{
  let value=value.trim();
  let end=value.find(|c:char|!c.is_ascii_digit())?;
  if !value[end..].starts_with([' ','.','-','_']) {return None;}
  metadata_number(&value[..end])
}
fn sort_album(album:&mut Album){
  album.items.sort_by_key(|item|(item.disc,item.track.unwrap_or(u32::MAX)));
  if let Some(first)=album.items.first(){album.playlist_id=first.playlist_id.clone();album.index=first.index;}
}
#[cfg(test)]
mod tests {
  use super::*;
  #[test]
  fn parses_track_metadata_and_filename_fallback(){
    assert_eq!(metadata_number(" 08/17"),Some(8));
    assert_eq!(metadata_number("?"),None);
    assert_eq!(metadata_number("0"),None);
    assert_eq!(filename_track("01 - FORFAIT"),Some(1));
    assert_eq!(filename_track("10.-Euro"),Some(10));
    assert_eq!(filename_track("1985"),None);
    assert_eq!(filename_track("SCH - Otto"),None);
  }
  #[test]
  fn sorts_numerically_by_disc_preserving_playback_indices(){
    let song=|disc,track,index|AlbumTrack{title:format!("{index}"),duration:String::new(),playlist_id:"p1".into(),index,disc,track};
    let mut album=Album{title:String::new(),artist:String::new(),playlist_id:"p1".into(),index:90,tracks:6,items:vec![song(2,Some(1),90),song(1,Some(10),91),song(1,Some(2),92),song(1,Some(1),93),song(1,None,94),song(1,None,95)]};
    sort_album(&mut album);
    assert_eq!(album.items.iter().map(|s|s.index).collect::<Vec<_>>(),vec![93,92,91,94,95,90]);
    assert_eq!(album.index,93);
    assert_eq!(album.playlist_id,"p1");
  }
}
#[derive(Serialize)]pub struct Playlist {id:String,title:String}
#[derive(Serialize)]pub struct AlbumLibrary {albums:Vec<Album>,playlists:Vec<Playlist>,truncated:bool}
#[tauri::command]
pub async fn music_albums(playlist_id:Option<String>)->Result<AlbumLibrary,String>{
  let client=client()?;
  let response:Value=client.get(format!("{BASE}/playlists")).send().await.map_err(|_|"Lecteur indisponible")?.error_for_status().map_err(|_|"Playlists inaccessibles")?.json().await.map_err(|_|"Playlists invalides")?;
  let playlists=response["playlists"].as_array().ok_or("Playlists invalides")?;
  let choices:Vec<Playlist>=playlists.iter().filter_map(|p| Some(Playlist{id:p["id"].as_str()?.into(),title:p["title"].as_str().unwrap_or("Playlist sans nom").into()})).collect();
  let mut albums:BTreeMap<(String,String),Album>=BTreeMap::new();let mut scanned=0u64;let mut truncated=false;
  for playlist in playlists {
    let id=playlist["id"].as_str().ok_or("Identifiant de playlist invalide")?;
    if !id.chars().all(|c|c.is_ascii_alphanumeric()||c=='-'||c=='_'){continue;}
    if let Some(ref selected)=playlist_id { if !selected.is_empty() && selected != id {continue;} }
    let count=playlist["itemCount"].as_u64().unwrap_or(0);
    let mut offset=0u64;
    while offset<count {
      if scanned>=20000 {truncated=true;break;}
      let limit=(count-offset).min(500).min(20000-scanned);
      let data:Value=client.get(format!("{BASE}/playlists/{id}/items/{offset}:{limit}")).query(&[("columns","%album%,%album artist%,%artist%,%title%,%length%,%discnumber%,%tracknumber%,%filename%")]).send().await.map_err(|_|"Albums indisponibles")?.error_for_status().map_err(|_|"Albums inaccessibles")?.json().await.map_err(|_|"Albums invalides")?;
      let items=data["playlistItems"]["items"].as_array().ok_or("Liste d’albums invalide")?;
      if items.is_empty(){break;}
      for (i,item) in items.iter().enumerate(){
        let columns=item["columns"].as_array().ok_or("Métadonnées invalides")?;
        let text=|n:usize|columns.get(n).and_then(Value::as_str).unwrap_or("");
        let title=text(0).trim();let title=if title.is_empty()||title=="?" {"Sans album"} else {title};
        let artist=if text(1).is_empty()||text(1)=="?"{text(2)}else{text(1)};
        let key=(title.to_lowercase(),artist.to_lowercase());
        let album=albums.entry(key).or_insert_with(||Album{title:title.into(),artist:artist.into(),playlist_id:id.into(),index:offset+i as u64,tracks:0,items:Vec::new()});album.tracks+=1;album.items.push(AlbumTrack{title:text(3).into(),duration:text(4).into(),playlist_id:id.into(),index:offset+i as u64,disc:metadata_number(text(5)).unwrap_or(1),track:metadata_number(text(6)).or_else(||filename_track(text(7)))});
      }
      offset+=items.len() as u64;scanned+=items.len() as u64;
    }
    if truncated {break;}
  }
  let albums=albums.into_values().map(|mut album|{sort_album(&mut album);album}).collect();
  Ok(AlbumLibrary{albums,playlists:choices,truncated})
}
#[tauri::command]
pub async fn music_play_album(playlist_id:String,index:u64)->Result<(),String>{
  if playlist_id.is_empty()||playlist_id.len()>64||!playlist_id.chars().all(|c|c.is_ascii_alphanumeric()||c=='-'||c=='_')||index>100000{return Err("Album invalide".into());}
  client()?.post(format!("{BASE}/player/play/{playlist_id}/{index}")).send().await.map_err(|_|"Lecteur indisponible")?.error_for_status().map_err(|_|"Impossible de lire cet album")?;Ok(())
}

// The webview never supplies a URL or an HTTP method. No redirects, no proxies.
#[tauri::command]
pub async fn music_request(action: String, value: Option<f64>) -> Result<Value, String> {
    if action == "launch" {
        let executable=std::path::Path::new(r"C:\Program Files\foobar2000\foobar2000.exe");
        if !executable.is_file(){return Err("foobar2000 est introuvable dans C:\\Program Files\\foobar2000".into());}
        std::process::Command::new(executable).arg("/hide").spawn().map_err(|_|"Impossible d’ouvrir foobar2000".to_string())?;
        return Ok(Value::Null);
    }
    let client = reqwest::Client::builder().timeout(Duration::from_secs(3))
        .redirect(reqwest::redirect::Policy::none()).no_proxy().build().map_err(|e|e.to_string())?;
    let base = "http://127.0.0.1:8880/api";
    let request = match action.as_str() {
        "status" => client.get(format!("{base}/player")).query(&[("columns", "%title%,%artist%,%album%,%album artist%")]),
        "artwork" => client.get(format!("{base}/artwork/current")),
        "play-pause" | "next" | "previous" => client.post(format!("{base}/player/{action}")),
        "seek" => {
            let n=value.filter(|n|n.is_finite() && *n>=0.0 && *n<=86400.0).ok_or("Position invalide")?;
            client.post(format!("{base}/player")).json(&json!({"position":n}))
        },
        "volume" => {
            let n=value.filter(|n|n.is_finite() && *n>=-100.0 && *n<=0.0).ok_or("Volume invalide")?;
            client.post(format!("{base}/player")).json(&json!({"volume":n}))
        },
        _ => return Err("Action musicale non autorisée".into()),
    };
    let response=request.send().await.map_err(|_|"foobar2000 indisponible sur 127.0.0.1:8880".to_string())?;
    if !response.status().is_success() { return Err(format!("Le lecteur a répondu HTTP {}",response.status())); }
    if action=="artwork" {
        let mime=response.headers().get("content-type").and_then(|h|h.to_str().ok()).unwrap_or("").split(';').next().unwrap_or("").to_owned();
        if !["image/jpeg","image/png","image/webp"].contains(&mime.as_str()) { return Err("Format de pochette non pris en charge".into()); }
        if response.content_length().unwrap_or(0)>5_000_000 {return Err("Pochette trop volumineuse".into());}
        let bytes=response.bytes().await.map_err(|e|e.to_string())?;
        if bytes.len()>5_000_000 {return Err("Pochette trop volumineuse".into());}
        return Ok(json!(format!("data:{mime};base64,{}",STANDARD.encode(bytes))));
    }
    if action=="status" {return response.json().await.map_err(|_|"Réponse musicale invalide".into());}
    Ok(Value::Null)
}
