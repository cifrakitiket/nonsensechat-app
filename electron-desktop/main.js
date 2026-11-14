const { 
  app, 
  BrowserWindow, 
  Tray, 
  Menu, 
  Notification, 
  ipcMain, 
  nativeImage, 
  session, 
  desktopCapturer, 
  screen, 
  shell,
  clipboard
} = require('electron');
const path = require('path');
const fs = require('fs');

// Set Application User Model ID for Windows Notifications (Action Center)
if (process.platform === 'win32') {
  try {
    app.setAppUserModelId(process.execPath);
  } catch (_) {
    app.setAppUserModelId('com.nonsense.chat');
  }
}

// Single Instance Lock (Discord behavior: only one app instance running)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Discord-grade performance & media flags
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-features', 'AudioServiceOutOfProcess');
app.commandLine.appendSwitch('disable-background-timer-throttling');

// Register custom protocol (Discord deep linking: nonsense://chat/<chatId>)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('nonsense', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('nonsense');
}

let mainWindow = null;
let tray = null;
let serverInstance = null;
let isQuitting = false;
let notificationMuted = false;
let firstMinimizeShown = false;
let currentTheme = 'dark';

const PORT = 8787;
const HOST = '127.0.0.1';

// Theme configuration matching the website
const THEME_CONFIG = {
  'dark': {
    overlayColor: '#0f1923',
    symbolColor: '#8aabb8',
    bgColor: '#0f1923'
  },
  'coffee-dark': {
    overlayColor: '#1a0e06',
    symbolColor: '#c8906a',
    bgColor: '#1a0e06'
  },
  'light': {
    overlayColor: '#f5f0eb',
    symbolColor: '#8a7060',
    bgColor: '#f5f0eb'
  },
  'moss': {
    overlayColor: '#0e1611',
    symbolColor: '#8ba888',
    bgColor: '#0e1611'
  }
};

// Directories setup
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

const iconIcoPath = path.join(publicDir, 'icon.ico');
const iconPngPath = path.join(publicDir, 'logo.png');
const appIconPath = fs.existsSync(iconIcoPath) ? iconIcoPath : iconPngPath;

// Window State Persistence (Discord-grade: remembers size, position, maximized & theme)
const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  const defaultState = { width: 1280, height: 850, isMaximized: false, theme: 'dark' };
  try {
    if (fs.existsSync(stateFilePath)) {
      const data = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
      if (data.x !== undefined && data.y !== undefined) {
        const visible = screen.getAllDisplays().some(display => {
          const { x, y, width, height } = display.bounds;
          return data.x >= x && data.x <= x + width && data.y >= y && data.y <= y + height;
        });
        if (!visible) {
          delete data.x;
          delete data.y;
        }
      }
      return { ...defaultState, ...data };
    }
  } catch (_) {}
  return defaultState;
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const isMax = mainWindow.isMaximized();
    const bounds = mainWindow.getNormalBounds ? mainWindow.getNormalBounds() : mainWindow.getBounds();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: isMax,
      theme: currentTheme
    };
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (_) {}
}

// Start built-in local backend server
function startBackend() {
  try {
    const backendPath = path.join(serverDir, 'local-backend.js');
    if (fs.existsSync(backendPath)) {
      console.log('[Discord-Desktop] Starting local backend from:', backendPath);
      const { createLocalBackend } = require(backendPath);
      serverInstance = createLocalBackend({ publicDir, dataDir });
      serverInstance.listen(PORT, HOST, () => {
        console.log(`[Discord-Desktop] Local backend active on http://${HOST}:${PORT}`);
      });
      serverInstance.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`[Discord-Desktop] Port ${PORT} already active, connecting to existing instance.`);
        } else {
          console.error('[Discord-Desktop] Backend error:', err);
        }
      });
    }
  } catch (err) {
    console.error('[Discord-Desktop] Failed to start backend:', err);
  }
}

// Setup Media & Screen Sharing Permissions (Discord WebRTC & Screen Sharing)
function setupPermissions() {
  const ses = session.defaultSession;
  
  // Spellchecker languages: Russian and English
  try {
    ses.setSpellCheckerLanguages(['ru-RU', 'en-US']);
  } catch (_) {}

  // Auto-grant permissions for calls, camera, mic, screen sharing and notifications
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['media', 'notifications', 'display-capture', 'clipboard-read', 'clipboard-sanitized-write'];
    callback(allowed.includes(permission) || permission.startsWith('media:'));
  });

  ses.setPermissionCheckHandler(() => true);

  // Screen Sharing desktopCapturer handler (seamless Discord-style screen streaming)
  ses.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      if (sources.length > 0) {
        callback({ video: sources[0] });
      } else {
        callback({});
      }
    }).catch(() => callback({}));
  });
}

