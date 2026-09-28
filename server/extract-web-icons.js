const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Find all SVG icons in public/index.html
const svgs = [...html.matchAll(/<svg[\s\S]*?<\/svg>/gi)].map(m => m[0]);
console.log('Total SVG elements in index.html:', svgs.length);

// Extract unique SVG shapes, viewBox, path data
const icons = [];
for (const svg of svgs) {
  const vb = svg.match(/viewBox=["']([^"']+)["']/i);
  const paths = [...svg.matchAll(/<path[^>]*d=["']([^"']+)["'][^>]*>/gi)].map(p => p[1]);
  const parent = svg.substring(0, 100);
  if (paths.length > 0) {
    icons.push({ viewBox: vb ? vb[1] : '0 0 24 24', paths: paths.slice(0, 3) });
  }
}
console.log('Extracted unique icons count:', icons.length);

// Also look for emoji or icon classes
const iconClasses = [...html.matchAll(/class=["']([^"']*(?:icon|btn|svg|badge)[^"']*)["']/gi)].map(m => m[1]);
console.log('Sample icon classes:', [...new Set(iconClasses)].slice(0, 30));
