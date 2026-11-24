const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VK_S3_CONFIG = {
  endpoint: 'https://hb.vkcs.cloud',
  bucket: 'noname',
  region: 'ru-msk',
  access: 'w1Vgn81mT6nkLJMrsA4C6f',
  secret: 'ceXVQHnATaisViK32aKJ3X6NCwZ82yRGHD4Z2tQ2yCd6'
};

function hmac(key, str) {
  return crypto.createHmac('sha256', key).update(str, 'utf8').digest();
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function uploadFileToS3(key, data, contentType) {
  const host = new URL(VK_S3_CONFIG.endpoint).host;
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const datetime = date + 'T' + now.toISOString().slice(11, 19).replace(/:/g, '') + 'Z';

  const payloadHash = sha256(data);
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
  const path = '/' + VK_S3_CONFIG.bucket + '/' + encodedKey;

  const credentialScope = date + '/' + VK_S3_CONFIG.region + '/s3/aws4_request';

  const canonicalHeaders =
    'host:' + host + '\n' +
    'x-amz-content-sha256:' + payloadHash + '\n' +
    'x-amz-date:' + datetime + '\n';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    credentialScope,
    sha256(Buffer.from(canonicalRequest, 'utf8'))
  ].join('\n');

  const kDate = hmac('AWS4' + VK_S3_CONFIG.secret, date);
  const kRegion = hmac(kDate, VK_S3_CONFIG.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorization =
    'AWS4-HMAC-SHA256 ' +
    'Credential=' + VK_S3_CONFIG.access + '/' + credentialScope + ', ' +
    'SignedHeaders=' + signedHeaders + ', ' +
    'Signature=' + signature;

  const url = VK_S3_CONFIG.endpoint + path;
  console.log(`[S3 Upload] Uploading ${key} (${(data.length / (1024 * 1024)).toFixed(2)} MB) to: ${url}`);

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Host': host,
      'Content-Type': contentType,
      'Content-Length': String(data.length),
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': datetime,
      'Authorization': authorization
    },
    body: data
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`S3 upload failed ${res.status}: ${text}`);
  }
  console.log(`[S3 Upload] Success! ${key} is available at: ${url}`);
  return url;
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const apkPath = fs.existsSync(path.join(rootDir, 'NonsenseChat.apk'))
    ? path.join(rootDir, 'NonsenseChat.apk')
    : path.join(rootDir, 'react-native-android', 'nonsense-chat.apk');

  if (!fs.existsSync(apkPath)) {
    console.error('ERROR: APK file not found at:', apkPath);
    process.exit(1);
  }

  const apkStats = fs.statSync(apkPath);
  console.log(`Found APK: ${apkPath} (${(apkStats.size / (1024 * 1024)).toFixed(2)} MB)`);

  let version = '2.9.6';
  let versionCode = 0;
  try {
    const gradlePath = path.join(rootDir, 'react-native-android', 'android', 'app', 'build.gradle');
    if (fs.existsSync(gradlePath)) {
      const gradleTxt = fs.readFileSync(gradlePath, 'utf8');
      const vnMatch = gradleTxt.match(/versionName\s+"([^"]+)"/);
      const vcMatch = gradleTxt.match(/versionCode\s+(\d+)/);
      if (vnMatch && vnMatch[1]) version = vnMatch[1].trim();
      if (vcMatch && vcMatch[1]) versionCode = parseInt(vcMatch[1], 10) || 0;
    }
  } catch (_) {}

  if (!versionCode) {
    try {
      const vJsonPath = path.join(rootDir, 'public', 'version.json');
      if (fs.existsSync(vJsonPath)) {
        const vData = JSON.parse(fs.readFileSync(vJsonPath, 'utf8'));
        if (vData && vData.v) version = String(vData.v).trim();
      }
    } catch (_) {}
    const codeDigits = version.replace(/[^0-9]/g, '');
    versionCode = parseInt(codeDigits, 10) || 296;
  }

  const rawArg = process.argv.slice(2).join(' ').trim();
  const isVersionArg = /^\d+(\.\d+)*$/.test(rawArg);
  const customNotes = isVersionArg ? '' : rawArg;
  const releaseNotes = customNotes || [
    '• 📱 Полная адаптивность: оптимизация интерфейса под любые экраны мобильных устройств Android',
    '• 🛡️ Поддержка Safe Area: корректные отступы для вырезов экранов, чёлок и системной шторки',
    '• 🎯 Улучшенное сенсорное управление: минимальный размер интерактивных элементов от 44px для удобства одной рукой',
    '• 🔔 Нативные системные уведомления в шторку Android и фоновые push-сообщения',
    '• 💬 Плавная типографика, масштабирование текста и быстрый отклик сообщений',
    '• ⚡ Повышена общая производительность, плавность анимаций и стабильность соединения'
  ].join('\n');

  const apkVersionData = {
    version: version,
    versionCode: versionCode,
    apkUrl: 'https://hb.vkcs.cloud/noname/nonsensechat.apk',
    fileName: 'nonsensechat.apk',
    fileSize: apkStats.size,
    publishedAt: new Date().toISOString(),
    releaseNotes: releaseNotes
  };

  // 1. Upload APK
  console.log('Reading APK into buffer...');
  const apkBuffer = fs.readFileSync(apkPath);
  await uploadFileToS3('nonsensechat.apk', apkBuffer, 'application/vnd.android.package-archive');

  // 2. Upload apk-version.json to S3
  const versionJsonBuffer = Buffer.from(JSON.stringify(apkVersionData, null, 2), 'utf8');
  await uploadFileToS3('apk-version.json', versionJsonBuffer, 'application/json');

  // 3. Save apk-version.json locally to public/ for hosting fallback
  fs.writeFileSync(path.join(rootDir, 'public', 'apk-version.json'), versionJsonBuffer);
  console.log('Saved public/apk-version.json');

  console.log('\n=========================================');
  console.log('🎉 APK & RELEASE METADATA UPLOADED TO VK CLOUD S3!');
  console.log('Direct APK download: https://hb.vkcs.cloud/noname/nonsensechat.apk');
  console.log('Version info JSON:   https://hb.vkcs.cloud/noname/apk-version.json');
  console.log('=========================================\n');
}

main().catch(err => {
  console.error('Fatal error during APK upload:', err);
  process.exit(1);
});
