const { contextBridge, ipcRenderer } = require('electron');

// Discord-grade Desktop Bridge for Nonsense Chat
const desktopBridge = {
  isDesktop: true,
  platform: process.platform,

  // Theme synchronization (dark, coffee-dark, light, moss)
  setTheme: (themeName) => {
    try {
      ipcRenderer.send('theme-changed', themeName);
    } catch (e) {
      console.warn('[DesktopBridge] setTheme error:', e);
    }
  },
  getTheme: () => ipcRenderer.invoke('get-current-theme'),

  // Native notification trigger (Windows Action Center Toast)
  notify: (data) => {
    try {
      ipcRenderer.send('show-notification', data);
    } catch (e) {
      console.warn('[DesktopBridge] notify error:', e);
    }
  },

  // Update unread count (for system tray tooltip & taskbar badge)
  setUnread: (count) => {
    try {
      ipcRenderer.send('set-unread-count', Number(count) || 0);
    } catch (e) {
      console.warn('[DesktopBridge] setUnread error:', e);
    }
  },

  // Flash taskbar window
  flashFrame: (flag) => {
    try {
      ipcRenderer.send('flash-window', Boolean(flag));
    } catch (e) {
      console.warn('[DesktopBridge] flashFrame error:', e);
    }
  },

  // Check if window is focused & visible
  isFocused: () => ipcRenderer.invoke('is-window-focused'),

  // Listen for chat open requests (from notification clicks, tray or deep links)
  onOpenChat: (callback) => {
    ipcRenderer.on('open-chat', (_event, chatId) => {
      if (typeof callback === 'function') {
        try {
          callback(chatId);
        } catch (e) {
          console.error('[DesktopBridge] onOpenChat error:', e);
        }
      }
    });
  },

  // Window Controls (Discord Frameless Titlebar)
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (cb) => {
    ipcRenderer.on('window-maximize-changed', (_e, val) => cb(val));
  },

  // Screen Sharing Desktop Capturer Sources
  getScreenSources: async (types = ['screen', 'window']) => {
    try {
      return await ipcRenderer.invoke('get-desktop-sources', types);
    } catch (e) {
      console.warn('[DesktopBridge] getScreenSources error:', e);
      return [];
    }
  }
};

try {
  contextBridge.exposeInMainWorld('Desktop', desktopBridge);
  contextBridge.exposeInMainWorld('NonsenseDesktop', desktopBridge);
  contextBridge.exposeInMainWorld('electronAPI', {
    ...desktopBridge,
    sendNotification: (title, options) => {
      desktopBridge.notify({
        title,
        body: options ? options.body : '',
        chatId: options && options.data ? options.data.chatId : null
      });
    },
    setUnreadCount: (count) => desktopBridge.setUnread(count),
    showDesktopNotification: (data) => desktopBridge.notify(data),
    onMaximizeChange: (cb) => {
      ipcRenderer.on('window-maximize-changed', (_e, val) => cb(val));
    }
  });
} catch (e) {
  console.error('[Preload] Failed to expose Desktop bridge:', e);
}

// Ensure desktop class is added to html immediately
try {
  if (document.documentElement) {
    document.documentElement.classList.add('is-desktop-app');
  }
} catch (_) {}

// Inject Discord-style Desktop Layout & Drag Area CSS into document
window.addEventListener('DOMContentLoaded', () => {
  try {
    document.documentElement.classList.add('is-desktop-app');
    document.body.classList.add('is-desktop-app');

    const style = document.createElement('style');
    style.id = 'discord-desktop-window-style';
    style.textContent = `
      /* Discord Desktop Titlebar & Layout */
      html.is-desktop-app {
        padding-top: 0 !important;
        margin: 0 !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      body.is-desktop-app {
        margin: 0 !important;
        padding: 0 !important;
        padding-top: 32px !important;
        height: 100vh !important;
        max-height: 100vh !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }

      body.is-desktop-app #desktopDiscordTitlebar {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 32px !important;
        z-index: 999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 142px 0 14px !important;
        -webkit-app-region: drag !important;
        user-select: none !important;
        background: var(--bg, #0f1923) !important;
        border-bottom: 1px solid var(--border, rgba(88, 139, 179, 0.15)) !important;
        transition: background 0.25s ease, border-color 0.25s ease !important;
      }

      body.is-desktop-app .dt-drag-area {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        width: 100% !important;
        height: 100% !important;
      }

      body.is-desktop-app .dt-left {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      body.is-desktop-app .dt-logo {
        width: 18px !important;
        height: 18px !important;
        border-radius: 4px !important;
        display: block !important;
      }

      body.is-desktop-app .dt-title {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--text2, #8aabb8) !important;
        letter-spacing: 0.2px !important;
        white-space: nowrap !important;
      }

      body.is-desktop-app .dt-divider {
        color: var(--text2, #8aabb8) !important;
        opacity: 0.4 !important;
        font-size: 10px !important;
      }

      body.is-desktop-app .dt-chat-name {
        font-size: 12px !important;
        font-weight: 500 !important;
        color: var(--text, #e8f0f9) !important;
        max-width: 320px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      body.is-desktop-app .sidebar,
      body.is-desktop-app .main {
        height: 100% !important;
        max-height: 100% !important;
        top: 0 !important;
        margin-top: 0 !important;
        position: relative !important;
        box-sizing: border-box !important;
      }

      /* Keep all buttons, inputs, links, avatars and tabs clickable without dragging */
      button,
      input,
      select,
      textarea,
      a,
      .btn,
      .action-btn,
      .iBtn,
      .tab,
      .chat-item,
      .msg,
      .avatar,
      .clickable,
      .interactive,
      [role="button"],
      #searchContainer,
      .search-box,
      .theme-picker,
      .theme-opt,
      .modal-box {
        -webkit-app-region: no-drag !important;
      }
    `;
    document.head.appendChild(style);

    // Initial theme sync to desktop
    const curSavedTheme = localStorage.getItem('theme') || 'dark';
    if (desktopBridge.setTheme) {
      desktopBridge.setTheme(curSavedTheme);
    }
  } catch (_) {}
});
