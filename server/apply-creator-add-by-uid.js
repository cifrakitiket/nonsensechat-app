const fs = require('fs');
const path = require('path');

function patchHtmlFile(filePath, isElectron = false) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping non-existent file: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Add Creator UID Section to modal-friend
  const creatorFriendSectionHtml = `
        <!-- Creator Exclusive Section -->
        <div id="creatorFriendSection" style="display:none;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;color:var(--acc3);margin-bottom:8px;display:flex;align-items:center;gap:6px">
            <span class="dev-badge">&lt;/&gt;</span>
            <span>РЕЖИМ СОЗДАТЕЛЯ: ДОБАВИТЬ ПО UID БЕЗ ЗАЯВКИ</span>
          </div>
          <div style="display:flex;gap:8px">
            <input class="mf" id="creatorTargetUid" placeholder="Вставьте UID (например: ieg1YXWEzYNtxpFc7okSkhW041s1)" style="flex:1;margin-bottom:0">
            <button class="mbtn" style="width:auto;padding:10px 14px;margin-top:0;background:linear-gradient(135deg,#7c3aed,#4f46e5);white-space:nowrap" onclick="creatorAddFriendByUid()">⚡ Добавить</button>
          </div>
        </div>`;

  if (!content.includes('id="creatorFriendSection"')) {
    const friendModalCancelBtn = /(<button class="mbtn sec" onclick="closeModal\('modal-friend'\)"[^>]*>.*?<\/button>\s*<\/div>)/;
    if (friendModalCancelBtn.test(content)) {
      content = content.replace(friendModalCancelBtn, `$1\n${creatorFriendSectionHtml}`);
      modified = true;
      console.log(`✓ Added creatorFriendSection to modal-friend in ${filePath}`);
    }
  }

  // 2. Add creatorAddFriendByUid function and enhance addFriend
  const creatorAddFriendJs = `
    /* ═══ CREATOR DIRECT ADD FRIEND BY UID ═══ */
    async function creatorAddFriendByUid(targetUid) {
      if (!me || me.uid !== CREATOR_UID) return;
      const uid = (targetUid || (document.getElementById('creatorTargetUid') ? document.getElementById('creatorTargetUid').value : '') || '').trim();
      if (!uid) {
        if (typeof customConfirm === 'function') await customConfirm('Ошибка', 'Введите UID пользователя', 'OK');
        else alert('Введите UID пользователя');
        return;
      }
      if (uid === me.uid) {
        if (typeof customConfirm === 'function') await customConfirm('Ошибка', 'Нельзя добавить самого себя', 'OK');
        else alert('Нельзя добавить самого себя');
        return;
      }

      // 1. Ищем пользователя в Firestore / кэше
      let targetUser = uCache[uid] || null;
      if (!targetUser) {
        try {
          if (typeof getUser === 'function') targetUser = await getUser(uid);
        } catch (_) {}
      }
      if (!targetUser) {
        try {
          const d = await db.collection('users').doc(uid).get();
          if (d.exists) {
            targetUser = d.data();
            uCache[uid] = targetUser;
          }
        } catch (_) {}
      }

      // 2. Детерминированный ID личного чата
      const chatId = me.uid < uid ? me.uid + '_' + uid : uid + '_' + me.uid;

      // 3. Создаём или обновляем чат без заявок
      const chatData = {
        type: 'dm',
        members: [me.uid, uid],
        lastMsg: 'Чат создан',
        lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: me.uid
      };

      try {
        await db.collection('chats').doc(chatId).set(chatData, { merge: true });
        await db.collection('chats').doc(chatId).collection('messages').add({
          type: 'system',
          uid: me.uid,
          text: 'Чат начат',
          at: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 4. Очищаем любые подвисшие заявки между нами
        try {
          const r1 = await db.collection('friend_requests').where('from', '==', me.uid).where('to', '==', uid).get();
          r1.forEach(d => d.ref.delete().catch(() => {}));
          const r2 = await db.collection('friend_requests').where('from', '==', uid).where('to', '==', me.uid).get();
          r2.forEach(d => d.ref.delete().catch(() => {}));
        } catch (_) {}

        // 5. Очищаем инпуты и закрываем модалки
        closeModal('modal-friend');
        closeModal('modal-viewprofile');
        const fInp = document.getElementById('friendNick'); if (fInp) fInp.value = '';
        const cInp = document.getElementById('creatorTargetUid'); if (cInp) cInp.value = '';

        // 6. Оповещение и открытие чата
        const dispName = targetUser?.nick ? ('@' + targetUser.nick) : (targetUser?.fname ? targetUser.fname : uid);
        if (typeof showToast === 'function') {
          showToast('Друзья', 'Пользователь ' + dispName + ' добавлен в друзья без заявки!', 'success');
        }

        if (typeof renderChatList === 'function') renderChatList();
        openChat(chatId, { type: 'dm', members: [me.uid, uid] });
      } catch (err) {
        console.error('creatorAddFriendByUid error:', err);
        if (typeof customConfirm === 'function') await customConfirm('Ошибка', 'Не удалось добавить: ' + (err.message || err), 'OK');
        else alert('Не удалось добавить: ' + (err.message || err));
      }
    }
    window.creatorAddFriendByUid = creatorAddFriendByUid;
`;

  if (!content.includes('function creatorAddFriendByUid')) {
    const addFriendFuncPattern = /(async function addFriend\(\)\s*\{)/;
    if (addFriendFuncPattern.test(content)) {
      content = content.replace(addFriendFuncPattern, creatorAddFriendJs + '\n    $1');
      modified = true;
      console.log(`✓ Injected creatorAddFriendByUid function into ${filePath}`);
    }
  }

  // 3. Update addFriend() to detect if creator entered UID or nick and add directly without request
  const oldAddFriendLogic = /(async function addFriend\(\)\s*\{\s*const nick\s*=\s*document\.getElementById\('friendNick'\)\.value\.trim\(\);\s*if\s*\(!nick\)\s*return;)/;
  if (oldAddFriendLogic.test(content) && !content.includes('if (me && me.uid === CREATOR_UID)')) {
    const newAddFriendLogic = `async function addFriend() {
      const inputVal = document.getElementById('friendNick').value.trim();
      if (!inputVal) return;

      // ═══ СОЗДАТЕЛЬ: Добавление напрямую без заявки ═══
      if (me && me.uid === CREATOR_UID) {
        // Проверяем: это сразу UID?
        try {
          const directUser = (typeof getUser === 'function') ? await getUser(inputVal) : null;
          if (directUser && (directUser.nick || directUser.uid)) {
            return await creatorAddFriendByUid(inputVal);
          }
          const directDoc = await db.collection('users').doc(inputVal).get();
          if (directDoc.exists) {
            return await creatorAddFriendByUid(inputVal);
          }
        } catch (_) {}

        // Если не UID напрямую, ищем по нику:
        const qCreator = await db.collection('users').where('nickLower', '==', inputVal.toLowerCase()).get();
        if (!qCreator.empty) {
          const tCreator = qCreator.docs[0].data();
          const targetUid = tCreator.uid || qCreator.docs[0].id;
          return await creatorAddFriendByUid(targetUid);
        }
      }

      const nick = inputVal;`;
    content = content.replace(oldAddFriendLogic, newAddFriendLogic);
    modified = true;
    console.log(`✓ Enhanced addFriend() with creator bypass in ${filePath}`);
  }

  // 4. Update openModal to display creator section in modal-friend
  const openModalPattern = /(function openModal\s*\(\s*id\s*\)\s*\{[\s\S]*?el\.classList\.remove\('closing'\);\s*el\.classList\.remove\('hidden'\);)/;
  if (openModalPattern.test(content) && !content.includes('creatorFriendSection')) {
    content = content.replace(openModalPattern, `$1
      if (id === 'modal-friend') {
        const cSec = document.getElementById('creatorFriendSection');
        if (cSec) cSec.style.display = (me && me.uid === CREATOR_UID) ? 'block' : 'none';
        const fn = document.getElementById('friendNick');
        if (fn && me && me.uid === CREATOR_UID) fn.placeholder = 'Юзернейм или UID пользователя';
      }`);
    modified = true;
    console.log(`✓ Added modal-friend open hook for creator in ${filePath}`);
  }

  // 5. Update updateVpAddFriendBtn for Creator in modal-viewprofile
  const oldUpdateVpBtn = /(const alreadyDm = \(allChats \|\| \[\]\)\.some\(c => c\.type === 'dm' && c\.members\?\.includes\(uid\)\);\s*if \(alreadyDm\) return;)/;
  if (oldUpdateVpBtn.test(content) && !content.includes('btn.onclick = () => creatorAddFriendByUid(uid);')) {
    content = content.replace(oldUpdateVpBtn, `$1
      // ═══ СОЗДАТЕЛЬ: Добавить в друзья сразу без заявки ═══
      if (me.uid === CREATOR_UID) {
        btn.innerHTML = '<span class="tgp-row-icon">⚡</span>Добавить в друзья (без заявки)';
        btn.onclick = () => creatorAddFriendByUid(uid);
        btn.style.display = 'flex';
        return;
      }
      btn.onclick = addFriendFromProfile;`);
    modified = true;
    console.log(`✓ Enhanced updateVpAddFriendBtn for creator in ${filePath}`);
  }

  // 6. Show UID row in profile for creator
  const oldVpFields = /(if \(u\.bday\)[^;]+;\s*document\.getElementById\('vpFields'\)\.innerHTML = f;)/;
  if (oldVpFields.test(content) && !content.includes('UID пользователя (только создатель)')) {
    content = content.replace(oldVpFields, `if (u.bday) f += \`<div class="tgp-row" style="cursor:default"><span class="tgp-row-icon">🎂</span><div class="tgp-row-body"><div class="tgp-row-val">\${new Date(u.bday).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</div><div class="tgp-row-lbl">День рождения</div></div></div>\`;
      if (me && me.uid === CREATOR_UID) {
        f += \`<div class="tgp-row" onclick="navigator.clipboard.writeText('\${uid}');if(typeof showToast==='function')showToast('UID','Скопирован UID: \${uid}','info');" title="Нажмите чтобы скопировать UID" style="cursor:pointer"><span class="tgp-row-icon">🆔</span><div class="tgp-row-body"><div class="tgp-row-val" style="font-family:monospace;font-size:12px;user-select:all">\${uid}</div><div class="tgp-row-lbl">UID пользователя (только создатель)</div></div></div>\`;
      }
      document.getElementById('vpFields').innerHTML = f;`);
    modified = true;
    console.log(`✓ Added UID copy row in profile for creator in ${filePath}`);
  }

  // 7. Verify all scripts parse without syntax errors
  const scriptMatches = [...content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  for (let i = 0; i < scriptMatches.length; i++) {
    if (scriptMatches[i][0].includes('application/ld+json')) continue;
    try {
      new Function(scriptMatches[i][1]);
    } catch (err) {
      console.error(`❌ Script ${i} in ${filePath} syntax error:`, err.message);
      return;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Successfully updated ${filePath}`);
  } else {
    console.log(`No changes made to ${filePath} (already patched)`);
  }
}

console.log('=== Patching public/index.html ===');
patchHtmlFile(path.join(__dirname, '..', 'public', 'index.html'), false);

console.log('\n=== Patching electron-desktop/public/index.html ===');
patchHtmlFile(path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html'), true);
