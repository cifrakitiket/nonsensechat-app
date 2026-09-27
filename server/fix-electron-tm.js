// Apply same changes to electron-desktop
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const electronPath = path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html');
let s = fs.readFileSync(electronPath, 'utf8');

// Remove TM from sidebar logo
s = s.replace(/<div class="logo-text-tm">[^<]*<\/div>\r?\n?\s*/g, '');

// Remove app-info-tm div
s = s.replace(/<div class="app-info-tm">[^<]*<\/div>\r?\n?\s*/g, '');

// Change version from 5.2 to 1.0
s = s.replace(/<span class="app-info-version">v5\.2<\/span>/, '<span class="app-info-version">v1.0</span>');
s = s.replace(/5\.2 - починка багов,калькулятор внутри\?,оповещение о обновляниях/, '1.0 — Публичный релиз');

// Fix developer name TM
s = s.replace('Беспонтовый Пирожок™', 'Беспонтовый Пирожок');

// Fix copyright TM
s = s.replace('ООО Беспонтовый Пирожок ™. Все права защищены.', 'Беспонтовый Пирожок. Все права защищены.');

// Fix page title TM
s = s.replace("document.title = 'Беспонтовый Чат ™';", "document.title = 'Беспонтовый Чат';");
s = s.replace(/'Беспонтовый Чат ™'/g, "'Беспонтовый Чат'");
s = s.replace('<title data-i18n="appTitle">Беспонтовый Чат ™</title>', '<title data-i18n="appTitle">Беспонтовый Чат</title>');
s = s.replace(
  "document.title = (dict.appTitle || 'Беспонтовый Чат') + ' ' + (dict.tm || '™');",
  "document.title = (dict.appTitle || 'Беспонтовый Чат');"
);
s = s.replace(
  "document.title = (n > 0 ? '(' + n + ') ' : '') + 'Беспонтовый Чат ™';",
  "document.title = (n > 0 ? '(' + n + ') ' : '') + 'Беспонтовый Чат';"
);

// Widen appinfo modal
s = s.replace(
  /id="modal-appinfo">\s*\r?\n\s*<div class="mcard" style="width:400px">/,
  (m) => m.replace('width:400px', 'width:480px')
);

// Validate JS
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match, sCount = 0;
while ((match = scriptRegex.exec(s)) !== null) {
  sCount++;
  const src = match[1];
  if (!src.trim()) continue;
  try { new vm.Script(src); } catch (err) {
    console.error(`Syntax error in script #${sCount}:`, err.message);
    process.exit(1);
  }
}

fs.writeFileSync(electronPath, s, 'utf8');
console.log(`Electron file updated (${sCount} scripts valid)`);
