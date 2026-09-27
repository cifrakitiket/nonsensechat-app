// server/set-cors.js
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// Load .env
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const ENDPOINT = process.env.VK_S3_ENDPOINT || 'https://hb.vkcs.cloud';
const BUCKET = process.env.VK_S3_BUCKET || 'noname';
const ACCESS = process.env.VK_S3_ACCESS;
const SECRET = process.env.VK_S3_SECRET;
const REGION = process.env.VK_S3_REGION || 'ru-msk';
const host = new URL(ENDPOINT).host;

console.log('Target bucket:', BUCKET);
console.log('Host:', host);

const corsXml = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>x-amz-request-id</ExposeHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

const md5 = crypto.createHash('md5').update(corsXml).digest('base64');
const sha256 = crypto.createHash('sha256').update(corsXml).digest('hex');

const now = new Date();
const date = now.toISOString().slice(0, 10).replace(/-/g, '');
const datetime = date + 'T' + now.toISOString().slice(11, 19).replace(/:/g, '') + 'Z';

const canonicalUri = `/${BUCKET}/`;
const canonicalQuery = 'cors=';

const canonicalHeaders = `content-md5:${md5}\ncontent-type:application/xml\nhost:${host}\nx-amz-content-sha256:${sha256}\nx-amz-date:${datetime}\n`;
const signedHeaders = 'content-md5;content-type;host;x-amz-content-sha256;x-amz-date';

const canonicalRequest = [
  'PUT',
  canonicalUri,
  canonicalQuery,
  canonicalHeaders,
  signedHeaders,
  sha256
].join('\n');

const credentialScope = `${date}/${REGION}/s3/aws4_request`;
const stringToSign = [
  'AWS4-HMAC-SHA256',
  datetime,
  credentialScope,
  crypto.createHash('sha256').update(canonicalRequest).digest('hex')
].join('\n');

const sign = (k, m) => crypto.createHmac('sha256', k).update(m).digest();
const kDate = sign('AWS4' + SECRET, date);
const kRegion = sign(kDate, REGION);
const kService = sign(kRegion, 's3');
const kSigning = sign(kService, 'aws4_request');
const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

const authHeader = `AWS4-HMAC-SHA256 Credential=${ACCESS}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

const req = https.request({
  hostname: host,
  path: `/${BUCKET}/?cors`,
  method: 'PUT',
  headers: {
    'Host': host,
    'x-amz-date': datetime,
    'x-amz-content-sha256': sha256,
    'Content-Type': 'application/xml',
    'Content-MD5': md5,
    'Content-Length': Buffer.byteLength(corsXml),
    'Authorization': authHeader
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Set CORS HTTP status:', res.statusCode);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('CORS successfully configured on bucket:', BUCKET);
    } else {
      console.log('Response body:', body);
    }
  });
});
req.on('error', e => console.error('Error:', e));
req.write(corsXml);
req.end();
