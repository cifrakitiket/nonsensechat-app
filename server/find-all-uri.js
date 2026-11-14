const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');

const regex = /\b(decodeURI|decodeURIComponent|encodeURI|encodeURIComponent)\s*\(/g;
let m;
let count = 0;
while ((m = regex.exec(h)) !== null) {
  count++;
  const idx = m.index;
  const line = h.slice(0, idx).split('\n').length;
  console.log(`[#${count}] Line ${line}: ${m[1]}`);
  console.log('   ' + h.slice(Math.max(0, idx - 60), idx + 140).replace(/\r?\n/g, ' '));
}
