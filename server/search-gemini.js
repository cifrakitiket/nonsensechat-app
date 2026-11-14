const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');

const target = "const archived = chats.filter";
const idx = h.indexOf(target);
console.log(h.slice(idx - 600, idx + 600));
