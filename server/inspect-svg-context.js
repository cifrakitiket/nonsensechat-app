const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Find all elements with SVG and their container IDs/classes
const svgMatches = [...html.matchAll(/<([a-zA-Z0-9_-]+)[^>]*id=["']([^"']+)["'][^>]*>[\s\S]*?<svg[\s\S]*?<\/svg>[\s\S]*?<\/\1>/gi)];
for (const m of svgMatches) {
  console.log('ID:', m[2]);
}

// Find inline SVGs with their surrounding context
const allSvgs = [...html.matchAll(/([\s\S]{0,100}<svg[\s\S]*?<\/svg>[\s\S]{0,50})/gi)].slice(0, 30);
console.log('--- SVGs with context ---');
for (let i = 0; i < allSvgs.length; i++) {
  const clean = allSvgs[i][0].replace(/\s+/g, ' ');
  console.log(`[SVG ${i+1}] ${clean.substring(0, 150)}...`);
}
