const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Find where messages are sent or processed
const sendMatches = [...html.matchAll(/(function\s+[a-zA-Z0-9_]*(?:send|msg|chat|poll|react|voice|audio|file|image|pin|reply|edit|forward|delete)[a-zA-Z0-9_]*\s*\([^)]*\))/gi)];
console.log('Functions related to messages:', sendMatches.map(m => m[1]));

// Let's find how polls, voice, files, reactions, replies are saved in RTDB
const rtdbPushMatches = [...html.matchAll(/(\.push\(|\.set\(|\.update\()([\s\S]{1,250})/g)].slice(0, 20);
for (const m of rtdbPushMatches) {
  if (m[2].includes('text') || m[2].includes('poll') || m[2].includes('audio') || m[2].includes('file') || m[2].includes('reaction') || m[2].includes('reply')) {
    console.log('--- RTDB WRITE ---');
    console.log(m[1] + m[2]);
  }
}
