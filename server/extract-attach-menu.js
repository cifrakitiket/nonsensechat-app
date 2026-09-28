const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const idx = html.indexOf('id="attachMenu"');
console.log(html.substring(idx - 50, idx + 1500));
