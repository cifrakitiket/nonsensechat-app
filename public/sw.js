/* ════════════════════════════════════════════════════════════════════════
   OFFICIAL SERVICE WORKER — NONSENSECHAT (БЕСПОНТОВЫЙ ЧАТ)
   Firebase & Google Cloud Messaging (FCM) + Web Push Handler
   ════════════════════════════════════════════════════════════════════════ */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* ── Входящий официальный Web Push / FCM (в фоновом или закрытом браузере) ── */
self.addEventListener('push', (event) => {
  let title = 'NonsenseChat';
  let body = 'Новое сообщение';
  let clickUrl = '/';
  let chatId = '';

  if (event.data) {
    try {
      const data = event.data.json();
      const notif = data.notification || {};
      const payload = data.data || {};

      title = notif.title || data.title || payload.title || title;
      body = notif.body || data.body || payload.body || payload.text || body;
      chatId = payload.chatId || data.chatId || '';
      clickUrl = payload.url || (data.fcmOptions && data.fcmOptions.link) || '';

      if (!chatId && clickUrl) {
        try {
          const u = new URL(clickUrl, self.location.origin);
          chatId = u.searchParams.get('openChat') || u.searchParams.get('chat') || '';
        } catch (_) {}
      }
    } catch (err) {
      try {
        body = event.data.text() || body;
      } catch (_) {}
    }
  }

  const targetUrl = clickUrl || (chatId ? ('/?openChat=' + encodeURIComponent(chatId)) : '/');
  const origin = self.location.origin || 'https://nonsensechattm-e5d18.web.app';
  const iconUrl = origin + '/logo.png';
  const badgeUrl = origin + '/favicon-96x96.png';

  const options = {
    body: body,
    icon: iconUrl,
    badge: badgeUrl,
    vibrate: [200, 100, 200],
    tag: chatId ? ('chat-' + chatId) : ('msg-' + Date.now()),
    renotify: true,
    requireInteraction: false,
    data: {
      chatId: chatId,
      url: targetUrl
    },
    actions: [
      { action: 'open', title: '💬 Открыть чат' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ── Клик по системному уведомлению — быстрый переход в нужный чат ── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const chatId = notifData.chatId || '';
  const targetUrl = notifData.url || (chatId ? ('/?openChat=' + encodeURIComponent(chatId)) : '/');

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    
    // 1. Если окно уже открыто — переключаемся на него и активируем чат
    for (const client of clientList) {
      if ('focus' in client) {
        try {
          await client.focus();
        } catch (_) {}
        if (chatId) {
          client.postMessage({ type: 'open-chat', chatId: chatId });
        }
        return;
      }
    }

    // 2. Если сайт был закрыт — запускаем окно сразу с ссылкой на чат ?openChat=...
    if (self.clients.openWindow) {
      const fullUrl = new URL(targetUrl, self.location.origin).href;
      await self.clients.openWindow(fullUrl);
    }
  })());
});

/* ── Приём локальных команд от открытой вкладки ── */
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'show-notification') {
    const title = event.data.title || 'NonsenseChat';
    const opts = event.data.options || {};
    self.registration.showNotification(title, opts).catch(() => {});
  }
});
