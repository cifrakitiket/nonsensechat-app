# PocketBase backend

This mode replaces Supabase/Firebase with a local or self-hosted PocketBase server.

## Install

1. Download the Windows `pocketbase` zip from https://github.com/pocketbase/pocketbase/releases.
2. Put `pocketbase.exe` in this project root.

## Run

```powershell
npm run pb
```

If your global `npm.cmd` is broken, use the direct launcher:

```powershell
.\run-pocketbase.bat
```

Open:

```text
http://127.0.0.1:8090
```

PocketBase applies `pb_migrations` automatically on first start. Admin UI is available at:

```text
http://127.0.0.1:8090/_/
```

For phones and other PCs on the same Wi-Fi:

```powershell
npm run pb:lan
```

Or directly:

```powershell
.\run-pocketbase-lan.bat
```

Then open `http://YOUR_PC_LAN_IP:8090`.

## Frontend config

The app defaults to PocketBase on port `8090`. If you host PocketBase elsewhere, run this once in the browser console:

```js
NonsensePocketBase.setUrl('https://your-domain.example')
```

To reset back to local:

```js
localStorage.removeItem('nonsense-pocketbase-url')
location.reload()
```

## Notes

- Uploaded photos/files are stored in PocketBase collection `uploads`.
- Chat documents are stored in PocketBase collections with a `doc` JSON field, preserving the old Firebase-like app model.
- The old JSON backend is still in `server/local-backend.js` as a fallback.
