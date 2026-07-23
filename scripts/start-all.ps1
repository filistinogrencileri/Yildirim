# Starts Yildirim's local components in the right order: Postgres, then API.
# The web app is managed via preview_start in Claude Code, so it's not included here.
param([switch]$Quiet)

function Write-Step($msg) {
  if (-not $Quiet) { Write-Host "==> $msg" -ForegroundColor Cyan }
}

Write-Step "Checking PostgreSQL..."
$pg = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if (-not $pg) {
  Write-Step "Starting PostgreSQL..."
  & "$PSScriptRoot\db.ps1" start
} else {
  Write-Step "PostgreSQL already running."
}

Write-Step "Checking API..."
$api = $null
try { $api = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/health" -TimeoutSec 3 -ErrorAction Stop } catch {}
if ($api -and $api.status -eq "ok") {
  Write-Step "API already running."
} else {
  Write-Step "Starting API..."
  & "$PSScriptRoot\api-start.ps1"
  Start-Sleep -Seconds 8
}

Write-Step "Final check..."
$ok = $false
for ($i = 0; $i -lt 6; $i++) {
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/health" -TimeoutSec 3 -ErrorAction Stop
    if ($health.status -eq "ok") { $ok = $true; break }
  } catch {}
  Start-Sleep -Seconds 3
}

if ($ok) {
  Write-Host "`nAll set: Postgres + API running (http://localhost:4000)" -ForegroundColor Green
  Write-Host "Start the web app now if it isn't running already." -ForegroundColor Green
} else {
  Write-Host "`nAPI failed to start - check .tools\api.err.log and .tools\api.log" -ForegroundColor Red
  exit 1
}
