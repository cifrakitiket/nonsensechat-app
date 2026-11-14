const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

function checkSnippet(label, snippet) {
  const found = html.includes(snippet);
  console.log(label + ':', found);
  if (!found) {
    const firstLine = snippet.trim().split('\n')[0];
    const pos = html.indexOf(firstLine.slice(0, 40));
    console.log('   partial search for ' + JSON.stringify(firstLine.slice(0, 40)) + ':', pos);
  }
}

checkSnippet('oldBadgeCss', '.signal-msg-badge {');
checkSnippet('oldSignalCryptoStart', '/* ═══ SIGNAL PROTOCOL E2EE MODULE ═══ */');
checkSnippet('oldEncryptDecryptBlock', 'async function encrypt(plaintext, partnerUid) {');
checkSnippet('oldRenderDecryptBlock', 'const isEncrypted = !!m.signal;');
checkSnippet('oldSendMsgEncrypt', 'signalPayload = await SignalCrypto.encrypt');
checkSnippet('oldE2eeNotice', 'e2ee-chat-notice');
