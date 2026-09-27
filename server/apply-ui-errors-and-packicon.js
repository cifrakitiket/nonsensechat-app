// server/apply-ui-errors-and-packicon.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

// Новые стили для тостов и кастомного промпта
const EXTRA_CSS = `
    /* ═══ RICH IN-APP TOAST SYSTEM ═══ */
    #toastWrap {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 100000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
      pointer-events: none;
    }
    @media (max-width: 600px) {
      #toastWrap {
        top: 12px;
        right: 12px;
        left: 12px;
        max-width: calc(100% - 24px);
      }
    }
    .app-toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(24, 32, 42, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 12px 14px;
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.5);
      cursor: pointer;
      opacity: 0;
      transform: translateY(-12px) scale(0.97);
      transition: opacity .22s cubic-bezier(0.2, 0.9, 0.3, 1), transform .22s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow .2s;
      user-select: none;
    }
    .app-toast.show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    .app-toast:hover {
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.65);
    }
    .app-toast-icon {
      font-size: 18px;
      line-height: 1.2;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .app-toast-content {
      flex: 1;
      min-width: 0;
    }
    .app-toast-title {
      font-weight: 700;
      font-size: 13px;
      color: var(--text, #fff);
      margin-bottom: 2px;
      line-height: 1.35;
    }
    .app-toast-body {
      font-size: 12px;
      color: var(--text2, #9bb0c3);
      line-height: 1.45;
      word-break: break-word;
    }
    .app-toast-close {
      background: none;
      border: none;
      color: var(--text2, #9bb0c3);
      font-size: 13px;
      padding: 2px 4px;
      cursor: pointer;
      opacity: 0.6;
      border-radius: 4px;
      transition: opacity .15s;
    }
    .app-toast-close:hover {
      opacity: 1;
      color: #fff;
    }
    .app-toast.toast-error {
      border-color: rgba(248, 81, 73, 0.4);
      background: rgba(43, 20, 24, 0.96);
      box-shadow: 0 12px 34px rgba(248, 81, 73, 0.18);
    }
    .app-toast.toast-warning {
      border-color: rgba(210, 153, 34, 0.4);
      background: rgba(40, 32, 18, 0.96);
      box-shadow: 0 12px 34px rgba(210, 153, 34, 0.18);
    }
    .app-toast.toast-success {
      border-color: rgba(46, 160, 67, 0.4);
      background: rgba(18, 36, 26, 0.96);
      box-shadow: 0 12px 34px rgba(46, 160, 67, 0.18);
    }
    .app-toast.toast-info {
      border-color: rgba(56, 139, 253, 0.4);
      background: rgba(20, 32, 48, 0.96);
      box-shadow: 0 12px 34px rgba(56, 139, 253, 0.18);
    }
    #customConfirm .cc-input {
      width: 100%;
      background: var(--input, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 11px 14px;
      color: var(--text, #fff);
      font-size: 14px;
      outline: none;
      margin-bottom: 16px;
      box-sizing: border-box;
      transition: border-color .15s;
    }
    #customConfirm .cc-input:focus {
      border-color: var(--acc, #64b5f6);
    }
`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) {
    console.log('Skipping (not found):', filePath);
    continue;
  }

  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Добавляем стили тостов в <head><style>
  if (!code.includes('/* ═══ RICH IN-APP TOAST SYSTEM ═══ */')) {
    code = code.replace('</style>', EXTRA_CSS + '\n</style>');
    console.log('Added EXTRA_CSS in:', filePath);
  }

  // 2. Добавляем input в #customConfirm
  if (!code.includes('id="ccInput"')) {
    code = code.replace(
      '<div class="cc-text" id="ccText">Вы уверены?</div>',
      '<div class="cc-text" id="ccText">Вы уверены?</div>\n      <input class="cc-input hidden" id="ccInput" autocomplete="off">'
    );
    console.log('Added ccInput in #customConfirm in:', filePath);
  }

  // 3. Заменяем window.onerror и onunhandledrejection на красивый инлайн-перехватчик без alert()
  const oldErrRegex = /window\.onerror\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?return\s+false;\s*\};[\s\S]*?window\.onunhandledrejection\s*=\s*function\s*\(e\)\s*\{[\s\S]*?\};/;
  const newErrCode = `// Глобальный перехватчик ошибок: логирует в консоль и показывает мягкий toast вместо браузерного alert
    window.onerror = function (msg, url, line, col, err) {
      const errText = "JS ERROR: " + msg + " (line " + line + " of " + (url ? url.split('/').pop() : 'unknown') + ")";
      console.error(errText, err);
      if (window.AndroidBridge && window.AndroidBridge.logError) {
        try { window.AndroidBridge.logError(errText); } catch(e){}
      }
      // Не спамим alert'ом! Показываем в интерфейсе только критические ошибки
      if (typeof showToast === 'function' && !/resizeobserver|script error|non-critical/i.test(String(msg))) {
        showToast('⚠️ Ошибка приложения', String(msg).replace(/^Uncaught\\s+/, ''), 'error');
      }
      return true;
    };
    window.onunhandledrejection = function (e) {
      const reason = String(e.reason && (e.reason.message || e.reason) || '');
      console.warn('Unhandled rejection:', reason);
      if (window.AndroidBridge && window.AndroidBridge.logError) {
        try { window.AndroidBridge.logError("PROMISE REJECT: " + reason); } catch(e){}
      }
      if (/failed to fetch|networkerror|load failed|fetch/i.test(reason)) {
        if (typeof showToast === 'function') showToast('Сбой сети', 'Не удалось связаться с сервером', 'warning');
        return;
      }
      // Не блокируем экран системным alert'ом
    };

    // Переопределяем нативные браузерные диалоги alert, confirm, prompt на дизайнерские интерфейсы сайта
    window.alert = function (msg) {
      if (typeof showToast === 'function') {
        showToast('Уведомление', String(msg == null ? '' : msg), 'info');
      } else {
        console.log('APP ALERT:', msg);
      }
    };
    window.confirm = function (msg) {
      console.warn('Sync window.confirm called, use customConfirm instead:', msg);
      return true;
    };
    window.prompt = function (msg, defaultVal) {
      console.warn('Sync window.prompt called, use customPrompt instead:', msg);
      return null;
    };`;

  if (oldErrRegex.test(code)) {
    code = code.replace(oldErrRegex, newErrCode);
    console.log('Replaced window.onerror & dialog overrides in:', filePath);
  } else if (!code.includes('window.alert = function')) {
    // Вставляем после <script>
    const scriptIdx = code.indexOf('<script>');
    if (scriptIdx > 0) {
      code = code.slice(0, scriptIdx + 8) + '\n    ' + newErrCode + '\n' + code.slice(scriptIdx + 8);
      console.log('Inserted newErrCode at start of script in:', filePath);
    }
  }

  // 4. Обновляем customConfirm, добавляем customAlert и customPrompt
  const oldConfirmCodeRegex = /function\s+customConfirm\s*\(title,\s*text,\s*okLabel\s*=\s*'Подтвердить',\s*okCls\s*=\s*''\)\s*\{[\s\S]*?\}\s*\}\s*\}/;
  // Найдём блок customConfirm
  const ccIdx = code.indexOf('function customConfirm(');
  if (ccIdx > 0) {
    const ccEnd = code.indexOf('/* ═══ THEME ═══ */', ccIdx);
    if (ccEnd > 0) {
      const newCustomDialogs = `function customConfirm(title, text, okLabel = 'Подтвердить', okCls = '', cancelLabel = 'Отмена') {
      return new Promise(resolve => {
        const el = document.getElementById('customConfirm');
        if (!el) { resolve(true); return; }
        document.getElementById('ccTitle').innerText = title || 'Подтверждение';
        document.getElementById('ccText').innerText = text || '';
        const inp = document.getElementById('ccInput');
        if (inp) inp.classList.add('hidden');
        const ok = document.getElementById('ccOk');
        const cancel = document.getElementById('ccCancel');
        ok.innerText = okLabel;
        ok.className = 'cc-ok' + (okCls ? ' ' + okCls : '');
        if (cancelLabel === null || cancelLabel === false || cancelLabel === '') {
          cancel.style.display = 'none';
        } else {
          cancel.style.display = '';
          cancel.innerText = cancelLabel;
        }
        el.classList.remove('hidden');
        const cleanup = (v) => {
          el.classList.add('hidden');
          ok.onclick = null;
          cancel.onclick = null;
          resolve(v);
        };
        ok.onclick = () => cleanup(true);
        cancel.onclick = () => cleanup(false);
      });
    }
    window.customConfirm = customConfirm;

    function customAlert(title, text, okLabel = 'OK', okCls = '') {
      return customConfirm(title, text, okLabel, okCls, null);
    }
    window.customAlert = customAlert;

    function customPrompt(title, text, defaultValue = '', placeholder = '') {
      return new Promise(resolve => {
        const el = document.getElementById('customConfirm');
        if (!el) { resolve(null); return; }
        document.getElementById('ccTitle').innerText = title || 'Ввод данных';
        document.getElementById('ccText').innerText = text || '';
        const inp = document.getElementById('ccInput');
        const ok = document.getElementById('ccOk');
        const cancel = document.getElementById('ccCancel');
        if (inp) {
          inp.classList.remove('hidden');
          inp.value = defaultValue || '';
          inp.placeholder = placeholder || '';
          setTimeout(() => inp.focus(), 50);
        }
        ok.innerText = 'OK';
        ok.className = 'cc-ok';
        cancel.style.display = '';
        cancel.innerText = 'Отмена';
        el.classList.remove('hidden');

        const onKeyDown = (e) => {
          if (e.key === 'Enter') { cleanup(inp ? inp.value : ''); }
          else if (e.key === 'Escape') { cleanup(null); }
        };
        if (inp) inp.onkeydown = onKeyDown;

        const cleanup = (v) => {
          el.classList.add('hidden');
          if (inp) { inp.classList.add('hidden'); inp.onkeydown = null; }
          ok.onclick = null;
          cancel.onclick = null;
          resolve(v);
        };
        ok.onclick = () => cleanup(inp ? inp.value : '');
        cancel.onclick = () => cleanup(null);
      });
    }
    window.customPrompt = customPrompt;

    `;
      code = code.slice(0, ccIdx) + newCustomDialogs + code.slice(ccEnd);
      console.log('Updated customConfirm, customAlert, customPrompt in:', filePath);
    }
  }

  // 5. Обновляем showToast реализацию
  const toastIdx = code.indexOf('function showToast(');
  if (toastIdx > 0) {
    const toastEnd = code.indexOf('/* ── Нативные уведомления (Android через Capacitor) ── */', toastIdx);
    if (toastEnd > 0) {
      const newToastFn = `function showToast(title, body, type = 'info', onClick = null) {
      if (typeof type === 'function') { onClick = type; type = 'info'; }
      if (!body && title) { body = title; title = 'Уведомление'; }
      let wrap = document.getElementById('toastWrap');
      if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toastWrap'; document.body.appendChild(wrap); }

      const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
      const icon = icons[type] || '🔔';

      const t = document.createElement('div');
      t.className = 'app-toast ' + (type ? 'toast-' + type : '');

      const iconEl = document.createElement('span');
      iconEl.className = 'app-toast-icon';
      iconEl.textContent = icon;

      const content = document.createElement('div');
      content.className = 'app-toast-content';

      const tt = document.createElement('div');
      tt.className = 'app-toast-title';
      tt.textContent = title;

      const tb = document.createElement('div');
      tb.className = 'app-toast-body';
      tb.textContent = body || '';

      content.appendChild(tt);
      if (body) content.appendChild(tb);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'app-toast-close';
      closeBtn.innerHTML = '✕';
      closeBtn.title = 'Закрыть';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        t.classList.remove('show');
        setTimeout(() => t.remove(), 250);
      };

      t.appendChild(iconEl);
      t.appendChild(content);
      t.appendChild(closeBtn);

      t.onclick = () => {
        try { onClick && onClick(); } finally {
          t.classList.remove('show');
          setTimeout(() => t.remove(), 250);
        }
      };

      wrap.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 250);
      }, type === 'error' ? 6500 : 4500);
    }
    window.showToast = showToast;

    `;
      code = code.slice(0, toastIdx) + newToastFn + code.slice(toastEnd);
      console.log('Updated showToast function in:', filePath);
    }
  }

  // 6. Добавляем функцию onPackIconSelected и обработку иконки пака
  if (!code.includes('async function onPackIconSelected(')) {
    const packIconCode = `
    /* ═══ PACK ICON SELECTION & PREVIEW ═══ */
    async function onPackIconSelected(input) {
      const file = input && input.files && input.files[0];
      if (input) input.value = '';
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) {
        showToast('Иконка набора', 'Пожалуйста, выберите изображение (PNG, JPG, WebP)', 'warning');
        return;
      }
      const prev = document.getElementById('packIconPrev');
      const status = document.getElementById('packUploadStatus');
      if (status) status.textContent = '⏳ Загрузка иконки...';
      try {
        const stk = await stickerizeImage(file, 256);
        const url = await uploadStickerImage(stk);
        packIconDraft = url;
        if (prev) {
          prev.style.backgroundImage = 'url(\"' + url + '\")';
          prev.style.backgroundSize = 'contain';
          prev.style.backgroundRepeat = 'no-repeat';
          prev.style.backgroundPosition = 'center';
          prev.style.borderStyle = 'solid';
          prev.innerHTML = '';
        }
        if (status) {
          status.textContent = '✅ Иконка установлена';
          setTimeout(() => { if (status && status.textContent === '✅ Иконка установлена') status.textContent = ''; }, 2500);
        }
        showToast('Иконка набора', 'Иконка набора успешно загружена!', 'success');
      } catch (err) {
        console.warn('onPackIconSelected error:', err);
        showToast('Ошибка иконки', (err && err.message) || 'Не удалось загрузить иконку', 'error');
        if (status) status.textContent = '';
      }
    }
    window.onPackIconSelected = onPackIconSelected;
`;
    const openCreateIdx = code.indexOf('function openCreatePack(');
    if (openCreateIdx > 0) {
      code = code.slice(0, openCreateIdx) + packIconCode + '\n    ' + code.slice(openCreateIdx);
      console.log('Added onPackIconSelected in:', filePath);
    }
  }

  // 7. Обновляем openCreatePack и openEditPack для отображения иконки
  if (code.includes('function openCreatePack(kind) {')) {
    code = code.replace(
      'function openCreatePack(kind) {\n      packKind = (kind === \'emoji\') ? \'emoji\' : \'sticker\';\n      editingPackId = null;\n      setPackModalMode(false);\n      stickerDraft = [];',
      `function openCreatePack(kind) {
      packKind = (kind === 'emoji') ? 'emoji' : 'sticker';
      editingPackId = null;
      setPackModalMode(false);
      stickerDraft = [];
      packIconDraft = null;
      const prev = document.getElementById('packIconPrev');
      if (prev) {
        prev.style.backgroundImage = '';
        prev.style.borderStyle = 'dashed';
        prev.innerHTML = '📦';
      }`
    );
    console.log('Updated openCreatePack in:', filePath);
  }

  if (code.includes('editingPackId = packId;\n      setPackModalMode(true);')) {
    code = code.replace(
      'editingPackId = packId;\n      setPackModalMode(true);',
      `editingPackId = packId;
      setPackModalMode(true);
      packIconDraft = pack.icon || null;
      const prev = document.getElementById('packIconPrev');
      if (prev) {
        if (pack.icon) {
          prev.style.backgroundImage = 'url("' + pack.icon + '")';
          prev.style.backgroundSize = 'contain';
          prev.style.backgroundRepeat = 'no-repeat';
          prev.style.backgroundPosition = 'center';
          prev.style.borderStyle = 'solid';
          prev.innerHTML = '';
        } else {
          prev.style.backgroundImage = '';
          prev.style.borderStyle = 'dashed';
          prev.innerHTML = '📦';
        }
      }`
    );
    console.log('Updated openEditPack in:', filePath);
  }

  // 8. Обновляем publishPack: сохраняем icon и заменяем alert на showToast
  const oldPublishStart = `      const slug = (title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 24) || noun) + '_' + Math.random().toString(36).slice(2, 6);
      try {
        const ref = await db.collection('stickerPacks').add({
          title, slug, kind: packKind, authorUid: me.uid, authorNick: me.nick || '', stickers,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });`;

  const newPublishStart = `      const slug = (title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 24) || noun) + '_' + Math.random().toString(36).slice(2, 6);
      const iconUrl = packIconDraft || (stickers[0] && stickers[0].url) || '';
      try {
        const ref = await db.collection('stickerPacks').add({
          title, slug, kind: packKind, authorUid: me.uid, authorNick: me.nick || '', stickers,
          icon: iconUrl,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });`;

  if (code.includes(oldPublishStart)) {
    code = code.replace(oldPublishStart, newPublishStart);
    console.log('Updated publishPack icon saving in:', filePath);
  }

  // 9. Заменяем alert(...) в publishPack и стикерах
  code = code.replace("if (!title) { alert('Введите название'); return; }", "if (!title) { showToast('Название набора', 'Пожалуйста, введите название', 'warning'); return; }");
  code = code.replace("if (!stickerDraft.length) { alert('Добавьте хотя бы один ' + (emo ? 'эмодзи' : 'стикер')); return; }", "if (!stickerDraft.length) { showToast('Пустой набор', 'Добавьте хотя бы один ' + (emo ? 'эмодзи' : 'стикер'), 'warning'); return; }");
  code = code.replace("alert('«' + title + '» обновлён (' + stickers.length + ' шт.).');", "showToast('✅ Готово', '«' + title + '» успешно обновлён (' + stickers.length + ' шт.)', 'success');");
  code = code.replace("alert('Не удалось сохранить изменения: ' + e.message);", "showToast('❌ Ошибка сохранения', e.message, 'error');");
  code = code.replace("alert((emo ? 'Набор эмодзи «' : 'Стикерпак «') + title + '» создан (' + stickers.length + ' шт.). Отправьте ' + (emo ? 'эмодзи' : 'стикер') + ' — друзья смогут добавить ' + noun + ', нажав на него.');", "showToast('✅ Готово', (emo ? 'Набор эмодзи «' : 'Стикерпак «') + title + '» создан (' + stickers.length + ' шт.)!', 'success');");
  code = code.replace("alert('Не удалось опубликовать: ' + e.message);", "showToast('❌ Ошибка публикации', e.message, 'error');");
  code = code.replace("if (!packId) { alert('Этот стикер не привязан к паку'); return; }", "if (!packId) { showToast('Стикер', 'Этот стикер не привязан к набору', 'info'); return; }");
  code = code.replace("if (!pack) { alert('Стикерпак не найден или удалён автором'); return; }", "if (!pack) { showToast('Стикерпак', 'Набор не найден или был удалён автором', 'warning'); return; }");
  code = code.replace("if (!pack) { alert('Пак не найден'); return; }", "if (!pack) { showToast('Стикерпак', 'Пак не найден', 'warning'); return; }");
  code = code.replace("if (pack.authorUid !== me.uid) { alert('Редактировать можно только свои паки'); return; }", "if (pack.authorUid !== me.uid) { showToast('Доступ', 'Редактировать можно только свои паки', 'warning'); return; }");
  code = code.replace("if (!activeId) { alert('Сначала откройте чат'); return; }", "if (!activeId) { showToast('Чат', 'Сначала выберите чат', 'info'); return; }");
  code = code.replace("if (!activeId) { alert('Откройте чат'); return; }", "if (!activeId) { showToast('Чат', 'Сначала выберите чат', 'info'); return; }");
  code = code.replace("alert('Не удалось отправить сообщение: ' + (e && e.message || e));", "showToast('Ошибка отправки', (e && e.message || e), 'error');");
  code = code.replace("if (file.size > MAX_SIZE) { alert('Размер изображения не должен превышать 10MB'); return; }", "if (file.size > MAX_SIZE) { showToast('Файл слишком большой', 'Максимальный размер изображения — 10 МБ', 'warning'); return; }");
  code = code.replace("alert('Не удалось отправить трек: ' + (err.message || 'ошибка'));", "showToast('Ошибка отправки', 'Не удалось отправить трек: ' + (err.message || 'ошибка'), 'error');");
  code = code.replace("alert('Выберите файл и откройте чат');", "showToast('Файл', 'Выберите файл и откройте чат', 'info');");
  code = code.replace("alert('Пожалуйста, выберите изображение или видео');", "showToast('Формат файла', 'Пожалуйста, выберите изображение или видео', 'warning');");
  code = code.replace("alert('Пожалуйста, выберите аудиофайл');", "showToast('Формат файла', 'Пожалуйста, выберите аудиофайл', 'warning');");
  code = code.replace("if (!d.exists) { alert('Пак не найден'); return; }", "if (!d.exists) { showToast('Стикерпак', 'Пак не найден', 'warning'); return; }");
  code = code.replace("alert('Ошибка: ' + e.message);", "showToast('Ошибка', e.message, 'error');");
  code = code.replace("if (file.size > MAX) { alert('Файл слишком большой. Максимум 5MB для аватара.'); return; }", "if (file.size > MAX) { showToast('Аватар', 'Файл слишком большой. Максимум 5 МБ.', 'warning'); return; }");
  code = code.replace("alert('Ошибка загрузки аватара: ' + e.message);", "showToast('Ошибка загрузки', 'Не удалось загрузить аватар: ' + e.message, 'error');");

  // 10. Заменяем prompt в showJoinDialog
  code = code.replace(
    `      function showJoinDialog() {
        const link = prompt('Введите ссылку для присоединения:');
        if (link) {
          window.location.href = link;
        }
      }`,
    `      async function showJoinDialog() {
        const link = await customPrompt('Подключение к звонку', 'Вставьте ссылку на звонок:', '', 'https://...');
        if (link && link.trim()) {
          window.location.href = link.trim();
        }
      }`
  );

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

console.log('apply-ui-errors-and-packicon completed successfully!');
