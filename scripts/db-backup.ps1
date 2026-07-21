# Nightly-style backup of the yildirim database (custom format, compressed).
# Keeps the newest 14 dumps. On the VPS the same pg_dump line runs in cron and
# ships to R2 (plan §7); locally it lands in .tools\backups.
$root = Split-Path $PSScriptRoot -Parent
$bin = "$root\.tools\pgsql\bin"
$dir = "$root\.tools\backups"
New-Item -ItemType Directory -Force $dir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = "$dir\yildirim-$stamp.dump"
$env:PGPASSWORD = "postgres"

& "$bin\pg_dump.exe" -h localhost -U postgres -d yildirim -F c -f $file
if ($LASTEXITCODE -ne 0) { Write-Error "pg_dump failed"; exit 1 }
Write-Output "backup: $file ($([math]::Round((Get-Item $file).Length/1KB,1)) KB)"

# retention: newest 14
Get-ChildItem $dir -Filter "yildirim-*.dump" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 14 |
  Remove-Item -Force -Confirm:$false
