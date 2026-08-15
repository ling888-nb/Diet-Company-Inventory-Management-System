@echo off
setlocal
cd /d "%~dp0\.."

set "BACKEND_PORT=8080"

echo ============================================================
echo LAN Inventory Backend - Foreground Startup
echo ============================================================
echo Project folder: %CD%
echo.

echo [1/4] Python check
where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python was not found in PATH.
  pause
  exit /b 1
)
python --version
echo.

echo [2/4] Backend dependency check
python -c "import fastapi, uvicorn, bcrypt, openpyxl" >nul 2>nul
if errorlevel 1 (
  echo ERROR: Backend dependencies are missing.
  echo Next step: run backend\install_backend_offline.bat
  pause
  exit /b 1
)
echo OK: Backend dependencies are ready.
echo.

echo [3/4] Port and data folder
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort %BACKEND_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo ERROR: Port %BACKEND_PORT% is already in use.
  echo Close the old backend process or change LAN_INVENTORY_PORT.
  pause
  exit /b 1
)
if not exist "backend\data" mkdir "backend\data"
if not exist "backend\backups" mkdir "backend\backups"
echo Data folder: %CD%\backend\data
echo Backup folder: %CD%\backend\backups
echo.

echo [4/4] Backend startup
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress); if (-not $ip) { $ip='127.0.0.1' }; Write-Host ('Local API/Web: http://127.0.0.1:%BACKEND_PORT%'); Write-Host ('LAN API/Web:   http://' + $ip + ':%BACKEND_PORT%')"
echo.
echo Backend is starting in this window. Keep this window open.
echo Press Ctrl+C to stop the backend.
echo.
python backend\app.py
pause
