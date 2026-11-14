const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Locate rogue CSS block in script
const rogueStart = '/* ═══ TELEGRAM-STYLE NOTIFICATIONS ═══ */';
const rogueEndCRLF = 'to { width: 0%; }\r\n    }';
const rogueEndLF = 'to { width: 0%; }\n    }';

const idxStart = content.indexOf(rogueStart);
if (idxStart === -1) {
  console.log('Rogue block not found!');
  process.exit(1);
}

let idxEnd = content.indexOf(rogueEndCRLF, idxStart);
let endLen = rogueEndCRLF.length;
if (idxEnd === -1) {
  idxEnd = content.indexOf(rogueEndLF, idxStart);
  endLen = rogueEndLF.length;
}

if (idxEnd === -1) {
  console.log('Rogue block end not found!');
  process.exit(1);
}

// Remove rogue CSS from <script>
content = content.slice(0, idxStart) + content.slice(idxEnd + endLen);
console.log('✓ Removed rogue CSS from <script> tag');

// 2. Ensure .app-toast::after and @keyframes tgToastProgress are safely in <style>
const tgToastAnimCss = `
    .app-toast::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2.5px;
      width: 100%;
      background: var(--grad);
      animation: tgToastProgress 4.5s linear forwards;
    }

    @keyframes tgToastProgress {
      from { width: 100%; }
      to { width: 0%; }
    }
`;

if (!content.includes('tgToastProgress')) {
  const toastInfoTarget = '.app-toast.toast-info {';
  const idxToastInfo = content.indexOf(toastInfoTarget);
  if (idxToastInfo !== -1) {
    const closeBrace = content.indexOf('}', idxToastInfo);
    if (closeBrace !== -1) {
      content = content.slice(0, closeBrace + 1) + '\n' + tgToastAnimCss + content.slice(closeBrace + 1);
      console.log('✓ Added tgToastProgress animation to <style>');
    }
  }
}

// 3. Verify all <script> blocks are valid syntax
const scriptMatches = [...content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
let allValid = true;
for (let i = 0; i < scriptMatches.length; i++) {
  if (scriptMatches[i][0].includes('application/ld+json')) continue;
  try {
    new Function(scriptMatches[i][1]);
  } catch (err) {
    console.error(`❌ Script ${i} syntax error:`, err.message);
    allValid = false;
  }
}

if (allValid) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Successfully wrote fixed public/index.html');
  console.log('✓ All scripts validated without syntax errors!');
} else {
  console.error('❌ Aborting write due to syntax errors');
  process.exit(1);
}
