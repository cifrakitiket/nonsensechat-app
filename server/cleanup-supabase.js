// cleanup-supabase.js
const fs = require('fs');
const files = [
  'd:/messenger/public/index.html',
  'd:/messenger/electron-desktop/public/index.html'
];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('SKIP', f); continue; }
  let c = fs.readFileSync(f, 'utf8');
  const marker = "const SUPABASE_URL = 'https://xpkiirwnpxyfwbrktmqm.supabase.co';";
  const endMarker = "function uploadToLocalBackend(file, onStatus, onProgress, onXhr)";
  const start = c.indexOf(marker);
  if (start < 0) { console.log('already clean:', f); continue; }
  const end = c.indexOf(endMarker, start);
  if (end < 0) { console.log('end marker not found:', f); continue; }
  c = c.slice(0, start) + c.slice(end);
  fs.writeFileSync(f, c, 'utf8');
  console.log('cleaned:', f);
}
