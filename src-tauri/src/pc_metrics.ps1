$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$os=Get-CimInstance Win32_OperatingSystem
$cpu=Get-CimInstance Win32_Processor
$load=($cpu | Measure-Object LoadPercentage -Average).Average
$temperature=$null
$monitorConnected=$false
$gpuTemperature=$null
$cpuPower=$null
function SensorNumber($sensor) {
  if ($null -eq $sensor) { return $null }
  $raw=[string]$sensor.RawValue
  if ($raw -match '(-?\d+(?:[.,]\d+)?)') { return [double]::Parse($matches[1].Replace(',','.'),[Globalization.CultureInfo]::InvariantCulture) }
  return $null
}
function FlattenSensors($node) {
  if($node.SensorId) { $node }
  foreach($child in $node.Children) { FlattenSensors $child }
}
try {
  $request=[Net.HttpWebRequest]::Create('http://127.0.0.1:8085/data.json')
  $request.Proxy=$null; $request.Timeout=2000; $request.AllowAutoRedirect=$false
  $response=$request.GetResponse()
  try { $reader=[IO.StreamReader]::new($response.GetResponseStream()); $tree=$reader.ReadToEnd()|ConvertFrom-Json } finally { $response.Close() }
  $sensors=@(FlattenSensors $tree)
  $monitorConnected=$true
  $cpuSensors=@($sensors|Where-Object { $_.SensorId -match '^/(amdcpu|intelcpu)/' })
  $temperature=SensorNumber ($cpuSensors|Where-Object { $_.Type -eq 'Temperature' -and $_.Text -match 'Package|Tctl|Tdie' }|Select-Object -First 1)
  if($null -eq $temperature) {$temperature=SensorNumber ($cpuSensors|Where-Object Type -eq 'Temperature'|Select-Object -First 1)}
  $cpuLoad=SensorNumber ($cpuSensors|Where-Object { $_.Type -eq 'Load' -and $_.Text -eq 'CPU Total' }|Select-Object -First 1)
  if($null -ne $cpuLoad){$load=$cpuLoad}
  $cpuPower=SensorNumber ($cpuSensors|Where-Object { $_.Type -eq 'Power' -and $_.Text -match 'Package' }|Select-Object -First 1)
  $gpuTemperature=SensorNumber ($sensors|Where-Object { $_.Type -eq 'Temperature' -and $_.SensorId -match '^/gpu-' -and $_.Text -match 'Core' }|Select-Object -First 1)
} catch {}
if($null -eq $temperature) {
foreach($namespace in @('root\LibreHardwareMonitor','root\OpenHardwareMonitor')) {
  try {
    $sensors=Get-CimInstance -Namespace $namespace -ClassName Sensor -ErrorAction Stop | Where-Object { $_.SensorType -eq 'Temperature' -and ($_.Identifier -match '/(intelcpu|amdcpu|cpu)/' -or $_.Name -match 'CPU Package|CPU Core|CPU Die') }
    if($sensors){$temperature=($sensors|Measure-Object Value -Maximum).Maximum;break}
  } catch {}
}
}
$ping=$null
try {$reply=(New-Object Net.NetworkInformation.Ping).Send($env:FOCUS_PING_HOST,1000);if($reply.Status -eq 'Success'){$ping=$reply.RoundtripTime}}catch{}
@{monitorConnected=$monitorConnected;gpuTemperatureC=$gpuTemperature;cpuPowerW=$cpuPower;cpuPercent=$load;cpuName=($cpu|Select-Object -First 1).Name;ramUsedGb=[math]::Round(($os.TotalVisibleMemorySize-$os.FreePhysicalMemory)/1MB,1);ramTotalGb=[math]::Round($os.TotalVisibleMemorySize/1MB,1);temperatureC=$temperature;pingMs=$ping;uptimeHours=[math]::Round(((Get-Date)-$os.LastBootUpTime).TotalHours,1)}|ConvertTo-Json -Compress
