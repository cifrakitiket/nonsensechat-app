const fs = require('fs');
const path = 'd:/messenger/public/index.html';

let content = fs.readFileSync(path, 'utf8');

console.log('Original length:', content.length);

// 1. Update #modal-viewprofile .mcard and .mbody styles
const oldVpCardCss = `    #modal-viewprofile .mcard {
      width: 400px;
      padding: 0;
      overflow: hidden;
    }

    #modal-viewprofile .mbody {
      padding: 0 !important;
    }`;

const newVpCardCss = `    #modal-viewprofile .mcard {
      width: 420px;
      max-width: 95vw;
      max-height: 90vh;
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    #modal-viewprofile .mbody {
      padding: 0 !important;
      overflow-y: auto;
      max-height: 90vh;
      -webkit-overflow-scrolling: touch;
    }

    #rightPanel {
      display: none !important;
    }`;

if (content.includes(oldVpCardCss)) {
  content = content.replace(oldVpCardCss, newVpCardCss);
  console.log('✓ Updated modal-viewprofile CSS to scroll and hide rightPanel');
} else {
  console.warn('⚠ Could not find oldVpCardCss directly');
}

// 2. Update chatHeader onclick from toggleRightPanel to openChatInfo
const oldChatHdr = `<div id="chatHeader" class="chat-header hidden" onclick="toggleRightPanel(event)">`;
const newChatHdr = `<div id="chatHeader" class="chat-header hidden" onclick="openChatInfo(event)">`;
if (content.includes(oldChatHdr)) {
  content = content.replace(oldChatHdr, newChatHdr);
  console.log('✓ Changed chatHeader onclick to openChatInfo');
}

const oldInfoBtn = `<button class="iBtn" onclick="toggleRightPanel(event)" title="Информация"><i
          class="fa-solid fa-circle-info"></i></button>`;
const newInfoBtn = `<button class="iBtn" onclick="openChatInfo(event)" title="Профиль собеседника"><i
          class="fa-solid fa-circle-info"></i></button>`;
if (content.includes(oldInfoBtn)) {
  content = content.replace(oldInfoBtn, newInfoBtn);
  console.log('✓ Changed info button onclick to openChatInfo');
} else {
  // Try regex for slightly different spacing
  const infoBtnRegex = /<button class="iBtn" onclick="toggleRightPanel\(event\)" title="Информация"><i[\s\S]*?class="fa-solid fa-circle-info"><\/i><\/button>/;
  if (infoBtnRegex.test(content)) {
    content = content.replace(infoBtnRegex, newInfoBtn);
    console.log('✓ Changed info button onclick to openChatInfo via regex');
  }
}

// 3. Add #vpSharedMediaSection to modal-viewprofile HTML
const targetSection = `        <div class="tgp-section">
          <div class="tgp-actions">
            <button class="tgp-action" onclick="dmFromProfile()"><span class="tgp-row-icon">💬</span><span
                data-i18n="sendMsgBtn">Написать сообщение</span></button>
            <button class="tgp-action" id="vpAddFriendBtn" style="display:none" onclick="addFriendFromProfile()"><span
                class="tgp-row-icon">👤</span><span data-i18n="addFriendBtn">Добавить в друзья</span></button>
          </div>
        </div>`;

const sharedSectionHtml = `        <div class="tgp-section">
          <div class="tgp-actions">
            <button class="tgp-action" onclick="dmFromProfile()"><span class="tgp-row-icon">💬</span><span
                data-i18n="sendMsgBtn">Написать сообщение</span></button>
            <button class="tgp-action" id="vpAddFriendBtn" style="display:none" onclick="addFriendFromProfile()"><span
                class="tgp-row-icon">👤</span><span data-i18n="addFriendBtn">Добавить в друзья</span></button>
          </div>
        </div>
        <!-- Вложения в переписке (фото, файлы, музыка в ЛС) -->
        <div class="tgp-section" id="vpSharedMediaSection" style="display:none"></div>`;

if (!content.includes('id="vpSharedMediaSection"')) {
  if (content.includes(targetSection)) {
    content = content.replace(targetSection, sharedSectionHtml);
    console.log('✓ Injected #vpSharedMediaSection into modal-viewprofile');
  } else {
    console.warn('⚠ Could not match targetSection in modal-viewprofile');
  }
}

