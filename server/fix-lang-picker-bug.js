// server/fix-lang-picker-bug.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Lower z-index of langPicker to 600 (below modal 4000)
  code = code.replace(
    'id="langPicker" style="right:8px;top:54px;z-index:9999;"',
    'id="langPicker" style="right:8px;top:54px;z-index:600;"'
  );

  // 2. Update openModal to always close langPicker and themePicker
  const openModalOldRegex = /function openModal\(id\)\s*\{\s*const el\s*=\s*document\.getElementById\(id\);[\s\S]*?el\.classList\.remove\('hidden'\);\s*\}/;
  const openModalNew = `function openModal(id) {
      const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');
      const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');
      if (typeof hideCtx === 'function') hideCtx();
      const el = document.getElementById(id); if (!el) return;
      el.classList.remove('closing'); el.classList.remove('hidden');
    }`;

  if (openModalOldRegex.test(code)) {
    code = code.replace(openModalOldRegex, openModalNew);
    console.log(`✓ Updated openModal in ${filePath}`);
  }

  // 3. Update document click listener to close langPicker when clicking outside
  const docClickOldRegex = /document\.addEventListener\('click',\s*e\s*=>\s*\{[\s\S]*?document\.getElementById\('themePicker'\)\.classList\.remove\('open'\);[\s\S]*?closeMentionPopup\(\);\s*\}\);/;
  const docClickNew = `document.addEventListener('click', e => {
      if (e.target.classList.contains('modal')) closeModal(e.target.id);
      const lp = document.getElementById('langPicker');
      if (lp && !e.target.closest('#langPicker') && !e.target.closest('#langBtn')) lp.classList.remove('open');
      const tp = document.getElementById('themePicker');
      if (tp && !e.target.closest('#themePicker') && !e.target.closest('#themeBtn') && !e.target.closest('.theme-btn') && !e.target.closest('.theme-opt')) tp.classList.remove('open');
      if (!e.target.closest('#attachMenu') && !e.target.closest('.attach-btn')) hideAttachMenu();
      if (!e.target.closest('#tgPicker') && !e.target.closest('.emoji-btn') && !e.target.closest('.sticker-btn')) closeTgp();
      if (!e.target.closest('.ctx')) hideCtx();
      if (e.target.classList.contains('spoiler')) e.target.classList.add('vis');
      if (!e.target.closest('#mentionPopup') && !e.target.closest('#minp')) closeMentionPopup();
    });`;

  if (docClickOldRegex.test(code)) {
    code = code.replace(docClickOldRegex, docClickNew);
    console.log(`✓ Updated click-outside listener in ${filePath}`);
  }

  // 4. Update showCtx to close langPicker & themePicker
  const showCtxOldRegex = /function showCtx\(id,\s*e\)\s*\{\s*hideCtx\(\);/;
  const showCtxNew = `function showCtx(id, e) {
  hideCtx();
  const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');
  const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');`;

  if (showCtxOldRegex.test(code)) {
    code = code.replace(showCtxOldRegex, showCtxNew);
    console.log(`✓ Updated showCtx to dismiss pickers in ${filePath}`);
  }

  // 5. Update openRightPanel to close langPicker & themePicker
  const openRpOldRegex = /function openRightPanel\(\)\s*\{\s*if\s*\(!activeChat\)\s*return;/;
  const openRpNew = `function openRightPanel() {
      const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');
      const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');
      if (!activeChat) return;`;

  if (openRpOldRegex.test(code)) {
    code = code.replace(openRpOldRegex, openRpNew);
    console.log(`✓ Updated openRightPanel in ${filePath}`);
  }

  // Validate all scripts
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let sCount = 0;
  while ((match = scriptRegex.exec(code)) !== null) {
    sCount++;
    const src = match[1];
    if (!src.trim()) continue;
    try {
      new vm.Script(src);
    } catch (err) {
      console.error(`❌ Syntax error in script #${sCount} of ${filePath}:`, err.message);
      process.exit(1);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✓ Validated and saved ${filePath} (${sCount} scripts valid)`);
}

console.log('\nLanguage picker bug fixed successfully!');
