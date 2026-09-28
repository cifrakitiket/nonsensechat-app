# 📱 Беспонтовый Чат — Android (Нативный Java)

Полноценное высокопроизводительное нативное Android-приложение на **чистой Java** с XML-разметками и кастомными компонентами, в точности повторяющими тёмную киберпанк-эстетику веб-версии.

---

## ✨ Ключевые возможности

| Компонент / Фича | Реализация | Описание |
|-------------------|------------|----------|
| **Стек** | Native Java + Android SDK | Без оверхэда сторонних кроссплатформенных движков, максимальная скорость |
| **Тема и Цвета** | Dark Glassmorphism | `#080C14` (обсидиан), акценты `#00FF88`, `#00D2FF`, `#8B5CF6` |
| **Список чатов** | `RecyclerView` + папки | Разделение по вкладкам («Все», «Личные», «Группы», «Каналы»), живой поиск |
| **Экран чата** | `ChatActivity` + `MessageAdapter` | Облачка переписки со скруглениями, статусы отправки, группировка |
| **Telegram Спойлеры** | `TelegramSpoilerView` | Процедурный Canvas с мерцающими частицами, виброоткликом и плавным раскрытием |
| **Интерактивные опросы** | `Poll` + анимированные бары | Голосование в один клик, пересчет процентов и синхронизация в реальном времени |
| **Индикатор набора** | Realtime Database TTL | Уведомление «печатает...» в шапке с автосбросом через 4.5 секунды |
| **Аватары** | `AvatarView` | Градиентные заглушки с инициалами, интеграция Glide и индикатор онлайн |
| **Авторизация** | `AuthActivity` | Вход, регистрация и быстрый гостевой вход в один клик |

---

## 📁 Структура проекта (`android/`)

```
android/
├── app/
│   ├── build.gradle
│   ├── google-services.json
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/nonsensechat/app/
│       │   ├── App.java
│       │   ├── data/FirebaseManager.java
│       │   ├── model/ (User, Chat, Message, Poll, PollOption)
│       │   ├── ui/
│       │   │   ├── SplashActivity.java
│       │   │   ├── auth/AuthActivity.java
│       │   │   ├── main/ (MainActivity, ChatListAdapter)
│       │   │   ├── chat/ (ChatActivity, MessageAdapter)
│       │   │   └── custom/ (TelegramSpoilerView, AvatarView)
│       └── res/
│           ├── drawable/ (иконки, градиенты, баблы, кнопки)
│           ├── layout/ (activity_main, activity_chat, item_message_*, item_chat)
│           └── values/ (colors, strings, themes, styles)
├── gradlew.bat
├── settings.gradle
└── build.gradle
```

---

## 🛠 Запуск в Android Studio

1. Откройте **Android Studio**.
2. Нажмите **File -> Open...** и выберите папку `android/` внутри проекта (`d:\messenger\android`).
3. Дождитесь автоматической синхронизации Gradle.
4. Нажмите **Run ▶️** (Shift+F10) для запуска на эмуляторе или подключенном телефоне.

## 📦 Сборка APK из консоли

```cmd
cd android
gradlew.bat assembleDebug
```
Готовый установочный APK файл будет сформирован в:
`android/app/build/outputs/apk/debug/app-debug.apk`
