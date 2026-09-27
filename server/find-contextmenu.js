const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');

const regex = /\.addEventListener\(['"]contextmenu['"]/g;
let m, count = 0;
while ((m = regex.exec(s)) !== null) {
  count++;
  console.log('Match #' + count + ' at pos ' + m.index);
  console.log(s.slice(Math.max(0, m.index - 50), Math.min(s.length, m.index + 120)).replace(/\r?\n/g, ' '));
}
