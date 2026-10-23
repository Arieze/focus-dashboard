$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$group=$env:FOCUS_SHORTCUT_GROUP|ConvertFrom-Json
$action=$env:FOCUS_SHORTCUT_ACTION
$sessionPath=Join-Path $env:FOCUS_SHORTCUT_DIR ($group.id+'.json')
$entries=@()
$messages=[Collections.Generic.List[string]]::new()
if(Test-Path -LiteralPath $sessionPath) {$entries=@(Get-Content -LiteralPath $sessionPath -Raw|ConvertFrom-Json)}
$shell=New-Object -ComObject Shell.Application
function Alive($entry) {
  try {
    if($entry.kind -eq 'folder') {return @($shell.Windows()|Where-Object { [string]$_.HWND -eq [string]$entry.handle -and $_.Document.Folder.Self.Path -eq $entry.target }).Count -gt 0}
    $process=Get-Process -Id $entry.processId -ErrorAction SilentlyContinue
    return $process -and $process.StartTime.ToUniversalTime().Ticks.ToString() -eq $entry.started
  } catch {return $false}
}
function Remember($process) {
  if($process -and -not $process.HasExited) {return @{kind='process';processId=$process.Id;started=$process.StartTime.ToUniversalTime().Ticks.ToString()}}
}
$entries=@($entries|Where-Object {Alive $_})
if($action -eq 'open' -and $entries.Count -eq 0) {
  $urls=@($group.items|Where-Object type -eq 'url'|ForEach-Object target)
  if($urls.Count) {
    try {
      $brave='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'
      if(-not (Test-Path -LiteralPath $brave)) {throw 'Brave est introuvable.'}
      $profile=Join-Path $env:FOCUS_SHORTCUT_DIR ('brave-'+$group.id)
      $arguments=@(('--user-data-dir="'+$profile+'"'),'--no-first-run','--no-default-browser-check','--new-window')
      foreach($url in $urls){$arguments+='"'+([uri]$url).AbsoluteUri.Replace('"','%22')+'"'}
      $process=Start-Process -FilePath $brave -ArgumentList $arguments -PassThru
      $entry=Remember $process;if($entry){$entries+=,$entry}
    }catch{$messages.Add($_.Exception.Message)}
  }
  foreach($item in $group.items|Where-Object type -ne 'url') {
    try {
      $target=Get-Item -LiteralPath $item.target
      if($item.type -eq 'folder') {
        if(-not $target.PSIsContainer){throw 'Choisissez un dossier.'}
        $before=@($shell.Windows()|ForEach-Object {[string]$_.HWND})
        $shell.Open($target.FullName)
        Start-Sleep -Milliseconds 700
        $found=$false
        foreach($window in $shell.Windows()) {
          if($before -notcontains [string]$window.HWND -and $window.Document.Folder.Self.Path -eq $target.FullName) {
            $entries+=,@{kind='folder';handle=[string]$window.HWND;target=$target.FullName};$found=$true
          }
        }
        if(-not $found){$messages.Add('Dossier ouvert dans une fenêtre existante : fermeture manuelle.')}
      } else {
        if($target.PSIsContainer){throw 'Choisissez un fichier.'}
        if($item.type -eq 'app' -and $target.Extension -ne '.exe'){throw 'Choisissez une application .exe.'}
        $process=Start-Process -FilePath $target.FullName -WorkingDirectory $target.DirectoryName -PassThru
        Start-Sleep -Milliseconds 400
        $entry=Remember $process
        if($entry){$entries+=,$entry}else{$messages.Add($target.Name+' : ouvert dans une application existante, fermeture manuelle.')}
      }
    } catch {$messages.Add($_.Exception.Message)}
    ConvertTo-Json -InputObject @($entries) -Depth 5 | Set-Content -LiteralPath $sessionPath -Encoding UTF8
  }
} elseif($action -eq 'close') {
  foreach($entry in $entries) {
    try {
      if($entry.kind -eq 'folder') {
        foreach($window in $shell.Windows()){if([string]$window.HWND -eq [string]$entry.handle -and $window.Document.Folder.Self.Path -eq $entry.target){$window.Quit()}}
      } else {
        $process=Get-Process -Id $entry.processId -ErrorAction SilentlyContinue
        if($process -and (Alive $entry)) {
          if(-not $process.CloseMainWindow()){$messages.Add($process.ProcessName+' : fermeture manuelle nécessaire.')}
        }
      }
    } catch {$messages.Add($_.Exception.Message)}
  }
  Start-Sleep -Milliseconds 500
  $entries=@($entries|Where-Object {Alive $_})
  if($entries.Count){$messages.Add('Certaines fenêtres restent ouvertes : terminez leur fermeture ou enregistrez les documents.')}
}
ConvertTo-Json -InputObject @($entries) -Depth 5 | Set-Content -LiteralPath $sessionPath -Encoding UTF8
@{active=($entries.Count -gt 0);messages=@($messages.ToArray())}|ConvertTo-Json -Compress
