@echo off
chcp 65001 > nul
echo ========================================================
echo   Nonsense Chat — React Native Android Client
echo ========================================================
echo.
cd /d "d:\messenger\react-native-android"
echo Установка зависимостей (если требуется)...
call npm install --silent
echo.
echo Запуск Metro Bundler...
start cmd /k "npx react-native start"
echo.
echo Запуск приложения на Android...
npx react-native run-android
pause
