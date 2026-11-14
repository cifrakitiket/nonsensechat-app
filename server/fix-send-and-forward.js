// server/fix-send-and-forward.js
const fs = require('fs');
const path = require('path');

const publicIndexPath = path.join(__dirname, '..', 'public', 'index.html');
const electronIndexPath = path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html');
const reactAppPath = path.join(__dirname, '..', 'desktop-react', 'src', 'App.tsx');
const versionPath = path.join(__dirname, '..', 'public', 'version.json');

console.log('--- Applying Fix for Send Button and Forward Modal Auto-Close ---');

// 1. Fix public/index.html
let html = fs.readFileSync(publicIndexPath, 'utf8');

// 1a. Fix send-btn HTML: remove preventDefault from pointerdown/touchstart which was blocking click!
const oldSendBtnPattern = /<button class="send-btn"[^>]*>[\s\S]*?<\/button>/;
const newSendBtn = `<button class="send-btn" id="sendBtn" onmousedown="event.preventDefault()" ontouchend="handleSendBtn(event)" onclick="handleSendBtn(event)" title="Отправить"><i class="fa-solid fa-paper-plane"></i></button>`;

if (oldSendBtnPattern.test(html)) {
  html = html.replace(oldSendBtnPattern, newSendBtn);
  console.log('✓ Updated send-btn in public/index.html with reliable handleSendBtn');
} else {
  console.error('Could not find send-btn in public/index.html');
}

// 1b. Add handleSendBtn and forwardToChat functions to public/index.html
const sendAndForwardLogic = `
    /* ═══ RELIABLE SEND BUTTON HANDLER ═══ */
    let _lastSendBtnTime = 0;
    function handleSendBtn(e) {
      if (e) {
        if (e.type === 'touchend') {
          try { e.preventDefault(); } catch (_) {}
        }
      }
      const now = Date.now();
      if (now - _lastSendBtnTime < 300) return;
      _lastSendBtnTime = now;
      if (typeof sendMsg === 'function') sendMsg();
      try {
        const inp = typeof minp === 'function' ? minp() : document.getElementById('minp');
        if (inp) inp.focus();
      } catch (_) {}
    }
    window.handleSendBtn = handleSendBtn;

    /* ═══ INSTANT FORWARD TO CHAT WITH AUTO-CLOSE ═══ */
    async function forwardToChat(targetId) {
      if (!forwardMsgData || !targetId) {
        if (typeof closeModal === 'function') closeModal('modal-forward');
        return;
      }
      const dataToForward = { ...forwardMsgData };
      forwardMsgData = null;
      selectedForwardTarget = null;
      if (typeof closeModal === 'function') closeModal('modal-forward');
      const fb = document.getElementById('forwardBar');
      if (fb) fb.classList.add('hidden');

      try {
        const data = buildForwardData(dataToForward, me);
        await db.collection('chats').doc(targetId).collection('messages').add(data);
        await db.collection('chats').doc(targetId).update({
          lastMsg: '↪️ Переслано: ' + getForwardLastMsgPreview(data),
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        });
        if (typeof showToast === 'function') {
          showToast('Пересылка', 'Сообщение успешно переслано!', 'success');
        }
      } catch (err) {
        console.error('[forwardToChat] error:', err);
        if (typeof showToast === 'function') {
          showToast('Ошибка', 'Не удалось переслать: ' + (err.message || err), 'error');
        }
      }
    }
    window.forwardToChat = forwardToChat;
`;

// Replace doForward in public/index.html
const oldDoForwardRegex = /async function doForward\(\)\s*\{[\s\S]*?\}\s*function cancelForward\(\)/;
const newDoForward = `async function doForward() {
      if (!forwardMsgData) {
        closeModal('modal-forward');
        return;
      }
      if (!selectedForwardTarget) {
        if (typeof showToast === 'function') showToast('Пересылка', 'Выберите чат из списка', 'warning');
        else alert('Выберите чат из списка');
        return;
      }
      await forwardToChat(selectedForwardTarget);
    }
    function cancelForward()`;

