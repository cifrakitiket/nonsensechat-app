# 📱 Беспонтовый Чат — Android (Нативный Kotlin)

Нативный Android-порт без Capacitor. Полноценное приложение с нативными возможностями и кастомным UI (как Telegram, не Material Design).

## Архитектура

```
WebView (HTML/CSS/JS из Firebase Hosting)
    ↕ JS Bridge (AndroidBridge)
Kotlin нативный слой:
  ├── Edge-to-edge дизайн (прозрачный статусбар)
  ├── FCM Push-уведомления
  ├── Haptic feedback (вибрация)
  ├── File picker + Camera
  ├── Splash Screen (Android 12+)
  └── Deep links (открытие чата из уведомления)
```

## 🚀 Быстрый старт

### Предварительные требования

1. **Android Studio** Hedgehog (2023.1.1) или новее
2. **Android SDK** 26+ (Android 8.0)
3. **JDK 11** (включён в Android Studio)

### 1. Получить `google-services.json`

> ⚠️ БЕЗ ЭТОГО ФАЙЛА PUSH-УВЕДОМЛЕНИЯ НЕ РАБОТАЮТ

1. Откройте [Firebase Console](https://console.firebase.google.com)
2. Выберите проект `nonsensechattm-e5d18`
3. Перейдите в **Project Settings** → **Your apps**
4. Если Android-приложения нет — нажмите **Add app → Android**:
   - Package name: `com.messenger.app`
   - App nickname: `Беспонтовый Чат`
5. Скачайте `google-services.json`
6. Замените файл `android-native/app/google-services.json` скачанным

### 2. Открыть в Android Studio

```
File → Open → выберите папку android-native/
```

Дождитесь Gradle Sync (может занять 2-5 минут при первом запуске).

### 3. Запустить

- **На эмуляторе**: Run → Run 'app' (или ▶️)
- **На телефоне**: Включите USB Debugging, подключите кабель → Run

---

## 📦 Сборка APK

```bash
cd android-native

# Debug APK (для тестирования)
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk

# Release APK (для публикации)
./gradlew assembleRelease
```

### Подписанный Release APK

```bash
# 1. Создать keystore (один раз)
keytool -genkey -v -keystore messenger-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias messenger

# 2. Добавить в android-native/keystore.properties:
storePassword=ВАШ_ПАРОЛЬ
keyPassword=ВАШ_ПАРОЛЬ
keyAlias=messenger
storeFile=../messenger-key.jks

# 3. Добавить в app/build.gradle.kts signingConfigs (закомментировано) и раскомментировать
```

---

## 🔧 Что реализовано

| Фича | Статус | Описание |
|------|--------|----------|
| WebView | ✅ | Загружает `https://nonsensechattm-e5d18.web.app` |
| Edge-to-edge | ✅ | Прозрачный статус-бар, контент под ним |
| Мобильный лейаут | ✅ | Telegram-style: список → чат (slide-in анимация) |
| Кнопка ← в хедере | ✅ | Закрывает чат, возврат в список |
| Back button | ✅ | Закрыть чат → двойное нажатие = выход |
| Haptic feedback | ✅ | Вибрация на клики по чатам и кнопкам |
| Статус-бар тема | ✅ | Синхронизация с dark/light темой |
| FCM Push | ✅* | Нужен `google-services.json` |
| Уведомления | ✅ | Tap → открывает нужный чат |
| File picker | ✅ | Отправка фото, видео, файлов |
| Камера/микрофон | ✅ | Автогрант для WebRTC звонков |
| Safe area insets | ✅ | Отступы для notch и навигационной панели |
| Offline страница | ✅ | Кастомная страница без интернета |
| Splash Screen | ✅ | Android 12+ нативный Splash |

*Требует настройки `google-services.json`

---

## 📡 JS Bridge (AndroidBridge)

Из JavaScript в WebView доступны:

```javascript
// Проверка платформы
AndroidBridge.isAndroid()           // → true

// Вибрация
AndroidBridge.haptic()              // лёгкая (30мс)
AndroidBridge.hapticMedium()        // средняя (60мс)
AndroidBridge.vibrate(100)          // произвольная (мс)

// Статус-бар
AndroidBridge.setStatusBarDark(true)  // тёмные иконки (светлая тема)

// Уведомления
AndroidBridge.showLocalNotification("Заголовок", "Текст", "chat_id")

// FCM
AndroidBridge.getFCMToken()         // async → вызывает window.onFCMToken(token)
AndroidBridge.subscribeToTopic("topic_name")

// Системные
AndroidBridge.toast("Сообщение")
AndroidBridge.copyToClipboard("текст")
AndroidBridge.shareText("поделиться")
AndroidBridge.goBack()              // навигация назад
```

---

## 🔔 Настройка Push-уведомлений

### Отправка push из Appwrite Functions

```javascript
// В Appwrite Function (Node.js)
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

await admin.messaging().send({
  token: userFcmToken, // из коллекции devices
  data: {
    title: senderName,
    body: messageText,
    chat_id: chatId
  }
});
```

### Структура коллекции `devices` в Appwrite

| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | string | ID пользователя |
| `fcm_token` | string | FCM токен устройства |
| `platform` | string | `android` / `ios` |
| `updated_at` | datetime | Дата обновления токена |

---

## 🎨 Мобильный UI

При запуске в WebView автоматически инжектируется CSS, который:
- Переключает layout на Telegram-style (sidebar = весь экран)
- Чат открывается поверх с анимацией slide-in справа
- Кнопка `←` в хедере чата для возврата в список
- Убирает hover-эффекты (не нужны на touch)
- Увеличивает размеры кнопок для пальцев
- Safe area отступы под notch и навигационную панель

---

## 📁 Структура проекта

```
android-native/
├── app/
│   ├── src/main/
│   │   ├── java/com/messenger/app/
│   │   │   ├── MainActivity.kt           ← Главная Activity
│   │   │   ├── WebAppInterface.kt        ← JS Bridge
│   │   │   ├── MessengerFCMService.kt    ← FCM push
│   │   │   ├── NotificationHelper.kt     ← Каналы уведомлений
│   │   │   └── MessengerApplication.kt  ← Application класс
│   │   ├── res/
│   │   │   ├── drawable/                 ← Иконки (SVG)
│   │   │   ├── layout/activity_main.xml  ← WebView layout
│   │   │   ├── mipmap-anydpi-v26/        ← Adaptive launcher icon
│   │   │   ├── values/
│   │   │   │   ├── colors.xml
│   │   │   │   ├── strings.xml
│   │   │   │   └── themes.xml
│   │   │   └── xml/
│   │   │       ├── network_security_config.xml
│   │   │       ├── file_provider_paths.xml
│   │   │       ├── backup_rules.xml
│   │   │       └── data_extraction_rules.xml
│   │   └── AndroidManifest.xml
│   ├── google-services.json              ← ⚠️ Заменить на настоящий!
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── gradle/
│   ├── libs.versions.toml                ← Версии зависимостей
│   └── wrapper/gradle-wrapper.properties
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
└── .gitignore
```
