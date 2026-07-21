param([ValidateSet("start", "stop", "status")][string]$Action = "status")
$root = Split-Path $PSScriptRoot -Parent
$pgctl = "$root\.tools\pgsql\bin\pg_ctl.exe"
$data = "$root\.tools\pgdata"
& $pgctl -D $data -l "$root\.tools\pg.log" -o "-p 5432" $Action
