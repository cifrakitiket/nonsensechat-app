const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ELECTRON_VERSION = '33.4.11';
const DIST_DIR = path.join(__dirname, 'electron-desktop', 'node_modules', 'electron', 'dist');

// Try GitHub releases first, then mirror
const MIRRORS = [
  `https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/electron-v${ELECTRON_VERSION}-win32-x64.zip`,
  `https://npmmirror.com/mirrors/electron/${ELECTRON_VERSION}/electron-v${ELECTRON_VERSION}-win32-x64.zip`,
  `https://cdn.npmmirror.com/binaries/electron/${ELECTRON_VERSION}/electron-v${ELECTRON_VERSION}-win32-x64.zip`,
];

const ZIP_PATH = path.join(__dirname, 'electron_binary.zip');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log('Downloading:', url);
    const proto = url.startsWith('https://') ? https : http;
    const file = fs.createWriteStream(dest);
    let received = 0;
    let total = 0;

    const req = proto.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error('HTTP ' + res.statusCode));
      }
      total = parseInt(res.headers['content-length'] || '0');
      res.on('data', chunk => {
        received += chunk.length;
        if (total > 0) process.stdout.write(`\r${Math.round(received/1024/1024)}MB / ${Math.round(total/1024/1024)}MB`);
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log('\nDownload complete!'); resolve(); });
    });
    req.on('error', (err) => { file.close(); try { fs.unlinkSync(dest); } catch(_){} reject(err); });
    req.setTimeout(60000, () => { req.destroy(new Error('Timeout')); });
  });
}

async function main() {
  for (const url of MIRRORS) {
    try {
      await downloadFile(url, ZIP_PATH);
      // Unzip
      console.log('Extracting...');
      execSync(`powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${DIST_DIR}' -Force"`, { stdio: 'inherit' });
      fs.unlinkSync(ZIP_PATH);
      // Write path.txt
      fs.writeFileSync(path.join(__dirname, 'electron-desktop', 'node_modules', 'electron', 'path.txt'), 'dist/electron.exe');
      console.log('Electron binary installed at:', path.join(DIST_DIR, 'electron.exe'));
      const exists = fs.existsSync(path.join(DIST_DIR, 'electron.exe'));
      console.log('electron.exe exists?', exists);
      return;
    } catch (err) {
      console.error('Mirror failed:', err.message, 'trying next...');
    }
  }
  console.error('All mirrors failed!');
  process.exit(1);
}

main();
