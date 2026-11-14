@echo off
title Build Nonsense Chat Desktop EXE
setlocal

rem Add NodeJs to PATH
if exist "D:\NodeJs\node.exe" (
    set "PATH=D:\NodeJs;%PATH%"
)

echo ========================================================
echo   Building Nonsense Chat Standalone Windows Executable
echo ========================================================
echo.

echo 1. Syncing assets and scripts from public/ ...
copy /Y "%~dp0public\index.html" "%~dp0electron-desktop\public\index.html" >nul
copy /Y "%~dp0public\favicon.ico" "%~dp0electron-desktop\public\favicon.ico" >nul
copy /Y "%~dp0public\icon.ico" "%~dp0electron-desktop\public\icon.ico" >nul
copy /Y "%~dp0public\logo.png" "%~dp0electron-desktop\public\logo.png" >nul
copy /Y "%~dp0server\local-backend.js" "%~dp0electron-desktop\server\local-backend.js" >nul

echo 2. Packaging desktop client resources (app.asar)...
cd /d "%~dp0electron-desktop"

if exist "public\react-app" rmdir /s /q "public\react-app"

if exist "dist\Nonsense Chat-win32-x64\resources" (
    if exist "staging" rmdir /s /q "staging"
    mkdir "staging"
    copy /Y "main.js" "staging\" >nul
    copy /Y "preload.js" "staging\" >nul
    copy /Y "package.json" "staging\" >nul
    xcopy /E /I /Y "public" "staging\public" >nul
    xcopy /E /I /Y "server" "staging\server" >nul
    rem Remove large artifacts if copied
    if exist "staging\public\*.apk" del /q "staging\public\*.apk" >nul 2>&1
    if exist "staging\public\*.zip" del /q "staging\public\*.zip" >nul 2>&1
    if exist "staging\public\react-app" rmdir /s /q "staging\public\react-app" >nul 2>&1
    call node_modules\.bin\asar.cmd pack "staging" "dist\Nonsense Chat-win32-x64\resources\app.asar"
    rmdir /s /q "staging"
) else (
    call npm run pack
)

if errorlevel 1 (
    echo.
    echo Packaging failed!
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   SUCCESS! Executable is ready at:
echo   electron-desktop\dist\Nonsense Chat-win32-x64\Nonsense Chat.exe
echo ========================================================
echo.
pause
