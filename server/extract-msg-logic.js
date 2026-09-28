const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

function extractFunc(name) {
  const pattern = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const match = pattern.exec(html);
  if (!match) return `NOT FOUND: ${name}`;
  let start = match.index;
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let end = start;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') braceCount++;
    else if (ch === '}') {
      braceCount--;
      if (braceCount === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return html.substring(start, end);
}

const funcsToExtract = [
  'sendMsg',
  'sendPoll',
  'votePoll',
  'sendReact',
  'uploadFile',
  'ctxPin',
  'ctxReply',
  'ctxForward',
  'ctxDelete'
];

for (const fn of funcsToExtract) {
  console.log(`================= ${fn} =================`);
  console.log(extractFunc(fn).substring(0, 1500));
}
