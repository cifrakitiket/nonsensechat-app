const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const start = html.indexOf('function getAiQuickMatch(');
const end = html.indexOf('function hideAiQuickBubble()', start);
const code = html.slice(start, end);

const fn = new Function(code + '; return getAiQuickMatch;')();

const tests = [
  { in: 'gemini: напиши шутку', expP: 'gemini', expPrompt: 'напиши шутку' },
  { in: 'grok: факт о космосе', expP: 'grok', expPrompt: 'факт о космосе' },
  { in: 'claude: привет', expP: 'claude', expPrompt: 'привет' },
  { in: 'gemini:', expP: 'gemini', expPrompt: '' },
  { in: '  grok:  тест  ', expP: 'grok', expPrompt: 'тест' },
  { in: 'hello world', expP: null }
];

let failed = 0;
tests.forEach(t => {
  const res = fn(t.in);
  if (t.expP === null) {
    if (res !== null) { failed++; console.error('FAIL for', t.in, res); }
  } else {
    if (!res || res.provider !== t.expP || res.prompt !== t.expPrompt) {
      failed++;
      console.error('FAIL for', t.in, res);
    }
  }
});

console.log('Tested getAiQuickMatch:', tests.length - failed, 'passed,', failed, 'failed.');
if (failed > 0) process.exit(1);
