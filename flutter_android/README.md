# 📱 Nonsense Chat — Flutter Android Port

Официальный Android-порт мессенджера **Nonsense Chat**, написанный на **Flutter & Dart**.

---

## 🎨 Особенности Flutter порта

1. **Telegram Dark UI (`#0E1420`)**:
   - Адаптивный мобильный дизайн с нативной анимацией переходов между списком чатов и открытым диалогом.
   - Поддержка системного Edge-to-edge стиля (прозрачный статус-бар и панель навигации).

2. **Два режима работы**:
   - ⚡ **Native Dart UI**: Нативные экраны входа, списка чатов и сообщений через REST API.
   - 🌐 **Hybrid WebView Mode**: Возможность мгновенно переключиться на встроенную Web-версию приложения прямо в приложении.

3. **Связь с локальным и облачным бэкендом**:
   - Автоматическая настройка подключения к хосту (по умолчанию `http://10.0.2.2:8787` для эмулятора Android или пользовательскому серверу).

---

## 🚀 Запуск и Сборка APK

### Предварительные требования:
- Установленный [Flutter SDK](https://flutter.dev) (3.0+)
- Установленный Android Studio / Android SDK

### 1. Установка зависимостей:
```bash
flutter pub get
```

### 2. Запуск на эмуляторе или устройстве:
```bash
flutter run
```

### 3. Сборка готового APK:
```bash
# Debug APK
flutter build apk --debug

# Release APK (для установки на телефон)
flutter build apk --release
```
*Скомпилированный файл появится по адресу: `build/app/outputs/flutter-apk/app-release.apk`.*

---

## 📁 Структура проекта
- `lib/main.dart` — Точка входа, тема приложения, сплэш-экран.
- `lib/services/api_service.dart` — Клиент сети (авторизация, чаты, сообщения).
- `lib/screens/login_screen.dart` — Экраны Авторизации / Регистрации / Выбора сервера.
- `lib/screens/chat_list_screen.dart` — Нативный список чатов.
- `lib/screens/chat_detail_screen.dart` — Нативный экран сообщений.
- `lib/screens/web_view_screen.dart` — Встроенный WebView режим.
