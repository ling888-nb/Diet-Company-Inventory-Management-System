$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ''
Write-Host 'Inventory system quick start'
Write-Host "Project: $projectRoot"
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js is not installed or is not available in PATH.' -ForegroundColor Red
  Write-Host 'Please install Node.js 16+ and run start.bat again.'
  Read-Host 'Press Enter to exit'
  exit 1
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  Write-Host 'npm is not installed or is not available in PATH.' -ForegroundColor Red
  Read-Host 'Press Enter to exit'
  exit 1
}

if (-not (Test-Path (Join-Path $projectRoot 'node_modules'))) {
  Write-Host 'Dependencies were not found. Running npm install...' -ForegroundColor Yellow
  & $npmCommand.Source install
}

Write-Host ''
Write-Host 'Starting development server...' -ForegroundColor Green
Write-Host 'Press Ctrl+C in this window to stop it.'
Write-Host ''

& $npmCommand.Source run dev
