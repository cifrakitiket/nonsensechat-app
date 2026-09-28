const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const lines = html.split('\n');
console.log('Total lines in index.html:', lines.length);

lines.forEach((line, i) => {
  if (line.includes('openChat(')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
