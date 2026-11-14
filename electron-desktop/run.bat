@echo off
set "ELECTRON_RUN_AS_NODE="
if exist "D:\NodeJs\node.exe" (
    set "PATH=D:\NodeJs;%PATH%"
)
cd /d "%~dp0"
echo Starting Nonsense Chat Desktop...
if exist "node_modules\.bin\electron.cmd" (
    call node_modules\.bin\electron.cmd .
) else (
    call npx electron .
)
if errorlevel 1 pause
