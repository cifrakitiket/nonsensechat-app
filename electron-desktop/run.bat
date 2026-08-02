@echo off
cd /d "%~dp0"
echo Starting Nonsense Chat Desktop...
call npx electron .
if errorlevel 1 pause
