// server/list-all-text.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'index.html');
const s = fs.readFileSync(file, 'utf8');

console.log('--- MODAL IDS ---');
const modalRegex = /id=["'](modal-[a-zA-Z0-9_-]+)["']/g;
let m;
while ((m = modalRegex.exec(s)) !== null) {
  console.log(m[1]);
}

console.log('\n--- PLACEHOLDERS ---');
const phRegex = /placeholder=["']([^"']+)["']/g;
const phs = new Set();
while ((m = phRegex.exec(s)) !== null) {
  phs.add(m[1]);
}
for (const p of phs) console.log(p);

console.log('\n--- BUTTON / LINK / LABEL TEXTS ---');
const btnRegex = /<(?:button|div|span|h3|h4|label|a)[^>]*>([^<]{2,40})<\/(?:button|div|span|h3|h4|label|a)>/g;
const texts = new Set();
while ((m = btnRegex.exec(s)) !== null) {
  const t = m[1].trim();
  if (t && !t.startsWith('@') && !t.includes('{') && !t.includes('(') && !t.match(/^\d+$/) && t.match(/[а-яА-ЯёЁ]/)) {
    texts.add(t);
  }
}
console.log('Russian texts count:', texts.size);
for (const t of Array.from(texts).slice(0, 80)) console.log('-', t);
