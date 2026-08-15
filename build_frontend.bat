@echo off
cd /d "%~dp0"
echo Building frontend static files into dist ...
cmd /c npm run build
if errorlevel 1 (
  echo(
  echo Frontend build failed. Please make sure node_modules is installed.
  pause
  exit /b 1
)
echo(
echo Build complete. Run backend\start_backend.bat to serve both web pages and API.
pause
