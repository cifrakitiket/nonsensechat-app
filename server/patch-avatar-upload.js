const fs = require('fs');
const path = 'd:/messenger/public/index.html';

let content = fs.readFileSync(path, 'utf8');

// 1. Guard getVKCS3PresignedUrl against invalid VK_S3_CONFIG.endpoint
const oldPresignStart = `    async function getVKCS3PresignedUrl(fileName, contentType, uid) {
      const subtle = window.crypto && window.crypto.subtle;`;

const newPresignStart = `    async function getVKCS3PresignedUrl(fileName, contentType, uid) {
      if (!VK_S3_CONFIG || !VK_S3_CONFIG.endpoint || !VK_S3_CONFIG.endpoint.startsWith('http') || VK_S3_CONFIG.endpoint.includes('__')) {
        throw new Error('VK Cloud S3 endpoint is not configured');
      }
      const subtle = window.crypto && window.crypto.subtle;`;

if (content.includes(oldPresignStart)) {
  content = content.replace(oldPresignStart, newPresignStart);
  console.log('✓ Guarded getVKCS3PresignedUrl against invalid S3 endpoint');
} else {
  console.log('⚠ Could not match oldPresignStart, trying regex');
  const presignRegex = /async function getVKCS3PresignedUrl\(fileName,\s*contentType,\s*uid\)\s*\{\s*const subtle = window\.crypto && window\.crypto\.subtle;/;
  if (presignRegex.test(content)) {
    content = content.replace(presignRegex, newPresignStart.trim());
    console.log('✓ Guarded getVKCS3PresignedUrl via regex');
  }
}

// 2. Add fileToCompressedDataUrl helper and update handleAvaUpload
const oldHandleAvaRegex = /\/\*\s*\s*\?\s*\?\s*\? AVATAR UPLOAD FROM FILE[\s\S]*?async function handleAvaUpload\(prefix\)[\s\S]*?if \(input\) input\.value = '';\s*\}/;

const newHandleAvaCode = `    /* ─── AVATAR UPLOAD & COMPRESSION ─── */
    async function fileToCompressedDataUrl(file, maxDim = 256, quality = 0.85) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(file);
      });
    }

    async function handleAvaUpload(prefix) {
      const input = document.getElementById(prefix + 'AvaFile');
      const file = input?.files?.[0];
      if (!file) return;

      const MAX = 10 * 1024 * 1024;
      if (file.size > MAX) {
        showToast('Файл слишком большой', 'Максимальный размер фото 10МБ', 'warning');
        return;
      }

      const imgEl = document.getElementById(prefix + 'Ava');
      const urlEl = document.getElementById(prefix + 'AvaUrl');

      if (urlEl) { urlEl.value = 'Сжатие и обработка...'; urlEl.disabled = true; }

      try {
        // Compress avatar directly to optimized 256x256 JPEG base64 dataUrl
        const dataUrl = await fileToCompressedDataUrl(file, 256, 0.85);

        let finalUrl = dataUrl;
        // If S3 is actually configured with a real endpoint, optionally try uploading there
        const s3Ready = VK_S3_CONFIG && VK_S3_CONFIG.endpoint && VK_S3_CONFIG.endpoint.startsWith('http') && !VK_S3_CONFIG.endpoint.includes('__');
        if (s3Ready) {
          try {
            const { url } = await smartUpload(file, status => { if (urlEl) urlEl.value = status; });
            if (url) finalUrl = url;
          } catch (s3Err) {
            console.warn('S3 upload not available, using high-speed inline dataUrl:', s3Err);
          }
        }

        if (urlEl) { urlEl.value = finalUrl; urlEl.disabled = false; }
        if (imgEl) imgEl.src = finalUrl;
        showToast('Успешно', 'Аватар готов! Не забудьте нажать «Сохранить».', 'success');
      } catch (e) {
        if (urlEl) { urlEl.value = ''; urlEl.disabled = false; }
        showToast('Ошибка загрузки', 'Не удалось загрузить аватар: ' + (e && e.message ? e.message : e), 'error');
        if (imgEl) imgEl.src = '';
      }
      if (input) input.value = '';
    }`;

if (new RegExp(oldHandleAvaRegex).test(content)) {
  content = content.replace(oldHandleAvaRegex, newHandleAvaCode);
  console.log('✓ Replaced handleAvaUpload with safe, high-speed compressor');
} else {
  console.log('⚠ Could not match oldHandleAvaRegex, trying simple handleAvaUpload replace');
  const simpleAvaRegex = /async function handleAvaUpload\(prefix\)\s*\{[\s\S]*?if \(input\) input\.value = '';\s*\}/;
  if (simpleAvaRegex.test(content)) {
    content = content.replace(simpleAvaRegex, newHandleAvaCode);
    console.log('✓ Replaced handleAvaUpload via simple regex');
  } else {
    console.error('❌ Failed to replace handleAvaUpload');
  }
}

// 3. Update smartUpload fallback for general images
const oldSmartUpload = `      const url = await uploadToVKCloud(up, onStatus, onProgress, onXhr);
      onStatus('✓ Готово');
      return { url, via: 'vkcloud' };`;

const newSmartUpload = `      const s3Ready = VK_S3_CONFIG && VK_S3_CONFIG.endpoint && VK_S3_CONFIG.endpoint.startsWith('http') && !VK_S3_CONFIG.endpoint.includes('__');
      if (!s3Ready) {
        if (file.type && file.type.startsWith('image/')) {
          onStatus('Сжатие изображения...');
          const durl = await fileToCompressedDataUrl(file, 1024, 0.85);
          onStatus('✓ Готово');
          return { url: durl, via: 'inline' };
        }
      }
      const url = await uploadToVKCloud(up, onStatus, onProgress, onXhr);
      onStatus('✓ Готово');
      return { url, via: 'vkcloud' };`;

if (content.includes(oldSmartUpload)) {
  content = content.replace(oldSmartUpload, newSmartUpload);
  console.log('✓ Updated smartUpload with graceful S3 fallback');
} else {
  console.log('⚠ Could not find oldSmartUpload directly, checking regex');
  const smartRegex = /const url = await uploadToVKCloud\(up,\s*onStatus,\s*onProgress,\s*onXhr\);[\s\S]*?return \{ url,\s*via: 'vkcloud' \};/;
  if (smartRegex.test(content)) {
    content = content.replace(smartRegex, newSmartUpload);
    console.log('✓ Updated smartUpload via regex');
  }
}

// 4. Update saveMyProfile to ensure avatar is never missed
const oldSaveAvaLine = `avatar: document.getElementById('mpAvaUrl').value.trim(),`;
const newSaveAvaLine = `avatar: document.getElementById('mpAvaUrl').value.trim() || ((document.getElementById('mpAva') && document.getElementById('mpAva').src && document.getElementById('mpAva').src.startsWith('data:')) ? document.getElementById('mpAva').src : ''),`;

if (content.includes(oldSaveAvaLine)) {
  content = content.replace(oldSaveAvaLine, newSaveAvaLine);
  console.log('✓ Enhanced saveMyProfile avatar extraction');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done patching avatar upload');
