// server/apply-mentions-all.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

const MENTION_LOGIC_CODE = `
    /* ═══ MENTION LINKS & USER PROFILE BY NICK ═══ */
    async function openProfileByNick(nick) {
      if (!nick) return;
      const clean = String(nick).replace(/^@+/, '').trim().toLowerCase();
      if (!clean) return;

      // Закрываем настройки группы если открыты, чтобы показать профиль
      try { if (typeof closeModal === 'function') closeModal('modal-groupsettings'); } catch(e) {}

      // 1. Если кликнули на свой ник — открываем свой профиль
      if (typeof me !== 'undefined' && me && (me.nick || '').toLowerCase() === clean) {
        viewProfile(me.uid);
        return;
      }

      // 2. Поиск по локальному кэшу uCache
      if (typeof uCache !== 'undefined' && uCache) {
        for (const uid in uCache) {
          const cached = uCache[uid];
          if (cached && (
            (cached.nickLower && cached.nickLower.toLowerCase() === clean) ||
            (cached.nick && cached.nick.toLowerCase() === clean)
          )) {
            viewProfile(uid);
            return;
          }
        }
      }

      try {
        // 3. Поиск в БД по nickLower
        let q = await db.collection('users').where('nickLower', '==', clean).limit(1).get();
        if (!q.empty) {
          const u = q.docs[0].data();
          const uid = u.uid || q.docs[0].id;
          if (typeof uCache !== 'undefined') uCache[uid] = u;
          viewProfile(uid);
          return;
        }

        // 4. Поиск в БД по обычному nick
        let q2 = await db.collection('users').where('nick', '==', clean).limit(1).get();
        if (!q2.empty) {
          const u = q2.docs[0].data();
          const uid = u.uid || q2.docs[0].id;
          if (typeof uCache !== 'undefined') uCache[uid] = u;
          viewProfile(uid);
          return;
        }

        // 5. Фолбэк — сканирование коллекции users (регистронезависимо)
        const allU = await db.collection('users').get();
        const found = allU.docs.find(d => {
          const data = d.data() || {};
          return (data.nickLower && data.nickLower.toLowerCase() === clean) ||
                 (data.nick && data.nick.toLowerCase() === clean);
        });
        if (found) {
          const u = found.data();
          const uid = u.uid || found.id;
          if (typeof uCache !== 'undefined') uCache[uid] = u;
          viewProfile(uid);
          return;
        }
      } catch (err) {
        console.warn('openProfileByNick error:', err);
      }

      if (typeof customConfirm === 'function') {
        await customConfirm('Пользователь', 'Пользователь @' + clean + ' не найден', 'OK');
      } else {
        alert('Пользователь @' + clean + ' не найден');
      }
    }
    window.openProfileByNick = openProfileByNick;

    function formatMentionsHtml(text) {
      if (!text) return '';
      const escaped = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      // Ссылки на внешние сайты
      let res = escaped.replace(/(https?:\\/\\/[^\\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener" onclick="event.stopPropagation();" style="color:var(--acc3,#5b8fb9);text-decoration:underline;">$1</a>');

      // Кликабельные упоминания @username (буквы, цифры, дефис, подчёркивание, точка)
      res = res.replace(/(^|[^\\w@])@([a-zA-Z0-9_.-]+)/g, (match, prefix, username) => {
        return (prefix || '') + '<span class="mention-link" style="color:var(--acc3,#5b8fb9);font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px;" onclick="event.stopPropagation();openProfileByNick(\\'' + username + '\\')" title="Профиль @' + username + '">@' + username + '</span>';
      });

      return res.replace(/\\n/g, '<br>');
    }
    window.formatMentionsHtml = formatMentionsHtml;
`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) {
    console.log('Skipping (not found):', filePath);
    continue;
  }

  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Добавляем или обновляем MENTION_LOGIC_CODE
  if (code.includes('/* ═══ MENTION LINKS & USER PROFILE BY NICK ═══ */')) {
    // Заменяем существующий блок
    const start = code.indexOf('/* ═══ MENTION LINKS & USER PROFILE BY NICK ═══ */');
    const end = code.indexOf('window.formatMentionsHtml = formatMentionsHtml;', start) + 'window.formatMentionsHtml = formatMentionsHtml;'.length;
    code = code.slice(0, start) + MENTION_LOGIC_CODE.trim() + code.slice(end);
    console.log('Updated MENTION_LOGIC_CODE in:', filePath);
  } else {
    // Вставляем перед function viewProfile
    const vpMatch = code.match(/async\s+function\s+viewProfile\s*\(/);
    if (vpMatch) {
      const idx = vpMatch.index;
      code = code.slice(0, idx) + MENTION_LOGIC_CODE + '\n    ' + code.slice(idx);
      console.log('Inserted MENTION_LOGIC_CODE before viewProfile in:', filePath);
    } else {
      console.warn('Could not find viewProfile in:', filePath);
    }
  }

  // 2. Обновляем vpBio в viewProfile
  // Находим блок vpBio
  code = code.replace(
    /(const\s+bioEl\s*=\s*document\.getElementById\(['"]vpBio['"]\);[\s\S]*?if\s*\([a-zA-Z0-9_.]+\.bio\)\s*\{[\s\S]*?)(bioEl\.querySelector\(['"]\.tgp-row-val['"]\)\.innerText\s*=\s*[a-zA-Z0-9_.]+\.bio;)([\s\S]*?\}\s*else\s*\{[\s\S]*?bioEl\.innerHTML\s*=\s*['"]['"];[\s\S]*?\})/,
    (match, before, inner, after) => {
      return `const bioEl = document.getElementById('vpBio');
      if (u.bio) {
        bioEl.className = 'tgp-row';
        bioEl.style.cursor = 'default';
        bioEl.innerHTML = \`<span class="tgp-row-icon">ℹ️</span><div class="tgp-row-body"><div class="tgp-row-val" style="word-break:break-word;line-height:1.45;">\${formatMentionsHtml(u.bio)}</div><div class="tgp-row-lbl">О себе</div></div>\`;
      } else {
        bioEl.className = 'hidden';
        bioEl.innerHTML = '';
      }`;
    }
  );

  // 3. Обновляем processLinks для сообщений
  const procLinksMatch = code.match(/function\s+processLinks\s*\([^)]*\)\s*\{([\s\S]*?)(?=\n\s*(?:function|async\s+function|\/\*))/);
  if (procLinksMatch) {
    const newProcessLinks = `function processLinks(text) {
      if (!text) return '';
      // Make @mention chips clickable
      text = text.replace(/<span class="mention-chip"([^>]*)>@?([a-zA-Z0-9_.-]+)<\\/span>&nbsp;/g,
        '<span class="mention-chip"$1 style="cursor:pointer" onclick="event.stopPropagation();openProfileByNick(\\'$2\\')" title="Профиль @$2">@$2</span> ');
      text = text.replace(/<span class="mention-chip"([^>]*)>@?([a-zA-Z0-9_.-]+)<\\/span>/g,
        '<span class="mention-chip"$1 style="cursor:pointer" onclick="event.stopPropagation();openProfileByNick(\\'$2\\')" title="Профиль @$2">@$2</span>');

      // URLs — не трогаем URL внутри HTML-тегов (напр. src кастом-эмодзи <img>)
      text = text.replace(/<[^>]+>|(https?:\\/\\/[^\\s<>"]+)/g, (m, url) =>
        url ? \`<a href="\${url}" target="_blank" rel="noopener" onclick="return handleLink('\${url}',event)" style="color:var(--acc3);word-break:break-all">\${url}</a>\` : m);

      // Обычные @mentions в тексте сообщения
      text = text.replace(/<[^>]+>|((?:^|[^\\w@]))@([a-zA-Z0-9_.-]+)/g, (m, pre, nick) => {
        if (!nick) return m;
        return (pre || '') + \`<span class="mention-link" onclick="event.stopPropagation();openProfileByNick('\${nick}')" title="Профиль @\${nick}" style="color:var(--acc3,#5b8fb9);font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px;">@\${nick}</span>\`;
      });
      return text;
    }`;
    code = code.replace(procLinksMatch[0], newProcessLinks);
    console.log('Updated processLinks in:', filePath);
  }

  // 4. Обновляем отображение описания группы в шапке чата (chSub)
  if (code.includes("document.getElementById('chSub').innerText = data.desc || (data.members?.length || 0) + ' участников';")) {
    code = code.replace(
      "document.getElementById('chSub').innerText = data.desc || (data.members?.length || 0) + ' участников';",
      "if (data.desc) { document.getElementById('chSub').innerHTML = formatMentionsHtml(data.desc); } else { document.getElementById('chSub').innerText = (data.members?.length || 0) + ' участников'; }"
    );
    console.log('Updated chSub group listener in:', filePath);
  }

  if (code.includes("document.getElementById('chSub').innerText = sub;")) {
    code = code.replace(
      "document.getElementById('chSub').innerText = sub;",
      "if (data.type === 'group' && data.desc) { document.getElementById('chSub').innerHTML = formatMentionsHtml(data.desc); } else { document.getElementById('chSub').innerText = sub; }"
    );
    console.log('Updated chSub initial render in:', filePath);
  }

  // 5. Обновляем openRightPanel (боковая панель чата)
  if (code.includes("const sub = document.getElementById('chSub')?.innerText || '';") && code.includes("<div class=\"rp-sub\">${escUp(sub)}</div>")) {
    code = code.replace(
      "<div class=\"rp-sub\">${escUp(sub)}</div>",
      "<div class=\"rp-sub\" style=\"line-height:1.4;word-break:break-word;\">${(activeChat.type === 'group' && activeChat.desc) ? formatMentionsHtml(activeChat.desc) : (window._chatPeerUser && window._chatPeerUser.bio) ? formatMentionsHtml(window._chatPeerUser.bio) : escUp(sub)}</div>"
    );
    console.log('Updated openRightPanel rp-sub in:', filePath);
  }

  // 6. Добавляем предпросмотр описания в настройках группы gsDescPreview
  if (!code.includes('id="gsDescPreview"')) {
    code = code.replace(
      '<textarea class="mf" id="gsDesc" placeholder="Описание..."></textarea>',
      '<textarea class="mf" id="gsDesc" placeholder="Описание..." oninput="updateGsDescPreview(this.value)"></textarea>\n        <div id="gsDescPreview" style="display:none;font-size:13px;color:var(--text2);margin-top:4px;word-break:break-word;background:rgba(255,255,255,0.04);padding:8px 12px;border-radius:8px;"></div>'
    );
    console.log('Added gsDescPreview HTML in:', filePath);
  }

  // Обновляем openGroupSettings для обновления gsDescPreview
  if (code.includes("document.getElementById('gsDesc').value = data.desc || '';") && !code.includes("updateGsDescPreview(data.desc || '')")) {
    code = code.replace(
      "document.getElementById('gsDesc').value = data.desc || '';",
      "document.getElementById('gsDesc').value = data.desc || ''; updateGsDescPreview(data.desc || '');"
    );
    console.log('Updated openGroupSettings to update gsDescPreview in:', filePath);
  }

  // Добавляем функцию updateGsDescPreview если её нет
  if (!code.includes('function updateGsDescPreview(')) {
    const helperCode = `
    function updateGsDescPreview(val) {
      const el = document.getElementById('gsDescPreview');
      if (!el) return;
      if (val && val.trim()) {
        el.innerHTML = '<span style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;opacity:.7;display:block;margin-bottom:2px">Предпросмотр:</span>' + formatMentionsHtml(val);
        el.style.display = 'block';
      } else {
        el.innerHTML = '';
        el.style.display = 'none';
      }
    }
    window.updateGsDescPreview = updateGsDescPreview;
`;
    const openGsIdx = code.indexOf('async function openGroupSettings()');
    if (openGsIdx > 0) {
      code = code.slice(0, openGsIdx) + helperCode + '\n    ' + code.slice(openGsIdx);
      console.log('Added updateGsDescPreview helper in:', filePath);
    }
  }

  // 7. Обновляем renderMyProfileHeader
  if (code.includes("if (subEl) subEl.innerText = p.bio || 'В сети';")) {
    code = code.replace(
      "if (subEl) subEl.innerText = p.bio || 'В сети';",
      "if (subEl) subEl.innerHTML = p.bio ? formatMentionsHtml(p.bio) : 'В сети';"
    );
    console.log('Updated renderMyProfileHeader in:', filePath);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Saved:', filePath);

  // Валидация синтаксиса встроенного JS
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptCount = 0;
  while ((match = scriptRegex.exec(code)) !== null) {
    const scriptBody = match[1];
    scriptCount++;
    try {
      new vm.Script(scriptBody);
    } catch (e) {
      console.error(`Syntax error in script #${scriptCount} of ${filePath}:`, e.message);
      process.exit(1);
    }
  }
  console.log(`Validated ${scriptCount} scripts in ${filePath}: ALL OK!`);
}

console.log('All done successfully!');
