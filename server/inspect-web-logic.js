const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

function findFunction(name) {
  const idx = html.indexOf(name);
  if (idx === -1) return null;
  return html.substring(idx - 50, idx + 1000);
}

console.log('--- renderMessage snippet ---');
console.log(findFunction('renderMessage'));

console.log('--- formatText snippet ---');
console.log(findFunction('formatText') || findFunction('formatMsg') || findFunction('parseText') || findFunction('escapeHtml'));

console.log('--- sendVoice or voice recording snippet ---');
console.log(findFunction('sendVoice') || findFunction('startRecording') || findFunction('recordVoice'));

console.log('--- Poll structure snippet ---');
console.log(findFunction('createPoll') || findFunction('votePoll') || findFunction('sendPoll'));

console.log('--- Reactions snippet ---');
console.log(findFunction('addReaction') || findFunction('toggleReaction') || findFunction('reaction'));
