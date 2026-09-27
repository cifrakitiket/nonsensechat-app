// server/apply-android-mobile.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

const MOBILE_CSS = `
/* ════════════════════════════════════════════════════════════════════════
   ANDROID / MOBILE WEB APP (CHROME & PWA) RESPONSIVE STYLES
   ════════════════════════════════════════════════════════════════════════ */
.mobile-back-btn {
  display: none;
}

@media (max-width: 768px) {
  html, body {
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    overflow: hidden !important;
    position: fixed !important;
    inset: 0 !important;
    overscroll-behavior: none !important;
    -webkit-tap-highlight-color: transparent !important;
    touch-action: manipulation !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* ── Sidebar (full screen chat list on mobile) ── */
  .sidebar {
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    height: 100dvh !important;
    display: flex !important;
    flex-direction: column !important;
    position: absolute !important;
    inset: 0 !important;
    z-index: 10 !important;
    transform: translate3d(0, 0, 0);
    transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease !important;
    will-change: transform;
    background: var(--side) !important;
  }

  /* When mobile chat is open, sidebar shifts left for depth */
  body.mobile-chat-open .sidebar {
    transform: translate3d(-28%, 0, 0) !important;
    pointer-events: none !important;
    opacity: 0.85 !important;
  }

  /* ── Main Chat Area (slides in from right) ── */
  .main {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    min-width: 100% !important;
    height: 100% !important;
    height: 100dvh !important;
    z-index: 20 !important;
    transform: translate3d(100%, 0, 0) !important;
    transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1) !important;
    will-change: transform;
    background: var(--bg) !important;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.45) !important;
    flex: 1 1 100% !important;
  }

  body.mobile-chat-open .main {
    transform: translate3d(0, 0, 0) !important;
  }

  /* ── Mobile Back Button in Chat Header ── */
  .mobile-back-btn {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    border-radius: 50% !important;
    background: var(--hover) !important;
    border: none !important;
    color: var(--text) !important;
    font-size: 16px !important;
    cursor: pointer !important;
    margin-right: 4px !important;
    transition: background 0.15s, transform 0.1s !important;
    flex-shrink: 0 !important;
  }
  .mobile-back-btn:active {
    transform: scale(0.92) !important;
    background: var(--acc) !important;
    color: #fff !important;
  }

  /* ── Chat Header adjustments on mobile ── */
  .chat-header {
    padding: 10px 14px !important;
    padding-top: max(10px, env(safe-area-inset-top)) !important;
    gap: 10px !important;
    height: auto !important;
    min-height: 56px !important;
  }
  .ch-ava {
    width: 38px !important;
    height: 38px !important;
  }
  .ch-name {
    font-size: 15px !important;
  }
  .ch-sub {
    font-size: 11.5px !important;
  }

  /* ── Input Bar on mobile ── */
  .input-area {
    padding-bottom: max(8px, env(safe-area-inset-bottom)) !important;
  }
  .input-row {
    padding: 6px 10px !important;
    gap: 6px !important;
  }
  #minp {
    font-size: 16px !important; /* Crucial: stops Android Chrome from auto-zooming! */
    max-height: 120px !important;
    padding: 8px 12px !important;
    border-radius: 18px !important;
  }
  .send-btn, .emoji-btn, .attach-btn {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    border-radius: 50% !important;
    font-size: 16px !important;
  }
  .send-btn {
    background: var(--grad) !important;
    color: #fff !important;
  }

  /* Prevent Chrome auto-zoom on all inputs */
  input, textarea, select {
    font-size: 16px !important;
  }

  /* ── Messages list ── */
  #messages {
    padding: 12px 10px !important;
    gap: 8px !important;
    overscroll-behavior-y: contain !important;
    -webkit-overflow-scrolling: touch !important;
  }
  .msg-row {
    max-width: 90% !important;
  }
  .msg {
    font-size: 14.5px !important;
    padding: 9px 13px !important;
    border-radius: 16px !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.18) !important;
  }
  .msg-mini-ava {
    width: 28px !important;
    height: 28px !important;
    margin-bottom: 4px !important;
  }

  /* ── Right Profile Panel on mobile ── */
  .rp {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    height: 100dvh !important;
    z-index: 100 !important;
    border-left: none !important;
    background: var(--side) !important;
    padding-top: env(safe-area-inset-top) !important;
    padding-bottom: env(safe-area-inset-bottom) !important;
  }

  /* ── Emoji / Stickers / GIF Picker (Bottom Sheet on mobile) ── */
  .tgp {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 48dvh !important;
    max-height: 380px !important;
    border-radius: 20px 20px 0 0 !important;
    border: 1px solid var(--border) !important;
    border-bottom: none !important;
    z-index: 1500 !important;
    box-shadow: 0 -8px 36px rgba(0, 0, 0, 0.5) !important;
    padding-bottom: max(6px, env(safe-area-inset-bottom)) !important;
  }

  /* ── Modals as smooth mobile sheets ── */
  .modal {
    padding: 0 !important;
    align-items: flex-end !important;
  }
  .mcard {
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 24px 24px 0 0 !important;
    max-height: 88dvh !important;
    padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
    margin: 0 !important;
    animation: slideUpMobile 0.24s cubic-bezier(0.2, 0.9, 0.3, 1) !important;
  }
  @keyframes slideUpMobile {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  /* ── Call Overlay on mobile ── */
  #dcCallSidebar {
    display: none !important;
  }
  #dcCallTopbar {
    padding: 0 12px !important;
  }
  .vk-ctrl {
    width: 48px !important;
    height: 48px !important;
  }
  .vk-ctrl svg {
    width: 22px !important;
    height: 22px !important;
  }
  #lkControlsBar {
    gap: 8px !important;
    padding: 0 8px !important;
    bottom: max(16px, env(safe-area-inset-bottom)) !important;
  }

  /* ── Attach menu on mobile ── */
  .attach-menu {
    left: 10px !important;
    right: 10px !important;
    width: auto !important;
    bottom: 60px !important;
  }

  /* ── Custom Confirm modal ── */
  #customConfirm .cc-card {
    width: 90vw !important;
    max-width: 360px !important;
  }

  /* ── Sidebar top layout ── */
  .sidebar-top {
    padding: 10px 14px !important;
    padding-top: max(10px, env(safe-area-inset-top)) !important;
  }

  /* ── Smooth button feedback on Android touch ── */
  button:active, .chat-item:active, .iBtn:active, .action-btn:active {
    transform: scale(0.96) !important;
    transition: transform 0.08s ease !important;
  }
}
`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Fix curLang variable declaration
  const targetCurrentLang = `let currentLang = localStorage.getItem('app_lang') || 'ru';`;
  const fixedCurrentLang = `var curLang = localStorage.getItem('app_lang') || localStorage.getItem('appLang') || localStorage.getItem('nonsense-lang') || 'ru';\n    var currentLang = curLang;\n    window.curLang = curLang;`;
  if (code.includes(targetCurrentLang)) {
    code = code.replace(targetCurrentLang, fixedCurrentLang);
    console.log(`✓ Fixed curLang declaration in ${filePath}`);
  }

  // 2. Fix setLanguage to keep curLang and window.curLang in sync
  const targetSetLangFn = `function setLanguage(lang) {\n      if (!I18N[lang]) lang = 'ru';\n      currentLang = lang;`;
  const fixedSetLangFn = `function setLanguage(lang) {\n      if (!lang) lang = curLang || 'ru';\n      if (!I18N[lang]) lang = 'ru';\n      curLang = lang;\n      currentLang = lang;\n      window.curLang = lang;\n      localStorage.setItem('appLang', lang);`;
  if (code.includes(targetSetLangFn)) {
    code = code.replace(targetSetLangFn, fixedSetLangFn);
    console.log(`✓ Updated setLanguage synchronization in ${filePath}`);
  }

  // 3. Fix line 4317: applyTheme(curTheme); setLanguage(curLang);
  const targetApplyThemeLang = `applyTheme(curTheme); setLanguage(curLang);`;
  const fixedApplyThemeLang = `applyTheme(curTheme); setLanguage(window.curLang || (typeof curLang !== 'undefined' ? curLang : 'ru'));`;
  if (code.includes(targetApplyThemeLang)) {
    code = code.replace(targetApplyThemeLang, fixedApplyThemeLang);
    console.log(`✓ Safe-guarded setLanguage(curLang) invocation in ${filePath}`);
  }

  // 4. Fix setTheme(t) where e was used without check
  const targetSetTheme = `function setTheme(t){applyTheme(t);if(!e.target.closest('#themePicker')&&!e.target.closest('#themeBtn')){const tp=document.getElementById('themePicker');if(tp)tp.classList.remove('open');}\n  if(!e.target.closest('#langPicker')&&!e.target.closest('#langBtn')){const lp=document.getElementById('langPicker');if(lp)lp.classList.remove('open');} const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');}`;
  const fixedSetTheme = `function setTheme(t, e){\n  applyTheme(t);\n  const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');\n  const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');\n}`;
  if (code.includes(targetSetTheme)) {
    code = code.replace(targetSetTheme, fixedSetTheme);
    console.log(`✓ Fixed setTheme handler in ${filePath}`);
  }

  // 5. Inject MOBILE_CSS into <style> if not already present
  if (!code.includes('ANDROID / MOBILE WEB APP (CHROME & PWA) RESPONSIVE STYLES')) {
    const endStyleIdx = code.indexOf('</style>');
    if (endStyleIdx > 0) {
      code = code.slice(0, endStyleIdx) + '\n' + MOBILE_CSS + '\n' + code.slice(endStyleIdx);
      console.log(`✓ Injected Mobile Responsive CSS in ${filePath}`);
    }
  }

  // 6. Add mobile-back-btn to #chatHeader if not already present
  const targetChatHdr = `<div id="chatHeader" class="chat-header hidden" onclick="toggleRightPanel(event)">`;
  const backBtnHtml = `<button class="mobile-back-btn iBtn" id="mobileBackBtn" onclick="closeMobileChat(event)" aria-label="Назад"><i class="fa-solid fa-arrow-left"></i></button>`;
  if (code.includes(targetChatHdr) && !code.includes('id="mobileBackBtn"')) {
    code = code.replace(targetChatHdr, targetChatHdr + '\n    ' + backBtnHtml);
    console.log(`✓ Injected mobile back button in ${filePath}`);
  }

  // 7. Inject closeMobileChat and openChat mobile handler into script
  if (!code.includes('function closeMobileChat')) {
    const openChatMarker = `document.getElementById('chatHeader').classList.remove('hidden');`;
    if (code.includes(openChatMarker)) {
      const mobileOpenCode = `document.body.classList.add('mobile-chat-open');
  const _mainEl = document.querySelector('.main');
  if (_mainEl) _mainEl.classList.add('mobile-open');
  if (window.innerWidth <= 768) {
    try { if (history.state?.mobileChat !== id) history.pushState({ mobileChat: id }, ''); } catch (_) {}
  }
  document.getElementById('chatHeader').classList.remove('hidden');`;
      code = code.replace(openChatMarker, mobileOpenCode);
    }

    const helperFunctions = `
    function closeMobileChat(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      document.body.classList.remove('mobile-chat-open');
      const mainEl = document.querySelector('.main');
      if (mainEl) mainEl.classList.remove('mobile-open');
      if (window.closeRightPanel) closeRightPanel();
    }
    window.closeMobileChat = closeMobileChat;
    window.addEventListener('popstate', function(e) {
      if (document.body.classList.contains('mobile-chat-open')) {
        closeMobileChat();
      }
    });
`;
    // Place right before closing </script> of main script
    const lastScriptEnd = code.lastIndexOf('</script>');
    code = code.slice(0, lastScriptEnd) + '\n' + helperFunctions + '\n' + code.slice(lastScriptEnd);
    console.log(`✓ Added closeMobileChat and Android popstate handler in ${filePath}`);
  }

  // 8. Validate all scripts in the document
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let scriptCount = 0;
  while ((m = scriptRegex.exec(code)) !== null) {
    scriptCount++;
    if (m[1].trim()) {
      try {
        new vm.Script(m[1].trim());
      } catch (err) {
        console.error(`Syntax error in script #${scriptCount} of ${filePath}:`, err.stack || err.message);
        process.exit(1);
      }
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✓ Validated and saved ${filePath} (${scriptCount} scripts valid)`);
}

console.log('\n🎉 ANDROID / CHROME MOBILE OPTIMIZATION APPLIED SUCCESSFULLY!');