if (oldDoForwardRegex.test(html)) {
  html = html.replace(oldDoForwardRegex, sendAndForwardLogic + '\n    ' + newDoForward);
  console.log('✓ Injected handleSendBtn, forwardToChat and updated doForward in public/index.html');
} else {
  console.error('Could not find doForward in public/index.html');
}

// 1c. Update renderForwardList to allow 1-click forward on chat item click in public/index.html
const oldForwardItemClickRegex = /el\.onclick\s*=\s*\(\)\s*=>\s*\{\s*selectedForwardTarget\s*=\s*c\.id;\s*renderForwardList\(\);\s*\};/;
const newForwardItemClick = `el.onclick = () => { forwardToChat(c.id); };`;

if (oldForwardItemClickRegex.test(html)) {
  html = html.replace(oldForwardItemClickRegex, newForwardItemClick);
  console.log('✓ Updated renderForwardList in public/index.html so clicking any chat forwards and closes immediately');
} else {
  console.log('✓ renderForwardList item click already updated or format differs');
}

// 1d. Add CSS rule to prevent inner <i> or <svg> from blocking pointer events on .send-btn
if (!html.includes('.send-btn * { pointer-events: none; }')) {
  html = html.replace('.send-btn {', '.send-btn * { pointer-events: none; }\n    .send-btn {');
  console.log('✓ Added pointer-events: none for send-btn children');
}

fs.writeFileSync(publicIndexPath, html, 'utf8');
console.log('✓ Saved public/index.html');

// 2. Fix electron-desktop/public/index.html
let electronHtml = fs.readFileSync(electronIndexPath, 'utf8');

// 2a. Update send-btn in electron-desktop
if (oldSendBtnPattern.test(electronHtml)) {
  electronHtml = electronHtml.replace(oldSendBtnPattern, newSendBtn);
  console.log('✓ Updated send-btn in electron-desktop');
}

// 2b. Add forwardToChat and update doForward in electron-desktop
const oldElectronDoForwardRegex = /async function doForward\(\)\s*\{[\s\S]*?\}\s*function cancelForward\(\)/;
if (oldElectronDoForwardRegex.test(electronHtml)) {
  electronHtml = electronHtml.replace(oldElectronDoForwardRegex, sendAndForwardLogic + '\n    ' + newDoForward);
  console.log('✓ Injected handleSendBtn, forwardToChat in electron-desktop');
}

const oldElectronForwardItemClickRegex = /el\.onclick\s*=\s*\(\)\s*=>\s*\{\s*selectedForwardTarget\s*=\s*c\.id;\s*renderForwardList\(\);\s*\};/;
if (oldElectronForwardItemClickRegex.test(electronHtml)) {
  electronHtml = electronHtml.replace(oldElectronForwardItemClickRegex, newForwardItemClick);
  console.log('✓ Updated renderForwardList in electron-desktop for 1-click forward and close');
}

fs.writeFileSync(electronIndexPath, electronHtml, 'utf8');
console.log('✓ Saved electron-desktop/public/index.html');

// 3. Update desktop-react/src/App.tsx
let reactApp = fs.readFileSync(reactAppPath, 'utf8');
const oldReactHandleForward = `  const handleForwardMessage = async (targetChatId: string, msg: Message) => {
    if (!currentUser?.uid) return;`;

const newReactHandleForward = `  const handleForwardMessage = async (targetChatId: string, msg: Message) => {
    if (!currentUser?.uid) return;
    setForwardMessage(null);`;

if (reactApp.includes(oldReactHandleForward)) {
  reactApp = reactApp.replace(oldReactHandleForward, newReactHandleForward);
  fs.writeFileSync(reactAppPath, reactApp, 'utf8');
  console.log('✓ Updated handleForwardMessage in desktop-react to close modal immediately');
} else {
  console.log('✓ desktop-react handleForwardMessage already updated');
}

// 4. Update public/version.json
const ver = { v: '2.5.7-send-btn-and-forward-close-fix' };
fs.writeFileSync(versionPath, JSON.stringify(ver) + '\n', 'utf8');
console.log('✓ Bumped version in public/version.json to', ver.v);

console.log('--- ALL FIXES APPLIED SUCCESSFULLY ---');
