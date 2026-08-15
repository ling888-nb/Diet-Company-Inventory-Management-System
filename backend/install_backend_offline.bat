@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Backend Dependency Installer - Offline Mode
echo ============================================================
echo Backend folder: %CD%
echo.

echo [1/4] Python check
where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python was not found in PATH.
  echo Please install Python 3.9+ and enable "Add Python to PATH".
  pause
  exit /b 1
)
python --version
python -m pip --version
echo.

echo [2/4] Offline package folder check
if not exist "offline_packages" (
  echo ERROR: offline_packages folder was not found.
  echo Next step: run prepare_offline_packages.bat on an internet-connected PC first.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$count=(Get-ChildItem -Path 'offline_packages' -Filter '*.whl' -ErrorAction SilentlyContinue | Measure-Object).Count; Write-Host ('Wheel files found: ' + $count); if ($count -eq 0) { exit 1 }"
if errorlevel 1 (
  echo ERROR: No wheel files were found in backend\offline_packages.
  echo Next step: run prepare_offline_packages.bat on an internet-connected PC first.
  pause
  exit /b 1
)
echo.

echo [3/4] Installing backend dependencies
python -m pip install --no-index --find-links "%CD%\offline_packages" -r requirements.txt
if errorlevel 1 (
  echo(
  echo ERROR: Install failed. Please check Python version and wheel compatibility.
  pause
  exit /b 1
)
echo.

echo [4/4] Import verification
python -c "import fastapi, uvicorn, bcrypt, openpyxl; print('Backend dependencies verified.')"
if errorlevel 1 (
  echo ERROR: Dependencies were installed but import verification failed.
  pause
  exit /b 1
)
echo.
echo Backend dependencies are installed and ready.
echo Next step: run ..\start_lan_system.bat or start_backend.bat
pause
