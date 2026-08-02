# Native Desktop App

This is a real Java Swing desktop client. It does not use Electron, WebView, or browser app mode.

## Build

```powershell
native-desktop\build-native.bat
```

## Run

```powershell
native-desktop\run-native.bat
```

The launcher starts the free local backend (`server/local-backend.js`) and opens the native client. It runs compiled Java classes directly, so it does not require `jar`, `jpackage`, Electron, WebView, or a browser shell.

Implemented in the native client:

- Sign in / registration.
- Local JSON backend, no Firebase/Supabase.
- Direct chat creation by UID.
- Chat list and message list.
- Text messages.
- Binary file/photo upload to `data/uploads`.
- Realtime refresh through server-sent events.
- System tray and tray notifications.
