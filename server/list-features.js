const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');

// Find all IDs with modal, dialog, popup, menu, drawer, sheet
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
const modals = idMatches.filter(id => /modal|dialog|sheet|popup|menu|drawer/i.test(id));
console.log('--- Modals / Menus / Sheets ---');
console.log(JSON.stringify(modals, null, 2));

// Find key UI buttons and features
const actionButtons = idMatches.filter(id => /btn|action|toggle|tab|picker/i.test(id));
console.log('--- Action Buttons / Controls ---');
console.log(JSON.stringify(actionButtons.slice(0, 50), null, 2));

// Search for feature keywords in JS
const keywords = [
  'poll', 'voice', 'audio', 'record', 'sticker', 'reaction', 'pin', 'reply',
  'edit', 'forward', 'delete', 'profile', 'channel', 'group', 'call', 'webrtc',
  'search', 'settings', 'theme', 'media', 'photo', 'video', 'file', 's3',
  'notification', 'saved', 'favorite', 'quote', 'spoiler'
];

console.log('--- Feature References ---');
for (const kw of keywords) {
  const count = (html.match(new RegExp(kw, 'gi')) || []).length;
  console.log(`${kw}: ${count} occurrences`);
}
