[CmdletBinding()]
param(
  [switch]$SkipSmokeTests,
  [int]$TimeoutSeconds = 90
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-PidsByPort {
  param([Parameter(Mandatory = $true)][int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  if (-not $connections) {
    return @()
  }

  return @($connections)
}

function Stop-PortListeners {
  param([Parameter(Mandatory = $true)][int]$Port)

  $pids = Get-PidsByPort -Port $Port
  foreach ($processId in $pids) {
    try {
      $proc = Get-Process -Id $processId -ErrorAction Stop
      Write-Host "[dev-up] Stopping PID $processId ($($proc.ProcessName)) on port $Port"
      Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
      Write-Host "[dev-up] Could not stop PID $processId on port ${Port}: $($_.Exception.Message)"
    }
  }
}

function Wait-Http {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][int]$TimeoutSec
  )

  $start = Get-Date
  while (((Get-Date) - $start).TotalSeconds -lt $TimeoutSec) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        return $true
      }
    } catch {
      # Keep waiting until timeout.
    }

    Start-Sleep -Milliseconds 700
  }

  return $false
}

function Resolve-PythonLauncher {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) {
    return 'python'
  }

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) {
    return 'py'
  }

  throw 'Python launcher was not found. Install Python or run frontend with another static server.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot 'backend'
$frontendPath = Join-Path $repoRoot 'frontend'
$runtimeDir = Join-Path $repoRoot '.runtime'
$stateFile = Join-Path $runtimeDir 'dev-processes.json'
$smokeFile = Join-Path $runtimeDir 'dev-smoke.json'

if (-not (Test-Path $backendPath)) {
  throw "Backend folder not found at: $backendPath"
}
if (-not (Test-Path $frontendPath)) {
  throw "Frontend folder not found at: $frontendPath"
}

New-Item -Path $runtimeDir -ItemType Directory -Force | Out-Null

Write-Host '[dev-up] Cleaning previous listeners on ports 3000 and 5173...'
Stop-PortListeners -Port 3000
Stop-PortListeners -Port 5173

$backendCmd = "npm --prefix `"$backendPath`" run start:dev"
$backendProc = Start-Process -FilePath 'powershell' -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $backendCmd -PassThru
Write-Host "[dev-up] Backend launched. PID=$($backendProc.Id)"

$pythonLauncher = Resolve-PythonLauncher
if ($pythonLauncher -eq 'python') {
  $frontendCmd = "python -m http.server 5173 --directory `"$frontendPath`""
} else {
  $frontendCmd = "py -m http.server 5173 --directory `"$frontendPath`""
}

$frontendProc = Start-Process -FilePath 'powershell' -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $frontendCmd -PassThru
Write-Host "[dev-up] Frontend launched. PID=$($frontendProc.Id)"

$state = [ordered]@{
  startedAt = (Get-Date).ToString('o')
  backend = [ordered]@{
    pid = $backendProc.Id
    command = $backendCmd
    url = 'http://localhost:3000'
  }
  frontend = [ordered]@{
    pid = $frontendProc.Id
    command = $frontendCmd
    url = 'http://localhost:5173'
  }
}
$state | ConvertTo-Json -Depth 6 | Out-File -FilePath $stateFile -Encoding utf8

$backendReady = Wait-Http -Url 'http://localhost:3000/health' -TimeoutSec $TimeoutSeconds
$frontendReady = Wait-Http -Url 'http://localhost:5173' -TimeoutSec $TimeoutSeconds

if (-not $backendReady -or -not $frontendReady) {
  $message = "[dev-up] Startup timeout. backendReady=$backendReady frontendReady=$frontendReady"
  Write-Error $message
}

Write-Host '[dev-up] Services are reachable.'

if (-not $SkipSmokeTests) {
  Write-Host '[dev-up] Running smoke tests...'
  $smoke = [ordered]@{
    timestamp = (Get-Date).ToString('o')
    health = $null
    login = $null
    equipos = $null
  }

  try {
    $health = Invoke-WebRequest -Uri 'http://localhost:3000/health' -UseBasicParsing -TimeoutSec 10
    $smoke.health = [ordered]@{ status = [int]$health.StatusCode; ok = $health.StatusCode -eq 200 }
  } catch {
    $smoke.health = [ordered]@{ status = 0; ok = $false; error = $_.Exception.Message }
  }

  $loginBody = @{ cedula = '10101010'; password = '123456'; rutaNumero = 'R1' } | ConvertTo-Json
  try {
    $login = Invoke-WebRequest -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody -UseBasicParsing -TimeoutSec 10
    $smoke.login = [ordered]@{ status = [int]$login.StatusCode; ok = ($login.StatusCode -eq 201 -or $login.StatusCode -eq 200) }
  } catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode.value__ }
    $smoke.login = [ordered]@{ status = $status; ok = $false; error = $_.Exception.Message }
  }

  try {
    $equipos = Invoke-WebRequest -Uri 'http://localhost:3000/equipos' -UseBasicParsing -TimeoutSec 10
    $smoke.equipos = [ordered]@{ status = [int]$equipos.StatusCode; ok = $equipos.StatusCode -eq 200 }
  } catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode.value__ }
    $smoke.equipos = [ordered]@{ status = $status; ok = $false; error = $_.Exception.Message }
  }

  $smoke | ConvertTo-Json -Depth 6 | Out-File -FilePath $smokeFile -Encoding utf8
  Write-Host "[dev-up] Smoke report written to: $smokeFile"
}

Write-Host '[dev-up] Done.'
Write-Host '[dev-up] Backend:  http://localhost:3000/health'
Write-Host '[dev-up] Frontend: http://localhost:5173/'
