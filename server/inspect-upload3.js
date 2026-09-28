const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const idx = html.indexOf('async function smartUpload(');
console.log(html.substring(idx, idx + 2000));
