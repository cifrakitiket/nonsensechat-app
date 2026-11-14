const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const moduleCode = fs.readFileSync(path.join(__dirname, 'ai-hub-module.js'), 'utf8');
const jsPartIdx = moduleCode.indexOf('const AI_HUB_JS = `');
const jsStart = jsPartIdx + 'const AI_HUB_JS = `'.length;
const jsEnd = moduleCode.lastIndexOf('`;');
const jsCode = moduleCode.slice(jsStart, jsEnd);

const fmtCalcMarker = 'function fmtCalcNum(n) {';
const fmtCalcIdx = html.indexOf(fmtCalcMarker);

if (fmtCalcIdx === -1) {
  console.error('Cannot find fmtCalcNum marker!');
  process.exit(1);
}

if (!html.includes('function getAiQuickMatch(')) {
  html = html.slice(0, fmtCalcIdx) + jsCode + '\n\n    ' + html.slice(fmtCalcIdx);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Successfully injected AI_HUB_JS before fmtCalcNum!');
} else {
  console.log('AI_HUB_JS already injected!');
}