// 4. Implement loadVpSharedMedia and delegate toggleRightPanel
const mediaHelperCode = `
    /* ═══════════════════════════════════════════════════════════════════════
       ОБЩИЕ МЕДИА И ФАЙЛЫ В ПРОФИЛЕ ПОЛЬЗОВАТЕЛЯ (ЛС)
       ═══════════════════════════════════════════════════════════════════════ */
    window._vpPhotos = [];
    window._vpFiles = [];
    window._vpAudio = [];

    async function loadVpSharedMedia(uid) {
      const container = document.getElementById('vpSharedMediaSection');
      if (!container) return;

      container.style.display = 'block';
      container.innerHTML = '<div style="padding:14px 18px;color:var(--text2);font-size:12px;text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Загрузка вложений...</div>';

      window._vpPhotos = [];
      window._vpFiles = [];
      window._vpAudio = [];

      try {
        // 1. Ищем ЛС чат между me и uid
        let dmChat = (allChats || []).find(c => c.type === 'dm' && c.members && c.members.includes(uid) && c.members.includes(me.uid));
        let dmChatId = dmChat ? dmChat.id : null;

        if (!dmChatId && activeChat && activeChat.type === 'dm' && activeChat.members && activeChat.members.includes(uid)) {
          dmChatId = activeId;
        }

        if (!dmChatId && window.db) {
          try {
            const q = await db.collection('chats').where('type', '==', 'dm').where('members', 'array-contains', uid).get();
            for (const doc of q.docs) {
              const d = doc.data();
              if (d.members && d.members.includes(me.uid)) {
                dmChatId = doc.id;
                break;
              }
            }
          } catch (_) {}
        }

        if (!dmChatId) {
          container.style.display = 'none';
          return;
        }

        // 2. Получаем сообщения чата
        let docs = [];
        if (activeId === dmChatId && typeof lastMsgsDocs !== 'undefined' && lastMsgsDocs && lastMsgsDocs.length) {
          docs = lastMsgsDocs;
        } else if (window.db) {
          try {
            const snap = await db.collection('chats').doc(dmChatId).collection('messages').limit(150).get();
            docs = snap.docs;
          } catch (err) {
            console.warn('loadVpSharedMedia fetch err:', err);
          }
        }

        for (const d of docs) {
          const m = (typeof d.data === 'function') ? d.data() : d;
          if (!m || m._deleted) continue;
          // Фото и медиа
          if (m.type === 'photo' || m.photoUrl) {
            window._vpPhotos.push({
              url: m.photoUrl || ('data:image/png;base64,' + m.fileData),
              name: m.fileName || 'Фото'
            });
          }
          // Файлы и документы
          else if (m.type === 'file' || (m.fileUrl && m.type !== 'photo' && m.type !== 'audio' && m.type !== 'voice')) {
            window._vpFiles.push({
              url: m.fileUrl || ('data:application/octet-stream;base64,' + m.fileData),
              name: m.fileName || 'файл',
              size: m.fileSize || 0
            });
          }
          // Музыка и аудио / голосовые
          else if (m.type === 'audio' || m.type === 'voice' || m.audioUrl) {
            window._vpAudio.push({
              url: m.audioUrl || m.fileUrl || '',
              name: (m.audioTitle ? ((m.audioArtist ? m.audioArtist + ' — ' : '') + m.audioTitle) : (m.fileName || (m.type === 'voice' ? 'Голосовое сообщение' : 'Аудиозапись'))),
              size: m.fileSize || 0,
              duration: m.duration || 0
            });
          }
        }

        const photos = window._vpPhotos;
        const files = window._vpFiles;
        const audios = window._vpAudio;
        const total = photos.length + files.length + audios.length;

        if (total === 0) {
          container.innerHTML = \`
            <div style="padding:14px 18px;text-align:center;color:var(--text2);font-size:12.5px;">
              <div style="font-size:20px;margin-bottom:4px;opacity:.6">📁</div>
              В переписке пока нет фото и файлов
            </div>
          \`;
          return;
        }

        let html = '';

        // Фотографии
        if (photos.length > 0) {
          html += \`
            <div class="rp-sec" style="padding:10px 18px 6px;">
              <span>Медиа в переписке</span>
              <span class="rp-cnt">\${photos.length}</span>
            </div>
            <div class="rp-grid" style="padding:0 18px 12px;">
              \${photos.map((p, idx) => \`
                <div class="rp-thumb" style="background-image:url('\${p.url}')" onclick="vpOpenPhoto(\${idx})" title="Открыть фото"></div>
              \`).reverse().join('')}
            </div>
          \`;
        }

        // Файлы
        if (files.length > 0) {
          html += \`
            <div class="rp-sec" style="padding:10px 18px 6px;">
              <span>Файлы в переписке</span>
              <span class="rp-cnt">\${files.length}</span>
            </div>
            <div style="padding:0 18px 12px;display:flex;flex-direction:column;gap:4px;">
              \${files.map((f, idx) => \`
                <div class="rp-file" onclick="vpDownloadFile(\${idx})" title="Скачать файл">
                  <span class="rp-file-ic">📎</span>
                  <div class="rp-file-meta">
                    <div class="rp-file-n">\${escHtml(f.name)}</div>
                    <div class="rp-file-s">\${formatFileSize(f.size)}</div>
                  </div>
                  <span style="opacity:.6;font-size:13px"><i class="fa-solid fa-download"></i></span>
                </div>
              \`).reverse().join('')}
            </div>
          \`;
        }

        // Музыка / аудио
        if (audios.length > 0) {
          html += \`
            <div class="rp-sec" style="padding:10px 18px 6px;">
              <span>Музыка и аудио</span>
              <span class="rp-cnt">\${audios.length}</span>
            </div>
            <div style="padding:0 18px 12px;display:flex;flex-direction:column;gap:4px;">
              \${audios.map((a, idx) => \`
                <div class="rp-file" onclick="vpDownloadAudio(\${idx})" title="Скачать / прослушать">
                  <span class="rp-file-ic">🎵</span>
                  <div class="rp-file-meta">
                    <div class="rp-file-n">\${escHtml(a.name)}</div>
                    <div class="rp-file-s">\${a.duration ? Math.round(a.duration) + ' сек · ' : ''}\${formatFileSize(a.size)}</div>
                  </div>
                  <span style="opacity:.6;font-size:13px"><i class="fa-solid fa-play"></i></span>
                </div>
              \`).reverse().join('')}
            </div>
          \`;
        }

        container.innerHTML = html;
      } catch (err) {
        console.warn('loadVpSharedMedia error:', err);
        container.style.display = 'none';
      }
    }

    function vpOpenPhoto(idx) {
      const p = window._vpPhotos && window._vpPhotos[idx];
      if (p && p.url) {
        if (typeof openImageViewer === 'function') openImageViewer(p.url, {});
      }
    }

    function vpDownloadFile(idx) {
      const f = window._vpFiles && window._vpFiles[idx];
      if (f && f.url) {
        if (typeof downloadFile === 'function') downloadFile(f.url, f.name);
        else window.open(f.url, '_blank');
      }
    }

    function vpDownloadAudio(idx) {
      const a = window._vpAudio && window._vpAudio[idx];
      if (a && a.url) {
        if (typeof downloadFile === 'function') downloadFile(a.url, a.name);
        else window.open(a.url, '_blank');
      }
    }
  `;

