$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$index = Join-Path $root 'index.html'
$package = Join-Path $root 'package.json'

if (-not (Test-Path -LiteralPath $package -PathType Leaf)) {
  throw "package.json was not found. Open the inner project folder containing package.json."
}
if (Test-Path -LiteralPath $index -PathType Container) {
  Write-Host "Found a DIRECTORY named index.html. Vite requires a FILE here." -ForegroundColor Red
  Write-Host "Inspect its contents and rename it aside; do not delete it blindly:" -ForegroundColor Yellow
  Write-Host "  Get-ChildItem -LiteralPath '.\index.html' -Force"
  throw "Project preflight failed: index.html is a directory."
}
if (-not (Test-Path -LiteralPath $index -PathType Leaf)) {
  throw "index.html file is missing from the project root. Re-extract the project ZIP into a new folder."
}
$file = Get-Item -LiteralPath $index
if ($file.Length -lt 100) {
  throw "index.html is unexpectedly small ($($file.Length) bytes). Restore it from the project ZIP."
}
Write-Host "Project preflight passed." -ForegroundColor Green
Write-Host "index.html is a regular file ($($file.Length) bytes)."
