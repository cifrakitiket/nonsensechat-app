// server/test-client-s3.js
const fs = require('fs');

// Load .env
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function testSign() {
  const subtle = crypto.subtle;
  const ENDPOINT = process.env.VK_S3_ENDPOINT || 'https://hb.vkcs.cloud';
  const BUCKET = process.env.VK_S3_BUCKET || 'noname';
  const ACCESS = process.env.VK_S3_ACCESS;
  const SECRET = process.env.VK_S3_SECRET;
  const REGION = process.env.VK_S3_REGION || 'ru-msk';
  
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
  const host = new URL(ENDPOINT).host;
  const key = 'test/client-sign-' + Date.now() + '.txt';
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');

  const credentialScope = `${date}/${REGION}/s3/aws4_request`;
  const credential = `${ACCESS}/${credentialScope}`;

  const queryParams = [
    'X-Amz-Algorithm=AWS4-HMAC-SHA256',
    'X-Amz-Credential=' + encodeURIComponent(credential),
    'X-Amz-Date=' + datetime,
    'X-Amz-Expires=300',
    'X-Amz-SignedHeaders=host'
  ].sort().join('&');

  const canonicalRequest = [
    'PUT',
    '/' + BUCKET + '/' + encodedKey,
    queryParams,
    'host:' + host + '\n',
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\n');

  const kDate = await hmac(enc.encode('AWS4' + SECRET), date);
  const kRegion = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const sigBuf = await hmac(kSigning, stringToSign);
  const signature = Array.from(sigBuf).map(b => b.toString(16).padStart(2, '0')).join('');

  const uploadUrl = `${ENDPOINT}/${BUCKET}/${encodedKey}?${queryParams}&X-Amz-Signature=${signature}`;
  const publicUrl = `${ENDPOINT}/${BUCKET}/${encodedKey}`;

  console.log('Upload URL generated:', uploadUrl.slice(0, 90) + '...');
  
  // Test upload via fetch
  const res = await fetch(uploadUrl, { method: 'PUT', body: 'WebCrypto client signature test!' });
  console.log('Upload HTTP status:', res.status);
  console.log('Public URL:', publicUrl);
}

testSign().catch(console.error);
