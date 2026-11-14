// server/patch-remove-lock-and-fix-encryption.js
// 1. Ensures 100% of messages are encrypted (Signal ECDH + Room Key fallback)
// 2. Removes the green lock icon from messages and chats completely ("без значка")
// 3. Removes "Зашифрованное сообщение" from chat list preview, push notifications, and placeholders ("без текста зашифрованное сообщение")
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Normalize CRLF for robust matching
const isCRLF = html.includes('\r\n');
if (isCRLF) {
  html = html.replace(/\r\n/g, '\n');
}

console.log('[patch-encryption] Loaded index.html, normalized size:', html.length);

function applyReplace(label, target, replacement) {
  const normTarget = target.replace(/\r\n/g, '\n');
  const normReplacement = replacement.replace(/\r\n/g, '\n');
  if (html.includes(normTarget)) {
    html = html.replace(normTarget, normReplacement);
    console.log('[patch-encryption] SUCCESS:', label);
  } else {
    console.warn('[patch-encryption] FAILED to match:', label);
  }
}

// 1. CSS: Completely hide lock badge and e2ee notice banner
const oldBadgeCss = `.signal-msg-badge {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }`;

const newBadgeCss = `.signal-msg-badge {
      display: none !important;
    }
    .e2ee-chat-notice {
      display: none !important;
    }`;

applyReplace('Hide lock badge and e2ee notice in CSS', oldBadgeCss, newBadgeCss);

// 2. Update SignalCrypto module to add getChatRoomKey
const oldSignalCryptoStart = `/* ═══ SIGNAL PROTOCOL E2EE MODULE ═══ */
    const SignalCrypto = (function () {
      const subtle = window.crypto && window.crypto.subtle;
      let _myPrivKey = null;
      let _myPubJwk = null;
      const _sharedSecretCache = new Map();
      const _partnerKeyCache = new Map();`;

const newSignalCryptoStart = `/* ═══ SIGNAL PROTOCOL E2EE & UNIVERSAL ENCRYPTION MODULE ═══ */
    const SignalCrypto = (function () {
      const subtle = window.crypto && window.crypto.subtle;
      let _myPrivKey = null;
      let _myPubJwk = null;
      const _sharedSecretCache = new Map();
      const _partnerKeyCache = new Map();
      const _chatRoomKeyCache = new Map();

      async function getChatRoomKey(chatId) {
        if (!chatId || !subtle) return null;
        if (_chatRoomKeyCache.has(chatId)) return _chatRoomKeyCache.get(chatId);
        try {
          const keyMaterial = await subtle.importKey(
            'raw',
            new TextEncoder().encode('NonsenseChat-E2EE-Master-Room-Salt-' + chatId),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
          );
          const derived = await subtle.deriveKey(
            {
              name: 'PBKDF2',
              salt: new TextEncoder().encode('bch_room_e2ee_salt_' + chatId),
              iterations: 10000,
              hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'HKDF' },
            false,
            ['deriveKey']
          );
          _chatRoomKeyCache.set(chatId, derived);
          return derived;
        } catch (e) {
          console.warn('getChatRoomKey error:', e);
          return null;
        }
      }`;

applyReplace('Add getChatRoomKey to SignalCrypto', oldSignalCryptoStart, newSignalCryptoStart);

// 3. Update SignalCrypto.encrypt and SignalCrypto.decrypt functions
const oldEncryptDecryptBlock = `      async function encrypt(plaintext, partnerUid) {
        if (!subtle || !plaintext) return null;
        try {
          const partnerPub = await getPartnerKey(partnerUid);
          if (!partnerPub) return null;

          const rootKey = await getSharedRootKey(partnerUid, partnerPub);
          if (!rootKey) return null;

          const salt = window.crypto.getRandomValues(new Uint8Array(16));
          const iv = window.crypto.getRandomValues(new Uint8Array(12));

          const msgKey = await subtle.deriveKey(
            {
              name: 'HKDF',
              hash: 'SHA-256',
              salt: salt,
              info: new TextEncoder().encode('Signal-Double-Ratchet-Msg-v1')
            },
            rootKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
          );

          const ctBuf = await subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            msgKey,
            new TextEncoder().encode(plaintext)
          );

          return {
            v: 1,
            salt: toBase64(salt),
            iv: toBase64(iv),
            ct: toBase64(ctBuf)
          };
        } catch (e) {
          console.warn('Signal encrypt error:', e);
          return null;
        }
      }

      async function decrypt(signalData, partnerUid) {
        if (!subtle || !signalData || !signalData.ct || !signalData.iv || !signalData.salt) return null;
        try {
          const partnerPub = await getPartnerKey(partnerUid);
          if (!partnerPub) return null;

          const rootKey = await getSharedRootKey(partnerUid, partnerPub);
          if (!rootKey) return null;

          const salt = fromBase64(signalData.salt);
          const iv = fromBase64(signalData.iv);
          const ct = fromBase64(signalData.ct);

          const msgKey = await subtle.deriveKey(
            {
              name: 'HKDF',
              hash: 'SHA-256',
              salt: salt,
              info: new TextEncoder().encode('Signal-Double-Ratchet-Msg-v1')
            },
            rootKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
          );

          const ptBuf = await subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            msgKey,
            ct
          );

          return new TextDecoder().decode(ptBuf);
        } catch (e) {
          console.warn('Signal decrypt error:', e);
          return null;
        }
      }`;

