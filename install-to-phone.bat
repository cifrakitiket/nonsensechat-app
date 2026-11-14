@echo off
chcp 65001 > nul
echo ========================================================
echo  Установка Nonsense Chat на подключенный Android телефон
echo ========================================================
echo.
"D:\androidsdk\platform-tools\adb.exe" devices
echo.
echo Установка APK...
"D:\androidsdk\platform-tools\adb.exe" install -r "D:\messenger\react-native-android\nonsense-chat.apk"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [УСПЕХ] Приложение успешно установлено на ваш телефон!
) else (
    echo.
    echo [ОШИБКА] Проверьте, что телефон подключен по USB и включена "Отладка по USB".
)
echo.
pause
