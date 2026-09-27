// server/check-handlers.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'index.html');
const s = fs.readFileSync(file, 'utf8');

const regex = /(?:onclick|onchange|oninput)\s*=\s*["']([a-zA-Z0-9_]+)\s*\(/g;
const handlers = new Set();
let match;
while ((match = regex.exec(s)) !== null) {
  handlers.add(match[1]);
}

console.log('Found inline handlers count:', handlers.size);
const missing = [];
for (const h of handlers) {
  // check if defined in JS
  const defRegex = new RegExp('(?:function\\s+' + h + '\\b|' + h + '\\s*=|window\\.' + h + '\\s*=)');
  if (!defRegex.test(s)) {
    missing.push(h);
  }
}

console.log('Missing handlers:', missing);
