const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

// 1. Find all text nodes in HTML that contain Russian (outside <script> and <style>)
const htmlOnly = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

const textNodeRegex = />([^<]{2,100})</g;
const untaggedHtmlTexts = new Set();
let m;
while ((m = textNodeRegex.exec(htmlOnly)) !== null) {
  const txt = m[1].trim();
  if (/[а-яА-ЯёЁ]/.test(txt)) {
    // Check if the opening tag before this had data-i18n
    const before = htmlOnly.slice(Math.max(0, m.index - 150), m.index + 1);
    if (!before.includes('data-i18n="') && !before.includes("data-i18n='")) {
      untaggedHtmlTexts.add(txt);
    }
  }
}

console.log('=== UNTAGGED HTML TEXTS (' + untaggedHtmlTexts.size + ') ===');
for (const t of untaggedHtmlTexts) {
  console.log(t);
}

// 2. Find untagged placeholders
const phRegex = /placeholder=["']([^"']*[а-яА-ЯёЁ][^"']*)["']/g;
const untaggedPhs = new Set();
while ((m = phRegex.exec(htmlOnly)) !== null) {
  const ph = m[1];
  const before = htmlOnly.slice(Math.max(0, m.index - 100), m.index + 100);
  if (!before.includes('data-i18n-ph')) {
    untaggedPhs.add(ph);
  }
}
console.log('\n=== UNTAGGED PLACEHOLDERS (' + untaggedPhs.size + ') ===');
for (const p of untaggedPhs) {
  console.log(p);
}
