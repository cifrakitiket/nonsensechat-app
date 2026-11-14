const fs = require('fs');
const path = 'd:/messenger/public/index.html';

let content = fs.readFileSync(path, 'utf8');

// 1. Fix userIsOnline: if (!lastSeen) return false (NOT true)
const oldUserIsOnline = `    function userIsOnline(u) {
      if (!u || !u.online) return false;
      const lastSeen = asDate(u.lastSeen);
      if (!lastSeen) return true;
      return (Date.now() - lastSeen.getTime()) < ONLINE_STATUS_TIMEOUT;
    }`;

const newUserIsOnline = `    function userIsOnline(u) {
      if (!u || !u.online) return false;
      const lastSeen = asDate(u.lastSeen);
      if (!lastSeen) return false;
      return Math.abs(Date.now() - lastSeen.getTime()) < ONLINE_STATUS_TIMEOUT;
    }`;

if (content.includes(oldUserIsOnline)) {
  content = content.replace(oldUserIsOnline, newUserIsOnline);
  console.log('✓ Fixed userIsOnline in index.html');
} else {
  console.log('⚠ Could not match oldUserIsOnline, checking alternative');
  const fallbackRegex = /function userIsOnline\(u\)\s*\{\s*if \(!u \|\| !u\.online\) return false;\s*const lastSeen = asDate\(u\.lastSeen\);\s*if \(!lastSeen\) return true;\s*return \(Date\.now\(\) - lastSeen\.getTime\(\)\) < ONLINE_STATUS_TIMEOUT;\s*\}/;
  if (fallbackRegex.test(content)) {
    content = content.replace(fallbackRegex, newUserIsOnline.trim());
    console.log('✓ Fixed userIsOnline via regex in index.html');
  } else {
    console.error('❌ Failed to patch userIsOnline');
  }
}

// 2. Fix notifyFromChats: RTDB timestamp parsing
const oldNotifyLine = `const at = c.lastMsgAt && c.lastMsgAt.seconds || 0;`;
const newNotifyLine = `const ts = asDate(c.lastMsgAt);
        const at = ts ? ts.getTime() : (typeof c.lastMsgAt === 'number' ? c.lastMsgAt : (c.lastMsgAt && c.lastMsgAt.seconds ? c.lastMsgAt.seconds * 1000 : 0));`;

if (content.includes(oldNotifyLine)) {
  content = content.replace(oldNotifyLine, newNotifyLine);
  console.log('✓ Fixed notifyFromChats RTDB timestamp check in index.html');
} else {
  console.log('⚠ Could not find oldNotifyLine directly, trying regex');
  const notifyRegex = /const at = c\.lastMsgAt && c\.lastMsgAt\.seconds \|\| 0;/g;
  if (notifyRegex.test(content)) {
    content = content.replace(notifyRegex, newNotifyLine);
    console.log('✓ Fixed notifyFromChats via regex in index.html');
  } else {
    console.error('❌ Failed to patch notifyFromChats');
  }
}

// 3. Hook up RTDB presence in auth.onAuthStateChanged
const oldHeartbeatBlock = `      if (presenceHeartbeatTimer) clearInterval(presenceHeartbeatTimer);
      presenceHeartbeatTimer = setInterval(() => {
        db.collection('users').doc(user.uid).update({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => { });
      }, 45000);`;

const newHeartbeatBlock = `      // Hook up Realtime Database server-side onDisconnect & presence
      try {
        if (_fbDb && user && user.uid) {
          const userRtdbRef = _fbDb.ref('users/' + user.uid);
          _fbDb.ref('.info/connected').on('value', function(snap) {
            if (snap.val() === true) {
              userRtdbRef.update({ online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP });
              userRtdbRef.onDisconnect().update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP, typingIn: null, typingAt: null });
            }
          });
        }
      } catch (errPres) { console.warn('RTDB presence listener error:', errPres); }

      if (presenceHeartbeatTimer) clearInterval(presenceHeartbeatTimer);
      presenceHeartbeatTimer = setInterval(() => {
        if (!document.hidden && _fbDb && user && user.uid) {
          _fbDb.ref('users/' + user.uid).update({ online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP }).catch(() => { });
        }
      }, 35000);`;

if (content.includes(oldHeartbeatBlock)) {
  content = content.replace(oldHeartbeatBlock, newHeartbeatBlock);
  console.log('✓ Added RTDB .info/connected and onDisconnect presence in index.html');
} else {
  console.log('⚠ Could not find oldHeartbeatBlock directly, checking regex');
  const hbRegex = /if \(presenceHeartbeatTimer\) clearInterval\(presenceHeartbeatTimer\);\s*presenceHeartbeatTimer = setInterval\(\(\) => \{\s*db\.collection\('users'\)\.doc\(user\.uid\)\.update\(\{ lastSeen: firebase\.firestore\.FieldValue\.serverTimestamp\(\) \}\)\.catch\(\(\) => \{ \}\);\s*\}, 45000\);/;
  if (hbRegex.test(content)) {
    content = content.replace(hbRegex, newHeartbeatBlock);
    console.log('✓ Added RTDB presence via regex in index.html');
  } else {
    console.error('❌ Failed to patch heartbeat block');
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done patching index.html');
