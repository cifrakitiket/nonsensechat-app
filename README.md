<div align="center">

  <img src="public/logo.png" alt="Nonsense Chat Logo" width="120" height="120" />

  # Nonsense Chat (Беспонтовый Чат ™)

  **Современный, быструщий и кроссплатформенный десктопный мессенджер**

  [![Electron](https://img.shields.io/badge/Electron-v33.4.11-47ABE4?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-v22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](#)
  [![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](#)

</div>

---

## 🌟 Основные возможности

- ⚡ **Автономный десктопный клиент (Electron)**: Полностью изолированное приложение в `.exe` с автоматическим встроенным бэкенд-сервером.
- 💬 **Обмен сообщениями в реальном времени**: Мгновенная синхронизация через SSE (Server-Sent Events) и локальную систему документов.
- 🔔 **Нативные уведомления Windows**: Всплывающие карточки Action Center с переходом прямо в чат по клику.
- 📌 **Системный трей Windows**: Сворачивание в трей, быстрое восстановление окна и контекстное меню.
- 🎨 **Современный UI/UX**: Telegram-стиль, темная тема `#0e1420`, стикеры, GIF-поиск (GIPHY), голосовые сообщения и превью медиафайлов.
- 📦 **Полноценный инсталлятор (NSIS Setup)**: Мастер установки с автоматическим созданием ярлыков на Рабочем столе и в меню «Пуск».

---

## 🚀 Запуск и Сборка

### 1. Быстрый запуск из исходного кода
```bash
# Переход в папку десктопного приложения
cd electron-desktop

# Установка зависимостей
npm install

# Запуск приложения
npm start
```

### 2. Сборка портативного .exe приложения
```bash
cd electron-desktop
npx @electron/packager . "Nonsense Chat" --platform=win32 --arch=x64 --out=dist --overwrite --icon=public/icon.ico
```
*Готовый исполняемый файл будет доступен в `electron-desktop/dist/Nonsense Chat-win32-x64/Nonsense Chat.exe`.*

### 3. Сборка установочного сетапника (NSIS Installer)
```bash
cd electron-desktop
npx electron-builder --win nsis
```
*Инсталлятор `Nonsense Chat Setup 1.0.0.exe` сохранится в папку `electron-desktop/dist-installer/`.*

---

## 🛠️ Технологический стек

- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System & Glassmorphic Elements), JavaScript ES2024.
- **Desktop Shell**: Electron 33, Node.js, ContextBridge, IPC.
- **Backend / Realtime**: Node.js HTTP Server, Server-Sent Events (SSE), PBKDF2 Crypto Hashing.
- **Packaging**: Electron Packager, Electron Builder, NSIS.

---

## 📄 Лицензия

Распространяется под лицензией [MIT](LICENSE.md).

---

<div align="center">
  <sub>Разработано для <b>Nonsense Chat</b> • <a href="https://github.com/cifrakitiket/nonsensechat-app">GitHub Repository</a></sub>
</div>
