@echo off
chcp 65001 >nul
echo ========================================================
echo   Сборка Android APK для Беспонтового Чата
echo ========================================================
echo.

set "JAVA_HOME=D:\jdk17"
set "ANDROID_HOME=D:\androidsdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0android"

echo [1/2] Запуск сборки через Gradle...
call gradlew.bat assembleDebug

if %ERRORLEVEL% NEQ 0 goto :build_error

echo.
echo ========================================================
echo   СБОРКА УСПЕШНО ЗАВЕРШЕНА!
echo   Копирование APK...
echo ========================================================

if exist "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" (
    copy /Y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0nonsense-chat.apk" >nul
    copy /Y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0..\NonsenseChat.apk" >nul
    echo.
    echo   Готово! APK сохранен:
    echo   - %~dp0nonsense-chat.apk
    echo   - %~dp0..\NonsenseChat.apk
    echo.
    echo [2/2] Загрузка APK в VK Cloud Object Storage...
    node "%~dp0..\server\upload-apk-to-storage.js"
) else (
    echo [ВНИМАНИЕ] Файл app-debug.apk не найден в папке сборки.
)

goto :end

:build_error
echo.
echo ========================================================
echo   [ОШИБКА] Сборка APK завершилась с ошибкой!
echo ========================================================
echo.

:end
pause
