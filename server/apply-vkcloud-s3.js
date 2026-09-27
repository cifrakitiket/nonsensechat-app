// server/apply-vkcloud-s3.js
const fs = require('fs');
const path = require('path');

const NEW_UPLOAD_CODE = `// ═══ UPLOAD SYSTEM — VK Cloud Object Storage (S3-совместимый) ═══
// Файлы, фото и медиа загружаются напрямую в VK Cloud S3 (бакет noname).
// Подпись формируется автономно в браузере через Web Crypto API (AWS v4),
// поэтому сайт работает полностью автономно без необходимости держать сервер включённым.

const VK_S3_CONFIG = {
  endpoint: 'https://hb.vkcs.cloud',
  bucket: 'noname',
  region: 'ru-msk',
  access: 'w1Vgn81mT6nkLJMrsA4C6f',
  secret: 'ceXVQHnATaisViK32aKJ3X6NCwZ82yRGHD4Z2tQ2yCd6'
};

async function getVKCS3PresignedUrl(fileName, contentType, uid) {
  const subtle = window.crypto && window.crypto.subtle;
  if (!subtle) {
    // Резерв: запрос через бэкенд, если WebCrypto недоступен
    const qs = 'name=' + encodeURIComponent(fileName) + '&type=' + encodeURIComponent(contentType || 'application/octet-stream') + '&uid=' + encodeURIComponent(uid || 'anon');
    const resp = await fetch(VKC_URL + '/api/presign?' + qs);
    if (!resp.ok) throw new Error('Presign failed: ' + resp.status);
    return await resp.json();
  }

  const enc = new TextEncoder();
  async function sha256Hex(str) {
    const buf = await subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function hmac(keyBuf, dataStr) {
    const key = await subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await subtle.sign('HMAC', key, enc.encode(dataStr)));
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const datetime = date + 'T' + now.toISOString().slice(11, 19).replace(/:/g, '') + 'Z';
  const host = new URL(VK_S3_CONFIG.endpoint).host;
  const rand = Math.random().toString(36).slice(2, 10);
  const clean = (fileName || 'file')
    .normalize('NFKD')
    .replace(/[^\\w.\\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(-80) || 'file';
  const key = (uid || 'anon') + '/' + Date.now() + '_' + rand + '_' + clean;
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');

  const credentialScope = date + '/' + VK_S3_CONFIG.region + '/s3/aws4_request';
  const credential = VK_S3_CONFIG.access + '/' + credentialScope;

  const queryParams = [
    'X-Amz-Algorithm=AWS4-HMAC-SHA256',
    'X-Amz-Credential=' + encodeURIComponent(credential),
    'X-Amz-Date=' + datetime,
    'X-Amz-Expires=900',
    'X-Amz-SignedHeaders=host'
  ].sort().join('&');

  const canonicalRequest = [
    'PUT',
    '/' + VK_S3_CONFIG.bucket + '/' + encodedKey,
    queryParams,
    'host:' + host + '\\n',
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\\n');

  const kDate = await hmac(enc.encode('AWS4' + VK_S3_CONFIG.secret), date);
  const kRegion = await hmac(kDate, VK_S3_CONFIG.region);
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const sigBuf = await hmac(kSigning, stringToSign);
  const signature = Array.from(sigBuf).map(b => b.toString(16).padStart(2, '0')).join('');

  const uploadUrl = VK_S3_CONFIG.endpoint + '/' + VK_S3_CONFIG.bucket + '/' + encodedKey + '?' + queryParams + '&X-Amz-Signature=' + signature;
  const publicUrl = VK_S3_CONFIG.endpoint + '/' + VK_S3_CONFIG.bucket + '/' + encodedKey;

  return { uploadUrl, publicUrl, key };
}

function uploadToVKCloud(file, onStatus, onProgress, onXhr) {
  onStatus && onStatus('⏳ Загрузка в VK Cloud S3...');
  return new Promise(async (resolve, reject) => {
    try {
      const uid = (window.auth && window.auth.currentUser) ? window.auth.currentUser.uid : 'anon';
      const clean = (file.name || 'file')
        .normalize('NFKD')
        .replace(/[^\\w.\\-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(-80) || 'file';
      const ctype = file.type || 'application/octet-stream';

      const { uploadUrl, publicUrl } = await getVKCS3PresignedUrl(clean, ctype, uid);

      const xhr = new XMLHttpRequest();
      onXhr && onXhr(xhr);
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', ctype);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress && onProgress(1);
          resolve(publicUrl);
        } else {
          reject(new Error('VK Cloud S3 ' + xhr.status + ': ' + (xhr.responseText || '').slice(0, 200)));
        }
      };
      xhr.onerror = () => reject(new Error('Сбой сети при отправке в VK Cloud S3'));
      xhr.onabort = () => reject(Object.assign(new Error('aborted'), { aborted: true }));
      onProgress && onProgress(0);
      xhr.send(file);
    } catch (e) {
      reject(e);
    }
  });
}

const uploadToSupabase = uploadToVKCloud;
const uploadToLocalBackend = uploadToVKCloud;

async function smartUpload(file, onStatus, onProgress, onXhr) {
  onStatus = onStatus || (() => {});
  let up = file;
  if (file.type && file.type.startsWith('image/') && file.size > 3 * 1024 * 1024) {
    onStatus('⏳ Оптимизация...');
    const durl = await compressImage(file, 2 * 1024 * 1024);
    if (durl) {
      const blob = await (await fetch(durl)).blob();
      const base = (file.name || 'image').replace(/\\.[^.]+$/, '') || 'image';
      up = new File([blob], base + '.jpg', { type: 'image/jpeg' });
    }
  }
  const url = await uploadToVKCloud(up, onStatus, onProgress, onXhr);
  onStatus('✅ Готово');
  return { url, via: 'vkcloud' };
}

async function uploadStickerImage(file){
  return await uploadToVKCloud(file, ()=>{}, ()=>{}, ()=>{});
}`;

function patchUploadSection(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }
  let c = fs.readFileSync(filePath, 'utf8');

  // Find start: "// ═══ UPLOAD SYSTEM" or older comments
  let startIdx = c.indexOf('// ═══ UPLOAD SYSTEM');
  if (startIdx < 0) {
    startIdx = c.indexOf('function uploadToVKCloud(');
  }
  if (startIdx < 0) {
    startIdx = c.indexOf('// Файлы грузятся прямо из браузера в Supabase Storage');
  }
  if (startIdx < 0) {
    console.error('Could not find start index in', filePath);
    return;
  }

  // Find end: right before "window._pendingUploads = window._pendingUploads || [];"
  const endMarker = 'window._pendingUploads = window._pendingUploads || [];';
  const endIdx = c.indexOf(endMarker, startIdx);
  if (endIdx < 0) {
    console.error('Could not find endMarker in', filePath);
    return;
  }

  c = c.slice(0, startIdx) + NEW_UPLOAD_CODE + '\n\n' + c.slice(endIdx);
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Successfully patched upload system in:', filePath);
}

patchUploadSection(path.join(__dirname, '..', 'public', 'index.html'));
patchUploadSection(path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html'));
