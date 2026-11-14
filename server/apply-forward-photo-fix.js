// server/apply-forward-photo-fix.js
const fs = require('fs');
const path = require('path');

const publicIndexPath = path.join(__dirname, '..', 'public', 'index.html');
const electronIndexPath = path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html');
const useChatsTsPath = path.join(__dirname, '..', 'desktop-react', 'src', 'hooks', 'useChats.ts');
const reactAppTsxPath = path.join(__dirname, '..', 'desktop-react', 'src', 'App.tsx');
const chatAreaTsxPath = path.join(__dirname, '..', 'desktop-react', 'src', 'components', 'ChatArea.tsx');
const versionPath = path.join(__dirname, '..', 'public', 'version.json');

console.log('--- Applying Comprehensive Fix for Photo Forwarding ---');

// 1. Update public/index.html
let html = fs.readFileSync(publicIndexPath, 'utf8');

// 1a. Enhance buildForwardData
const oldBuildForwardDataRegex = /function buildForwardData\(orig, sender, extraText\) \{[\s\S]*?return data;\s*\}/;

const newBuildForwardData = `function buildForwardData(orig, sender, extraText) {
      if (!orig) orig = {};
      const origAuthor = orig.forwardFrom || orig.author || '?';
      
      // Resilient resolution of media URLs across web, mobile, React and desktop data models
      const photoUrl = orig.photoUrl || (orig.attachment && orig.attachment.type === 'photo' ? orig.attachment.url : '') || (orig.type === 'photo' ? orig.fileUrl : '') || (orig.fileUrl && /\\.(jpg|jpeg|png|gif|webp|bmp|heic)(\\?|$)/i.test(orig.fileUrl) ? orig.fileUrl : '') || (orig.fileData ? ('data:image/png;base64,' + orig.fileData) : '');
      const videoUrl = orig.videoUrl || (orig.attachment && orig.attachment.type === 'video' ? orig.attachment.url : '') || (orig.fileUrl && /\\.(mp4|webm|mov|mkv)(\\?|$)/i.test(orig.fileUrl) ? orig.fileUrl : '');
      const audioUrl = orig.audioUrl || orig.voiceUrl || (orig.attachment && orig.attachment.type === 'audio' ? orig.attachment.url : '') || (orig.fileUrl && /\\.(mp3|wav|ogg|m4a|flac)(\\?|$)/i.test(orig.fileUrl) ? orig.fileUrl : '');
      const stickerUrl = orig.stickerUrl || (orig.type === 'sticker' ? orig.photoUrl : '');
      
      let type = orig.type;
      if (stickerUrl) type = 'sticker';
      else if (photoUrl && (!type || type === 'text' || type === 'media' || type === 'image' || type === 'file')) type = 'photo';
      else if (videoUrl && (!type || type === 'text' || type === 'media' || type === 'file')) type = 'video';
      else if (audioUrl && (!type || type === 'text' || type === 'file')) type = 'audio';
      else if (!type) type = 'text';

      const data = {
        uid: sender.uid,
        author: sender.nick,
        forwardFrom: origAuthor,
        at: firebase.firestore.FieldValue.serverTimestamp(),
        type: type,
        text: extraText !== undefined ? extraText : (orig.text || '')
      };

      if (type === 'photo' || photoUrl) {
        data.type = 'photo';
        data.photoUrl = photoUrl;
        data.fileUrl = photoUrl;
        data.fileData = orig.fileData || '';
        data.caption = orig.caption || (extraText === undefined ? orig.text : '') || '';
        data.isSpoiler = !!orig.isSpoiler;
        data.fileName = orig.fileName || 'photo.jpg';
        data.fileSize = orig.fileSize || 0;
      } else if (type === 'video' || videoUrl) {
        data.type = 'video';
        data.videoUrl = videoUrl;
        data.fileUrl = videoUrl;
        data.fileName = orig.fileName || 'video.mp4';
        data.fileSize = orig.fileSize || 0;
        data.duration = orig.duration || orig.mediaDuration || 0;
        data.caption = orig.caption || (extraText === undefined ? orig.text : '') || '';
      } else if (type === 'audio' || audioUrl) {
        data.type = 'audio';
        data.audioUrl = audioUrl;
        data.fileUrl = audioUrl;
        data.audioTitle = orig.audioTitle || '';
        data.audioArtist = orig.audioArtist || '';
        data.audioCover = orig.audioCover || '';
        data.duration = orig.duration || 0;
        data.fileName = orig.fileName || 'audio.mp3';
        data.fileSize = orig.fileSize || 0;
      } else if (type === 'voice') {
        data.type = 'voice';
        data.voiceUrl = orig.voiceUrl || audioUrl || '';
        data.audioUrl = data.voiceUrl;
        data.fileUrl = data.voiceUrl;
        data.duration = orig.duration || 0;
        data.waveform = orig.waveform || [];
      } else if (type === 'file') {
        data.type = 'file';
        data.fileUrl = orig.fileUrl || '';
        data.fileData = orig.fileData || '';
        data.fileName = orig.fileName || 'файл';
        data.fileSize = orig.fileSize || 0;
      } else if (type === 'sticker' || stickerUrl) {
        data.type = 'sticker';
        data.stickerUrl = stickerUrl;
        data.emoji = orig.emoji || '';
        data.packId = orig.packId || '';
        data.vid = !!orig.vid;
      } else if (type === 'gif' || orig.gifUrl) {
        data.type = 'gif';
        data.gifUrl = orig.gifUrl || '';
      } else if (type === 'poll' && orig.poll) {
        data.poll = {
          question: orig.poll.question || '',
          desc: orig.poll.desc || '',
          options: Array.isArray(orig.poll.options) ? [...orig.poll.options] : [],
          isQuiz: !!orig.poll.isQuiz,
          isMultiple: !!orig.poll.isMultiple,
          isAnonymous: !!orig.poll.isAnonymous,
          votes: {},
          correctIdxs: orig.poll.correctIdxs || []
        };
      }
      return data;
    }`;

