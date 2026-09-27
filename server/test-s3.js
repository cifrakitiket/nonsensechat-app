// test-s3.js — проверка подключения к VK Cloud S3
const fs = require('fs');
const crypto = require('crypto');

// Load .env
for(const line of fs.readFileSync('.env','utf8').split('\n')){
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)/.exec(line.trim());
  if(m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}

const ENDPOINT = process.env.VK_S3_ENDPOINT || 'https://hb.vkcs.cloud';
const BUCKET   = process.env.VK_S3_BUCKET   || 'nonsensechat-uploads';
const ACCESS   = process.env.VK_S3_ACCESS;
const SECRET   = process.env.VK_S3_SECRET;
const REGION   = process.env.VK_S3_REGION   || 'ru-msk';

console.log('Access Key:', ACCESS);
console.log('Bucket:', BUCKET);
console.log('Endpoint:', ENDPOINT);

const now = new Date();
const date = now.toISOString().slice(0,10).replace(/-/g,'');
const datetime = date + 'T' + now.toISOString().slice(11,19).replace(/:/g,'') + 'Z';
const host = new URL(ENDPOINT).host;
const key = 'test/hello.txt';
const encodedKey = encodeURIComponent(key).replace(/%2F/g,'/');
const credentialScope = `${date}/${REGION}/s3/aws4_request`;
const credential = `${ACCESS}/${credentialScope}`;

const queryParams = [
  `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
  `X-Amz-Credential=${encodeURIComponent(credential)}`,
  `X-Amz-Date=${datetime}`,
  `X-Amz-Expires=300`,
  `X-Amz-SignedHeaders=host`,
].sort().join('&');

const canonicalRequest = [
  'PUT',
  `/${BUCKET}/${encodedKey}`,
  queryParams,
  `host:${host}\n`,
  'host',
  'UNSIGNED-PAYLOAD',
].join('\n');

const stringToSign = [
  'AWS4-HMAC-SHA256',
  datetime,
  credentialScope,
  crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
].join('\n');

const sign = (k, m) => crypto.createHmac('sha256', k).update(m).digest();
const signingKey = sign(sign(sign(sign(`AWS4${SECRET}`, date), REGION), 's3'), 'aws4_request');
const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

const uploadUrl = `${ENDPOINT}/${BUCKET}/${encodedKey}?${queryParams}&X-Amz-Signature=${signature}`;
const publicUrl = `${ENDPOINT}/${BUCKET}/${encodedKey}`;

console.log('\nPresigned URL (PUT):');
console.log(uploadUrl.slice(0, 120) + '...');
console.log('\nPublic URL:');
console.log(publicUrl);

// Попробуем реально загрузить маленький тестовый файл
const https = require('https');
const testContent = Buffer.from('NonsenseChat VK Cloud test ' + new Date().toISOString());
const urlObj = new URL(uploadUrl);

console.log('\nUploading test file to VK Cloud S3...');
const req = https.request({
  method: 'PUT',
  hostname: urlObj.hostname,
  path: urlObj.pathname + urlObj.search,
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': testContent.length,
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('SUCCESS! File uploaded. Status:', res.statusCode);
      console.log('Public URL:', publicUrl);
    } else {
      console.error('FAILED. Status:', res.statusCode);
      console.error('Response:', body.slice(0, 500));
    }
  });
});
req.on('error', e => console.error('Network error:', e.message));
req.write(testContent);
req.end();
