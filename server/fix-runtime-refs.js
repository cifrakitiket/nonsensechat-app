// server/fix-runtime-refs.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Fix tgpOpen in setLanguage
  code = code.replace(
    /if \(typeof tgpOpen !== 'undefined' && tgpOpen && typeof renderTgpBody === 'function'\) \{[\s\S]*?renderTgpFoot\(\);\s*\}/,
    `try {
        if (typeof window.tgpOpen !== 'undefined' && window.tgpOpen && typeof renderTgpBody === 'function') {
          renderTgpBody();
          if (typeof renderTgpFoot === 'function') renderTgpFoot();
        }
      } catch (_) {}`
  );

  // 2. Fix tgpOpen declaration (var instead of let, and export to window)
  code = code.replace(
    "let tgpMode='emoji', tgpOpen=false, tgpGifTimer=null, tgpGifQuery='';",
    "var tgpMode='emoji', tgpOpen=false, tgpGifTimer=null, tgpGifQuery=''; window.tgpOpen = false;"
  );

  // 3. Fix myCallChatId declaration (var and export to window)
  code = code.replace(
    "let myCallChatId   = null;",
    "var myCallChatId   = null; window.myCallChatId = null;"
  );

  // 4. Fix generateCallLink
  code = code.replace(
    "const chatId = myCallChatId || activeId;",
    "const chatId = (typeof myCallChatId !== 'undefined' ? myCallChatId : (window.myCallChatId || null)) || (typeof activeId !== 'undefined' ? activeId : null);"
  );

  // 5. Validate scripts syntax
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptCount = 0;
  while ((match = scriptRegex.exec(code)) !== null) {
    const scriptBody = match[1];
    scriptCount++;
    try {
      new vm.Script(scriptBody);
    } catch (e) {
      console.error(`Syntax error in script #${scriptCount} of ${filePath}:`, e.message);
      process.exit(1);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✓ Fixed runtime references in ${filePath} (${scriptCount} scripts valid)`);
}
console.log('All runtime references fixed successfully!');
