const fs = require('fs');
const path = require('path');

// 1. Patch public/index.html
function patchPublicIndex() {
  const filePath = path.join(__dirname, '..', 'public', 'index.html');
  let content = fs.readFileSync(filePath, 'utf8');
  let isCrlf = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  const oldOpenModal = `    function openModal(id) {
      const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');
      const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');
      if (typeof hideCtx === 'function') hideCtx();
      const el = document.getElementById(id); if (!el) return;
      el.classList.remove('closing'); el.classList.remove('hidden');
    }`;

  const newOpenModal = `    function openModal(id) {
      const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');
      const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');
      if (typeof hideCtx === 'function') hideCtx();
      const el = document.getElementById(id); if (!el) return;
      el.classList.remove('closing'); el.classList.remove('hidden');
      if (id === 'modal-friend') {
        const cSec = document.getElementById('creatorFriendSection');
        if (cSec) cSec.style.display = (me && me.uid === CREATOR_UID) ? 'block' : 'none';
        const fn = document.getElementById('friendNick');
        if (fn && me && me.uid === CREATOR_UID) fn.placeholder = 'Юзернейм или UID пользователя';
      }
    }`;

  if (norm.includes(oldOpenModal)) {
    norm = norm.replace(oldOpenModal, newOpenModal);
    const updated = isCrlf ? norm.replace(/\n/g, '\r\n') : norm;
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('✓ public/index.html: openModal hooked for creator friend section');
  } else {
    console.log('public/index.html: oldOpenModal not found (already hooked?)');
  }

  // Syntax check
  verifyScriptSyntax(filePath);
}

// 2. Patch electron-desktop/public/index.html
function patchElectronIndex() {
  const filePath = path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html');
  let content = fs.readFileSync(filePath, 'utf8');
  let isCrlf = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  // a. openModal
  const oldOpenModal = `function openModal(id) {
      const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');
      const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');
      if (typeof hideCtx === 'function') hideCtx();
      const el = document.getElementById(id); if (!el) return;
      el.classList.remove('closing'); el.classList.remove('hidden');
    }`;

  const newOpenModal = `function openModal(id) {
      const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');
      const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');
      if (typeof hideCtx === 'function') hideCtx();
      const el = document.getElementById(id); if (!el) return;
      el.classList.remove('closing'); el.classList.remove('hidden');
      if (id === 'modal-friend') {
        const cSec = document.getElementById('creatorFriendSection');
        if (cSec) cSec.style.display = (me && me.uid === CREATOR_UID) ? 'block' : 'none';
        const fn = document.getElementById('friendNick');
        if (fn && me && me.uid === CREATOR_UID) fn.placeholder = 'Юзернейм или UID пользователя';
      }
    }`;

  if (norm.includes(oldOpenModal)) {
    norm = norm.replace(oldOpenModal, newOpenModal);
    console.log('✓ electron-desktop: openModal hooked');
  }

  // b. updateVpAddFriendBtn
  const targetDmCheck = `  const alreadyDm=(allChats||[]).some(c=>c.type==='dm'&&c.members?.includes(uid));
  if(alreadyDm)return;
  // Есть ли общая группа?`;

  const newDmCheck = `  const alreadyDm=(allChats||[]).some(c=>c.type==='dm'&&c.members?.includes(uid));
  if(alreadyDm)return;
  // ═══ СОЗДАТЕЛЬ: Добавить в друзья сразу без заявки ═══
  if (me.uid === CREATOR_UID) {
    btn.innerHTML = '<span class="tgp-row-icon">⚡</span>Добавить в друзья (без заявки)';
    btn.onclick = () => creatorAddFriendByUid(uid);
    btn.style.display = 'flex';
    return;
  }
  btn.onclick = addFriendFromProfile;
  // Есть ли общая группа?`;

  if (norm.includes(targetDmCheck)) {
    norm = norm.replace(targetDmCheck, newDmCheck);
    console.log('✓ electron-desktop: updateVpAddFriendBtn enhanced for creator');
  }

  // c. vpFields UID row
  const targetBday = `  if(u.bday)f+=\`<div class="tgp-row" style="cursor:default"><span class="tgp-row-icon">🎂</span><div class="tgp-row-body"><div class="tgp-row-val">\${new Date(u.bday).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'})}</div><div class="tgp-row-lbl">День рождения</div></div></div>\`;
  document.getElementById('vpFields').innerHTML=f;`;

  const newBday = `  if(u.bday)f+=\`<div class="tgp-row" style="cursor:default"><span class="tgp-row-icon">🎂</span><div class="tgp-row-body"><div class="tgp-row-val">\${new Date(u.bday).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'})}</div><div class="tgp-row-lbl">День рождения</div></div></div>\`;
  if (me && me.uid === CREATOR_UID) {
    f += \`<div class="tgp-row" onclick="navigator.clipboard.writeText('\${uid}');if(typeof showToast==='function')showToast('UID','Скопирован UID: \${uid}','info');" title="Нажмите чтобы скопировать UID" style="cursor:pointer"><span class="tgp-row-icon">🆔</span><div class="tgp-row-body"><div class="tgp-row-val" style="font-family:monospace;font-size:12px;user-select:all">\${uid}</div><div class="tgp-row-lbl">UID пользователя (только создатель)</div></div></div>\`;
  }
  document.getElementById('vpFields').innerHTML=f;`;

  if (norm.includes(targetBday)) {
    norm = norm.replace(targetBday, newBday);
    console.log('✓ electron-desktop: vpFields added UID row for creator');
  }

  const updated = isCrlf ? norm.replace(/\n/g, '\r\n') : norm;
  fs.writeFileSync(filePath, updated, 'utf8');

  // Syntax check
  verifyScriptSyntax(filePath);
}

function verifyScriptSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const scriptMatches = [...content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  let errors = 0;
  for (let i = 0; i < scriptMatches.length; i++) {
    if (scriptMatches[i][0].includes('application/ld+json')) continue;
    try {
      new Function(scriptMatches[i][1]);
    } catch (err) {
      console.error(`❌ Syntax error in script #${i} of ${path.basename(filePath)}:`, err.message);
      errors++;
    }
  }
  if (errors === 0) {
    console.log(`✓ All scripts in ${path.basename(filePath)} parsed cleanly without errors!`);
  }
}

console.log('=== Patching public/index.html ===');
patchPublicIndex();
console.log('\n=== Patching electron-desktop/public/index.html ===');
patchElectronIndex();
