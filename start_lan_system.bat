@echo off
setlocal
cd /d "%~dp0"

set "BACKEND_PORT=8080"
set "FRONTEND_PORT=3000"
set "BACKEND_LOG=backend\backend-service.log"
set "BACKEND_ERR=backend\backend-service.err.log"
set "FRONTEND_LOG=frontend-service.log"
set "FRONTEND_ERR=frontend-service.err.log"
if exist "dist\index.html" (
  set "FRONTEND_MODE=dist"
) else (
  set "FRONTEND_MODE=dev"
)

echo ============================================================
echo LAN Inventory System - Detailed Startup
echo ============================================================
echo Project folder: %CD%
echo.

echo [1/7] Backend dependency check
where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python was not found in PATH.
  echo Please install Python 3.9+ and enable "Add Python to PATH".
  pause
  exit /b 1
)
python --version
python -c "import fastapi, uvicorn, bcrypt, openpyxl" >nul 2>nul
if errorlevel 1 (
  echo ERROR: Backend dependencies are missing.
  echo Next step: run backend\install_backend_offline.bat
  echo If offline_packages is empty, run backend\prepare_offline_packages.bat on an internet-connected PC first.
  pause
  exit /b 1
)
echo OK: Backend dependencies are ready.
for /f "usebackq delims=" %%i in (`python -c "import socket; ips=[]; [ips.append(i[4][0]) for i in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET) if (i[4][0].startswith(('10.','192.168.')) or (i[4][0].startswith('172.') and 16 <= int(i[4][0].split('.')[1]) <= 31)) and not i[4][0].startswith(('192.168.48.','192.168.192.'))]; print(ips[0] if ips else '127.0.0.1')"`) do set "LAN_IP=%%i"
if not defined LAN_IP set "LAN_IP=127.0.0.1"
echo.

echo [2/7] Frontend mode check
if "%FRONTEND_MODE%"=="dist" (
  echo OK: Production dist found. Other computers and mobile devices only need to open port %BACKEND_PORT%.
) else (
  echo NOTICE: dist was not found, falling back to Vite development mode on port %FRONTEND_PORT%.
  where node >nul 2>nul
  if errorlevel 1 (
    echo ERROR: Node.js was not found in PATH.
    echo Run build_frontend.bat on a configured server, or copy a complete dist folder here.
    pause
    exit /b 1
  )
  where npm >nul 2>nul
  if errorlevel 1 (
    echo ERROR: npm was not found in PATH.
    pause
    exit /b 1
  )
  node --version
  cmd /c npm --version
  if not exist "node_modules" (
    echo ERROR: node_modules folder was not found.
    echo Please install frontend dependencies on an internet-connected PC and copy node_modules here.
    pause
    exit /b 1
  )
  echo OK: Frontend dependencies are ready.
)
echo.

echo [3/7] Port check
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort %BACKEND_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  set "BACKEND_PORT_BUSY=0"
  echo OK: Backend port %BACKEND_PORT% is free.
) else (
  set "BACKEND_PORT_BUSY=1"
  echo NOTICE: Backend port %BACKEND_PORT% is already in use. Backend may already be running.
)
if "%FRONTEND_MODE%"=="dist" (
  set "FRONTEND_PORT_BUSY=0"
  echo OK: Frontend dev port is not needed in dist mode.
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort %FRONTEND_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
  if errorlevel 1 (
    set "FRONTEND_PORT_BUSY=0"
    echo OK: Frontend port %FRONTEND_PORT% is free.
  ) else (
    set "FRONTEND_PORT_BUSY=1"
    echo NOTICE: Frontend port %FRONTEND_PORT% is already in use. Frontend may already be running.
  )
)
echo.

echo [4/7] Backend startup
if "%BACKEND_PORT_BUSY%"=="1" (
  echo SKIP: Backend was not started because port %BACKEND_PORT% is busy.
) else (
  echo Starting backend in background...
  echo Backend log: %BACKEND_LOG%
  echo Backend error log: %BACKEND_ERR%
  start "LAN Inventory Backend" /min cmd /c "python backend\app.py 1>%BACKEND_LOG% 2>%BACKEND_ERR%"
)
echo.

echo [5/7] Frontend startup
if "%FRONTEND_MODE%"=="dist" (
  echo SKIP: dist mode uses backend port %BACKEND_PORT% to serve both webpage and API.
) else if "%FRONTEND_PORT_BUSY%"=="1" (
  echo SKIP: Frontend was not started because port %FRONTEND_PORT% is busy.
) else (
  echo Starting frontend dev server in background...
  echo Frontend log: %FRONTEND_LOG%
  echo Frontend error log: %FRONTEND_ERR%
  start "LAN Inventory Frontend" /min cmd /c "npm run dev -- --host 0.0.0.0 --port %FRONTEND_PORT% 1>%FRONTEND_LOG% 2>%FRONTEND_ERR%"
)
echo.

echo [6/7] Service health check
echo Waiting a few seconds for services to open...
timeout /t 4 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { if ((Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%BACKEND_PORT%/api/health -TimeoutSec 3).StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo NOTICE: Backend health check is not ready yet.
  echo Check %BACKEND_ERR% and %BACKEND_LOG% if the API cannot open.
) else (
  echo OK: Backend API is responding.
)
if "%FRONTEND_MODE%"=="dist" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { if ((Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%BACKEND_PORT% -TimeoutSec 3).StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
  if errorlevel 1 (
    echo NOTICE: Web page on backend port is not ready yet.
  ) else (
    echo OK: Web page is responding on backend port.
  )
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { if ((Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%FRONTEND_PORT% -TimeoutSec 3).StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
  if errorlevel 1 (
    echo NOTICE: Frontend health check is not ready yet.
    echo Check %FRONTEND_ERR% and %FRONTEND_LOG% if the web page cannot open.
  ) else (
    echo OK: Frontend page is responding.
  )
)
echo.

echo [7/7] Access addresses
if "%FRONTEND_MODE%"=="dist" (
  echo Local web:   http://127.0.0.1:%BACKEND_PORT%
  echo LAN web:     http://%LAN_IP%:%BACKEND_PORT%
  echo Backend API: http://%LAN_IP%:%BACKEND_PORT%/api
) else (
  echo Local web:   http://127.0.0.1:%FRONTEND_PORT%
  echo LAN web:     http://%LAN_IP%:%FRONTEND_PORT%
  echo Backend API: http://%LAN_IP%:%BACKEND_PORT%
)
echo.
echo Startup sequence finished.
echo Closing this window will not stop background services.
echo To stop services, use Task Manager and end python.exe/node.exe, or restart the PC.
echo.
pause
