// fix-datetime.js
const fs = require('fs');
const file = 'd:/messenger/server/vkcloud-backend.js';
let c = fs.readFileSync(file, 'utf8');
const OLD = "  const datetime = now.toISOString().replace(/[-:]/g,'').replace(/\\.\\d+/,'') + 'Z';";
const NEW = "  const datetime = date + 'T' + now.toISOString().slice(11,19).replace(/:/g,'') + 'Z';";
if (c.includes(OLD)) {
  c = c.replace(OLD, NEW);
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed datetime in vkcloud-backend.js');
} else {
  console.log('Pattern not found, checking current line 181...');
  const lines = c.split('\n');
  console.log('Line 180:', JSON.stringify(lines[180]));
}
