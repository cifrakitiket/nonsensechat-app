const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const target = `      const archived = chats.filter(c => c.archivedBy?.includes(me.uid) && c.type !== 'fav');
      const normal = chats.filter(c => !c.archivedBy?.includes(me.uid) && c.type !== 'fav');`;

const replacement = `      const isSpecialChat = c => !c || c.type === 'fav' || c.type === 'ai_hub' || (c.id && c.id.startsWith('aihub_'));
      const archived = chats.filter(c => c.archivedBy?.includes(me.uid) && !isSpecialChat(c));
      const normal = chats.filter(c => !c.archivedBy?.includes(me.uid) && !isSpecialChat(c));`;

if (html.includes(target)) {
  html = html.replace(target, replacement);
  console.log('Replaced archived and normal filter');
} else {
  // Try CRLF replacement
  const targetCRLF = target.replace(/\n/g, '\r\n');
  const replacementCRLF = replacement.replace(/\n/g, '\r\n');
  if (html.includes(targetCRLF)) {
    html = html.replace(targetCRLF, replacementCRLF);
    console.log('Replaced archived and normal filter (CRLF)');
  } else {
    console.error('Target not found!');
    process.exit(1);
  }
}

// Also update dm and groups filters to exclude ai_hub
html = html.replace(
  `c.type !== 'group' && c.type !== 'fav'`,
  `c.type !== 'group' && c.type !== 'fav' && c.type !== 'ai_hub' && !c.id?.startsWith('aihub_')`
);
html = html.replace(
  `c.type !== 'dm' && c.type !== 'fav'`,
  `c.type !== 'dm' && c.type !== 'fav' && c.type !== 'ai_hub' && !c.id?.startsWith('aihub_')`
);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated chat list filtering to eliminate AI Hub duplicate!');
