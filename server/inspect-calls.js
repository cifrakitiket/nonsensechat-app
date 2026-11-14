const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');

let pos = 0;
while ((pos = h.indexOf("call_sessions/", pos)) !== -1) {
  console.log(pos, ':\n' + h.slice(pos - 40, pos + 180).replace(/\r?\n/g, ' '));
  pos += 15;
}
