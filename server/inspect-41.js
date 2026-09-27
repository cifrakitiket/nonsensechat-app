const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const htmlOnly = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

const textNodeRegex = />([^<]{2,100})</g;
let m;
const remaining = [];
while ((m = textNodeRegex.exec(htmlOnly)) !== null) {
  const txt = m[1].trim();
  if (/[а-яА-ЯёЁ]/.test(txt)) {
    const before = htmlOnly.slice(Math.max(0, m.index - 150), m.index + 1);
    if (!before.includes('data-i18n="') && !before.includes("data-i18n='")) {
      const fullMatch = htmlOnly.slice(Math.max(0, m.index - 50), Math.min(htmlOnly.length, m.index + m[0].length + 50));
      remaining.push({ txt, fullMatch: fullMatch.replace(/\r?\n/g, ' ') });
    }
  }
}
console.log('Count:', remaining.length);
remaining.forEach((r, idx) => console.log((idx+1) + '. ' + r.txt + ' ===> ' + r.fullMatch));
