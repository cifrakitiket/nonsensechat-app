@echo off
set "PATH=D:\NodeJs;%PATH%"
cd /d "%~dp0"
echo ========================================================
echo   NonsenseChat - Deploying Hosting and Rules...
echo ========================================================
call npx --yes firebase-tools deploy --only "hosting,firestore:rules"
echo.
pause