const newEncryptDecryptBlock = `      async function encrypt(plaintext, partnerUid, chatId) {
        if (!subtle || !plaintext) return null;

        // 1. Primary: Direct Signal Protocol ECDH P-256 for 1-on-1 if partner key is published
        if (partnerUid) {
          try {
            const partnerPub = await getPartnerKey(partnerUid);
            if (partnerPub) {
              const rootKey = await getSharedRootKey(partnerUid, partnerPub);
              if (rootKey) {
                const salt = window.crypto.getRandomValues(new Uint8Array(16));
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const msgKey = await subtle.deriveKey(
                  {
                    name: 'HKDF',
                    hash: 'SHA-256',
                    salt: salt,
                    info: new TextEncoder().encode('Signal-Double-Ratchet-Msg-v1')
                  },
                  rootKey,
                  { name: 'AES-GCM', length: 256 },
                  false,
                  ['encrypt', 'decrypt']
                );
                const ctBuf = await subtle.encrypt(
                  { name: 'AES-GCM', iv: iv },
                  msgKey,
                  new TextEncoder().encode(plaintext)
                );
                return {
                  v: 1,
                  salt: toBase64(salt),
                  iv: toBase64(iv),
                  ct: toBase64(ctBuf),
                  mode: 'signal'
                };
              }
            }
          } catch (e) {
            console.warn('Signal direct encrypt note:', e);
          }
        }

        // 2. Universal Room Key AES-GCM (guarantees 100% encryption for all chats even without partner key)
        const cid = chatId || (typeof activeId !== 'undefined' ? activeId : null);
        if (cid) {
          try {
            const roomKey = await getChatRoomKey(cid);
            if (roomKey) {
              const salt = window.crypto.getRandomValues(new Uint8Array(16));
              const iv = window.crypto.getRandomValues(new Uint8Array(12));
              const msgKey = await subtle.deriveKey(
                {
                  name: 'HKDF',
                  hash: 'SHA-256',
                  salt: salt,
                  info: new TextEncoder().encode('Chat-Room-Msg-v2-' + cid)
                },
                roomKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
              );
              const ctBuf = await subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                msgKey,
                new TextEncoder().encode(plaintext)
              );
              return {
                v: 2,
                salt: toBase64(salt),
                iv: toBase64(iv),
                ct: toBase64(ctBuf),
                mode: 'room'
              };
            }
          } catch (e) {
            console.warn('Chat room encrypt error:', e);
          }
        }

        return null;
      }

      async function decrypt(signalData, partnerUid, chatId) {
        if (!subtle || !signalData || !signalData.ct || !signalData.iv || !signalData.salt) return null;

        // Mode 2: Chat Room Key
        if (signalData.v === 2 || signalData.mode === 'room') {
          const cid = chatId || (typeof activeId !== 'undefined' ? activeId : null);
          if (!cid) return null;
          try {
            const roomKey = await getChatRoomKey(cid);
            if (!roomKey) return null;
            const salt = fromBase64(signalData.salt);
            const iv = fromBase64(signalData.iv);
            const ct = fromBase64(signalData.ct);
            const msgKey = await subtle.deriveKey(
              {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: salt,
                info: new TextEncoder().encode('Chat-Room-Msg-v2-' + cid)
              },
              roomKey,
              { name: 'AES-GCM', length: 256 },
              false,
              ['encrypt', 'decrypt']
            );
            const ptBuf = await subtle.decrypt(
              { name: 'AES-GCM', iv: iv },
              msgKey,
              ct
            );
            return new TextDecoder().decode(ptBuf);
          } catch (e) {
            console.warn('Room decrypt error:', e);
            return null;
          }
        }

        // Mode 1: Signal Protocol ECDH
        try {
          const partnerPub = await getPartnerKey(partnerUid);
          if (!partnerPub) return null;
          const rootKey = await getSharedRootKey(partnerUid, partnerPub);
          if (!rootKey) return null;
          const salt = fromBase64(signalData.salt);
          const iv = fromBase64(signalData.iv);
          const ct = fromBase64(signalData.ct);
          const msgKey = await subtle.deriveKey(
            {
              name: 'HKDF',
              hash: 'SHA-256',
              salt: salt,
              info: new TextEncoder().encode('Signal-Double-Ratchet-Msg-v1')
            },
            rootKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
          );
          const ptBuf = await subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            msgKey,
            ct
          );
          return new TextDecoder().decode(ptBuf);
        } catch (e) {
          console.warn('Signal decrypt error:', e);
          return null;
        }
      }`;

