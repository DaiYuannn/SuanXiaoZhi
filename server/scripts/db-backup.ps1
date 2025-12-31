param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutDir = "backups"
)

function Get-SqlitePathFromUrl([string]$url) {
  if (-not $url) { return $null }
  if ($url.StartsWith('file:')) { $p = $url.Substring(5) }
  elseif ($url.StartsWith('sqlite:')) { $p = $url.Substring(7) }
  else { return $null }
  $p = $p.Split('?')[0]
  if ([System.IO.Path]::IsPathRooted($p)) { return $p }
  return (Join-Path (Get-Location) $p)
}

$effectiveUrl = $DatabaseUrl
if (-not $effectiveUrl) { $effectiveUrl = 'file:./data/prod.db' }
$path = Get-SqlitePathFromUrl $effectiveUrl
if (-not $path) {
  Write-Error "DATABASE_URL is not a sqlite file URL (file: or sqlite:)"
  exit 1
}

if (-not (Test-Path $path)) {
  Write-Host "Skip: SQLite file not found: $path"
  exit 0
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$base = [System.IO.Path]::GetFileNameWithoutExtension($path)
$ext = [System.IO.Path]::GetExtension($path)
$dest = Join-Path $OutDir ("$base-$ts$ext")

Copy-Item -Path $path -Destination $dest -Force
Write-Host "Backup created: $dest"