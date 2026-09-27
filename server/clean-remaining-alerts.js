// server/clean-remaining-alerts.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

for (const p of [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
]) {
  if (!fs.existsSync(p)) continue;
  let c = fs.readFileSync(p, 'utf8');

  c = c.replace(
    "alert('Пользователь @' + clean + ' не найден');",
    "showToast('Пользователь', 'Пользователь @' + clean + ' не найден', 'warning');"
  );
  c = c.replace(
    "if (!activeId) { alert('Откройте чат'); return; }",
    "if (!activeId) { showToast('Чат', 'Сначала откройте чат', 'info'); return; }"
  );
  c = c.replace(
    "if (!activeId) { alert('Сначала откройте чат'); return; }",
    "if (!activeId) { showToast('Чат', 'Сначала откройте чат', 'info'); return; }"
  );
  c = c.replace(
    "window.prompt('Скопируйте ссылку:', url.toString())",
    "customPrompt('Ссылка на звонок', 'Скопируйте ссылку ниже:', url.toString())"
  );

  fs.writeFileSync(p, c, 'utf8');

  // test syntax
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m, cnt = 0;
  while ((m = scriptRegex.exec(c)) !== null) {
    cnt++;
    new vm.Script(m[1]);
  }
  console.log(p, 'Updated & validated', cnt, 'scripts OK');
}
