const fs = require('fs');
const path = 'd:/messenger/public/index.html';

let content = fs.readFileSync(path, 'utf8');

// 1. sendPoll
const oldPoll = `        await db.collection('chats').doc(activeId).update({
          lastMsg: '📊 ' + q,
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        });`;
const newPoll = `        await db.collection('chats').doc(activeId).update({
          lastMsg: '📊 ' + q,
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        });
        if (typeof dispatchPushToChat === 'function') dispatchPushToChat(activeId, '📊 ' + q);`;

if (content.includes(oldPoll)) {
  content = content.replace(oldPoll, newPoll);
  console.log('✓ Hooked dispatchPushToChat into sendPoll');
}

// 2. uploadFiles
const oldUpload = `        db.collection('chats').doc(e.chatId).update({
          lastMsg: lastMsgText,
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        }).catch(() => { });`;
const newUpload = `        db.collection('chats').doc(e.chatId).update({
          lastMsg: lastMsgText,
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        }).catch(() => { });
        if (typeof dispatchPushToChat === 'function') dispatchPushToChat(e.chatId, lastMsgText);`;

if (content.includes(oldUpload)) {
  content = content.replace(oldUpload, newUpload);
  console.log('✓ Hooked dispatchPushToChat into uploadFiles');
}

// 3. fwdMsg
const oldFwd = `        await db.collection('chats').doc(targetId).update({
          lastMsg: '↪️ Переслано: ' + getForwardLastMsgPreview(data),
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        });`;
const newFwd = `        await db.collection('chats').doc(targetId).update({
          lastMsg: '↪️ Переслано: ' + getForwardLastMsgPreview(data),
          lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMsgUid: me.uid
        });
        if (typeof dispatchPushToChat === 'function') dispatchPushToChat(targetId, '↪️ Переслано: ' + getForwardLastMsgPreview(data));`;

if (content.includes(oldFwd)) {
  content = content.replace(oldFwd, newFwd);
  console.log('✓ Hooked dispatchPushToChat into fwdMsg');
}

// 4. sendSticker
const oldSticker = `      db.collection('chats').doc(cid).update({ lastMsg: (emoji ? emoji + ' ' : '') + 'Стикер', lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid }).catch(() => { });`;
const newSticker = `      db.collection('chats').doc(cid).update({ lastMsg: (emoji ? emoji + ' ' : '') + 'Стикер', lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid }).catch(() => { });
      if (typeof dispatchPushToChat === 'function') dispatchPushToChat(cid, (emoji ? emoji + ' ' : '') + 'Стикер');`;

if (content.includes(oldSticker)) {
  content = content.replace(oldSticker, newSticker);
  console.log('✓ Hooked dispatchPushToChat into sendSticker');
}

// 5. sendGif
const oldGif = `      db.collection('chats').doc(cid).update({ lastMsg: 'GIF', lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid }).catch(() => { });`;
const newGif = `      db.collection('chats').doc(cid).update({ lastMsg: 'GIF', lastMsgAt: firebase.firestore.FieldValue.serverTimestamp(), lastMsgUid: me.uid }).catch(() => { });
      if (typeof dispatchPushToChat === 'function') dispatchPushToChat(cid, '🎬 GIF');`;

if (content.includes(oldGif)) {
  content = content.replace(oldGif, newGif);
  console.log('✓ Hooked dispatchPushToChat into sendGif');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done hooking remaining message types!');
