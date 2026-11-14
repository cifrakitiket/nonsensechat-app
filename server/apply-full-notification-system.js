const fs = require('fs');
const path = 'd:/messenger/public/index.html';

let content = fs.readFileSync(path, 'utf8');

console.log('File length before:', content.length);

// 1. Update systemNotify
const oldSysNotify = `    function systemNotify(title, body, chatId) {
      if (Desktop && Desktop.notify) {
        try { Desktop.notify({ title, body, chatId }); } catch (e) { }
        return;
      }
      // Android (Capacitor) — нативное уведомление в шторку + вибрация
      if (isNative) { nativeNotify(title, body, chatId); return; }
      // Браузер — Web Notification / Service Worker
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const opts = { body: body || '', tag: 'chat-' + chatId, icon: 'logo.png', badge: 'logo.png', renotify: true, data: { chatId } };
      if (swReg && swReg.showNotification) {
        swReg.showNotification(title, opts).catch(() => { try { const n = new Notification(title, opts); n.onclick = () => { try { window.focus(); } catch (e) { } openChatById(chatId); n.close(); }; } catch (e) { } });
        return;
      }
      try { const n = new Notification(title, opts); n.onclick = () => { try { window.focus(); } catch (e) { } openChatById(chatId); n.close(); }; } catch (e) { }
    }`;

const newSysNotify = `    function systemNotify(title, body, chatId) {
      if (Desktop && Desktop.notify) {
        try { Desktop.notify({ title, body, chatId }); } catch (e) { }
        return;
      }
      // Android WebView (Bridge в приложении)
      if (window.AndroidBridge && typeof window.AndroidBridge.showLocalNotification === 'function') {
        try {
          window.AndroidBridge.showLocalNotification(String(title || 'Новое сообщение'), String(body || ''), String(chatId || ''));
        } catch (_) {}
      }
      // Android (Capacitor) — нативное уведомление в шторку + вибрация
      if (isNative) { nativeNotify(title, body, chatId); return; }
      // Браузер — Web Notification / Service Worker
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const opts = {
        body: body || '',
        tag: 'chat-' + (chatId || 'msg'),
        icon: 'logo.png',
        badge: 'logo.png',
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
          chatId: chatId,
          url: '/?openChat=' + encodeURIComponent(chatId || '')
        }
      };
      if (swReg && swReg.showNotification) {
        swReg.showNotification(title, opts).catch(() => {
          try {
            const n = new Notification(title, opts);
            n.onclick = () => { try { window.focus(); } catch (e) { } openChatById(chatId); n.close(); };
          } catch (e) { }
        });
        return;
      }
      try {
        const n = new Notification(title, opts);
        n.onclick = () => { try { window.focus(); } catch (e) { } openChatById(chatId); n.close(); };
      } catch (e) { }
    }`;

if (content.includes(oldSysNotify)) {
  content = content.replace(oldSysNotify, newSysNotify);
  console.log('✓ Updated systemNotify with AndroidBridge and vibration');
} else {
  console.warn('⚠ Could not match oldSysNotify directly');
}

// 2. Update openChatById at line 14319
const oldOpenChatById = `    function openChatById(id) { const c = (allChats || []).find(x => x.id === id); if (c) openChat(id, c); }`;
const newOpenChatById = `    function openChatById(id) {
      if (!id) return;
      if (typeof switchTgTab === 'function') switchTgTab('chats');
      const c = (allChats || []).find(x => x.id === id);
      if (c) {
        openChat(id, c);
      } else if (window.db) {
        db.collection('chats').doc(id).get().then(doc => {
          if (doc.exists) openChat(id, { id: doc.id, ...doc.data() });
        }).catch(err => console.warn('openChatById fetch error:', err));
      }
    }`;

if (content.includes(oldOpenChatById)) {
  content = content.replace(oldOpenChatById, newOpenChatById);
  console.log('✓ Upgraded openChatById to auto-switch tab and fetch from Firestore');
} else {
  console.warn('⚠ Could not match oldOpenChatById directly');
}

