// server/resize-logo.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

const NEW_LOGO_CSS = `
    /* ═══ EXPANDED LOGO BADGE & OSWALD FONT ═══ */
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      cursor: pointer;
      min-width: 0;
    }
    .logo-wrap img {
      width: 44px !important;
      height: 44px !important;
      min-width: 44px !important;
      min-height: 44px !important;
      border-radius: 12px !important;
      object-fit: cover !important;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: transform .2s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow .2s;
      flex-shrink: 0;
    }
    .logo-wrap:hover img {
      transform: scale(1.06);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.38);
    }
`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  // Заменяем старое 24px правило в сайдбаре
  code = code.replace(
    /\.logo-wrap\s*img\s*\{[^}]*width:\s*24px;[^}]*\}/g,
    `.logo-wrap img {
      width: 44px !important;
      height: 44px !important;
      min-width: 44px !important;
      min-height: 44px !important;
      border-radius: 12px !important;
      object-fit: cover !important;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: transform .2s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow .2s;
      flex-shrink: 0;
    }`
  );

  // Добавляем или обновляем NEW_LOGO_CSS
  if (!code.includes('/* ═══ EXPANDED LOGO BADGE & OSWALD FONT ═══ */')) {
    code = code.replace('</style>', NEW_LOGO_CSS + '\n</style>');
  }

  fs.writeFileSync(filePath, code, 'utf8');

  // Валидация синтаксиса
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptCount = 0;
  while ((match = scriptRegex.exec(code)) !== null) {
    scriptCount++;
    try {
      new vm.Script(match[1]);
    } catch (e) {
      console.error(`Syntax error in script #${scriptCount} of ${filePath}:`, e.message);
      process.exit(1);
    }
  }
  console.log(`Validated ${scriptCount} scripts in ${filePath}: ALL OK!`);
}

console.log('resize-logo completed successfully!');
