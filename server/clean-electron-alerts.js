// server/clean-electron-alerts.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const p = path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html');
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  c = c.replace(/alert\('Не удалось отправить сообщение:\s*'\s*\+\s*\(e\s*&&\s*e\.message\s*\|\|\s*e\)\);/g, "showToast('Ошибка отправки', (e && e.message || e), 'error');");
  c = c.replace(/if\s*\(!activeId\)\s*\{\s*alert\('Откройте чат'\);\s*return;\s*\}/g, "if(!activeId){showToast('Чат', 'Сначала выберите чат', 'info');return;}");
  c = c.replace(/if\s*\(file\.size\s*>\s*MAX_SIZE\)\s*\{\s*alert\('Размер изображения не должен превышать 10MB'\);\s*return;\s*\}/g, "if(file.size>MAX_SIZE){showToast('Файл слишком большой', 'Максимальный размер изображения — 10 МБ', 'warning');return;}");
  c = c.replace(/if\s*\(!activeId\)\s*\{\s*alert\('Сначала откройте чат'\);\s*return;\s*\}/g, "if(!activeId){showToast('Чат', 'Сначала выберите чат', 'info');return;}");
  c = c.replace(/if\s*\(!pack\)\s*\{\s*alert\('Пак не найден'\);\s*return;\s*\}/g, "if(!pack){showToast('Стикерпак', 'Пак не найден', 'warning');return;}");
  c = c.replace(/if\s*\(pack\.authorUid\s*!==\s*me\.uid\)\s*\{\s*alert\('Редактировать можно только свои паки'\);\s*return;\s*\}/g, "if(pack.authorUid!==me.uid){showToast('Доступ', 'Редактировать можно только свои паки', 'warning');return;}");
  c = c.replace(/if\s*\(!title\)\s*\{\s*alert\('Введите название'\);\s*return;\s*\}/g, "if(!title){showToast('Название набора', 'Пожалуйста, введите название', 'warning');return;}");
  c = c.replace(/if\s*\(!stickerDraft\.length\)\s*\{\s*alert\('Добавьте хотя бы один '\s*\+\s*\(emo\s*\?\s*'эмодзи'\s*:\s*'стикер'\)\);\s*return;\s*\}/g, "if(!stickerDraft.length){showToast('Пустой набор', 'Добавьте хотя бы один ' + (emo ? 'эмодзи' : 'стикер'), 'warning');return;}");
  c = c.replace(/alert\('«'\s*\+\s*title\s*\+\s*'» обновлён \('\s*\+\s*stickers\.length\s*\+\s*' шт\.\)\.'\);/g, "showToast('✅ Готово', '«' + title + '» обновлён (' + stickers.length + ' шт.)', 'success');");
  c = c.replace(/alert\('Не удалось сохранить изменения:\s*'\s*\+\s*e\.message\);/g, "showToast('❌ Ошибка', 'Не удалось сохранить: ' + e.message, 'error');");
  c = c.replace(/alert\(\(emo\s*\?\s*'Набор эмодзи «'\s*:\s*'Стикерпак «'\)\s*\+\s*title\s*\+\s*'» создан \('\s*\+\s*stickers\.length\s*\+\s*' шт\.\)\. Отправьте '\s*\+\s*\(emo\s*\?\s*'эмодзи'\s*:\s*'стикер'\)\s*\+\s*' — друзья смогут добавить '\s*\+\s*noun\s*\+\s*', нажав на него\.'\);/g, "showToast('✅ Готово', (emo ? 'Набор эмодзи «' : 'Стикерпак «') + title + '» создан!', 'success');");
  c = c.replace(/alert\('Не удалось опубликовать:\s*'\s*\+\s*e\.message\);/g, "showToast('❌ Ошибка', 'Не удалось опубликовать: ' + e.message, 'error');");
  c = c.replace(/if\s*\(!packId\)\s*\{\s*alert\('Этот стикер не привязан к паку'\);\s*return;\s*\}/g, "if(!packId){showToast('Стикер', 'Этот стикер не привязан к набору', 'info');return;}");
  c = c.replace(/if\s*\(!pack\)\s*\{\s*alert\('Стикерпак не найден или удалён автором'\);\s*return;\s*\}/g, "if(!pack){showToast('Стикерпак', 'Набор не найден или удалён автором', 'warning');return;}");
  c = c.replace(/if\s*\(!d\.exists\)\s*\{\s*alert\('Пак не найден'\);\s*return;\s*\}/g, "if(!d.exists){showToast('Стикерпак', 'Пак не найден', 'warning');return;}");
  c = c.replace(/alert\('Ошибка:\s*'\s*\+\s*e\.message\);/g, "showToast('Ошибка', e.message, 'error');");
  c = c.replace(/window\.prompt\('Скопируйте ссылку:',\s*url\.toString\(\)\)/g, "customPrompt('Ссылка на звонок', 'Скопируйте ссылку ниже:', url.toString())");
  c = c.replace(/if\s*\(file\.size\s*>\s*MAX\)\s*\{\s*alert\('Файл слишком большой\. Максимум 5MB для аватара\.'\);\s*return;\s*\}/g, "if(file.size > MAX){showToast('Аватар', 'Файл слишком большой. Максимум 5 МБ.', 'warning');return;}");
  c = c.replace(/const\s+link\s*=\s*prompt\('Введите ссылку для присоединения:'\);/g, "const link = await customPrompt('Подключение к звонку', 'Вставьте ссылку на звонок:', '', 'https://...');");
  c = c.replace(/function\s+showJoinDialog\(\)\s*\{[\s\S]*?const link = await customPrompt/g, "async function showJoinDialog() {\n        const link = await customPrompt");

  fs.writeFileSync(p, c, 'utf8');

  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m, cnt = 0;
  while ((m = scriptRegex.exec(c)) !== null) {
    cnt++;
    new vm.Script(m[1]);
  }
  console.log('electron-desktop: Updated & validated', cnt, 'scripts OK');
}
