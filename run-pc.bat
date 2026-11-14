@echo off
title Nonsense Chat PC
setlocal

rem Add NodeJs to PATH
if exist "D:\NodeJs\node.exe" (
    set "PATH=D:\NodeJs;%PATH%"
)

set "ELECTRON_RUN_AS_NODE="
set "APP_EXE=%~dp0electron-desktop\dist\Nonsense Chat-win32-x64\Nonsense Chat.exe"

if exist "%APP_EXE%" (
    echo Starting Nonsense Chat PC...
    start "" "%APP_EXE%"
    exit /b 0
)

echo Starting Nonsense Chat PC (Development Mode)...
cd /d "%~dp0electron-desktop"
if exist "node_modules\.bin\electron.cmd" (
    call node_modules\.bin\electron.cmd .
) else (
    call npx electron .
)
if errorlevel 1 pause
