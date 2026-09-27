// server/apply-telegram-picker.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

// 1. New CSS for Telegram emoji picker & subcategories
const PICKER_CSS = `
/* ═══ TELEGRAM EMOJI PICKER & SUBCATEGORIES ═══ */
.tgp-subcats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px 6px;
  background: transparent;
  flex-shrink: 0;
  transition: opacity 0.15s ease;
}
.tgp-subcats-bar.hidden {
  display: none !important;
}
.tgp-subcats-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.08);
  padding: 3px 5px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.tgp-subcats-pill::-webkit-scrollbar {
  display: none;
}
.tgp-subcat-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text2);
  cursor: pointer;
  transition: all 0.12s ease;
  padding: 0;
  flex-shrink: 0;
  opacity: 0.6;
}
.tgp-subcat-btn:hover {
  opacity: 1;
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
}
.tgp-subcat-btn.active {
  opacity: 1;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
}
.tgp-subcat-btn svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
}

/* Bottom pack selector (Image 1 in Telegram) */
.tgp-foot-icons {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 3px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 2px 0;
}
.tgp-foot-icons::-webkit-scrollbar {
  display: none;
}
.tgp-fic {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text2);
  transition: all 0.12s ease;
  padding: 0;
  flex-shrink: 0;
  overflow: hidden;
  opacity: 0.7;
}
.tgp-fic:hover {
  background: var(--hover);
  color: var(--text);
  opacity: 1;
}
.tgp-fic.active {
  background: rgba(255, 255, 255, 0.14) !important;
  color: #fff !important;
  border-color: rgba(255, 255, 255, 0.28) !important;
  opacity: 1 !important;
}
.tgp-fic svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
}
.tgp-fic img, .tgp-fic video {
  width: 26px;
  height: 26px;
  object-fit: cover;
  border-radius: 6px;
  pointer-events: none;
}
.tgp-cat-svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
  vertical-align: middle;
  opacity: 0.75;
}
.tgp-sec-head {
  padding: 6px 4px 6px;
  gap: 8px;
  font-size: 12px;
}
.tgp-emoji-grid {
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: 2px 0;
}
.emoji-cell {
  font-size: 24px;
  line-height: 1.35;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.1s, transform 0.1s;
}
.emoji-cell:hover {
  background: var(--hover);
  transform: scale(1.22);
}
`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  // Inject PICKER_CSS into <style> if not already present
  if (!code.includes('TELEGRAM EMOJI PICKER & SUBCATEGORIES')) {
    const endStyleIdx = code.indexOf('</style>');
    if (endStyleIdx > 0) {
      code = code.slice(0, endStyleIdx) + '\n' + PICKER_CSS + '\n' + code.slice(endStyleIdx);
      console.log(`✓ Injected Telegram Picker CSS into ${filePath}`);
    }
  }

  // Inject subcategories container into #tgPicker HTML
  const targetTop = `<div class="tgp-top">\r\n        <span class="tgp-search-ic"><i class="fa-solid fa-magnifying-glass"></i></span>\r\n        <input class="tgp-search" id="tgpSearch" placeholder="Поиск" oninput="tgpOnSearch(this.value)">\r\n      </div>`;
  const targetTopUnix = `<div class="tgp-top">\n        <span class="tgp-search-ic"><i class="fa-solid fa-magnifying-glass"></i></span>\n        <input class="tgp-search" id="tgpSearch" placeholder="Поиск" oninput="tgpOnSearch(this.value)">\n      </div>`;
  const subcatHtml = `\n      <div class="tgp-subcats-bar" id="tgpSubcatsBar">\n        <div class="tgp-subcats-pill" id="tgpSubcatsPill"></div>\n      </div>`;

  if (!code.includes('id="tgpSubcatsBar"')) {
    if (code.includes(targetTop)) {
      code = code.replace(targetTop, targetTop + subcatHtml);
      console.log(`✓ Added #tgpSubcatsBar HTML in ${filePath}`);
    } else if (code.includes(targetTopUnix)) {
      code = code.replace(targetTopUnix, targetTopUnix + subcatHtml);
      console.log(`✓ Added #tgpSubcatsBar HTML in ${filePath}`);
    } else {
      // Fallback find tgp-top
      const topIdx = code.indexOf('<div class="tgp-top">');
      if (topIdx > 0) {
        const topEnd = code.indexOf('</div>', topIdx) + 6;
        code = code.slice(0, topEnd) + subcatHtml + code.slice(topEnd);
        console.log(`✓ Added #tgpSubcatsBar HTML (fallback) in ${filePath}`);
      }
    }
  }

  // Validate scripts
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
  console.log(`✓ Saved layout updates to ${filePath}`);
}

console.log('CSS and HTML layout injected successfully.');