// Inject loadVpSharedMedia right before viewProfile
if (!content.includes('function loadVpSharedMedia')) {
  content = content.replace('async function viewProfile(uid) {', mediaHelperCode + '\n    async function viewProfile(uid) {');
  console.log('✓ Injected loadVpSharedMedia helpers');
}

// 5. Call loadVpSharedMedia in viewProfile(uid)
const oldVpOpen = `      updateVpAddFriendBtn(uid);
      openModal('modal-viewprofile');`;

const newVpOpen = `      updateVpAddFriendBtn(uid);
      if (typeof loadVpSharedMedia === 'function') loadVpSharedMedia(uid);
      openModal('modal-viewprofile');`;

if (content.includes(oldVpOpen)) {
  content = content.replace(oldVpOpen, newVpOpen);
  console.log('✓ Added loadVpSharedMedia call into viewProfile');
}

// 6. Update toggleRightPanel / openRightPanel to delegate to openChatInfo
const oldToggleRp = `    function toggleRightPanel(ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); const p = document.getElementById('rightPanel'); if (!p) return; if (p.classList.contains('open')) closeRightPanel(); else openRightPanel(); }
    function closeRightPanel() { const p = document.getElementById('rightPanel'); if (p) p.classList.remove('open'); }
    function rpOpenPhoto(i) { const s = window._rpPhotos[i]; if (s) openImageViewer(s, {}); }
    function rpDownloadFile(i) { const f = window._rpFiles[i]; if (f) downloadFile(f.url, f.name); }
    function openRightPanel() {`;

const newToggleRp = `    function toggleRightPanel(ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); if (typeof openChatInfo === 'function') openChatInfo(ev); }
    function closeRightPanel() { const p = document.getElementById('rightPanel'); if (p) p.classList.remove('open'); }
    function rpOpenPhoto(i) { const s = window._rpPhotos[i]; if (s) openImageViewer(s, {}); }
    function rpDownloadFile(i) { const f = window._rpFiles[i]; if (f) downloadFile(f.url, f.name); }
    function openRightPanel(ev) { if (typeof openChatInfo === 'function') openChatInfo(ev); return;`;

if (content.includes(oldToggleRp)) {
  content = content.replace(oldToggleRp, newToggleRp);
  console.log('✓ Replaced toggleRightPanel and openRightPanel to openChatInfo directly');
}

fs.writeFileSync(path, content, 'utf8');
console.log('File length after:', content.length);
console.log('Done!');
