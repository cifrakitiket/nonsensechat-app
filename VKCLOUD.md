# NonsenseChat — Архитектура: Firebase + VK Cloud S3 (Полная автономность)

Проект работает в связке:
1. **Firebase Realtime Database & Auth**:
   - База данных реального времени: сообщения, чаты, профили пользователей, реакции, статусы онлайн.
   - Авторизация: регистрация и вход по Email / паролю.
   - Не требует поддержки собственного сервера БД.
2. **VK Cloud Object Storage (S3)**:
   - Хранилище файлов: фото, видео, аватарки, стикеры, вложения.
   - Бакет: `noname` (регион `ru-msk`, эндпоинт `https://hb.vkcs.cloud`).
   - На бакете настроен **CORS** (`AllowedOrigin: *`, `AllowedMethods: GET, PUT, POST, DELETE, HEAD`).
   - Подпись AWS Signature v4 вычисляется **автономно прямо в браузере** через Web Crypto API.
   - Никаких серверов на локальном ПК держать не нужно — сайт работает в интернете автономно 24/7!

---

## 1. Запуск проекта

### На сайте в интернете (Firebase Hosting)
Для деплоя на сайт выполните:
```powershell
deploy.bat
```
(или `firebase deploy --only hosting`)

Сайт доступен онлайн, загрузка файлов в VK Cloud S3 и чаты работают без бэкенд-сервера.

### Локально в браузере
Просто откройте [public/index.html](file:///d:/messenger/public/index.html) в любом браузере или запустите локальный HTTP-сервер.

### В десктопном приложении Electron
```powershell
cd electron-desktop
npm start
```

---

## 2. Статус сервисов (проверено)

- [x] **Firebase Realtime Database**: Включена, доступна (HTTP 200).
- [x] **Firebase Authentication**: Включена, регистрация/вход работают (HTTP 200).
- [x] **VK Cloud S3 бакет `noname`**: Ключи настроены в `.env`, тестовая загрузка успешна (HTTP 200).
- [x] **CORS на бакете `noname`**: Настроен и активирован через S3 API.
- [x] **Прямая загрузка из браузера**: Встроена в `public/index.html` и `electron-desktop/public/index.html`.
