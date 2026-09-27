// server/apply-touch-ctx-and-ce-click.js
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

  // 1. Add CSS for clickable custom emojis and mobile message cursor
  const customEmojiCss = `
/* Custom Emoji clickable in messages */
img.ce, .ce {
  cursor: pointer !important;
  display: inline-block;
  vertical-align: -3px;
  transition: transform 0.12s ease;
}
img.ce:hover, .ce:hover {
  transform: scale(1.22);
}
@media (max-width: 768px) {
  .msg {
    cursor: pointer !important;
  }
}
`;
  if (!code.includes('Custom Emoji clickable in messages')) {
    const endStyleIdx = code.indexOf('</style>');
    if (endStyleIdx > 0) {
      code = code.slice(0, endStyleIdx) + '\n' + customEmojiCss + '\n' + code.slice(endStyleIdx);
      console.log(`✓ Added custom emoji CSS to ${filePath}`);
    }
  }

  // 2. Replace message contextmenu listener with tap-friendly handler
  // Look for the block containing selMsgId = d.id or selMsgId=d.id inside querySelector('.msg')
  const regexMsgCtx = /row\.querySelector\('\.msg'\)\.addEventListener\('contextmenu',\s*e\s*=>\s*\{[\s\S]*?showCtx\('ctxMsg',\s*e\);\s*\}\);/;
  
  const replacementMsgCtx = `const msgEl = row.querySelector('.msg');
          const openMsgContextMenu = (e) => {
            if (e && e.defaultPrevented) return;
            if (e) { e.preventDefault(); e.stopPropagation(); }
            selMsgId = d.id; selMsgAuthor = m.author || ''; selMsgText = m.text || ''; selMsgData = m;
            const isPhoto = m.type === 'photo';
            const isSticker = m.type === 'sticker';
            document.getElementById('ctxCopyText').style.display = (isPhoto || isSticker) ? 'none' : 'flex';
            document.getElementById('ctxCopyPhoto').style.display = isPhoto ? 'flex' : 'none';
            document.getElementById('ctxStickerPack').style.display = (isSticker && m.packId) ? 'flex' : 'none';
            showReadByInCtx(d.id, m);
            showCtx('ctxMsg', e);
          };

          msgEl.addEventListener('contextmenu', openMsgContextMenu);

          // On Android / mobile / touch screens: single tap opens context menu
          msgEl.addEventListener('click', e => {
            // If user clicked interactive element: skip context menu
            if (e.target.closest('img.ce, .ce, a, .reaction-chip, .msg-photo, .spoiler, video, audio, .mp-msg, .vp-play, .vp-bar, .mv-wrap, .mv-pip, button')) {
              return;
            }
            // Do not open if user was selecting text
            if (window.getSelection && window.getSelection().toString().trim().length > 0) {
              return;
            }
            // Tap opens context menu on Android / mobile / touch devices
            const isTouchOrMobile = window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isTouchOrMobile) {
              openMsgContextMenu(e);
            }
          });`;

  if (regexMsgCtx.test(code)) {
    code = code.replace(regexMsgCtx, replacementMsgCtx);
    console.log(`✓ Replaced message contextmenu listener with tap & contextmenu handler in ${filePath}`);
  } else if (code.includes('openMsgContextMenu')) {
    console.log(`ℹ Message tap & contextmenu handler already present in ${filePath}`);
  } else {
    console.warn(`⚠ Could not find message contextmenu pattern in ${filePath}`);
  }

  // 3. Improve showCtx coordinate detection for touch/clicks
  const regexShowCtx = /function showCtx\(id,\s*e\)\s*\{[\s\S]*?m\.style\.left\s*=\s*x\s*\+\s*'px';\s*m\.style\.top\s*=\s*y\s*\+\s*'px';\s*\}\);?\s*\}/;
  const replacementShowCtx = `function showCtx(id, e) {
  hideCtx();
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('vis');
  requestAnimationFrame(() => {
    let x = (e && typeof e.clientX === 'number' && e.clientX > 0) ? e.clientX : 0;
    let y = (e && typeof e.clientY === 'number' && e.clientY > 0) ? e.clientY : 0;
    if (!x && !y && e && e.touches && e.touches[0]) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    }
    if (!x && !y && e && e.target && e.target.getBoundingClientRect) {
      const rect = e.target.getBoundingClientRect();
      x = rect.left + Math.min(rect.width / 2, 40);
      y = rect.top + Math.min(rect.height / 2, 20);
    }
    let mw = m.offsetWidth || 220, mh = m.offsetHeight || 300;
    if (x + mw > window.innerWidth - 8) x = window.innerWidth - mw - 8;
    if (y + mh > window.innerHeight - 8) y = window.innerHeight - mh - 8;
    if (x < 8) x = 8; if (y < 8) y = 8;
    m.style.left = x + 'px'; m.style.top = y + 'px';
  });
}`;

  if (regexShowCtx.test(code)) {
    code = code.replace(regexShowCtx, replacementShowCtx);
    console.log(`✓ Updated showCtx for robust touch coordinate positioning in ${filePath}`);
  }

  // 4. Add custom emoji click-to-pack listener
  const ceClickMarker = '// Click on custom emoji in message -> directly open its emoji pack';
  const ceClickListener = `
${ceClickMarker}
document.addEventListener('click', function(e) {
  const ce = e.target && e.target.closest ? e.target.closest('img.ce, .ce') : null;
  if (ce && ce.closest('#messages')) {
    e.preventDefault();
    e.stopPropagation();
    let pid = ce.getAttribute('data-pack');
    if (!pid) {
      const src = ce.getAttribute('src');
      if (typeof stickerPacksCache === 'object' && stickerPacksCache) {
        for (const id in stickerPacksCache) {
          const p = stickerPacksCache[id];
          if (p && Array.isArray(p.stickers) && p.stickers.some(s => s && s.url === src)) {
            pid = id;
            break;
          }
        }
      }
      if (!pid && typeof installedEmojiPacks === 'function') {
        for (const p of installedEmojiPacks()) {
          if ((p.stickers || []).some(s => s && s.url === src)) {
            pid = p.id;
            break;
          }
        }
      }
    }
    if (pid && typeof openStickerPackView === 'function') {
      openStickerPackView(pid);
    }
  }
}, true);
`;

  if (code.includes(ceClickMarker)) {
    // Replace existing listener with the enhanced capture version
    const ceRegex = /\/\/ Click on custom emoji in message -> directly open its emoji pack[\s\S]*?\}\);\s*/;
    code = code.replace(ceRegex, ceClickListener.trim() + '\n\n');
    console.log(`✓ Updated custom emoji click listener to use capture in ${filePath}`);
  } else {
    const endScriptIdx = code.lastIndexOf('</script>');
    if (endScriptIdx > 0) {
      code = code.slice(0, endScriptIdx) + '\n' + ceClickListener + '\n' + code.slice(endScriptIdx);
      console.log(`✓ Added custom emoji click listener in ${filePath}`);
    }
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

console.log('\nAll touch context menu and custom emoji features applied and verified successfully!');
