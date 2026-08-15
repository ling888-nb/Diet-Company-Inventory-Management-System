@echo off
setlocal
cd /d "%~dp0\.."

set "BACKEND_PORT=8080"
set "BACKEND_LOG=backend\backend-service.log"
set "BACKEND_ERR=backend\backend-service.err.log"

echo ============================================================
echo LAN Inventory Backend - Background Startup
echo ============================================================
echo Project folder: %CD%
echo.

echo [1/5] Python check
where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python was not found in PATH.
  pause
  exit /b 1
)
python --version
echo.

echo [2/5] Backend dependency check
python -c "import fastapi, uvicorn, bcrypt, openpyxl" >nul 2>nul
if errorlevel 1 (
  echo ERROR: Backend dependencies are missing.
  echo Next step: run backend\install_backend_offline.bat
  pause
  exit /b 1
)
echo OK: Backend dependencies are ready.
echo.

echo [3/5] Port check
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort %BACKEND_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo NOTICE: Port %BACKEND_PORT% is already in use. Backend may already be running.
  goto addresses
)
echo OK: Backend port %BACKEND_PORT% is free.
echo.

echo [4/5] Backend startup
if not exist "backend\data" mkdir "backend\data"
if not exist "backend\backups" mkdir "backend\backups"
echo Backend log: %BACKEND_LOG%
echo Backend error log: %BACKEND_ERR%
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -WindowStyle Hidden -FilePath 'cmd.exe' -ArgumentList '/c python backend\app.py 1>%BACKEND_LOG% 2>%BACKEND_ERR%' -WorkingDirectory '%CD%'"
timeout /t 3 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { if ((Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%BACKEND_PORT%/api/health -TimeoutSec 3).StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo NOTICE: Backend is not responding yet. Check logs if it does not open.
) else (
  echo OK: Backend API is responding.
)
echo.

:addresses
echo [5/5] Access addresses
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress); if (-not $ip) { $ip='127.0.0.1' }; Write-Host ('Local API/Web: http://127.0.0.1:%BACKEND_PORT%'); Write-Host ('LAN API/Web:   http://' + $ip + ':%BACKEND_PORT%')"
echo.
echo Backend background startup finished.
echo Closing this window will not stop the backend.
pause