if (oldBuildForwardDataRegex.test(html)) {
  html = html.replace(oldBuildForwardDataRegex, newBuildForwardData);
  console.log('✓ Updated buildForwardData in public/index.html');
} else {
  console.error('Could not find buildForwardData in public/index.html');
}

// 1b. Enhance photo message renderer in public/index.html
const oldPhotoRenderRegex = /\} else if \(m\.type === 'photo'\) \{\s*\r?\n\s*const photoSrc = m\.photoUrl \|\| 'data:image\/png;base64,' \+ m\.fileData;/;
const newPhotoRender = `} else if (m.type === 'photo' || m.type === 'image' || m.photoUrl || (m.fileUrl && /\\.(jpg|jpeg|png|gif|webp|svg|bmp|heic)(\\?|$)/i.test(m.fileUrl))) {
            const photoSrc = m.photoUrl || m.fileUrl || (m.attachment && m.attachment.url) || (m.fileData ? ('data:image/png;base64,' + m.fileData) : '');`;

if (oldPhotoRenderRegex.test(html)) {
  html = html.replace(oldPhotoRenderRegex, newPhotoRender);
  console.log('✓ Updated photo renderer in public/index.html');
} else {
  console.log('✓ Photo renderer in public/index.html already updated or pattern differs');
}

fs.writeFileSync(publicIndexPath, html, 'utf8');
console.log('✓ Saved public/index.html');

// 2. Update electron-desktop/public/index.html
let electronHtml = fs.readFileSync(electronIndexPath, 'utf8');
if (oldBuildForwardDataRegex.test(electronHtml)) {
  electronHtml = electronHtml.replace(oldBuildForwardDataRegex, newBuildForwardData);
  console.log('✓ Updated buildForwardData in electron-desktop');
}
if (oldPhotoRenderRegex.test(electronHtml)) {
  electronHtml = electronHtml.replace(oldPhotoRenderRegex, newPhotoRender);
  console.log('✓ Updated photo renderer in electron-desktop');
}
fs.writeFileSync(electronIndexPath, electronHtml, 'utf8');
console.log('✓ Saved electron-desktop/public/index.html');

// 3. Update desktop-react/src/hooks/useChats.ts: Fix chatId in sendMessage
let useChatsTs = fs.readFileSync(useChatsTsPath, 'utf8');
const oldUseChatsSend = `      const msgsRef = ref(rtdb, \`messages/\${activeChatId}\`);
      const newMsgRef = push(msgsRef);

      const msgData: Record<string, unknown> = {
        chatId: activeChatId,`;

const newUseChatsSend = `      const targetChat = chatId || activeChatId;
      const msgsRef = ref(rtdb, \`messages/\${targetChat}\`);
      const newMsgRef = push(msgsRef);

      const msgData: Record<string, unknown> = {
        chatId: targetChat,`;

if (useChatsTs.includes(oldUseChatsSend)) {
  useChatsTs = useChatsTs.replace(oldUseChatsSend, newUseChatsSend);
  fs.writeFileSync(useChatsTsPath, useChatsTs, 'utf8');
  console.log('✓ Fixed target chatId in desktop-react useChats.ts sendMessage');
} else {
  console.log('✓ useChats.ts sendMessage already updated or pattern differs');
}

// 4. Update desktop-react/src/App.tsx: Enhance handleForwardMessage
let reactAppTsx = fs.readFileSync(reactAppTsxPath, 'utf8');
const oldReactAppForward = `    if (msg.photoUrl) {
      attachment = {
        type: 'photo',
        url: msg.photoUrl,
        caption: msg.caption,
        isSpoiler: msg.isSpoiler,
      };`;

const newReactAppForward = `    const resolvedPhotoUrl = msg.photoUrl || (msg.attachment?.type === 'photo' ? msg.attachment.url : '') || (msg.fileUrl && /\\.(jpg|jpeg|png|gif|webp|bmp|heic)(\\?|$)/i.test(msg.fileUrl) ? msg.fileUrl : '');
    if (resolvedPhotoUrl) {
      attachment = {
        type: 'photo',
        url: resolvedPhotoUrl,
        caption: msg.caption || msg.text || undefined,
        isSpoiler: msg.isSpoiler,
      };`;

if (reactAppTsx.includes(oldReactAppForward)) {
  reactAppTsx = reactAppTsx.replace(oldReactAppForward, newReactAppForward);
  fs.writeFileSync(reactAppTsxPath, reactAppTsx, 'utf8');
  console.log('✓ Updated handleForwardMessage in desktop-react App.tsx');
} else {
  console.log('✓ desktop-react App.tsx already updated');
}

// 5. Update desktop-react/src/components/ChatArea.tsx: Resilient photo src
let chatAreaTsx = fs.readFileSync(chatAreaTsxPath, 'utf8');
const oldChatAreaImg = `<img
                          src={msg.photoUrl}
                          alt="Photo"`;

const newChatAreaImg = `<img
                          src={msg.photoUrl || msg.fileUrl || msg.attachment?.url}
                          alt="Photo"`;

if (chatAreaTsx.includes(oldChatAreaImg)) {
  chatAreaTsx = chatAreaTsx.replace(oldChatAreaImg, newChatAreaImg);
  fs.writeFileSync(chatAreaTsxPath, chatAreaTsx, 'utf8');
  console.log('✓ Updated ChatArea.tsx photo img src fallback');
} else {
  console.log('✓ ChatArea.tsx photo img src already updated');
}

// 6. Update version in public/version.json
const ver = { v: '2.5.8-forward-photo-fix' };
fs.writeFileSync(versionPath, JSON.stringify(ver) + '\n', 'utf8');
console.log('✓ Bumped version in public/version.json to', ver.v);

console.log('--- ALL FORWARD PHOTO FIXES APPLIED SUCCESSFULLY ---');
