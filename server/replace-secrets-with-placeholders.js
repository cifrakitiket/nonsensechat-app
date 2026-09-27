// server/replace-secrets-with-placeholders.js
// Replaces all hardcoded secrets in public/index.html and electron-desktop/public/index.html
// with placeholder comments so the repo doesn't expose credentials.
const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

// ─── PLACEHOLDER VALUES ───────────────────────────────────────────────────────
// Replace these with your real values before running locally.
// NEVER commit real keys back to the repository.

const FIREBASE_PLACEHOLDER = {
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: '__FIREBASE_AUTH_DOMAIN__',
  databaseURL: '__FIREBASE_DATABASE_URL__',
  projectId: '__FIREBASE_PROJECT_ID__',
  storageBucket: '__FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__FIREBASE_SENDER_ID__',
  appId: '__FIREBASE_APP_ID__',
  measurementId: '__FIREBASE_MEASUREMENT_ID__'
};

const VK_PLACEHOLDER = {
  endpoint: '__VK_S3_ENDPOINT__',
  bucket: '__VK_S3_BUCKET__',
  region: '__VK_S3_REGION__',
  access: '__VK_S3_ACCESS_KEY__',
  secret: '__VK_S3_SECRET_KEY__'
};

// ─── REAL VALUES (fill in here for local dev, never commit) ──────────────────
// const REAL_FIREBASE = { apiKey: 'AIzaSy...', ... };
// const REAL_VK = { endpoint: 'https://hb.vkcs.cloud', bucket: 'noname', ... };

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) { console.log('Not found:', filePath); continue; }
  let code = fs.readFileSync(filePath, 'utf8');

  // ── Firebase config ──────────────────────────────────────────────────────
  const firebaseRegex = /const firebaseConfig\s*=\s*\{[\s\S]*?\};/;
  const firebaseReplacement = `const firebaseConfig = {
      apiKey: "${FIREBASE_PLACEHOLDER.apiKey}",
      authDomain: "${FIREBASE_PLACEHOLDER.authDomain}",
      databaseURL: "${FIREBASE_PLACEHOLDER.databaseURL}",
      projectId: "${FIREBASE_PLACEHOLDER.projectId}",
      storageBucket: "${FIREBASE_PLACEHOLDER.storageBucket}",
      messagingSenderId: "${FIREBASE_PLACEHOLDER.messagingSenderId}",
      appId: "${FIREBASE_PLACEHOLDER.appId}",
      measurementId: "${FIREBASE_PLACEHOLDER.measurementId}"
    };`;

  if (firebaseRegex.test(code)) {
    code = code.replace(firebaseRegex, firebaseReplacement);
    console.log(`✓ Firebase config replaced in ${path.basename(filePath)}`);
  } else {
    console.warn(`⚠ Firebase config not found in ${path.basename(filePath)}`);
  }

  // ── VK Cloud S3 config ───────────────────────────────────────────────────
  const vkRegex = /const VK_S3_CONFIG\s*=\s*\{[\s\S]*?\};/;
  const vkReplacement = `const VK_S3_CONFIG = {
      endpoint: '${VK_PLACEHOLDER.endpoint}',
      bucket: '${VK_PLACEHOLDER.bucket}',
      region: '${VK_PLACEHOLDER.region}',
      access: '${VK_PLACEHOLDER.access}',
      secret: '${VK_PLACEHOLDER.secret}'
    };`;

  if (vkRegex.test(code)) {
    code = code.replace(vkRegex, vkReplacement);
    console.log(`✓ VK S3 config replaced in ${path.basename(filePath)}`);
  } else {
    console.warn(`⚠ VK S3 config not found in ${path.basename(filePath)}`);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✓ Saved ${path.basename(filePath)}`);
}

console.log('\nDone. All secrets replaced with placeholders.');
console.log('Remember: fill in real values locally but NEVER commit them.');
