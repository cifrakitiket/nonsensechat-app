@echo off
cd /d "%~dp0electron-desktop"
echo Starting Nonsense Chat Desktop...
call npx electron .
if errorlevel 1 pause
