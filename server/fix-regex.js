const fs = require('fs');
let h = fs.readFileSync('public/index.html', 'utf8');

const targetPrefix = "endpoint = (s.customUrl || 'http://localhost:11434/v1').replace(";
const idx = h.indexOf(targetPrefix);
if (idx !== -1) {
  const lineEnd = h.indexOf('\n', idx);
  console.log('Original line:', JSON.stringify(h.slice(idx, lineEnd)));
  const goodLine = "endpoint = (s.customUrl || 'http://localhost:11434/v1').replace(/\\/+$/, '') + '/chat/completions';";
  h = h.slice(0, idx) + goodLine + h.slice(lineEnd);
  fs.writeFileSync('public/index.html', h, 'utf8');
  console.log('Successfully fixed regex line!');
} else {
  console.error('Target not found!');
  process.exit(1);
}