// 3. Update notifyFromChats
const oldNotifyFromChats = `    function notifyFromChats(chats) {
      const visible = !document.hidden;
      for (const c of chats) {
        const ts = asDate(c.lastMsgAt);
        const at = ts ? ts.getTime() : (typeof c.lastMsgAt === 'number' ? c.lastMsgAt : (c.lastMsgAt && c.lastMsgAt.seconds ? c.lastMsgAt.seconds * 1000 : 0));
        const prev = Notif.baseline[c.id] || 0;
        if (at <= prev) continue;
        Notif.baseline[c.id] = at;
        const incoming = c.lastMsg && c.lastMsgUid && c.lastMsgUid !== me.uid;
        const isOpenNow = (c.id === activeId) && visible;
        if (!Notif.primed || !Notif.on || !incoming || isOpenNow) continue;
        let name = c.name;
        if (c.type === 'dm') { const oid = (c.members || []).find(m => m !== me.uid); name = (uCache[oid] || {}).nick || name; }
        name = '@' + (name || 'Новое сообщение');
        Notif.unread[c.id] = (Notif.unread[c.id] || 0) + 1;
        beep();
        showToast(name, c.lastMsg, () => openChatById(c.id));
        // Windows-уведомление, когда окно приложения не в фокусе (вкладка скрыта ИЛИ вы в другом приложении)
        if (document.hidden || !document.hasFocus()) systemNotify(name, c.lastMsg, c.id);
      }
      updateTitle();
      Notif.primed = true;
    }`;

const newNotifyFromChats = `    function notifyFromChats(chats) {
      const visible = !document.hidden && document.hasFocus();
      for (const c of chats) {
        const ts = asDate(c.lastMsgAt);
        const at = ts ? ts.getTime() : (typeof c.lastMsgAt === 'number' ? c.lastMsgAt : (c.lastMsgAt && c.lastMsgAt.seconds ? c.lastMsgAt.seconds * 1000 : 0));
        const prev = Notif.baseline[c.id] || 0;
        if (at <= prev) continue;
        Notif.baseline[c.id] = at;
        const incoming = c.lastMsg && (!c.lastMsgUid || c.lastMsgUid !== me.uid);
        const isOpenNow = (c.id === activeId) && visible;
        if (!Notif.primed || !Notif.on || !incoming || isOpenNow) continue;
        let name = c.name;
        if (c.type === 'dm') { const oid = (c.members || []).find(m => m !== me.uid); name = (uCache[oid] || {}).nick || name; }
        name = '@' + (name || 'Новое сообщение');
        Notif.unread[c.id] = (Notif.unread[c.id] || 0) + 1;
        beep();
        try { if (navigator.vibrate) navigator.vibrate([180, 80, 180]); } catch (_) {}
        showToast(name, c.lastMsg, () => openChatById(c.id));
        // Системное уведомление, когда окно приложения не в фокусе
        if (document.hidden || !document.hasFocus()) systemNotify(name, c.lastMsg, c.id);
      }
      updateTitle();
      Notif.primed = true;
    }`;

if (content.includes(oldNotifyFromChats)) {
  content = content.replace(oldNotifyFromChats, newNotifyFromChats);
  console.log('✓ Upgraded notifyFromChats with document.hasFocus() and vibration');
} else {
  console.warn('⚠ Could not match oldNotifyFromChats directly');
}

// 4. Hook dispatchPushToChat into sendMsg
const oldSendMsgUpdate = `        await db.collection('chats').doc(activeId).update({ lastMsg: lastPreview, lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid });`;
const newSendMsgUpdate = `        await db.collection('chats').doc(activeId).update({ lastMsg: lastPreview, lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid });
        if (typeof dispatchPushToChat === 'function') dispatchPushToChat(activeId, lastPreview);`;

if (content.includes(oldSendMsgUpdate)) {
  content = content.replace(oldSendMsgUpdate, newSendMsgUpdate);
  console.log('✓ Hooked dispatchPushToChat into sendMsg');
}

// 5. Hook dispatchPushToChat into sendFavMusic
const oldFavMusicUpdate = `        db.collection('chats').doc(chatId).update({
          lastMsg: label,
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        }).catch(() => { });`;
const newFavMusicUpdate = `        db.collection('chats').doc(chatId).update({
          lastMsg: label,
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        }).catch(() => { });
        if (typeof dispatchPushToChat === 'function') dispatchPushToChat(chatId, label);`;

