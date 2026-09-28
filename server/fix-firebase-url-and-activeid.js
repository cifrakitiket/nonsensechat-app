// server/fix-firebase-url-and-activeid.js
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('Processing:', filePath);

  // 1. Восстановление корректного Firebase config и безопасная инициализация RTDB
  const fbInitRegex = /const firebaseConfig\s*=\s*\{[\s\S]*?const _fbDb\s*=\s*window\.firebase\.database\(\);/;
  if (!fbInitRegex.test(content)) {
    console.error('fbInitRegex failed to match in', filePath);
    process.exit(1);
  }

  const newFbInit = `const firebaseConfig = {
      apiKey: "AIzaSyCVH8_UhxO5hAj0ZBlA_lRw3B0hnN1zEOc",
      authDomain: "nonsensechattm-e5d18.firebaseapp.com",
      databaseURL: "https://nonsensechattm-e5d18-default-rtdb.firebaseio.com",
      projectId: "nonsensechattm-e5d18",
      storageBucket: "nonsensechattm-e5d18.firebasestorage.app",
      messagingSenderId: "497380539024",
      appId: "1:497380539024:web:cace5570f62f9e073af615",
      measurementId: "G-NC89Y47FVD"
    };

    // Инициализация Firebase
    const cleanFirebaseConfig = { ...firebaseConfig };
    if (!cleanFirebaseConfig.databaseURL || !cleanFirebaseConfig.databaseURL.startsWith('http')) {
      cleanFirebaseConfig.databaseURL = "https://nonsensechattm-e5d18-default-rtdb.firebaseio.com";
    }
    if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
      window.firebase.initializeApp(cleanFirebaseConfig);
    }
    const _fbAuth = window.firebase.auth();
    let _fbDb = null;
    try {
      _fbDb = window.firebase.database();
    } catch (dbErr) {
      console.warn('Firebase RTDB init error:', dbErr);
    }`;

  content = content.replace(fbInitRegex, newFbInit);
  console.log('✓ Firebase config & RTDB safe init updated');

  // 2. Объявление window.activeId
  const activeIdDeclRegex = /let me\s*=\s*null,\s*activeId\s*=\s*null,\s*activeChat\s*=\s*null,\s*curTab\s*=\s*'all';/;
  if (!activeIdDeclRegex.test(content)) {
    console.error('activeIdDeclRegex failed to match in', filePath);
    process.exit(1);
  }
  content = content.replace(activeIdDeclRegex, `window.activeId = null;
    let me = null, activeId = null, activeChat = null, curTab = 'all';`);
  console.log('✓ window.activeId declaration added');

  // 3. Синхронизация window.activeId в openChat
  content = content.replace(/activeId\s*=\s*id;\s*activeChat\s*=\s*data;/, 'activeId = id; window.activeId = id; activeChat = data;');
  console.log('✓ window.activeId synced in openChat');

  // 4. Безопасный generateCallLink в скрипте звонков
  const callLinkRegex = /\/\/\s*═══\s*GENERATE CALL LINK\s*═══[\s\S]*?(?=\/\/\s*═══\s*SHOW LINK DIALOG)/;
  if (!callLinkRegex.test(content)) {
    console.error('callLinkRegex failed to match in', filePath);
    process.exit(1);
  }

  const newCallLink = `// ═══ GENERATE CALL LINK ═══
      function generateCallLink() {
        let currentChatId = null;
        try { if (typeof myCallChatId !== 'undefined') currentChatId = myCallChatId; } catch (_) {}
        if (!currentChatId && window.myCallChatId) currentChatId = window.myCallChatId;
        if (!currentChatId) {
          try { if (typeof activeId !== 'undefined') currentChatId = activeId; } catch (_) {}
        }
        if (!currentChatId && window.activeId) currentChatId = window.activeId;
        const chatId = currentChatId || null;
        const baseUrl = window.location.origin + window.location.pathname;
        const fullLink = chatId ? \`\${baseUrl}?join=\${encodeURIComponent(chatId)}\` : baseUrl;
        const input = document.getElementById('callLinkInput');
        if (input) {
          input.value = fullLink;
          input.dataset.link = fullLink;
        }
      }

      `;

  content = content.replace(callLinkRegex, newCallLink);
  console.log('✓ Safe generateCallLink applied');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully written:', filePath);
}
console.log('All patches complete!');
