const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const uploadIdx = html.indexOf('function uploadFile(');
console.log(html.substring(uploadIdx, uploadIdx + 2000));
