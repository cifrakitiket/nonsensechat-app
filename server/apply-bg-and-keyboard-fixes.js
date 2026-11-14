// server/apply-bg-and-keyboard-fixes.js
const fs = require('fs');
const path = require('path');
const bgDict = require('./generate-bg-i18n');

const publicIndexPath = path.join(__dirname, '..', 'public', 'index.html');
const electronIndexPath = path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html');
const reactTypesPath = path.join(__dirname, '..', 'desktop-react', 'src', 'types', 'index.ts');
const versionPath = path.join(__dirname, '..', 'public', 'version.json');

console.log('--- Applying Bulgarian Localization and Mobile Keyboard/Picker Fixes ---');

// Helper to replace across \r\n and \n
function flexibleReplace(content, searchStr, replaceStr) {
  if (content.includes(searchStr)) return content.replace(searchStr, replaceStr);
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedSearch = searchStr.replace(/\r\n/g, '\n');
  if (normalizedContent.includes(normalizedSearch)) {
    const idx = normalizedContent.indexOf(normalizedSearch);
    // Convert back using regex
    const escaped = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\n/g, '\\r?\\n');
    return content.replace(new RegExp(escaped), replaceStr);
  }
  return content;
}

// 1. Update public/index.html
let html = fs.readFileSync(publicIndexPath, 'utf8');

// 1a. Viewport meta tag: add interactive-widget=resizes-content
if (!html.includes('interactive-widget=resizes-content')) {
  html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content">');
  console.log('✓ Updated viewport meta tag with interactive-widget=resizes-content');
} else {
  console.log('✓ Viewport meta tag already contains interactive-widget=resizes-content');
}

// 1b. Add Bulgarian option to langPicker
if (!html.includes('id="lopt-bg"')) {
  const ruPreOptRegex = /(<div class="theme-opt lang-opt" id="lopt-ru-pre"[^>]*>[\s\S]*?<\/div>)/;
  if (ruPreOptRegex.test(html)) {
    html = html.replace(ruPreOptRegex, `$1\n        <div class="theme-opt lang-opt" id="lopt-bg" onclick="setLanguage('bg')"><img class="lang-flag" src="https://flagcdn.com/w40/bg.png" alt="🇧🇬"> <span>Български</span></div>`);
    console.log('✓ Added Bulgarian option to #langPicker');
  } else {
    console.error('Could not find lopt-ru-pre in public/index.html');
  }
} else {
  console.log('✓ Bulgarian option already in #langPicker');
}

// 1c. Add "bg" to I18N dictionary in public/index.html
if (!html.includes('"bg": {')) {
  const formattedBgJson = ',\n      "bg": ' + JSON.stringify(bgDict, null, 8).trimEnd();
  // Regex to match end of ru-pre dictionary in I18N
  const endI18nRegex = /("enterCallLinkPh":\s*"Вставьте ссылку на звонокъ\.\.\."\s*\r?\n\s*\})(\s*\r?\n\s*\};)/;
  if (endI18nRegex.test(html)) {
    html = html.replace(endI18nRegex, `$1${formattedBgJson}$2`);
    console.log('✓ Inserted Bulgarian translation dictionary into I18N');
  } else {
    console.error('Failed to locate end of I18N object in public/index.html');
  }
} else {
  console.log('✓ Bulgarian dictionary already in I18N');
}

// 1d. Update setLanguage() flag button icon
if (!html.includes(`lang === 'bg'`)) {
  const oldLangBtnCheck = `else if (lang === 'ru-pre') langBtn.innerHTML = '<span style="font-size:16px;line-height:1">📜</span>';`;
  const newLangBtnCheck = `else if (lang === 'bg') langBtn.innerHTML = '<img class="lang-flag" style="width:20px;height:14px;border-radius:2px;" src="https://flagcdn.com/w40/bg.png" alt="🇧🇬">';\n        else if (lang === 'ru-pre') langBtn.innerHTML = '<span style="font-size:16px;line-height:1">📜</span>';`;
  html = flexibleReplace(html, oldLangBtnCheck, newLangBtnCheck);
  console.log('✓ Added Bulgarian flag icon to setLanguage()');
} else {
  console.log('✓ Bulgarian flag already in setLanguage()');
}

// 1e. Send button prevent blur on pointerdown/mousedown/touchstart
if (!html.includes('onpointerdown="event.preventDefault()"')) {
  const oldSendBtn = '<button class="send-btn" onclick="sendMsg()"><i class="fa-solid fa-paper-plane"></i></button>';
  const newSendBtn = '<button class="send-btn" onpointerdown="event.preventDefault()" onmousedown="event.preventDefault()" ontouchstart="event.preventDefault()" onclick="sendMsg()"><i class="fa-solid fa-paper-plane"></i></button>';
  html = html.replace(oldSendBtn, newSendBtn);
  console.log('✓ Updated send-btn with onpointerdown/onmousedown/ontouchstart preventDefault()');
} else {
  console.log('✓ send-btn already has preventDefault()');
}

