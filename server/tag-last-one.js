// server/tag-last-one.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

for (const filePath of targets) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace Razvernut
  code = code.replace(
    /polyline points="18 15 12 9 6 15"\/><\/svg>\s*Развернуть\s*<\/button>/g,
    'polyline points="18 15 12 9 6 15"/></svg> <span data-i18n="expand">Развернуть</span></button>'
  );

  // Validate scripts
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let scriptCount = 0;
  while ((m = scriptRegex.exec(code)) !== null) {
    scriptCount++;
    if (m[1].trim()) {
      try {
        new vm.Script(m[1].trim());
      } catch (err) {
        console.error(`Syntax error in script #${scriptCount} of ${filePath}:`, err.stack || err.message);
        process.exit(1);
      }
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✓ Replaced last element in ${filePath}`);
}
