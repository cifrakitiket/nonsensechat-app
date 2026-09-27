const fs = require('fs');
let s = fs.readFileSync('public/index.html', 'utf8');

// Fix modal width for appinfo
const mcardOld = 'modal-appinfo">\r\n    <div class="mcard" style="width:400px">';
const mcardNew = 'modal-appinfo">\r\n    <div class="mcard" style="width:480px">';
if (s.includes(mcardOld)) {
  s = s.replace(mcardOld, mcardNew);
  console.log('Fixed modal width');
} else {
  console.log('NOTE: mcard old not found, trying LF version');
  const mcardOldLF = 'modal-appinfo">\n    <div class="mcard" style="width:400px">';
  const mcardNewLF = 'modal-appinfo">\n    <div class="mcard" style="width:480px">';
  if (s.includes(mcardOldLF)) {
    s = s.replace(mcardOldLF, mcardNewLF);
    console.log('Fixed modal width (LF)');
  }
}

// Fix title tag
s = s.replace('<title data-i18n="appTitle">Беспонтовый Чат ™</title>', '<title data-i18n="appTitle">Беспонтовый Чат</title>');

// Fix JS page title assignments
s = s.replace(/document\.title = 'Беспонтовый Чат ™';/g, "document.title = 'Беспонтовый Чат';");
s = s.replace(/document\.title = 'Беспонтовый Чат \u2122'/g, "document.title = 'Беспонтовый Чат'");

// Fix i18n title update
s = s.replace(
  "document.title = (dict.appTitle || 'Беспонтовый Чат') + ' ' + (dict.tm || '™');",
  "document.title = (dict.appTitle || 'Беспонтовый Чат');"
);

// Fix badge count title
s = s.replace(
  "document.title = (n > 0 ? '(' + n + ') ' : '') + 'Беспонтовый Чат ™';",
  "document.title = (n > 0 ? '(' + n + ') ' : '') + 'Беспонтовый Чат';"
);

fs.writeFileSync('public/index.html', s, 'utf8');
console.log('All title TM symbols removed');
