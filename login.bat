@echo off
set "PATH=D:\NodeJs;%PATH%"
cd /d "%~dp0"
echo ========================================================
echo   NonsenseChat - Firebase Login
echo ========================================================
call npx --yes firebase-tools login
echo.
pause
