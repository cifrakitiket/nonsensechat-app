// server/test-s3-delete.js
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');

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

const testKey = 'test_delete_' + Date.now() + '.txt';
const now = new Date();
const date = now.toISOString().slice(0, 10).replace(/-/g, '');
const datetime = date + 'T' + now.toISOString().slice(11, 19).replace(/:/g, '') + 'Z';

function sign(k, m) { return crypto.createHmac('sha256', k).update(m).digest(); }
const credentialScope = date + '/' + REGION + '/s3/aws4_request';

const content = 'temporary test file for delete verification';
const contentSha = crypto.createHash('sha256').update(content).digest('hex');
const putCanReq = [
  'PUT',
  '/' + BUCKET + '/' + testKey,
  '',
  'host:' + host + '\nx-amz-content-sha256:' + contentSha + '\nx-amz-date:' + datetime + '\n',
  'host;x-amz-content-sha256;x-amz-date',
  contentSha
].join('\n');

const putStr = ['AWS4-HMAC-SHA256', datetime, credentialScope, crypto.createHash('sha256').update(putCanReq).digest('hex')].join('\n');
const kDate = sign('AWS4' + SECRET, date);
const kRegion = sign(kDate, REGION);
const kService = sign(kRegion, 's3');
const kSigning = sign(kService, 'aws4_request');
const putSig = crypto.createHmac('sha256', kSigning).update(putStr).digest('hex');
const putAuth = 'AWS4-HMAC-SHA256 Credential=' + ACCESS + '/' + credentialScope + ', SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=' + putSig;

const putReq = https.request({
  hostname: host,
  path: '/' + BUCKET + '/' + testKey,
  method: 'PUT',
  headers: {
    'Host': host,
    'x-amz-date': datetime,
    'x-amz-content-sha256': contentSha,
    'Authorization': putAuth,
    'Content-Length': Buffer.byteLength(content)
  }
}, (res) => {
  console.log('PUT test status:', res.statusCode);
  if (res.statusCode >= 200 && res.statusCode < 300) {
    console.log('File created, now testing DELETE via presigned URL...');
    const qParams = [
      'X-Amz-Algorithm=AWS4-HMAC-SHA256',
      'X-Amz-Credential=' + encodeURIComponent(ACCESS + '/' + credentialScope),
      'X-Amz-Date=' + datetime,
      'X-Amz-Expires=900',
      'X-Amz-SignedHeaders=host'
    ].sort().join('&');
    const delCanReq = [
      'DELETE',
      '/' + BUCKET + '/' + testKey,
      qParams,
      'host:' + host + '\n',
      'host',
      'UNSIGNED-PAYLOAD'
    ].join('\n');
    const delStr = ['AWS4-HMAC-SHA256', datetime, credentialScope, crypto.createHash('sha256').update(delCanReq).digest('hex')].join('\n');
    const delSig = crypto.createHmac('sha256', kSigning).update(delStr).digest('hex');
    const delUrl = ENDPOINT + '/' + BUCKET + '/' + testKey + '?' + qParams + '&X-Amz-Signature=' + delSig;

    const delReq = https.request(delUrl, { method: 'DELETE' }, (delRes) => {
      console.log('DELETE status:', delRes.statusCode);
      if (delRes.statusCode === 204 || (delRes.statusCode >= 200 && delRes.statusCode < 300)) {
        console.log('SUCCESS: Object was completely deleted from S3 memory!');
      } else {
        let b = ''; delRes.on('data', d => b += d); delRes.on('end', () => console.log('Delete body:', b));
      }
    });
    delReq.end();
  }
});
putReq.write(content);
putReq.end();