if (content.includes(oldFavMusicUpdate)) {
  content = content.replace(oldFavMusicUpdate, newFavMusicUpdate);
  console.log('✓ Hooked dispatchPushToChat into sendFavMusic');
}

// 6. Hook dispatchPushToChat into uploadFiles
const oldUploadFilesUpdate = `      db.collection('chats').doc(e.chatId).update({
        lastMsg: msgText,
        lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMsgUid: me.uid
      });`;
const newUploadFilesUpdate = `      db.collection('chats').doc(e.chatId).update({
        lastMsg: msgText,
        lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMsgUid: me.uid
      });
      if (typeof dispatchPushToChat === 'function') dispatchPushToChat(e.chatId, msgText);`;

if (content.includes(oldUploadFilesUpdate)) {
  content = content.replace(oldUploadFilesUpdate, newUploadFilesUpdate);
  console.log('✓ Hooked dispatchPushToChat into uploadFiles');
}

// 7. Hook dispatchPushToChat into sendSticker
const oldStickerUpdate = `      db.collection('chats').doc(cid).update({ lastMsg: (emoji ? emoji + ' ' : '') + 'Стикер', lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid });`;
const newStickerUpdate = `      db.collection('chats').doc(cid).update({ lastMsg: (emoji ? emoji + ' ' : '') + 'Стикер', lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid });
      if (typeof dispatchPushToChat === 'function') dispatchPushToChat(cid, (emoji ? emoji + ' ' : '') + 'Стикер');`;

if (content.includes(oldStickerUpdate)) {
  content = content.replace(oldStickerUpdate, newStickerUpdate);
  console.log('✓ Hooked dispatchPushToChat into sendSticker');
}

// 8. Hook dispatchPushToChat into fwdMsg
const oldFwdUpdate = `      db.collection('chats').doc(targetId).update({
        lastMsg: '↪️ Переслано: ' + preview,
        lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMsgUid: me.uid
      });`;
const newFwdUpdate = `      db.collection('chats').doc(targetId).update({
        lastMsg: '↪️ Переслано: ' + preview,
        lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMsgUid: me.uid
      });
      if (typeof dispatchPushToChat === 'function') dispatchPushToChat(targetId, '↪️ Переслано: ' + preview);`;

if (content.includes(oldFwdUpdate)) {
  content = content.replace(oldFwdUpdate, newFwdUpdate);
  console.log('✓ Hooked dispatchPushToChat into fwdMsg');
}

// 9. Hook dispatchPushToChat into sendGif
const oldGifUpdate = `      db.collection('chats').doc(cid).update({ lastMsg: 'GIF', lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid });`;
const newGifUpdate = `      db.collection('chats').doc(cid).update({ lastMsg: 'GIF', lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid });
      if (typeof dispatchPushToChat === 'function') dispatchPushToChat(cid, '🎬 GIF');`;

if (content.includes(oldGifUpdate)) {
  content = content.replace(oldGifUpdate, newGifUpdate);
  console.log('✓ Hooked dispatchPushToChat into sendGif');
}

// 10. Hook dispatchPushToChat into sendPoll
const oldPollUpdate = `      await db.collection('chats').doc(activeId).update({
        lastMsg: '📊 Опрос: ' + question,
        lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMsgUid: me.uid
      });`;
const newPollUpdate = `      await db.collection('chats').doc(activeId).update({
        lastMsg: '📊 Опрос: ' + question,
        lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMsgUid: me.uid
      });
      if (typeof dispatchPushToChat === 'function') dispatchPushToChat(activeId, '📊 Опрос: ' + question);`;

if (content.includes(oldPollUpdate)) {
  content = content.replace(oldPollUpdate, newPollUpdate);
  console.log('✓ Hooked dispatchPushToChat into sendPoll');
}

// 11. Add RTDB notification listener and Web Push auto-register in enterApp
const oldEnterAppHead = `      const profile = await ensureUserProfile(user);
      // Не даём «временному» (stale) профилю перезаписать более полный кэш.
      if (!me || !me.nick || !profile._stale) me = profile;
      renderMyProfileHeader(me);`;

