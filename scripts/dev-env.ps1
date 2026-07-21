# Dot-source this to use the project-local toolchain in any shell:
#   . D:\Yildirim\scripts\dev-env.ps1
$root = Split-Path $PSScriptRoot -Parent
$env:PATH = "$root\.tools\node;$root\.tools\pgsql\bin;$env:PATH"
$env:PGDATA = "$root\.tools\pgdata"
