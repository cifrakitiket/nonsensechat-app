@echo off
setlocal enabledelayedexpansion
title NonsenseChat - Build and Upload APK to VK Cloud S3

echo =====================================================================
echo   NonsenseChat: Build Android APK and Upload to VK Cloud S3
echo =====================================================================
echo.

set "ROOT_DIR=%~dp0"
set "ROOT_DIR=%ROOT_DIR:~0,-1%"

rem 1. Set Java and Android SDK paths
set "JAVA_HOME=D:\jdk17"
set "ANDROID_HOME=D:\androidsdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [1/6] Checking build environment...
if not exist "%JAVA_HOME%\bin\javac.exe" (
    echo [ERROR] JDK 17 not found at: %JAVA_HOME%
    exit /b 1
)
if not exist "%ANDROID_HOME%" (
    echo [ERROR] Android SDK not found at: %ANDROID_HOME%
    exit /b 1
)
echo       JAVA_HOME:    %JAVA_HOME%
echo       ANDROID_HOME: %ANDROID_HOME%
echo.

rem 2. Synchronize version across public/index.html, build.gradle and apk-version.json
echo [2/6] Synchronizing version numbers across project...
node "%ROOT_DIR%\server\sync-version.js" %*
if errorlevel 1 (
    echo [ERROR] Version sync failed.
    exit /b 1
)
echo.

rem 3. Sync public assets to Android assets
echo [3/6] Syncing public assets to Android project...
powershell -NoProfile -Command "Copy-Item -Path '%ROOT_DIR%\public\*' -Destination '%ROOT_DIR%\react-native-android\android\app\src\main\assets\public\' -Recurse -Force"
if errorlevel 1 (
    echo [ERROR] Failed to sync assets.
    exit /b 1
)
echo       Assets synced successfully.
echo.

rem 4. Build APK with Gradle
echo [4/6] Running Gradle assembleDebug...
pushd "%ROOT_DIR%\react-native-android\android"
call gradlew.bat assembleDebug
set "GRADLE_STATUS=%ERRORLEVEL%"
popd

if not "%GRADLE_STATUS%"=="0" (
    echo.
    echo [ERROR] Gradle build failed with code %GRADLE_STATUS%.
    exit /b %GRADLE_STATUS%
)
echo       Gradle build finished successfully.
echo.

rem 5. Copy generated APK to root
echo [5/6] Copying APK to NonsenseChat.apk...
set "BUILT_APK=%ROOT_DIR%\react-native-android\android\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%BUILT_APK%" (
    echo [ERROR] Built APK not found at: %BUILT_APK%
    exit /b 1
)

copy /Y "%BUILT_APK%" "%ROOT_DIR%\NonsenseChat.apk" >nul
if exist "%ROOT_DIR%\public" (
    copy /Y "%BUILT_APK%" "%ROOT_DIR%\public\NonsenseChat.apk" >nul
)
echo       APK copied to %ROOT_DIR%\NonsenseChat.apk.
echo.

rem 6. Upload APK to VK Cloud S3
echo [6/6] Uploading APK and apk-version.json to VK Cloud S3...
node "%ROOT_DIR%\server\upload-apk-to-storage.js" %*
set "UPLOAD_STATUS=%ERRORLEVEL%"

if not "%UPLOAD_STATUS%"=="0" (
    echo.
    echo [ERROR] VK Cloud upload failed with code %UPLOAD_STATUS%.
    exit /b %UPLOAD_STATUS%
)

echo.
echo =====================================================================
echo   SUCCESS: APK built and uploaded to VK Cloud S3!
echo   Direct APK download: https://hb.vkcs.cloud/noname/nonsensechat.apk
echo   Version info JSON:   https://hb.vkcs.cloud/noname/apk-version.json
echo =====================================================================
echo.
