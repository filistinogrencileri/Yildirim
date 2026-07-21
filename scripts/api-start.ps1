# Starts the built API (dist/main.js) as a detached background process.
# Logs: .tools\api.log / api.err.log · PID: .tools\api.pid
$root = Split-Path $PSScriptRoot -Parent
$env:PATH = "$root\.tools\node;$env:PATH"

$pidFile = "$root\.tools\api.pid"
if (Test-Path $pidFile) {
  $old = Get-Content $pidFile
  if (Get-Process -Id $old -ErrorAction SilentlyContinue) {
    Stop-Process -Id $old -Force -Confirm:$false
  }
}

$p = Start-Process -FilePath "$root\.tools\node\node.exe" -ArgumentList "dist/main.js" `
  -WorkingDirectory "$root\apps\api" -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput "$root\.tools\api.log" -RedirectStandardError "$root\.tools\api.err.log"
Set-Content -Path $pidFile -Value $p.Id -Encoding ascii
Write-Output "API started (PID $($p.Id)) on port 4000"
