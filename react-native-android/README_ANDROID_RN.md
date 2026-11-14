# 📱 Беспонтовый Чат — React Native Android Client

Мобильное приложение для Android, реализованное **по архитектурному методу Discord**:
1. **React Native (TypeScript)**: Единая кодовая база с десктопным клиентом (`desktop-react`) и веб-версией.
2. **Панель навигации в стиле Telegram**: 4 вкладки (**Контакты**, **Звонки**, **Чаты**, **Профиль**) с активным капсульным индикатором (pill) и динамической аватаркой пользователя в таб-баре в точности как на скриншоте.
3. **Сохранение всех возможностей (0% потерь)**: Все 22 000+ строк функционала веб-ядра (WebRTC аудио/видеозвонки, запись голосовых сообщений, Telegram стикеры, кастомные эмодзи, опросы, спойлеры, реакций, пересылки, темы) полностью сохранены и оптимизированы для Android.

---

## 🚀 Быстрый запуск

### 1. Установка зависимостей
```bash
cd d:\messenger\react-native-android
npm install
```

### 2. Сборка APK
```bash
cd android
gradlew assembleDebug
```
Собранный файл будет находиться по пути:
`d:\messenger\react-native-android\android\app\build\outputs\apk\debug\app-debug.apk`

### 3. Установка на подключенный телефон
```bash
D:\androidsdk\platform-tools\adb.exe install -r android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 🧭 Структура проекта
- `src/navigation/TelegramBottomNav.tsx` — Кастомный Telegram Bottom Tab Bar (Контакты, Звонки, Чаты, Профиль с аватаркой).
- `src/screens/ChatsScreen.tsx` — Главный экран диалогов, папок и поиска.
- `src/screens/ContactsScreen.tsx` — Список контактов с поиском, статусом «в сети» и быстрыми действиями.
- `src/screens/CallsScreen.tsx` — Журнал вызовов (входящие, исходящие, пропущенные) и кнопка нового звонка.
- `src/screens/ProfileScreen.tsx` — Экран профиля с карточками настроек в стиле Telegram Settings.
- `src/screens/ChatRoomScreen.tsx` — Полнофункциональный чат со всеми возможностями.
- `android/` — Нативный проект Android (Gradle, Manifest, SDK 34).
