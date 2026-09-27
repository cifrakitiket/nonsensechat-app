// server/fix-giant-svg.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

// SVG Outline icons for subcategories matching Telegram (Image 2) with explicit width, height and fill="none"
const SVG_ICONS = {
  recent: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>`,
  smileys: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9.5" r="1.2" fill="currentColor"/><circle cx="15" cy="9.5" r="1.2" fill="currentColor"/></svg>`,
  animals: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5c-4 0-7 2.7-7 6 0 2.5 1.7 4.7 4.2 5.5L8 20l3.6-1.5c.8.2 1.6.3 2.4.3 4 0 7-2.7 7-6s-3-6-7-6z"/><path d="M5 8L3 3l5 2M19 8l2-5-5 2"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/></svg>`,
  food: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5c-1.5-1.5-3.5-1.5-5 0-2.5 2.5-2.5 7 0 10.5 1.5 2 3.5 3 5 3s3.5-1 5-3c2.5-3.5 2.5-8 0-10.5-1.5-1.5-3.5-1.5-5 0z"/><path d="M12 2c0 2-1 4-3 4"/></svg>`,
  activity: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="12 8 8 11 9.5 16 14.5 16 16 11"/></svg>`,
  travel: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M3 11h18v6a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1H8v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/><circle cx="7" cy="14" r="1.5" fill="currentColor"/><circle cx="17" cy="14" r="1.5" fill="currentColor"/></svg>`,
  objects: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6m-4 3h2M12 2a7 7 0 0 0-7 7c0 2.5 1.3 4.5 3 5.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3c1.7-1.2 3-3.2 3-5.7a7 7 0 0 0-7-7z"/></svg>`,
  symbols: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  flags: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`
};

const EXTRA_CSS = `
/* Strict sizing for all picker SVGs to prevent giant icon blowups */
.tgp-sec-head svg,
.tgp-sec-icon svg,
.tgp-cat-svg {
  width: 18px !important;
  height: 18px !important;
  max-width: 18px !important;
  max-height: 18px !important;
  min-width: 18px !important;
  min-height: 18px !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 1.8 !important;
  flex-shrink: 0 !important;
  display: inline-block !important;
  vertical-align: middle !important;
}
.tgp-sec-icon {
  width: 18px !important;
  height: 18px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}
.tgp-subcat-btn svg {
  width: 17px !important;
  height: 17px !important;
  max-width: 17px !important;
  max-height: 17px !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 1.8 !important;
  flex-shrink: 0 !important;
  display: inline-block !important;
}
.tgp-fic svg {
  width: 18px !important;
  height: 18px !important;
  max-width: 18px !important;
  max-height: 18px !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 1.8 !important;
  flex-shrink: 0 !important;
  display: inline-block !important;
}
.tgp-body {
  width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}
.tgp-emoji-grid {
  display: grid !important;
  grid-template-columns: repeat(8, 1fr) !important;
  gap: 2px !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
.emoji-cell {
  width: 100% !important;
  height: 38px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 24px !important;
  line-height: 1 !important;
  user-select: none !important;
}
`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Inject EXTRA_CSS into <style>
  if (!code.includes('Strict sizing for all picker SVGs')) {
    const endStyleIdx = code.indexOf('</style>');
    if (endStyleIdx > 0) {
      code = code.slice(0, endStyleIdx) + '\n' + EXTRA_CSS + '\n' + code.slice(endStyleIdx);
      console.log(`✓ Injected SVG constraint CSS into ${filePath}`);
    }
  }

  // 2. Replace TG_SVG_ICONS definition in JS with fully-formed SVG with width/height/fill="none"
  const oldIconDefStart = 'const TG_SVG_ICONS =';
  if (code.includes(oldIconDefStart)) {
    const iconDefEnd = code.indexOf(';', code.indexOf(oldIconDefStart)) + 1;
    const newIconDef = 'const TG_SVG_ICONS = ' + JSON.stringify(SVG_ICONS) + ';';
    code = code.slice(0, code.indexOf(oldIconDefStart)) + newIconDef + code.slice(iconDefEnd);
    console.log(`✓ Replaced TG_SVG_ICONS in ${filePath}`);
  }

  // 3. Update tgpSection to wrap icon in .tgp-sec-icon
  const oldTgpSection = `function tgpSection(id, iconHtml, title, inner) {
  return \`<div class="tgp-sec" id="tgp-sec-\${id}"><div class="tgp-sec-head">\${iconHtml}<span class="tgp-sec-title">\${title}</span></div>\${inner}</div>\`;
}`;
  const newTgpSection = `function tgpSection(id, iconHtml, title, inner) {
  return \`<div class="tgp-sec" id="tgp-sec-\${id}"><div class="tgp-sec-head"><span class="tgp-sec-icon">\${iconHtml}</span><span class="tgp-sec-title">\${title}</span></div>\${inner}</div>\`;
}`;
  if (code.includes(oldTgpSection)) {
    code = code.replace(oldTgpSection, newTgpSection);
    console.log(`✓ Updated tgpSection with .tgp-sec-icon wrapper in ${filePath}`);
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
  console.log(`✓ Validated and saved ${filePath}`);
}

console.log('Fixed giant SVG icon issue.');