// 1f. SendMsg keep focus and caret on mobile
if (!html.includes('elMinp.focus();')) {
  const sendMsgClearRegex = /(_sendingMsg\s*=\s*true;\s*\r?\n\s*)minp\(\)\.innerHTML\s*=\s*'';(\s*\r?\n\s*hideCalcBubble\(\);)/;
  const replacement = `$1const elMinp = minp();
      if (elMinp) {
        elMinp.innerHTML = '';
        try {
          elMinp.focus();
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(elMinp);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch (_) {}
      }$2`;
  if (sendMsgClearRegex.test(html)) {
    html = html.replace(sendMsgClearRegex, replacement);
    console.log('✓ Updated sendMsg to keep focus & caret upon sending');
  } else {
    console.error('Could not find sendMsg clear location in public/index.html');
  }
} else {
  console.log('✓ sendMsg already maintains focus');
}

// 1g. Mobile CSS for .tgp (picker docked below .input-row instead of overlaying it)
const tgpMobileRegex = /(\/\* ── Emoji \/ Stickers \/ GIF Picker \(Bottom Sheet on mobile\) ── \*\/\s*\r?\n\s*\.tgp\s*\{)[\s\S]*?(padding-bottom:\s*max\(6px,\s*env\(safe-area-inset-bottom\)\)\s*!important;\s*\r?\n\s*\})/;
const newMobileTgpBody = `/* ── Emoji / Stickers / GIF Picker (Docked under input on mobile) ── */
      .tgp {
        position: static !important;
        left: auto !important;
        right: auto !important;
        bottom: auto !important;
        width: 100% !important;
        max-width: 100% !important;
        height: min(44dvh, 340px) !important;
        max-height: 340px !important;
        border-radius: 0 !important;
        border: none !important;
        border-top: 1px solid var(--border) !important;
        z-index: 10 !important;
        box-shadow: none !important;
        padding-bottom: max(6px, env(safe-area-inset-bottom)) !important;
      }`;

if (tgpMobileRegex.test(html)) {
  html = html.replace(tgpMobileRegex, newMobileTgpBody);
  console.log('✓ Updated mobile .tgp CSS so input field stays above the picker');
} else {
  console.log('✓ Mobile .tgp CSS already matches or regex missed');
}

