const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Set Application User Model ID for Windows Notifications
if (process.platform === 'win32') {
  app.setAppUserModelId(process.execPath || 'Nonsense.Chat.Desktop');
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let tray = null;
let serverInstance = null;

const PORT = 8787;
const HOST = '127.0.0.1';

// Find public and server directories
function getResourceDir(name) {
  const localDir = path.join(__dirname, name);
  if (fs.existsSync(localDir)) return localDir;
  const parentDir = path.join(__dirname, '..', name);
  if (fs.existsSync(parentDir)) return parentDir;
  const resDir = path.join(process.resourcesPath, name);
  if (fs.existsSync(resDir)) return resDir;
  return localDir;
}

const publicDir = getResourceDir('public');
const serverDir = getResourceDir('server');
const dataDir = app.isPackaged 
  ? path.join(app.getPath('userData'), 'data') 
  : path.join(__dirname, '..', 'data');
const iconPath = path.join(publicDir, 'logo.png');

function startBackend() {
  try {
    const backendPath = path.join(serverDir, 'local-backend.js');
    console.log('[Electron] Loading backend from:', backendPath);
    const { createLocalBackend } = require(backendPath);
    serverInstance = createLocalBackend({ publicDir, dataDir });
    serverInstance.listen(PORT, HOST, () => {
      console.log(`[Electron] Backend listening on http://${HOST}:${PORT}`);
    });
    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Electron] Port ${PORT} already in use, assuming backend is running.`);
      } else {
        console.error('[Electron] Backend error:', err);
      }
    });
  } catch (err) {
    console.error('[Electron] Failed to start local backend:', err);
  }
}

function createWindow() {
  let icon = null;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 840,
    minHeight: 600,
    title: 'Nonsense Chat',
    icon: icon || undefined,
    backgroundColor: '#0e1420',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadURL(`http://${HOST}:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  let icon = null;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  }

  if (!icon) return;

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Nonsense Chat');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть Nonsense Chat',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Свернуть в трей',
      click: () => {
        if (mainWindow) mainWindow.hide();
      }
    },
    { type: 'separator' },
    {
      label: 'Выйти',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Native Windows Toast Notifications IPC handler
ipcMain.on('show-notification', (event, data) => {
  if (!Notification.isSupported()) return;

  const title = typeof data === 'string' ? data : (data.title || 'Nonsense Chat');
  const body = typeof data === 'object' ? (data.body || '') : '';
  const chatId = typeof data === 'object' ? data.chatId : null;

  const notification = new Notification({
    title: title,
    body: body,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    silent: false
  });

  notification.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      if (chatId) {
        mainWindow.webContents.executeJavaScript(`try { openChatById(${JSON.stringify(chatId)}); } catch(e){}`);
      }
    }
  });

  notification.show();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  startBackend();

  setTimeout(() => {
    createWindow();
    createTray();
  }, 400);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverInstance) {
    try {
      serverInstance.close();
    } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
