const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const exe = path.join(root, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const command = process.argv.includes('migrate') ? 'migrate' : 'serve';
const host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
const port = process.env.PORT || '8090';

if (!require('fs').existsSync(exe)) {
  console.error(`PocketBase binary not found: ${exe}`);
  console.error('Download PocketBase and place the executable in the project root.');
  process.exit(1);
}

const args = command === 'migrate'
  ? ['migrate', 'up']
  : ['serve', `--http=${host}:${port}`, '--publicDir=public'];

const child = spawn(exe, args, {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true
});

child.on('error', (error) => {
  console.error(`Failed to start PocketBase: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code == null ? 1 : code);
});
