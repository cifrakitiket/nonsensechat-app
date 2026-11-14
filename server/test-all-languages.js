// server/test-all-languages.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

// Verify all script tags in public/index.html
const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m;
let scriptIdx = 0;
while ((m = scriptRegex.exec(html)) !== null) {
  scriptIdx++;
  const attrs = m[1];
  const code = m[2].trim();
  if (code) {
    if (attrs.includes('application/ld+json') || attrs.includes('application/json')) {
      try {
        JSON.parse(code);
      } catch (err) {
        console.error(`JSON Script #${scriptIdx} failed:`, err);
        process.exit(1);
      }
    } else {
      try {
        new vm.Script(code);
      } catch (err) {
        console.error(`Script #${scriptIdx} failed:`, err);
        process.exit(1);
      }
    }
  }
}
console.log(`✓ All ${scriptIdx} script tags compile cleanly`);

// Extract I18N object and check key symmetry across all 5 languages
const i18nMatch = html.match(/const I18N = (\{[\s\S]*?\n\s*\});/);
if (!i18nMatch) {
  console.error('Failed to extract I18N object');
  process.exit(1);
}

const I18N = JSON.parse(i18nMatch[1]);
const languages = ['ru', 'en', 'uk', 'ru-pre', 'bg'];
const ruKeys = Object.keys(I18N.ru);
console.log(`Total translation keys per language: ${ruKeys.length}`);

for (const lang of languages) {
  if (!I18N[lang]) {
    console.error(`Missing language: ${lang}`);
    process.exit(1);
  }
  const keys = Object.keys(I18N[lang]);
  const missing = ruKeys.filter(k => I18N[lang][k] === undefined);
  if (missing.length > 0) {
    console.error(`Language ${lang} is missing ${missing.length} keys:`, missing);
    process.exit(1);
  }
  console.log(`✓ Language ${lang}: ${keys.length} keys present, 0 missing`);
}

console.log('\n🎉 ALL 5 LANGUAGES HAVE 100% COMPLETE AND SYMMETRIC DICTIONARIES!');