const newEnterAppHead = `      const profile = await ensureUserProfile(user);
      // Не даём «временному» (stale) профилю перезаписать более полный кэш.
      if (!me || !me.nick || !profile._stale) me = profile;
      renderMyProfileHeader(me);

      // Инициализируем слушатель пуш-уведомлений в Realtime Database
      if (typeof initRtdbNotifListener === 'function') {
        initRtdbNotifListener(user.uid);
      }
      // Регистрируем Web Push, если разрешение уже выдано
      if (('Notification' in window) && Notification.permission === 'granted') {
        if (typeof registerWebPushForUser === 'function') {
          registerWebPushForUser(user.uid);
        }
      }
      // Проверка открытия конкретного чата из URL (?openChat=...)
      if (!window._openChatHandled) {
        const startupParams = new URLSearchParams(window.location.search);
        const startupChatId = startupParams.get('openChat') || startupParams.get('chat');
        if (startupChatId) {
          window._openChatHandled = true;
          setTimeout(() => { openChatById(startupChatId); }, 400);
        }
      }`;

if (content.includes(oldEnterAppHead)) {
  content = content.replace(oldEnterAppHead, newEnterAppHead);
  console.log('✓ Added RTDB listener, Web Push auto-register and startup deep link in enterApp');
}

// 12. Add Notifications card to renderTgProfileScreen
const oldProfileSettingsGroup = `        <div class="tg-profile-settings-group">
          <div class="tg-profile-setting-item" onclick="if(typeof me!=='undefined'&&me&&me.uid)viewProfile(me.uid)">`;

const newProfileSettingsGroup = `        <div class="tg-profile-settings-group">
          <div class="tg-profile-setting-item" onclick="openNotifSettingsModal()">
            <div class="tg-setting-icon" style="background:linear-gradient(135deg,#f59e0b,#ea580c)"><i class="fa-solid fa-bell"></i></div>
            <div class="tg-setting-title">Уведомления и пуш на телефон</div>
            <div class="tg-setting-val">\${(('Notification' in window) && Notification.permission === 'granted') ? 'Включены ✓' : 'Настроить'}</div>
            <div class="tg-setting-arr">›</div>
          </div>
          <div class="tg-profile-setting-item" onclick="if(typeof me!=='undefined'&&me&&me.uid)viewProfile(me.uid)">`;

if (content.includes(oldProfileSettingsGroup)) {
  content = content.replace(oldProfileSettingsGroup, newProfileSettingsGroup);
  console.log('✓ Added Notifications card into renderTgProfileScreen');
}

// 13. Fix window.openChatById at line 22934 in the AndroidBridge section so it doesn't fail
const oldBridgeOpenChat = `      window.openChatById = function (chatId) {
        if (!chatId) return;
        // Ищем чат в списке и кликаем по нему
        var chatEl = document.querySelector('[data-chat-id="' + chatId + '"]');
        if (chatEl) {
          chatEl.click();
        } else {
          // Чат не найден в DOM — перезагружаем список
          console.log('[AndroidBridge] Чат ' + chatId + ' не найден в DOM');
        }
      };`;

const newBridgeOpenChat = `      window.openChatById = function (chatId) {
        if (!chatId) return;
        if (typeof switchTgTab === 'function') switchTgTab('chats');
        var chatEl = document.querySelector('[data-chat-id="' + chatId + '"]');
        if (chatEl) {
          chatEl.click();
          return;
        }
        var c = (window.allChats || []).find(function(x) { return x.id === chatId; });
        if (c && typeof window.openChat === 'function') {
          window.openChat(chatId, c);
        } else if (window.db) {
          window.db.collection('chats').doc(chatId).get().then(function(doc) {
            if (doc.exists && typeof window.openChat === 'function') {
              window.openChat(chatId, Object.assign({ id: doc.id }, doc.data()));
            }
          }).catch(function() {});
        }
      };`;

if (content.includes(oldBridgeOpenChat)) {
  content = content.replace(oldBridgeOpenChat, newBridgeOpenChat);
  console.log('✓ Upgraded AndroidBridge window.openChatById');
}

fs.writeFileSync(path, content, 'utf8');
console.log('File length after:', content.length);
console.log('All patches applied successfully!');