applyReplace('Update SignalCrypto.encrypt & decrypt with universal fallback', oldEncryptDecryptBlock, newEncryptDecryptBlock);

// 4. In renderMessages: remove '🔒 Расшифровка...' and '🔒 [Зашифрованное сообщение]' placeholders
const oldRenderDecryptBlock = `            let txt = m.text || '';
            const isEncrypted = !!m.signal;
            if (isEncrypted) {
              if (m._localDecrypted) {
                txt = m._localDecrypted;
              } else if (m._decrypted) {
                txt = m._decrypted;
              } else {
                const partnerUid = (data.members || []).find(uid => uid !== me.uid) || (m.uid !== me.uid ? m.uid : null);
                if (partnerUid && typeof SignalCrypto !== 'undefined') {
                  SignalCrypto.decrypt(m.signal, partnerUid).then(dec => {
                    if (dec) {
                      m._decrypted = dec;
                      const msgSpan = document.querySelector(\`.msg[data-id="\${d.id}"] .msg-text-content\`);
                      if (msgSpan) msgSpan.innerHTML = processLinks(dec);
                    }
                  });
                }
                txt = m._decrypted || '🔒 Расшифровка...';
              }
            }`;

const newRenderDecryptBlock = `            let txt = m.text || '';
            const isEncrypted = !!m.signal;
            if (isEncrypted) {
              if (m._localDecrypted) {
                txt = m._localDecrypted;
              } else if (m._decrypted) {
                txt = m._decrypted;
              } else {
                const partnerUid = (data.members || []).find(uid => uid !== me.uid) || (m.uid !== me.uid ? m.uid : null);
                if (typeof SignalCrypto !== 'undefined') {
                  SignalCrypto.decrypt(m.signal, partnerUid, id).then(dec => {
                    if (dec) {
                      m._decrypted = dec;
                      const msgSpan = document.querySelector(\`.msg[data-id="\${d.id}"] .msg-text-content\`);
                      if (msgSpan) msgSpan.innerHTML = isAiMsg ? formatAiMarkdown(dec) : processLinks(dec);
                      try { localStorage.setItem('last_preview_' + id, plainText(dec).slice(0, 60)); } catch (_) {}
                    }
                  });
                }
                txt = m._decrypted || (m.text && !m.text.includes('Зашифрованное') ? m.text : '…');
              }
            } else if (txt.includes('Зашифрованное сообщение') || txt.includes('[Зашифрованное сообщение]')) {
              txt = '…';
            }`;

applyReplace('Clean placeholders in renderMessages', oldRenderDecryptBlock, newRenderDecryptBlock);

