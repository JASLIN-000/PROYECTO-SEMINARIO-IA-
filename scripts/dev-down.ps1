[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Stop-PortListeners {
  param([Parameter(Mandatory = $true)][int]$Port)

  $pids = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  if (-not $pids) {
    Write-Host "[dev-down] No listeners on port $Port"
    return
  }

  foreach ($processId in @($pids)) {
    try {
      $proc = Get-Process -Id $processId -ErrorAction Stop
      Write-Host "[dev-down] Stopping PID $processId ($($proc.ProcessName)) on port $Port"
      Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
      Write-Host "[dev-down] Could not stop PID $processId on port ${Port}: $($_.Exception.Message)"
    }
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$stateFile = Join-Path (Join-Path $repoRoot '.runtime') 'dev-processes.json'

if (Test-Path $stateFile) {
  try {
    $state = Get-Content $stateFile -Raw | ConvertFrom-Json
    foreach ($target in @($state.backend, $state.frontend)) {
      if ($target -and $target.pid) {
        try {
          $proc = Get-Process -Id ([int]$target.pid) -ErrorAction Stop
          Write-Host "[dev-down] Stopping tracked PID $($target.pid) ($($proc.ProcessName))"
          Stop-Process -Id ([int]$target.pid) -Force -ErrorAction Stop
        } catch {
          Write-Host "[dev-down] Tracked PID $($target.pid) is not running"
        }
      }
    }
  } catch {
    Write-Host "[dev-down] Could not parse state file: $($_.Exception.Message)"
  }
}

Stop-PortListeners -Port 3000
Stop-PortListeners -Port 5173

Write-Host '[dev-down] Done.'
