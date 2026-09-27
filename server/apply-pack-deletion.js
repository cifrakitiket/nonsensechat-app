// server/apply-pack-deletion.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) {
    console.log('Skipping (not found):', filePath);
    continue;
  }

  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Добавляем deleteFromVKCloud сразу после uploadToVKCloud
  if (!code.includes('async function deleteFromVKCloud(')) {
    const s3DeleteCode = `
    /* ═══ DELETE OBJECT FROM VK CLOUD S3 ═══ */
    async function deleteFromVKCloud(urlOrKey) {
      if (!urlOrKey) return false;
      try {
        let key = urlOrKey;
        if (typeof key === 'string' && (key.startsWith('http://') || key.startsWith('https://'))) {
          const u = new URL(key);
          const prefix = '/' + VK_S3_CONFIG.bucket + '/';
          if (u.pathname.startsWith(prefix)) {
            key = decodeURIComponent(u.pathname.slice(prefix.length));
          } else {
            return false;
          }
        }

        const enc = new TextEncoder();
        const sha256Hex = async (str) => {
          const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
          return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        };
        const hmac = async (keyData, str) => {
          const cryptoKey = await crypto.subtle.importKey(
            'raw',
            typeof keyData === 'string' ? enc.encode(keyData) : keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(str));
          return new Uint8Array(sig);
        };

        const now = new Date();
        const date = now.toISOString().slice(0, 10).replace(/-/g, '');
        const datetime = date + 'T' + now.toISOString().slice(11, 19).replace(/:/g, '') + 'Z';
        const host = new URL(VK_S3_CONFIG.endpoint).host;
        const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');

        const credentialScope = date + '/' + VK_S3_CONFIG.region + '/s3/aws4_request';
        const credential = VK_S3_CONFIG.access + '/' + credentialScope;

        const queryParams = [
          'X-Amz-Algorithm=AWS4-HMAC-SHA256',
          'X-Amz-Credential=' + encodeURIComponent(credential),
          'X-Amz-Date=' + datetime,
          'X-Amz-Expires=900',
          'X-Amz-SignedHeaders=host'
        ].sort().join('&');

        const canonicalRequest = [
          'DELETE',
          '/' + VK_S3_CONFIG.bucket + '/' + encodedKey,
          queryParams,
          'host:' + host + '\\n',
          'host',
          'UNSIGNED-PAYLOAD'
        ].join('\\n');

        const stringToSign = [
          'AWS4-HMAC-SHA256',
          datetime,
          credentialScope,
          await sha256Hex(canonicalRequest)
        ].join('\\n');

        const kDate = await hmac(enc.encode('AWS4' + VK_S3_CONFIG.secret), date);
        const kRegion = await hmac(kDate, VK_S3_CONFIG.region);
        const kService = await hmac(kRegion, 's3');
        const kSigning = await hmac(kService, 'aws4_request');
        const sigBuf = await hmac(kSigning, stringToSign);
        const signature = Array.from(sigBuf).map(b => b.toString(16).padStart(2, '0')).join('');

        const deleteUrl = VK_S3_CONFIG.endpoint + '/' + VK_S3_CONFIG.bucket + '/' + encodedKey + '?' + queryParams + '&X-Amz-Signature=' + signature;

        const res = await fetch(deleteUrl, { method: 'DELETE' });
        return res.ok || res.status === 204;
      } catch (err) {
        console.warn('deleteFromVKCloud error for', urlOrKey, err);
        return false;
      }
    }
    window.deleteFromVKCloud = deleteFromVKCloud;
`;
    const targetIdx = code.indexOf('async function uploadStickerImage(');
    if (targetIdx > 0) {
      code = code.slice(0, targetIdx) + s3DeleteCode + '\n    ' + code.slice(targetIdx);
      console.log('Added deleteFromVKCloud in:', filePath);
    }
  }

  // 2. Добавляем кнопку "🗑 Удалить навсегда" в modal-packview
  if (!code.includes('id="packViewDeleteBtn"')) {
    code = code.replace(
      '<button class="mbtn sec hidden" id="packViewEditBtn" onclick="packViewEdit()">✏️ Редактировать</button>',
      '<button class="mbtn sec hidden" id="packViewEditBtn" onclick="packViewEdit()">✏️ Редактировать</button>\n          <button class="mbtn red hidden" id="packViewDeleteBtn" onclick="deletePackPermanently(_packViewId)">🗑 Удалить навсегда</button>'
    );
    console.log('Added packViewDeleteBtn in modal-packview in:', filePath);
  }

  // 3. Добавляем кнопку "🗑 Удалить пак" в modal-createpack (при редактировании)
  if (!code.includes('id="packModalDeleteBtn"')) {
    code = code.replace(
      '<button class="mbtn" id="packPublishBtn"',
      '<button class="mbtn red hidden" id="packModalDeleteBtn" onclick="deletePackPermanently(editingPackId)">🗑 Удалить пак</button>\n          <button class="mbtn" id="packPublishBtn"'
    );
    console.log('Added packModalDeleteBtn in modal-createpack in:', filePath);
  }

  // 4. Добавляем deletePackPermanently функцию
  if (!code.includes('async function deletePackPermanently(')) {
    const deletePackPermanentlyCode = `
    /* ═══ ПОЛНОЕ УДАЛЕНИЕ ПАКА ИЗ ПАМЯТИ, БАЗЫ И ХРАНИЛИЩА ═══ */
    async function deletePackPermanently(packId) {
      if (!packId) return;
      let pack = stickerPacksCache[packId];
      if (!pack) {
        try {
          const d = await db.collection('stickerPacks').doc(packId).get();
          if (d.exists) {
            pack = { id: d.id, ...d.data() };
            stickerPacksCache[packId] = pack;
          }
        } catch (e) { }
      }
      if (!pack) {
        showToast('Стикерпак', 'Пак не найден или уже был удалён', 'warning');
        return;
      }
      const isMine = (me && pack.authorUid === me.uid) || (me && me.uid === CREATOR_UID);
      if (!isMine) {
        showToast('Доступ', 'Удалить пак навсегда может только его автор', 'warning');
        return;
      }

      const isEmo = pack.kind === 'emoji';
      const noun = isEmo ? 'набор эмодзи' : 'стикерпак';
      const title = pack.title || noun;

      const confirmed = await customConfirm(
        'Удалить ' + noun,
        'Вы уверены, что хотите ПОЛНОСТЬЮ удалить «' + title + '»? Пак будет стёрт из базы данных, все файлы удалены из облака VK Cloud S3, и он пропадёт из памяти мессенджера.',
        'Удалить навсегда',
        'red'
      );
      if (!confirmed) return;

      showToast('Удаление', 'Очистка файлов из VK Cloud S3 и базы...', 'info');

      // 1. Сбор всех URL для удаления из хранилища VK Cloud S3
      const urlsToDelete = [];
      if (pack.icon) urlsToDelete.push(pack.icon);
      if (Array.isArray(pack.stickers)) {
        for (const s of pack.stickers) {
          if (s && s.url) urlsToDelete.push(s.url);
        }
      }

      // 2. Удаление файлов из облака
      try {
        if (urlsToDelete.length > 0) {
          await Promise.allSettled(urlsToDelete.map(u => deleteFromVKCloud(u)));
        }
      } catch (err) {
        console.warn('Error deleting pack media from S3:', err);
      }

      // 3. Удаление документа пака из базы
      try {
        await db.collection('stickerPacks').doc(packId).delete();
      } catch (err) {
        console.warn('Error deleting pack doc:', err);
      }

      // 4. Удаление из установленных у текущего пользователя
      try {
        await db.collection('users').doc(me.uid).update({
          installedPacks: firebase.firestore.FieldValue.arrayRemove(packId)
        }).catch(() => {});
      } catch (e) {}

      // 5. Очистка кэша и состояния в памяти
      delete stickerPacksCache[packId];
      installedPackIds = (installedPackIds || []).filter(x => x !== packId);
      if (editingPackId === packId) editingPackId = null;
      if (_packViewId === packId) _packViewId = null;

      // 6. Закрытие модальных окон
      closeModal('modal-packview');
      closeModal('modal-createpack');

      // 7. Обновление интерфейса стикерной панели
      afterPackChange();

      showToast('✅ Удалено', (isEmo ? 'Набор эмодзи «' : 'Стикерпак «') + title + '» полностью удалён из памяти и хранилища!', 'success');
    }
    window.deletePackPermanently = deletePackPermanently;
`;
    const openPackViewIdx = code.indexOf('async function openStickerPackView(');
    if (openPackViewIdx > 0) {
      code = code.slice(0, openPackViewIdx) + deletePackPermanentlyCode + '\n    ' + code.slice(openPackViewIdx);
      console.log('Added deletePackPermanently function in:', filePath);
    }
  }

  // 5. Обновляем renderPackView для отображения packViewDeleteBtn
  if (code.includes("if (editBtn) editBtn.classList.toggle('hidden', !mine);") && !code.includes("packViewDeleteBtn")) {
    code = code.replace(
      "if (editBtn) editBtn.classList.toggle('hidden', !mine);",
      `if (editBtn) editBtn.classList.toggle('hidden', !mine);
      const delBtn = document.getElementById('packViewDeleteBtn');
      if (delBtn) delBtn.classList.toggle('hidden', !mine);`
    );
    console.log('Updated renderPackView delete button visibility in:', filePath);
  }

  // 6. Обновляем setPackModalMode для отображения packModalDeleteBtn
  if (code.includes("function setPackModalMode(editing) {") && !code.includes("packModalDeleteBtn")) {
    code = code.replace(
      "function setPackModalMode(editing) {\n      const h = document.getElementById('packModalTitle'), b = document.getElementById('packPublishBtn');",
      `function setPackModalMode(editing) {
      const h = document.getElementById('packModalTitle'), b = document.getElementById('packPublishBtn');
      const modalDel = document.getElementById('packModalDeleteBtn');
      if (modalDel) modalDel.classList.toggle('hidden', !editing);`
    );
    console.log('Updated setPackModalMode for packModalDeleteBtn in:', filePath);
  }

  // 7. Обновляем removeDraftSticker для удаления файла из S3
  if (code.includes('function removeDraftSticker(i) { stickerDraft.splice(i, 1); renderPackDraft(); }')) {
    code = code.replace(
      'function removeDraftSticker(i) { stickerDraft.splice(i, 1); renderPackDraft(); }',
      `function removeDraftSticker(i) {
      const removed = stickerDraft.splice(i, 1)[0];
      if (removed && removed.url) {
        deleteFromVKCloud(removed.url).catch(() => {});
      }
      renderPackDraft();
    }`
    );
    console.log('Updated removeDraftSticker to clean S3 in:', filePath);
  }

  // 8. Обновляем секцию кастомных эмодзи в пикере (renderTgpCustomEmoji): добавляем кнопки удаления и редактирования
  const oldCustEmojiRender = `      for (const p of packs) {
        const cells = (p.stickers || []).map(s => emojiCustomCell({ url: s.url, packId: p.id, name: s.emoji || '' })).join('');
        html += tgpSection('cemoji-pack-' + p.id, packIconImg(p), stkEsc(p.title || 'Эмодзи'), \`<div class="tgp-emoji-grid">\${cells}</div>\`);
      }`;

  const newCustEmojiRender = `      for (const p of packs) {
        const cells = (p.stickers || []).map(s => emojiCustomCell({ url: s.url, packId: p.id, name: s.emoji || '' })).join('');
        const mine = me && (p.authorUid === me.uid || me.uid === CREATOR_UID);
        const editBtn = mine ? \`<button class="stk-pack-del" title="Редактировать" onclick="openEditPack('\${p.id}')">✏️</button>\` : '';
        const delBtn = mine
          ? \`<button class="stk-pack-del red" title="Удалить набор навсегда" onclick="deletePackPermanently('\${p.id}')">🗑</button>\`
          : \`<button class="stk-pack-del" title="Убрать" onclick="uninstallPack('\${p.id}')">✕</button>\`;
        const head = \`\${packIconImg(p)}<span class="tgp-sec-title">\${stkEsc(p.title || 'Эмодзи')}</span><span style="display:flex;gap:4px">\${editBtn}\${delBtn}</span>\`;
        html += \`<div class="tgp-sec" id="tgp-sec-cemoji-pack-\${p.id}"><div class="tgp-sec-head">\${head}</div><div class="tgp-emoji-grid">\${cells}</div></div>\`;
      }`;

  if (code.includes(oldCustEmojiRender)) {
    code = code.replace(oldCustEmojiRender, newCustEmojiRender);
    console.log('Updated renderTgpCustomEmoji with delete and edit buttons in:', filePath);
  }

  // 9. Обновляем секцию стикеров в пикере (renderTgpStickers): для автора пака показываем и 🗑 (удалить навсегда) и ✕ (убрать)
  const oldStkHead = `const editBtn = mine ? \`<button class="stk-pack-del" title="Редактировать" onclick="openEditPack('\${p.id}')">✏️</button>\` : '';
        const head = \`\${packIconImg(p)}<span class="tgp-sec-title">\${stkEsc(p.title || 'Пак')}</span><span style="display:flex;gap:2px">\${editBtn}<button class="stk-pack-del" title="Убрать" onclick="uninstallPack('\${p.id}')">✕</button></span>\`;`;

  const newStkHead = `const editBtn = mine ? \`<button class="stk-pack-del" title="Редактировать" onclick="openEditPack('\${p.id}')">✏️</button>\` : '';
        const delBtn = mine
          ? \`<button class="stk-pack-del red" title="Удалить пак навсегда" onclick="deletePackPermanently('\${p.id}')">🗑</button>\`
          : \`<button class="stk-pack-del" title="Убрать" onclick="uninstallPack('\${p.id}')">✕</button>\`;
        const head = \`\${packIconImg(p)}<span class="tgp-sec-title">\${stkEsc(p.title || 'Пак')}</span><span style="display:flex;gap:4px">\${editBtn}\${delBtn}</span>\`;`;

  if (code.includes(oldStkHead)) {
    code = code.replace(oldStkHead, newStkHead);
    console.log('Updated renderTgpStickers with permanent delete button in:', filePath);
  }

  // 10. Добавляем стили для красных кнопок удаления
  if (!code.includes('.stk-pack-del.red')) {
    code = code.replace(
      '.stk-pack-del:hover {',
      `.stk-pack-del.red {
      color: #ff5c5c;
      opacity: .75;
      font-size: 13px;
    }
    .stk-pack-del.red:hover {
      opacity: 1;
      transform: scale(1.15);
    }
    .stk-pack-del:hover {`
    );
    console.log('Added .stk-pack-del.red CSS in:', filePath);
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

console.log('apply-pack-deletion completed successfully!');