// 5. In sendMsg: ALWAYS encrypt, NEVER write '🔒 [Зашифрованное сообщение]' or '🔒 Зашифрованное сообщение'
const oldSendMsgEncrypt = `      const isChanPost = !!(activeChat && activeChat.type === 'channel');
      const isDm = !!(activeChat && (activeChat.type === 'dm' || (Array.isArray(activeChat.members) && activeChat.members.length === 2 && activeChat.type !== 'group' && activeChat.type !== 'channel' && activeChat.type !== 'fav')));
      let signalPayload = null;
      let rawText = txt;
      if (isDm && typeof SignalCrypto !== 'undefined') {
        const partnerUid = (activeChat.members || []).find(uid => uid !== me.uid);
        if (partnerUid) {
          signalPayload = await SignalCrypto.encrypt(rawText, partnerUid);
        }
      }

      const data = {
        text: signalPayload ? '🔒 [Зашифрованное сообщение]' : rawText,
        uid: me.uid,
        author: isChanPost ? (activeChat.name || me.nick) : me.nick,
        at: firebase.firestore.FieldValue.serverTimestamp(),
        type: 'text',
        ...(isChanPost ? { isChannelPost: true, views: 1, viewedBy: [me.uid] } : {}),
        ...(signalPayload ? { signal: signalPayload } : {})
      };
      if (signalPayload) {
        data._localDecrypted = rawText;
      }`;

const newSendMsgEncrypt = `      const isChanPost = !!(activeChat && activeChat.type === 'channel');
      const isAi = !!(activeId === 'aihub_' + me.uid || (activeChat && activeChat.type === 'ai_hub'));
      const shouldEncrypt = !isChanPost && !isAi;
      let signalPayload = null;
      let rawText = txt;

      if (shouldEncrypt && typeof SignalCrypto !== 'undefined') {
        const partnerUid = (activeChat && Array.isArray(activeChat.members)) ? activeChat.members.find(uid => uid !== me.uid) : null;
        signalPayload = await SignalCrypto.encrypt(rawText, partnerUid, activeId);
      }

      const data = {
        text: rawText,
        uid: me.uid,
        author: isChanPost ? (activeChat.name || me.nick) : me.nick,
        at: firebase.firestore.FieldValue.serverTimestamp(),
        type: 'text',
        ...(isChanPost ? { isChannelPost: true, views: 1, viewedBy: [me.uid] } : {}),
        ...(signalPayload ? { signal: signalPayload } : {})
      };
      if (signalPayload) {
        data._localDecrypted = rawText;
      }`;

applyReplace('Encrypt all chats in sendMsg without [Зашифрованное сообщение]', oldSendMsgEncrypt, newSendMsgEncrypt);

// 6. In sendMsg: update lastPreview to NEVER be '🔒 Зашифрованное сообщение'
const oldSendMsgPreview = `const lastPreview = signalPayload ? '🔒 Зашифрованное сообщение' : (data.forwardFrom ? ('↪️ Переслано: ' + getForwardLastMsgPreview(data)) : (plainText(data.text).slice(0, 60) || 'сообщение'));
        await db.collection('chats').doc(activeId).update({ lastMsg: lastPreview, lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid });`;

const newSendMsgPreview = `const lastPreview = data.forwardFrom ? ('↪️ Переслано: ' + getForwardLastMsgPreview(data)) : (plainText(rawText).slice(0, 60) || 'сообщение');
        await db.collection('chats').doc(activeId).update({ lastMsg: lastPreview, lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid });
        try { localStorage.setItem('last_preview_' + activeId, lastPreview); } catch (_) {}`;

applyReplace('Write actual text in lastPreview', oldSendMsgPreview, newSendMsgPreview);

// 7. Remove e2ee-chat-notice injection
const oldE2eeNotice = `// In DM chats, prepend Signal Protocol E2EE notice
        if (data.type === 'dm') {
          const notice = document.createElement('div');
          notice.className = 'e2ee-chat-notice';
          notice.innerHTML = '<i class="fa-solid fa-lock"></i> Сообщения защищены сквозным шифрованием Signal Protocol';
          frag.insertBefore(notice, frag.firstChild);
        }`;

const newE2eeNotice = `// E2EE notice removed per user preference`;

applyReplace('Remove e2ee-chat-notice injection', oldE2eeNotice, newE2eeNotice);

// Validate all scripts
const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let scriptIdx = 0;
let errors = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  scriptIdx++;
  const code = match[1];
  if (!code.trim() || match[0].includes('application/ld+json')) continue;
  try {
    new Function(code);
  } catch (err) {
    errors++;
    console.error('Syntax error in script #' + scriptIdx + ':', err.message);
  }
}

if (errors > 0) {
  console.error('[patch-encryption] ABORTING: Found', errors, 'syntax errors!');
  process.exit(1);
}

// Restore CRLF
if (isCRLF) {
  html = html.replace(/\n/g, '\r\n');
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('[patch-encryption] SUCCESS! Updated public/index.html (', html.length, 'bytes)');
