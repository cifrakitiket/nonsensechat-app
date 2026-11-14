const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const scriptTagRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

while ((match = scriptTagRegex.exec(html)) !== null) {
  count++;
  if (count === 6) {
    const code = match[2];
    const lines = code.split('\n');
    try {
      const vm = require('vm');
      new vm.Script(code);
    } catch (err) {
      console.log('Error message:', err.message);
      console.log('Error stack line:', err.stack.split('\n')[0]);
      const m = /evalmachine\.<anonymous>:(\d+)/.exec(err.stack);
      if (m) {
        const lineNum = parseInt(m[1], 10);
        console.log('Line ' + lineNum + ':');
        console.log(lines.slice(Math.max(0, lineNum - 5), lineNum + 5).join('\n'));
      }
    }
  }
}
