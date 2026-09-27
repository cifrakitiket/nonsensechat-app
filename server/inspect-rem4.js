const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');

const idx = s.indexOf('Развернуть');
console.log('Развернуть context:');
console.log(JSON.stringify(s.slice(idx - 100, idx + 40)));

const ph1 = s.indexOf('Поиск');
console.log('Поиск context:');
console.log(JSON.stringify(s.slice(ph1 - 40, ph1 + 40)));

const ph2 = s.indexOf('Юзернейм');
console.log('Юзернейм context:');
console.log(JSON.stringify(s.slice(ph2 - 40, ph2 + 40)));

const ph3 = s.indexOf('Подпись');
console.log('Подпись context:');
console.log(JSON.stringify(s.slice(ph3 - 40, ph3 + 40)));
