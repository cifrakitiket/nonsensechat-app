const fs = require('fs');
let s = fs.readFileSync('public/index.html', 'utf8');
let el = s.readFileSync;

// Remove auth-tm div
s = s.replace(/<div class="auth-tm">™<\/div>\r\n/g, '');
s = s.replace(/<div class="auth-tm">™<\/div>\n/g, '');
s = s.replace(/<div class="auth-tm">[^<]*<\/div>/g, '');

// Electron too
let se = fs.readFileSync('electron-desktop/public/index.html', 'utf8');
se = se.replace(/<div class="auth-tm">™<\/div>\r\n/g, '');
se = se.replace(/<div class="auth-tm">™<\/div>\n/g, '');
se = se.replace(/<div class="auth-tm">[^<]*<\/div>/g, '');
fs.writeFileSync('electron-desktop/public/index.html', se, 'utf8');

fs.writeFileSync('public/index.html', s, 'utf8');
console.log('auth-tm removed from both files');
