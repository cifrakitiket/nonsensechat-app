// server/test-forward-data.js
const assert = require('assert');

function buildForwardData(orig, sender, extraText) {
  if (!orig) orig = {};
  const origAuthor = orig.forwardFrom || orig.author || '?';
  
  // Resolve actual media URL and detected type
  const photoUrl = orig.photoUrl || (orig.attachment && orig.attachment.type === 'photo' ? orig.attachment.url : '') || (orig.type === 'photo' ? orig.fileUrl : '') || (orig.fileUrl && /\.(jpg|jpeg|png|gif|webp|bmp|heic)(\?|$)/i.test(orig.fileUrl) ? orig.fileUrl : '') || (orig.fileData ? ('data:image/png;base64,' + orig.fileData) : '');
  const videoUrl = orig.videoUrl || (orig.attachment && orig.attachment.type === 'video' ? orig.attachment.url : '') || (orig.fileUrl && /\.(mp4|webm|mov|mkv)(\?|$)/i.test(orig.fileUrl) ? orig.fileUrl : '');
  const audioUrl = orig.audioUrl || orig.voiceUrl || (orig.attachment && orig.attachment.type === 'audio' ? orig.attachment.url : '') || (orig.fileUrl && /\.(mp3|wav|ogg|m4a|flac)(\?|$)/i.test(orig.fileUrl) ? orig.fileUrl : '');
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
    at: 'MOCK_TIMESTAMP',
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
  }
  return data;
}

const me = { uid: 'user1', nick: 'Alex' };

// Test 1: Standard web photo message
const webPhoto = { uid: 'u2', author: 'AgentYayko', type: 'photo', photoUrl: 'https://hb.vkcs.cloud/noname/photo1.jpg' };
const res1 = buildForwardData(webPhoto, me);
assert.strictEqual(res1.type, 'photo');
assert.strictEqual(res1.photoUrl, 'https://hb.vkcs.cloud/noname/photo1.jpg');
assert.strictEqual(res1.forwardFrom, 'AgentYayko');
console.log('✓ Test 1 passed: Standard web photo');

// Test 2: Message where type is missing or text, but photoUrl is present
const missingTypePhoto = { uid: 'u2', author: 'AgentYayko', photoUrl: 'https://hb.vkcs.cloud/noname/photo2.jpg' };
const res2 = buildForwardData(missingTypePhoto, me);
assert.strictEqual(res2.type, 'photo');
assert.strictEqual(res2.photoUrl, 'https://hb.vkcs.cloud/noname/photo2.jpg');
console.log('✓ Test 2 passed: Missing type with photoUrl');

// Test 3: React attachment format
const reactPhoto = { uid: 'u2', author: 'AgentYayko', attachment: { type: 'photo', url: 'https://example.com/p3.png' } };
const res3 = buildForwardData(reactPhoto, me);
assert.strictEqual(res3.type, 'photo');
assert.strictEqual(res3.photoUrl, 'https://example.com/p3.png');
console.log('✓ Test 3 passed: React attachment photo');

// Test 4: FileUrl with image extension
const filePhoto = { uid: 'u2', author: 'AgentYayko', type: 'file', fileUrl: 'https://example.com/test.jpg' };
const res4 = buildForwardData(filePhoto, me);
assert.strictEqual(res4.type, 'photo');
assert.strictEqual(res4.photoUrl, 'https://example.com/test.jpg');
console.log('✓ Test 4 passed: FileUrl with image extension');

// Test 5: Photo with caption
const photoWithCap = { uid: 'u2', author: 'AgentYayko', type: 'photo', photoUrl: 'https://example.com/cap.jpg', caption: 'Красивый закат' };
const res5 = buildForwardData(photoWithCap, me);
assert.strictEqual(res5.type, 'photo');
assert.strictEqual(res5.caption, 'Красивый закат');
console.log('✓ Test 5 passed: Photo with caption');

// Test 6: Forwarding an already forwarded photo
const alreadyForwarded = { uid: 'u2', author: 'AgentYayko', forwardFrom: 'OriginalCreator', type: 'photo', photoUrl: 'https://example.com/fwd.jpg' };
const res6 = buildForwardData(alreadyForwarded, me);
assert.strictEqual(res6.type, 'photo');
assert.strictEqual(res6.forwardFrom, 'OriginalCreator');
console.log('✓ Test 6 passed: Forwarding already forwarded photo preserves original creator');

console.log('ALL TESTS PASSED SUCCESSFULLY!');