// 1h. openTgp: blur input field immediately to dismiss native keyboard, and scroll messages
if (!html.includes('// Dismiss system virtual keyboard so it does not conflict with picker')) {
  const openTgpRegex = /(function openTgp\(mode\)\s*\{[\s\S]*?tgpOpen\s*=\s*true;)/;
  const newOpenTgpPart = `function openTgp(mode) {
      if (typeof hideAttachMenu === 'function') hideAttachMenu();
      const tp = document.getElementById('themePicker'); if (tp) tp.classList.remove('open');
      const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');
      // Dismiss system virtual keyboard so it does not conflict with picker
      try {
        const inp = typeof minp === 'function' ? minp() : document.getElementById('minp');
        if (inp) inp.blur();
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
      } catch (_) {}
      setTimeout(() => {
        const box = document.getElementById('messages');
        if (box) box.scrollTop = box.scrollHeight;
      }, 50);
      tgpOpen = true;`;
  if (openTgpRegex.test(html)) {
    html = html.replace(openTgpRegex, newOpenTgpPart);
    console.log('✓ Updated openTgp() to blur input / dismiss virtual keyboard');
  } else {
    console.error('Could not find openTgp function header in public/index.html');
  }
} else {
  console.log('✓ openTgp() already updated');
}

// 1i. Close picker when tapping / focusing message input, and VisualViewport keyboard fix
const minpTapScript = `
    /* ══ MOBILE KEYBOARD & PICKER INTERACTION ENHANCEMENTS ══ */
    // 1. When user taps or focuses on message input field, close emoji/sticker picker immediately and let system keyboard open
    (function setupInputPickerAutoCloser() {
      function checkAndClosePicker() {
        if (typeof window.tgpOpen !== 'undefined' && window.tgpOpen) {
          if (typeof closeTgp === 'function') closeTgp();
          setTimeout(() => {
            const box = document.getElementById('messages');
            if (box) box.scrollTop = box.scrollHeight;
          }, 60);
        }
      }
      const inp = document.getElementById('minp');
      if (inp) {
        inp.addEventListener('pointerdown', checkAndClosePicker);
        inp.addEventListener('focus', checkAndClosePicker);
      }
    })();

    // 2. Mobile VisualViewport Handler: ensure keyboard never overlaps input area or messages
    (function setupMobileViewportKeyboardFix() {
      if (!window.visualViewport) return;
      let isScrolling = false;
      function onVvChange() {
        if (window.innerWidth > 768) {
          const mainEl = document.querySelector('.main');
          if (mainEl && mainEl.style.height) mainEl.style.height = '';
          return;
        }
        const vv = window.visualViewport;
        const mainEl = document.querySelector('.main');
        if (!mainEl) return;
        
        // Check if virtual keyboard is open
        const kbDiff = window.innerHeight - vv.height;
        const isKbOpen = kbDiff > 120;
        
        if (document.body.classList.contains('mobile-chat-open')) {
          if (isKbOpen) {
            mainEl.style.height = \`\${vv.height}px\`;
            const box = document.getElementById('messages');
            if (box && !isScrolling) {
              isScrolling = true;
              requestAnimationFrame(() => {
                box.scrollTop = box.scrollHeight;
                isScrolling = false;
              });
            }
          } else {
            mainEl.style.height = '';
          }
        } else {
          mainEl.style.height = '';
        }
      }
      window.visualViewport.addEventListener('resize', onVvChange);
      window.visualViewport.addEventListener('scroll', onVvChange);
      window.addEventListener('resize', onVvChange);
    })();
`;

if (!html.includes('setupInputPickerAutoCloser')) {
  const endScriptTag = '  </script>\n</body>';
  if (html.includes(endScriptTag)) {
    html = html.replace(endScriptTag, minpTapScript + '\n  </script>\n</body>');
    console.log('✓ Injected setupInputPickerAutoCloser and setupMobileViewportKeyboardFix');
  } else {
    html = html.replace(/(<\/script>\s*<\/body>)/, minpTapScript + '\n$1');
    console.log('✓ Injected setupInputPickerAutoCloser (regex)');
  }
} else {
  console.log('✓ setupInputPickerAutoCloser already present');
}

fs.writeFileSync(publicIndexPath, html, 'utf8');
console.log('✓ Successfully saved updated public/index.html');

// 2. Update electron-desktop/public/index.html
let electronHtml = fs.readFileSync(electronIndexPath, 'utf8');

// 2a. Add Bulgarian option to langPicker
if (!electronHtml.includes('id="lopt-bg"')) {
  const oldElectronLangOpt = `<div class="theme-opt lang-opt" id="lopt-ru-pre" onclick="setLanguage('ru-pre')">📜 Русскій дореформенный</div>`;
  const newElectronLangOpt = `<div class="theme-opt lang-opt" id="lopt-ru-pre" onclick="setLanguage('ru-pre')">📜 Русскій дореформенный</div>\n      <div class="theme-opt lang-opt" id="lopt-bg" onclick="setLanguage('bg')">🇧🇬 Български</div>`;
  if (electronHtml.includes(oldElectronLangOpt)) {
    electronHtml = electronHtml.replace(oldElectronLangOpt, newElectronLangOpt);
    console.log('✓ Added Bulgarian option to electron-desktop langPicker');
  }
}

// 2b. Add "bg" to I18N dictionary in electron-desktop
if (!electronHtml.includes('"bg": {')) {
  const electronBgJson = ',\n  "bg": ' + JSON.stringify(bgDict, null, 4).trimEnd();
  const endI18nRegex = /("enterCallLinkPh":\s*"Вставьте ссылку на звонокъ\.\.\."\s*\r?\n\s*\})(\s*\r?\n\s*\};)/;
  if (endI18nRegex.test(electronHtml)) {
    electronHtml = electronHtml.replace(endI18nRegex, `$1${electronBgJson}$2`);
    console.log('✓ Inserted Bulgarian translation dictionary into electron-desktop I18N');
  } else {
    console.error('Failed to locate end of I18N object in electron-desktop/public/index.html');
  }
}

fs.writeFileSync(electronIndexPath, electronHtml, 'utf8');
console.log('✓ Successfully saved updated electron-desktop/public/index.html');

// 3. Update desktop-react/src/types/index.ts
let reactTypes = fs.readFileSync(reactTypesPath, 'utf8');
if (reactTypes.includes(`export type Language = 'ru' | 'en' | 'uk' | 'ru-pre';`)) {
  reactTypes = reactTypes.replace(
    `export type Language = 'ru' | 'en' | 'uk' | 'ru-pre';`,
    `export type Language = 'ru' | 'en' | 'uk' | 'ru-pre' | 'bg';`
  );
  fs.writeFileSync(reactTypesPath, reactTypes, 'utf8');
  console.log('✓ Updated Language type in desktop-react/src/types/index.ts');
}

// 4. Update public/version.json
const ver = { v: '2.5.6-bg-i18n-mobile-keyboard' };
fs.writeFileSync(versionPath, JSON.stringify(ver) + '\n', 'utf8');
console.log('✓ Bumped version in public/version.json to', ver.v);

console.log('--- ALL UPDATES COMPLETED SUCCESSFULLY ---');
