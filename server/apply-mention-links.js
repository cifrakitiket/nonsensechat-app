// server/apply-mention-links.js
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

const MENTION_HELPERS_CODE = `
    /* ═══ MENTION LINKS & USER PROFILE BY NICK ═══ */
    async function openProfileByNick(nick) {
      if (!nick) return;
      const clean = String(nick).replace(/^@+/, '').trim().toLowerCase();
      if (!clean) return;

      // Если кликнули на свой ник — открываем свой профиль
      if (me && (me.nick || '').toLowerCase() === clean) {
        viewProfile(me.uid);
        return;
      }

      try {
        // 1. Поиск по nickLower
        let q = await db.collection('users').where('nickLower', '==', clean).limit(1).get();
        if (!q.empty) {
          const u = q.docs[0].data();
          viewProfile(u.uid || q.docs[0].id);
          return;
        }

        // 2. Фолбэк — поиск среди всех пользователей (на случай если nickLower не был задан)
        const allU = await db.collection('users').get();
        const found = allU.docs.find(d => {
          const data = d.data() || {};
          return (data.nickLower && data.nickLower.toLowerCase() === clean) ||
                 (data.nick && data.nick.toLowerCase() === clean);
        });
        if (found) {
          viewProfile(found.data().uid || found.id);
          return;
        }
      } catch (err) {
        console.warn('openProfileByNick error:', err);
      }

      // 3. Поиск по локальному кэшу
      for (const uid in (uCache || {})) {
        const cached = uCache[uid];
        if (cached && (cached.nick || '').toLowerCase() === clean) {
          viewProfile(uid);
          return;
        }
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
      let res = escaped.replace(/(https?:\\/\\/[^\\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--acc3,#5b8fb9);text-decoration:underline;">$1</a>');

      // Кликабельные упоминания @username
      res = res.replace(/@([a-zA-Z0-9_.\\-]+)/g, (match, username) => {
        return '<span class="mention-link" style="color:var(--acc3,#5b8fb9);font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px;" onclick="event.stopPropagation();openProfileByNick(\\'' + username + '\\')" title="Профиль @' + username + '">@' + username + '</span>';
      });

      return res.replace(/\\n/g, '<br>');
    }
    window.formatMentionsHtml = formatMentionsHtml;
`;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let c = fs.readFileSync(f, 'utf8');

  // 1. Вставляем MENTION_HELPERS_CODE перед function viewProfile
  if (!c.includes('function openProfileByNick(')) {
    const vpIdx = c.indexOf('async function viewProfile(uid)');
    if (vpIdx > 0) {
      c = c.slice(0, vpIdx) + MENTION_HELPERS_CODE + '\n    ' + c.slice(vpIdx);
      console.log('Added mention helpers before viewProfile in:', f);
    } else {
      console.warn('viewProfile not found in:', f);
    }
  }

  // 2. Обновляем рендеринг био в viewProfile:
  const oldBio = `      // Био — первая строка секции инфо (как в Telegram)
      const bioEl = document.getElementById('vpBio');
      if (u.bio) {
        bioEl.className = 'tgp-row';
        bioEl.style.cursor = 'default';
        bioEl.innerHTML = \`<span class="tgp-row-icon">ℹ️</span><div class="tgp-row-body"><div class="tgp-row-val"></div><div class="tgp-row-lbl">О себе</div></div>\`;
        bioEl.querySelector('.tgp-row-val').innerText = u.bio;
      } else {
        bioEl.className = 'hidden';
        bioEl.innerHTML = '';
      }`;

  const newBio = `      // Био — первая строка секции инфо с кликабельными @mentions
      const bioEl = document.getElementById('vpBio');
      if (u.bio) {
        bioEl.className = 'tgp-row';
        bioEl.style.cursor = 'default';
        bioEl.innerHTML = \`<span class="tgp-row-icon">ℹ️</span><div class="tgp-row-body"><div class="tgp-row-val" style="word-break:break-word;line-height:1.45;">\${formatMentionsHtml(u.bio)}</div><div class="tgp-row-lbl">О себе</div></div>\`;
      } else {
        bioEl.className = 'hidden';
        bioEl.innerHTML = '';
      }`;

  if (c.includes(oldBio)) {
    c = c.replace(oldBio, newBio);
    console.log('Updated vpBio rendering in:', f);
  } else {
    console.warn('oldBio not found in:', f);
  }

  // 3. Обновляем processLinks для кликабельных упоминаний в сообщениях:
  const oldProcessLinks = `    function processLinks(text) {
      // Highlight @mentions
      text = text.replace(/<span class="mention-chip"[^>]*>(@\\w+)<\/span>&nbsp;/g, '<span class="mention-chip">$1</span> ');
      text = text.replace(/<span class="mention-chip"[^>]*>(@\\w+)<\/span>/g, '<span class="mention-chip">$1</span>');
      // URLs — но НЕ трогаем URL внутри HTML-тегов (напр. src кастом-эмодзи <img>)
      return text.replace(/<[^>]+>|(https?:\\/\\/[^\\s<>"]+)/g, (m, url) =>
        url ? \`<a href="\${url}" target="_blank" rel="noopener" onclick="return handleLink('\${url}',event)" style="color:var(--acc3);word-break:break-all">\${url}</a>\` : m);
    }`;

  const newProcessLinks = `    function processLinks(text) {
      // Highlight @mentions
      text = text.replace(/<span class="mention-chip"[^>]*>(@\\w+)<\/span>&nbsp;/g, '<span class="mention-chip" onclick="event.stopPropagation();openProfileByNick(\\'$1\\')" style="cursor:pointer" title="Профиль $1">$1</span> ');
      text = text.replace(/<span class="mention-chip"[^>]*>(@\\w+)<\/span>/g, '<span class="mention-chip" onclick="event.stopPropagation();openProfileByNick(\\'$1\\')" style="cursor:pointer" title="Профиль $1">$1</span>');
      // URLs — но НЕ трогаем URL внутри HTML-тегов (напр. src кастом-эмодзи <img>)
      let out = text.replace(/<[^>]+>|(https?:\\/\\/[^\\s<>"]+)/g, (m, url) =>
        url ? \`<a href="\${url}" target="_blank" rel="noopener" onclick="return handleLink('\${url}',event)" style="color:var(--acc3);word-break:break-all">\${url}</a>\` : m);
      // Кликабельные @mentions в тексте сообщения
      out = out.replace(/(<[^>]+>)|(?:^|([\\s(]))@([a-zA-Z0-9_.\\-]+)/g, (m, tag, pre, nick) => {
        if (tag) return tag;
        return (pre || '') + \`<span class="mention-link" onclick="event.stopPropagation();openProfileByNick('\${nick}')" title="Профиль @\${nick}" style="color:var(--acc3,#5b8fb9);font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px;">@\${nick}</span>\`;
      });
      return out;
    }`;

  if (c.includes(oldProcessLinks)) {
    c = c.replace(oldProcessLinks, newProcessLinks);
    console.log('Updated processLinks in:', f);
  } else {
    console.warn('oldProcessLinks not found in:', f);
  }

  // 4. Обновляем описание группы в шапке чата chSub
  const oldChSub = `        document.getElementById('chName').innerText = name;
        document.getElementById('chSub').innerText = sub;`;
  const newChSub = `        document.getElementById('chName').innerText = name;
        if (data.type === 'group' && data.desc) {
          document.getElementById('chSub').innerHTML = formatMentionsHtml(data.desc);
        } else {
          document.getElementById('chSub').innerText = sub;
        }`;

  if (c.includes(oldChSub)) {
    c = c.replace(oldChSub, newChSub);
    console.log('Updated chSub in openChat in:', f);
  } else {
    console.warn('oldChSub not found in:', f);
  }

  fs.writeFileSync(f, c, 'utf8');
}
console.log('Done apply-mention-links.js');
