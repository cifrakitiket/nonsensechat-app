// server/fix-typing-and-spoilers.js
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('Processing:', filePath);

  // 1. Усиленный стиль спойлеров (особенно для картинок/медиа)
  const spoilerCssRegex = /\.spoiler\s*\{[\s\S]*?\.spoiler\.vis\s*\{[^}]*\}\s*/;
  if (!spoilerCssRegex.test(content)) {
    console.error('Failed to match spoiler CSS in', filePath);
    process.exit(1);
  }

  const enhancedSpoilerCss = `.spoiler {
      background: rgba(255, 255, 255, .15);
      color: transparent;
      border-radius: 4px;
      cursor: pointer;
      filter: blur(6px);
      transition: .25s;
      user-select: none;
    }

    .spoiler.vis {
      filter: blur(0);
      color: inherit;
      background: transparent;
    }

    /* МЕДИА-СПОЙЛЕРЫ (фото/картинки) */
    div.spoiler {
      position: relative;
      overflow: hidden;
      border-radius: 14px;
      color: inherit;
      background: #0b0e14;
      filter: none;
      display: block;
      cursor: pointer;
    }

    div.spoiler:not(.vis) img,
    div.spoiler:not(.vis) .msg-photo {
      filter: blur(55px) brightness(0.22) saturate(0.15) !important;
      transform: scale(1.18);
      pointer-events: none;
      transition: filter .35s ease, transform .35s ease;
    }

    div.spoiler:not(.vis)::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(11, 14, 20, 0.72);
      backdrop-filter: blur(14px);
      z-index: 2;
      pointer-events: none;
      transition: opacity .35s ease;
    }

    div.spoiler:not(.vis)::after {
      content: '👁️‍🗨️ Спойлер';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 8px 18px;
      border-radius: 24px;
      background: rgba(18, 24, 38, 0.85);
      backdrop-filter: blur(12px);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: .4px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      z-index: 3;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: opacity .35s ease, transform .35s ease;
    }

    div.spoiler:not(.vis) .photo-time-overlay {
      display: none;
    }

    div.spoiler.vis {
      filter: none;
      background: transparent;
    }

    div.spoiler.vis img,
    div.spoiler.vis .msg-photo {
      filter: none !important;
      transform: scale(1);
      transition: filter .35s ease, transform .35s ease;
    }

    div.spoiler.vis::before,
    div.spoiler.vis::after {
      opacity: 0;
      pointer-events: none;
    }
`;

  content = content.replace(spoilerCssRegex, enhancedSpoilerCss);
  console.log('✓ Enhanced spoiler CSS applied');

  // 2. isUserTyping и userStatusText / renderVpStatus
  const statusBlockRegex = /function userStatusText\(u[\s\S]*?function renderVpStatus\(u\)\s*\{[\s\S]*?refreshPresenceUI\(\)\s*\{[\s\S]*?setInterval\(refreshPresenceUI,\s*30000\);/;
  if (!statusBlockRegex.test(content)) {
    console.error('Failed to match statusBlockRegex in', filePath);
    process.exit(1);
  }

  const newStatusBlock = `function isUserTyping(u, chatId) {
      if (!u || !chatId || u.typingIn !== chatId) return false;
      if (!userIsOnline(u)) return false;
      const t = asDate(u.typingAt);
      if (!t) return false;
      const diff = Date.now() - t.getTime();
      return diff >= 0 && diff < 4500;
    }
    function userStatusText(u, chatId = null) {
      if (userIsOnline(u)) {
        if (chatId && isUserTyping(u, chatId)) return '✏️ Печатает...';
        return 'В сети';
      }
      if (u?.hideLastSeen) return 'Не в сети';
      const lastSeen = asDate(u?.lastSeen);
      return lastSeen ? 'Был(а) ' + fmtLastSeen(lastSeen) : 'Не в сети';
    }
    function updateChatItemStatus(uid, u) {
      document.querySelectorAll(\`.chat-item[data-user="\${uid}"]\`).forEach(el => {
        const online = userIsOnline(u);
        const wrap = el.querySelector('.chat-ava-wrap');
        const dot = el.querySelector('.chat-online-dot');
        if (online && !dot) wrap.insertAdjacentHTML('beforeend', '<div class="chat-online-dot"></div>');
        if (!online && dot) dot.remove();
      });
    }
    function renderVpStatus(u) {
      const statusEl = document.getElementById('vpStatus');
      if (!statusEl || !u) return;
      if (userIsOnline(u)) {
        statusEl.innerText = (activeId && isUserTyping(u, activeId)) ? '✏️ Печатает...' : '🟢 В сети';
        statusEl.className = 'user-status-line online';
      } else if (u.hideLastSeen) {
        statusEl.innerText = '🔴 Не в сети';
        statusEl.className = 'user-status-line';
      } else {
        const ls = asDate(u.lastSeen);
        statusEl.innerText = ls ? '🕐 Был(а) ' + fmtLastSeen(ls) : '🔴 Не в сети';
        statusEl.className = 'user-status-line';
      }
    }
    function updateGroupTypersHeader(chatId = activeId, chatData = activeChat) {
      if (!chatId || chatData?.type !== 'group') return;
      const c = window._chatGroupData;
      if (!c) return;
      const typers = c.typing || {};
      const now = Date.now();
      const typerNames = Object.entries(typers).filter(([uid, v]) => {
        if (uid === me?.uid || !v) return false;
        let time = 0;
        if (typeof v === 'number') {
          time = v;
        } else {
          const d = asDate(v);
          if (d) time = d.getTime();
        }
        if (!time) return false;
        return (now - time) >= 0 && (now - time) < 4500;
      }).map(([uid]) => uid);

      const subEl = document.getElementById('chSub');
      if (!subEl) return;
      if (typerNames.length > 0) {
        Promise.all(typerNames.slice(0, 2).map(uid => getUser(uid))).then(users => {
          if (activeId !== chatId) return;
          const names = users.filter(Boolean).map(u => u.nick);
          if (names.length > 0) {
            subEl.innerText = '✏️ ' + names.join(', ') + ' печатает...';
          } else {
            subEl.innerText = chatData.desc || (chatData.members?.length || 0) + ' участников';
          }
        });
      } else {
        subEl.innerText = chatData.desc || (chatData.members?.length || 0) + ' участников';
      }
    }
    function refreshPresenceUI() {
      if (activeChat?.type === 'dm' && window._chatPeerUser) {
        const el = document.getElementById('chSub');
        if (el) el.innerText = userStatusText(window._chatPeerUser, activeId);
      } else if (activeChat?.type === 'group' && window._chatGroupData) {
        updateGroupTypersHeader();
      }
      const vp = document.getElementById('modal-viewprofile');
      if (vp && !vp.classList.contains('hidden') && window._vpUser) renderVpStatus(window._vpUser);
      document.querySelectorAll('.chat-item[data-user]').forEach(el => {
        const uid = el.getAttribute('data-user');
        if (uid && uCache[uid]) updateChatItemStatus(uid, uCache[uid]);
      });
    }
    setInterval(refreshPresenceUI, 3000);`;

  content = content.replace(statusBlockRegex, newStatusBlock);
  console.log('✓ Presence and group typers header logic applied');

  // 3. openChat — сброс тайпинга при переключении чатов и группа в onSnapshot
  const openChatHeadRegex = /async function openChat\(id,\s*data\)\s*\{/;
  if (!openChatHeadRegex.test(content)) {
    console.error('Failed to match openChatHeadRegex in', filePath);
    process.exit(1);
  }
  content = content.replace(openChatHeadRegex, `async function openChat(id, data) {
      if (typeof stopTyping === 'function' && isTyping && activeId && activeId !== id) {
        stopTyping(activeId);
      }`);

  // openChat — сохранение window._chatGroupData и вызов updateGroupTypersHeader
  const groupPresenceRegex = /\/\/\s*Listen for typing in groups[\s\S]*?presenceUnsub\s*=\s*db\.collection\('chats'\)\.doc\(id\)\.onSnapshot\(d\s*=>\s*\{[\s\S]*?document\.getElementById\('chSub'\)\.innerText\s*=\s*data\.desc[\s\S]*?\}\);\s*\}\s*document\.body\.classList\.add\('mobile-chat-open'\);/;
  if (!groupPresenceRegex.test(content)) {
    console.error('Failed to match groupPresenceRegex in', filePath);
    process.exit(1);
  }

  const newGroupPresence = `// Listen for typing in groups
        presenceUnsub = db.collection('chats').doc(id).onSnapshot(d => {
          const c = d.data(); if (!c) return;
          window._chatGroupData = c;
          updateGroupTypersHeader(id, data);
        });
      }
      document.body.classList.add('mobile-chat-open');`;

  content = content.replace(groupPresenceRegex, newGroupPresence);
  console.log('✓ openChat typing cleanup & group presence updated');

  // 4. Блок /* ═══ TYPING ═══ */ — функция stopTyping и надежный onTyping
  const typingSectionRegex = /\/\*\s*═══\s*TYPING\s*═══\s*\*\/[\s\S]*?(?=\/\*\s*═══\s*LINK PROCESSING)/;
  if (!typingSectionRegex.test(content)) {
    console.error('Failed to match typingSectionRegex in', filePath);
    process.exit(1);
  }

  const newTypingSection = `/* ═══ TYPING ═══ */
    function stopTyping(targetChatId = activeId) {
      clearTimeout(typingTimer);
      typingTimer = null;
      if (!isTyping) return;
      isTyping = false;
      if (!me) return;
      if (activeChat?.type === 'group' || (targetChatId && String(targetChatId).startsWith('grp_'))) {
        if (targetChatId) {
          db.collection('chats').doc(targetChatId).update({ [\`typing.\${me.uid}\`]: false }).catch(() => { });
        }
      } else {
        db.collection('users').doc(me.uid).update({ typingIn: null, typingAt: null }).catch(() => { });
      }
    }

    async function onTyping() {
      if (!activeId || !me) return;
      const txt = (minp()?.innerText || '').replace(/[\\u00a0\\u200b\\u200c\\u200d\\ufeff]/g, ' ').trim();
      if (!txt) {
        stopTyping();
        return;
      }
      const now = Date.now();
      isTyping = true;
      if (activeChat?.type === 'group') {
        db.collection('chats').doc(activeId).update({ [\`typing.\${me.uid}\`]: now }).catch(() => { });
      } else {
        db.collection('users').doc(me.uid).update({
          typingIn: activeId,
          typingAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => { });
      }
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        stopTyping();
      }, 2500);
    }

    `;

  content = content.replace(typingSectionRegex, newTypingSection);
  console.log('✓ TYPING section (stopTyping + onTyping) updated');

  // 5. sendMsg — вызов stopTyping()
  const sendMsgStopTypingRegex = /\/\/\s*Stop typing[\s\S]*?(?=\s*try\s*\{)/;
  if (!sendMsgStopTypingRegex.test(content)) {
    console.error('Failed to match sendMsgStopTypingRegex in', filePath);
    process.exit(1);
  }
  content = content.replace(sendMsgStopTypingRegex, `// Stop typing
      if (typeof stopTyping === 'function') stopTyping();
  `);
  console.log('✓ sendMsg typing cleanup updated');

  // 6. visibilitychange и beforeunload / pagehide
  const visRegex = /document\.addEventListener\('visibilitychange',\s*(?:\(\s*\)|\(\s*\)\s*=>)[\s\S]*?clearUnread\(activeId\);\s*\}\);/;
  if (!visRegex.test(content)) {
    console.error('Failed to match visRegex in', filePath);
    process.exit(1);
  }
  content = content.replace(visRegex, `document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (typeof stopTyping === 'function') stopTyping();
      } else if (activeId) {
        clearUnread(activeId);
      }
    });`);

  const unloadRegex = /window\.addEventListener\('beforeunload',\s*(?:\(\s*\)|\(\s*\)\s*=>)[\s\S]*?db\.collection\('users'\)\.doc\(me\.uid\)\.update\(\{[\s\S]*?\}\);?\s*\}\);/;
  if (!unloadRegex.test(content)) {
    console.error('Failed to match unloadRegex in', filePath);
    process.exit(1);
  }
  content = content.replace(unloadRegex, `window.addEventListener('beforeunload', () => {
      if (typeof stopTyping === 'function') stopTyping();
      if (me) db.collection('users').doc(me.uid).update({ online: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp(), typingIn: null, typingAt: null });
    });
    window.addEventListener('pagehide', () => {
      if (typeof stopTyping === 'function') stopTyping();
    });`);
  console.log('✓ visibilitychange and unload handlers updated');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully written:', filePath);
}
console.log('All patches complete!');
