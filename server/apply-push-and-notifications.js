const fs = require('fs');
const path = 'd:/messenger/public/index.html';

let content = fs.readFileSync(path, 'utf8');

console.log('Original length:', content.length);

// 1. Check if NTFY_VAPID_PUBLIC_KEY is already present
if (!content.includes('NTFY_VAPID_PUBLIC_KEY')) {
  console.log('Injecting Push & Notification helpers...');

  const notifHelpersCode = `
    /* ═══════════════════════════════════════════════════════════════════════
       PUSH-УВЕДОМЛЕНИЯ И WEB PUSH (В Т.Ч. КОГДА САЙТ ЗАКРЫТ)
       ═══════════════════════════════════════════════════════════════════════ */
    const NTFY_VAPID_PUBLIC_KEY = 'BEMjM0sNxh41x0a6Lz3YaqkJ7AUhZefxsOQgw-at69i0fM1CybVBcj7-QQXf4N_tPCgFnOXdRbQ5jrSrr9Yg9Lc';

    function cleanUidForTopic(uid) {
      return String(uid || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function urlB64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/\\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    async function registerWebPushForUser(userUid) {
      if (!userUid) return false;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[WebPush] PushManager не поддерживается данным браузером');
        return false;
      }
      try {
        if (!('Notification' in window)) return false;
        if (Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') {
            console.log('[WebPush] Разрешение на уведомления отклонено');
            return false;
          }
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(NTFY_VAPID_PUBLIC_KEY)
          });
        }

        const topic = 'nonsensechat_usr_' + cleanUidForTopic(userUid);
        const rawAuth = sub.getKey ? sub.getKey('auth') : null;
        const rawP256dh = sub.getKey ? sub.getKey('p256dh') : null;
        const auth = rawAuth ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuth))) : '';
        const p256dh = rawP256dh ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawP256dh))) : '';

        const res = await fetch('https://ntfy.sh/v1/webpush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            auth: auth,
            p256dh: p256dh,
            topics: [topic]
          })
        });

        if (res.ok) {
          console.log('[WebPush] Успешно зарегистрирован топик Web Push:', topic);
          localStorage.setItem('nonsense_webpush_subscribed', topic);
          return true;
        } else {
          console.warn('[WebPush] Ошибка регистрации в ntfy:', res.status);
          return false;
        }
      } catch (err) {
        console.warn('[WebPush] Исключение при подписке на Web Push:', err);
        return false;
      }
    }

    async function dispatchPushToChat(chatId, previewText, chatData) {
      if (!chatId || !me || !me.uid) return;
      try {
        const c = chatData || (allChats || []).find(x => x.id === chatId) || (activeChat && activeId === chatId ? activeChat : null);
        let members = (c && c.members) || [];
        if (!members.length && window.db) {
          try {
            const snap = await db.collection('chats').doc(chatId).get();
            if (snap.exists) members = snap.data().members || [];
          } catch (_) {}
        }
        const recipients = members.filter(uid => uid && uid !== me.uid);
        if (!recipients.length) return;

        const senderName = me.nick ? ('@' + me.nick) : (me.displayName || 'Новое сообщение');
        const safeText = String(previewText || 'Новое сообщение').slice(0, 140);
        const clickUrl = 'https://nonsensechat.ru/?openChat=' + encodeURIComponent(chatId);

        for (const rUid of recipients) {
          const topic = 'nonsensechat_usr_' + cleanUidForTopic(rUid);
          // 1. Отправляем в ntfy топик получателя (для закрытого сайта / PWA / Android)
          try {
            fetch('https://ntfy.sh/' + topic, {
              method: 'POST',
              headers: {
                'Title': senderName,
                'Click': clickUrl,
                'Icon': 'https://nonsensechat.ru/logo.png',
                'Tags': 'speech_balloon,incoming_envelope',
                'Priority': 'high'
              },
              body: safeText
            }).catch(() => {});
          } catch (_) {}

          // 2. Отправляем в Realtime Database получателя (для открытых / фоновых вкладок)
          try {
            if (_fbDb) {
              _fbDb.ref('notifications/' + rUid).set({
                senderUid: me.uid,
                senderNick: senderName,
                text: safeText,
                chatId: chatId,
                at: firebase.database.ServerValue.TIMESTAMP
              }).catch(() => {});
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn('[Push] dispatchPushToChat failed:', err);
      }
    }

    let _rtdbNotifSubscribed = false;
    function initRtdbNotifListener(userUid) {
      if (!userUid || !_fbDb || _rtdbNotifSubscribed) return;
      _rtdbNotifSubscribed = true;
      try {
        const ref = _fbDb.ref('notifications/' + userUid);
        ref.on('value', snap => {
          const data = snap.val();
          if (!data || !data.senderUid || data.senderUid === me.uid) return;
          // Игнорируем старые уведомления (старше 20 секунд)
          if (data.at && Math.abs(Date.now() - data.at) > 20000) return;
          const isOpenNow = (data.chatId === activeId) && !document.hidden && document.hasFocus();
          if (!isOpenNow) {
            beep();
            try { if (navigator.vibrate) navigator.vibrate([180, 80, 180]); } catch (_) {}
            systemNotify(data.senderNick, data.text, data.chatId);
            showToast(data.senderNick, data.text, () => openChatById(data.chatId));
          }
        });
      } catch (e) {
        console.warn('RTDB notif listener init error:', e);
      }
    }

    function testNotificationAndSound() {
      beep();
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (_) {}
      showToast('🔊 Проверка звука', 'Звук воспроизведён, уведомление отправлено!', 'success');
      systemNotify('Беспонтовый Чат', 'Тестовое уведомление работает отлично! Нажмите для проверки перехода.', activeId || '');
    }

    function openNotifSettingsModal() {
      const topic = me && me.uid ? ('nonsensechat_usr_' + cleanUidForTopic(me.uid)) : '';
      const ntfyWebUrl = topic ? ('https://ntfy.sh/' + topic) : 'https://ntfy.sh';
      let m = document.getElementById('modal-notifsettings');
      if (!m) {
        m = document.createElement('div');
        m.id = 'modal-notifsettings';
        m.className = 'modal hidden';
        document.body.appendChild(m);
      }
      const permGranted = ('Notification' in window) && Notification.permission === 'granted';

      m.innerHTML = \`
        <div class="modal-box" style="max-width:440px;padding:24px 20px;">
          <div class="modal-title" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#ea580c);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;">
              <i class="fa-solid fa-bell"></i>
            </div>
            <div>
              <div style="font-size:17px;font-weight:700;">Уведомления и пуш</div>
              <div style="font-size:12px;color:var(--text2,#8a9aa8);">Настройка доставки сообщений</div>
            </div>
          </div>

          <div style="background:var(--card2,#18222d);border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:14px;margin-bottom:14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:13.5px;font-weight:600;">Системные уведомления</span>
              <span id="notifPermBadge" style="font-size:12px;padding:3px 8px;border-radius:6px;background:\${permGranted ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'};color:\${permGranted ? '#10b981' : '#ef4444'};font-weight:600;">
                \${permGranted ? 'Разрешены ✓' : 'Не включены'}
              </span>
            </div>
            <p style="font-size:12px;color:var(--text2,#8a9aa8);margin:0 0 12px 0;line-height:1.4;">
              Показывают тосты Windows/Android и воспроизводят звук, когда сайт свёрнут или открыто другое окно.
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="iBtn" style="flex:1;background:var(--acc,#5b8fb9);color:#fff;" onclick="requestAndRegisterNotifs()">
                \${permGranted ? 'Обновить разрешение' : 'Включить уведомления'}
              </button>
              <button class="iBtn" style="background:rgba(255,255,255,.08);color:var(--text,#fff);" onclick="testNotificationAndSound()">
                Проверить звук
              </button>
            </div>
          </div>

          <div style="background:var(--card2,#18222d);border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:14px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <i class="fa-solid fa-mobile-screen-button" style="color:var(--acc,#5b8fb9)"></i>
              <span style="font-size:13.5px;font-weight:600;">Уведомления при закрытом сайте</span>
            </div>
            <p style="font-size:12px;color:var(--text2,#8a9aa8);margin:0 0 12px 0;line-height:1.4;">
              Чтобы пуши приходили на заблокированный телефон или ПК, даже когда браузер закрыт: подключите ваш личный канал в 1 клик. Клик по уведомлению сразу откроет нужный чат.
            </p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <a href="\${ntfyWebUrl}" target="_blank" rel="noopener noreferrer" class="iBtn" style="display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;font-weight:600;">
                <i class="fa-solid fa-bell"></i> Подключить телефон (1 клик)
              </a>
              <button class="iBtn" style="background:rgba(255,255,255,.06);color:var(--text,#fff);" onclick="navigator.clipboard.writeText('\${ntfyWebUrl}');showToast('Скопировано','Ссылка на ваш канал скопирована','success');">
                <i class="fa-solid fa-copy"></i> Скопировать ссылку канала
              </button>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;">
            <button class="iBtn" onclick="closeModal('modal-notifsettings')">Закрыть</button>
          </div>
        </div>
      \`;

      openModal('modal-notifsettings');
    }

    async function requestAndRegisterNotifs() {
      if (!('Notification' in window)) {
        showToast('Уведомления', 'Браузер не поддерживает системные уведомления', 'warning');
        return;
      }
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          showToast('Успешно', 'Уведомления успешно включены!', 'success');
          if (me && me.uid) registerWebPushForUser(me.uid);
          testNotificationAndSound();
        } else {
          showToast('Внимание', 'Разрешение отклонено в браузере. Разрешите в настройках сайта.', 'warning');
        }
        if (typeof renderTgProfileScreen === 'function') renderTgProfileScreen();
        const badge = document.getElementById('notifPermBadge');
        if (badge) {
          const granted = perm === 'granted';
          badge.style.background = granted ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)';
          badge.style.color = granted ? '#10b981' : '#ef4444';
          badge.textContent = granted ? 'Разрешены ✓' : 'Не включены';
        }
      } catch (e) {
        showToast('Ошибка', e.message || 'Не удалось запросить разрешение', 'error');
      }
    }
  `;

  // Inject right before function systemNotify
  content = content.replace('function systemNotify(title, body, chatId) {', notifHelpersCode + '\n    function systemNotify(title, body, chatId) {');
  console.log('✓ Injected Push & Notification helpers');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done preliminary injection');
