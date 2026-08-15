@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Backend Dependency Package Builder - Internet Mode
echo ============================================================
echo Backend folder: %CD%
echo.

echo [1/4] Python and pip check
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

echo [2/4] Offline package folder
if not exist "offline_packages" mkdir "offline_packages"
echo Target folder: %CD%\offline_packages
echo.

echo [3/4] Downloading backend dependency wheels
echo This step needs internet access. The script will try several package sources.
echo.

echo Source 1/3: Official PyPI
python -m pip download -r requirements.txt -d "%CD%\offline_packages" --only-binary=:all: --retries 8 --timeout 60 --trusted-host pypi.org --trusted-host files.pythonhosted.org
if not errorlevel 1 goto download_ok

echo.
echo Source 1 failed. Trying Source 2/3: Tsinghua mirror
python -m pip download -r requirements.txt -d "%CD%\offline_packages" --only-binary=:all: --retries 8 --timeout 60 -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
if not errorlevel 1 goto download_ok

echo.
echo Source 2 failed. Trying Source 3/3: Aliyun mirror
python -m pip download -r requirements.txt -d "%CD%\offline_packages" --only-binary=:all: --retries 8 --timeout 60 -i https://mirrors.aliyun.com/pypi/simple --trusted-host mirrors.aliyun.com
if not errorlevel 1 goto download_ok

echo(
echo ERROR: Download failed from all package sources.
echo Try these checks:
echo 1. Make sure this computer can open https://pypi.org in a browser.
echo 2. If the company network blocks SSL, try another WiFi or mobile hotspot.
echo 3. If you already have wheel files, copy them into backend\offline_packages.
pause
exit /b 1

:download_ok
echo.
echo [4/4] Package summary
powershell -NoProfile -ExecutionPolicy Bypass -Command "$files=Get-ChildItem -Path 'offline_packages' -Filter '*.whl' -ErrorAction SilentlyContinue; Write-Host ('Wheel files ready: ' + $files.Count); $files | Select-Object -ExpandProperty Name"
echo.
echo Offline packages are ready.
echo Next step: copy the whole project folder to the server PC, then run install_backend_offline.bat there.
pause
