// Desktop notification bridge — works both in Electron (via NonsenseDesktop) and browser
export function sendDesktopNotification(title: string, body: string, chatId?: string, icon?: string) {
  // Electron native notifications
  const w = window as unknown as {
    NonsenseDesktop?: { notify: (data: object) => void };
    electronAPI?: { sendNotification: (title: string, options: object) => void };
  };

  if (w.NonsenseDesktop?.notify) {
    w.NonsenseDesktop.notify({ title, body, chatId });
    return;
  }
  if (w.electronAPI?.sendNotification) {
    w.electronAPI.sendNotification(title, { body, data: { chatId } });
    return;
  }

  // Browser Notification API fallback
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: icon || '/logo.png',
        tag: chatId,
        renotify: true,
        silent: false,
      } as any);
      if (chatId) {
        n.onclick = () => {
          window.focus();
          n.close();
        };
      }
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification(title, { body, icon: icon || '/logo.png', tag: chatId });
        }
      });
    }
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function isElectron(): boolean {
  if (typeof window === 'undefined') return true;
  const w = window as unknown as { NonsenseDesktop?: object; electronAPI?: object };
  if (w.NonsenseDesktop || w.electronAPI) return true;
  if (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron')) return true;
  return true;
}
