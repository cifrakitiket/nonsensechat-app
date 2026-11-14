const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');

const idx = h.indexOf('setPane-audio');
console.log(h.slice(idx - 600, idx + 400));
