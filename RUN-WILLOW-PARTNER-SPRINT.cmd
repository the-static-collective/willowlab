@echo off
setlocal
cd /d "%~dp0"
rem Local-only, zero-credential Willow Partner Sprint preview.
rem This does NOT deploy to WillowConnect, connect a CRM, or send mail.
set "PYTHON=python"
where py >nul 2>nul
if not errorlevel 1 set "PYTHON=py -3"
where python >nul 2>nul
if not errorlevel 1 goto run
where py >nul 2>nul
if not errorlevel 1 goto run
echo Python 3 is required to start a local preview. No network setup is performed.
echo Install Python 3, then open this script again.
pause
exit /b 1
:run
echo.
echo Willow Partner Sprint - LOCAL PREVIEW
echo This browser-only research board sends ZERO messages.
echo Leave this window open while viewing the local page.
echo Press Ctrl+C in this window to stop the server.
echo.
start "" /MIN powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8765/growth-desk/sprint.html'"
%PYTHON% -m http.server 8765 --bind 127.0.0.1