// Deep linking handler: nonsense://chat/<chatId>
function handleDeepLink(urlStr) {
  if (!urlStr || !urlStr.startsWith('nonsense://')) return;
  try {
    const raw = urlStr.replace('nonsense://', '');
    const match = raw.match(/(?:chat|open)\/([a-zA-Z0-9_\-]+)/);
    if (match && match[1] && mainWindow) {
      const chatId = match[1];
      mainWindow.webContents.send('open-chat', chatId);
      mainWindow.webContents.executeJavaScript(`try { if (typeof openChatById === 'function') openChatById(${JSON.stringify(chatId)}); } catch(e){}`);
    }
  } catch (e) {
    console.error('[Discord-Desktop] Deep link error:', e);
  }
}

function createWindow() {
  const windowState = loadWindowState();
  currentTheme = windowState.theme || 'dark';
  const themeCfg = THEME_CONFIG[currentTheme] || THEME_CONFIG['dark'];

  let icon = null;
  if (fs.existsSync(appIconPath)) {
    icon = nativeImage.createFromPath(appIconPath);
  }

  // Discord-style window with custom title bar overlay matching website themes
  mainWindow = new BrowserWindow({
    width: windowState.width || 1280,
    height: windowState.height || 850,
    x: windowState.x,
    y: windowState.y,
    minWidth: 840,
    minHeight: 560,
    title: 'Nonsense Chat',
    icon: icon || undefined,
    backgroundColor: themeCfg.bgColor,
    autoHideMenuBar: true,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: themeCfg.overlayColor,
      symbolColor: themeCfg.symbolColor,
      height: 32
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false,
      spellcheck: true
    }
  });

  Menu.setApplicationMenu(null);

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Open external links in user's default browser (Discord behavior)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedLocal = `http://${HOST}:${PORT}`;
    if (!url.startsWith(allowedLocal) && !url.startsWith(`http://localhost:${PORT}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Discord-style Context Menu (Cut, Copy, Paste, Google Search, Open link, Save image)
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menuTemplate = [];

    // Spellcheck suggestions
    if (params.misspelledWord && params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions.slice(0, 4)) {
        menuTemplate.push({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion)
        });
      }
      menuTemplate.push({ type: 'separator' });
    }

    // Text editing fields
    if (params.isEditable) {
      menuTemplate.push(
        { label: 'Отменить', role: 'undo' },
        { label: 'Повторить', role: 'redo' },
        { type: 'separator' },
        { label: 'Вырезать', role: 'cut' },
        { label: 'Копировать', role: 'copy' },
        { label: 'Вставить', role: 'paste' },
        { label: 'Выделить всё', role: 'selectAll' }
      );
    } else if (params.selectionText && params.selectionText.trim().length > 0) {
      menuTemplate.push(
        { label: 'Копировать', role: 'copy' },
        { type: 'separator' },
        {
          label: 'Искать в Google',
          click: () => shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText.trim())}`)
        }
      );
    }

    // Links
    if (params.linkURL) {
      if (menuTemplate.length > 0) menuTemplate.push({ type: 'separator' });
      menuTemplate.push(
        {
          label: 'Открыть ссылку в браузере',
          click: () => shell.openExternal(params.linkURL)
        },
        {
          label: 'Скопировать адрес ссылки',
          click: () => clipboard.writeText(params.linkURL)
        }
      );
    }

    // Images
    if (params.hasImageContents && params.srcURL) {
      if (menuTemplate.length > 0) menuTemplate.push({ type: 'separator' });
      menuTemplate.push(
        {
          label: 'Копировать изображение',
          click: () => mainWindow.webContents.copyImageAt(params.x, params.y)
        },
        {
          label: 'Открыть изображение в браузере',
          click: () => shell.openExternal(params.srcURL)
        }
      );
    }

    if (menuTemplate.length > 0) {
      const contextMenu = Menu.buildFromTemplate(menuTemplate);
      contextMenu.popup({ window: mainWindow, x: params.x, y: params.y });
    }
  });

  // Load genuine backend web application (public/index.html)
  mainWindow.loadURL(`http://${HOST}:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();

    // Check for deep link on startup
    const startLink = process.argv.find(arg => arg.startsWith('nonsense://'));
    if (startLink) {
      handleDeepLink(startLink);
    }
  });

  // Taskbar flash reset on focus
  mainWindow.on('focus', () => {
    if (mainWindow) mainWindow.flashFrame(false);
  });

  // Save geometry on resize / move
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximize-changed', true);
    saveWindowState();
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximize-changed', false);
    saveWindowState();
  });

  // Discord-style Close Behavior: Minimize to Tray on Close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      saveWindowState();
      mainWindow.hide();

      if (!firstMinimizeShown && tray && Notification.isSupported()) {
        firstMinimizeShown = true;
        try {
          const n = new Notification({
            title: 'Nonsense Chat свёрнут в трей',
            body: 'Приложение продолжает работать в фоне и принимать сообщения.',
            icon: fs.existsSync(iconPngPath) ? iconPngPath : undefined,
            silent: true
          });
          n.show();
        } catch (_) {}
      }
      return false;
    }
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Discord-style Keyboard Shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F11: Fullscreen toggle
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    // F12 or Ctrl+Shift+I: DevTools
    if ((input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    // Ctrl+R or F5: Reload
    if ((input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) && input.type === 'keyDown') {
      mainWindow.webContents.reload();
      event.preventDefault();
    }
    // Zoom shortcuts (Ctrl + Plus, Ctrl + Minus, Ctrl + 0)
    if (input.control && (input.key === '=' || input.key === '+') && input.type === 'keyDown') {
      const curZoom = mainWindow.webContents.getZoomFactor();
      mainWindow.webContents.setZoomFactor(Math.min(curZoom + 0.1, 2.0));
      event.preventDefault();
    }
    if (input.control && input.key === '-' && input.type === 'keyDown') {
      const curZoom = mainWindow.webContents.getZoomFactor();
      mainWindow.webContents.setZoomFactor(Math.max(curZoom - 0.1, 0.7));
      event.preventDefault();
    }
    if (input.control && input.key === '0' && input.type === 'keyDown') {
      mainWindow.webContents.setZoomFactor(1.0);
      event.preventDefault();
    }
    // Esc: Close active modal or dialog
    if (input.key === 'Escape' && input.type === 'keyDown') {
      mainWindow.webContents.executeJavaScript(`
        try {
          const openModal = document.querySelector('.modal:not(.hidden)');
          if (openModal) {
            const mId = openModal.id;
            if (mId && typeof closeModal === 'function') closeModal(mId);
            else openModal.classList.add('hidden');
          } else if (typeof closeRightPanel === 'function') {
            closeRightPanel();
          }
        } catch (_) {}
      `);
    }
    // Ctrl+W: Minimize to tray (Discord behavior)
    if (input.control && input.key.toLowerCase() === 'w' && input.type === 'keyDown') {
      mainWindow.hide();
      event.preventDefault();
    }
    // Ctrl+Q: Full Quit
    if (input.control && input.key.toLowerCase() === 'q' && input.type === 'keyDown') {
      isQuitting = true;
      app.quit();
    }
  });
}

// Discord-style System Tray
function createTray() {
  let icon = null;
  if (fs.existsSync(iconPngPath)) {
    icon = nativeImage.createFromPath(iconPngPath);
  } else if (fs.existsSync(iconIcoPath)) {
    icon = nativeImage.createFromPath(iconIcoPath);
  }

  if (!icon) return;

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Nonsense Chat');

  const updateTrayMenu = () => {
    const isAutoStart = app.getLoginItemSettings().openAtLogin;

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
        label: 'Без звука уведомлений',
        type: 'checkbox',
        checked: notificationMuted,
        click: (item) => {
          notificationMuted = item.checked;
        }
      },
      {
        label: 'Запускать при старте Windows',
        type: 'checkbox',
        checked: isAutoStart,
        click: (item) => {
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            args: ['--hidden']
          });
        }
      },
      {
        label: 'Очистить кэш и перезагрузить',
        click: () => {
          if (mainWindow) {
            session.defaultSession.clearCache().then(() => {
              mainWindow.reload();
            });
          }
        }
      },
      {
        label: 'Перезагрузить приложение',
        click: () => {
          if (mainWindow) mainWindow.reload();
        }
      },
      { type: 'separator' },
      {
        label: 'Выйти из Nonsense Chat',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateTrayMenu();

  // Click & Double-click restore window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        mainWindow.focus();
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Dynamic Theme Synchronization (Matching website themes: dark, coffee-dark, light, moss)
ipcMain.on('theme-changed', (_event, themeName) => {
  if (!THEME_CONFIG[themeName]) return;
  currentTheme = themeName;
  const cfg = THEME_CONFIG[themeName];

  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.setTitleBarOverlay({
        color: cfg.overlayColor,
        symbolColor: cfg.symbolColor,
        height: 32
      });
      mainWindow.setBackgroundColor(cfg.bgColor);
    } catch (e) {
      console.warn('[Discord-Desktop] setTitleBarOverlay error:', e);
    }
  }
  saveWindowState();
});

ipcMain.handle('get-current-theme', () => currentTheme);

// Desktop Capturer sources for Discord-style Screen Share
ipcMain.handle('get-desktop-sources', async (_event, types) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: types || ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 }
    });
    return sources.map(s => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : null
    }));
  } catch (e) {
    console.error('[Discord-Desktop] get-desktop-sources error:', e);
    return [];
  }
});

// Discord-style Native Windows Toast Notifications
ipcMain.on('show-notification', (_event, data) => {
  if (!Notification.isSupported() || notificationMuted) return;

  const title = typeof data === 'string' ? data : (data.title || 'Беспонтовый Чат');
  const body = typeof data === 'object' ? (data.body || '') : '';
  const chatId = typeof data === 'object' ? data.chatId : null;
  const silent = typeof data === 'object' ? Boolean(data.silent) : false;

  let icon = fs.existsSync(iconPngPath) ? iconPngPath : undefined;
  if (data && typeof data === 'object' && data.icon && typeof data.icon === 'string') {
    if (fs.existsSync(data.icon)) {
      icon = data.icon;
    }
  }

  try {
    const notification = new Notification({
      title: title,
      body: body,
      icon: icon,
      silent: silent
    });

    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
        mainWindow.flashFrame(false);
        if (chatId) {
          mainWindow.webContents.send('open-chat', chatId);
          mainWindow.webContents.executeJavaScript(`try { if (typeof openChatById === 'function') openChatById(${JSON.stringify(chatId)}); } catch(e){}`);
        }
      }
    });

    notification.show();

    // Flash taskbar icon if window is not active or minimized
    if (mainWindow && (!mainWindow.isFocused() || mainWindow.isMinimized())) {
      mainWindow.flashFrame(true);
    }
  } catch (err) {
    console.warn('Native notification error:', err);
  }
});

// Window focus query
ipcMain.handle('is-window-focused', () => {
  return mainWindow ? (mainWindow.isFocused() && !mainWindow.isMinimized() && mainWindow.isVisible()) : false;
});

// Flash taskbar window
ipcMain.on('flash-window', (_event, flag) => {
  if (mainWindow) mainWindow.flashFrame(Boolean(flag));
});

// Update unread count (for system tray tooltip & taskbar badge)
ipcMain.on('set-unread-count', (_event, count) => {
  const n = Number(count) || 0;
  if (tray) {
    tray.setToolTip(n > 0 ? `Беспонтовый Чат (${n} непрочитанных)` : 'Беспонтовый Чат');
  }
  if (mainWindow && process.platform === 'win32') {
    if (n > 0) {
      try {
        const text = n > 99 ? '99+' : String(n);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#ef4444" stroke="#ffffff" stroke-width="2"/><text x="16" y="21" font-size="${text.length > 2 ? 11 : 14}" font-family="Segoe UI, sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle">${text}</text></svg>`;
        const badge = nativeImage.createFromBuffer(Buffer.from(svg));
        mainWindow.setOverlayIcon(badge, `${n} непрочитанных`);
      } catch (_) {
        mainWindow.setOverlayIcon(null, '');
      }
    } else {
      mainWindow.setOverlayIcon(null, '');
    }
  }
  if (app.setBadgeCount) {
    try { app.setBadgeCount(n); } catch (_) {}
  }
});

// Window Control IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Second instance focus & deep link
app.on('second-instance', (_event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();

    const link = argv.find(a => a.startsWith('nonsense://'));
    if (link) handleDeepLink(link);
  }
});

// App lifecycle
app.whenReady().then(() => {
  setupPermissions();
  startBackend();

  setTimeout(() => {
    createWindow();
    createTray();
  }, 350);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  saveWindowState();
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
