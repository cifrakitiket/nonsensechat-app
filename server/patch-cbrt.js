const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const calcStartMarker = 'function calcEval(expr) {';
const calcStart = html.indexOf(calcStartMarker);
const fmtCalcMarker = 'function fmtCalcNum(n) {';
const calcEnd = html.indexOf(fmtCalcMarker, calcStart);

if (calcStart === -1 || calcEnd === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const newCalcEval = `function calcEval(expr) {
      let raw = (expr || '').toLowerCase()
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/:/g, '/');

      // 1. Unicode root symbols (∛ is cube root \\u221B, √ is square root \\u221A)
      raw = raw.replace(/∛\\s*\\(/g, 'cbrt(');
      raw = raw.replace(/∛\\s*(-?\\d+(?:[.,]\\d+)?)/g, 'cbrt($1)');
      raw = raw.replace(/3\\s*√\\s*\\(/g, 'cbrt(');
      raw = raw.replace(/3\\s*√\\s*(-?\\d+(?:[.,]\\d+)?)/g, 'cbrt($1)');
      raw = raw.replace(/√\\s*\\(/g, 'root(');
      raw = raw.replace(/√\\s*(-?\\d+(?:[.,]\\d+)?)/g, 'root($1)');

      // 2. Russian natural wording
      raw = raw.replace(/кубический\\s*корень\\s*(?:из)?\\s*\\(/gi, 'cbrt(')
               .replace(/кубический\\s*корень\\s*(?:из)?\\s*(-?\\d+(?:[.,]\\d+)?)/gi, 'cbrt($1)')
               .replace(/кубкорень\\s*(?:из)?\\s*\\(/gi, 'cbrt(')
               .replace(/кубкорень\\s*(?:из)?\\s*(-?\\d+(?:[.,]\\d+)?)/gi, 'cbrt($1)')
               .replace(/куб\\.?\\s*корень\\s*(?:из)?\\s*\\(/gi, 'cbrt(')
               .replace(/куб\\.?\\s*корень\\s*(?:из)?\\s*(-?\\d+(?:[.,]\\d+)?)/gi, 'cbrt($1)')
               .replace(/корень\\s*3\\s*(?:-?\\s*(?:ей|ой|й))?\\s*степени\\s*(?:из)?\\s*\\(/gi, 'cbrt(')
               .replace(/корень\\s*3\\s*(?:-?\\s*(?:ей|ой|й))?\\s*степени\\s*(?:из)?\\s*(-?\\d+(?:[.,]\\d+)?)/gi, 'cbrt($1)')
               .replace(/корень\\s*(?:из)?\\s*\\(/gi, 'root(')
               .replace(/корень\\s*(?:из)?\\s*(-?\\d+(?:[.,]\\d+)?)/gi, 'root($1)');

      // 3. Aliases
      raw = raw.replace(/root3\\s*\\(/gi, 'cbrt(')
               .replace(/root3\\s+(-?\\d+(?:[.,]\\d+)?)/gi, 'cbrt($1)')
               .replace(/cbroot\\s*\\(/gi, 'cbrt(')
               .replace(/cbroot\\s+(-?\\d+(?:[.,]\\d+)?)/gi, 'cbrt($1)')
               .replace(/croot\\s*\\(/gi, 'cbrt(')
               .replace(/croot\\s+(-?\\d+(?:[.,]\\d+)?)/gi, 'cbrt($1)')
               .replace(/cbrt\\s+(-?\\d+(?:[.,]\\d+)?)/gi, 'cbrt($1)')
               .replace(/root\\s+(-?\\d+(?:[.,]\\d+)?)/gi, 'root($1)');

      // 4. Two-argument form: root(expr, 3) or root(expr; 3) => cbrt(expr)
      while (/root\\s*\\(\\s*(.+?)\\s*[,;]\\s*3\\s*\\)/i.test(raw)) {
        raw = raw.replace(/root\\s*\\(\\s*(.+?)\\s*[,;]\\s*3\\s*\\)/gi, 'cbrt($1)');
      }
      while (/root\\s*\\(\\s*(.+?)\\s*[,;]\\s*2\\s*\\)/i.test(raw)) {
        raw = raw.replace(/root\\s*\\(\\s*(.+?)\\s*[,;]\\s*2\\s*\\)/gi, 'root($1)');
      }

      // 5. Convert decimal commas to dots and remove spaces
      const s = raw.replace(/,/g, '.').replace(/\\s+/g, '');

      if (!s || !/\\d/.test(s)) return null;
      if (!/^[\\d.+\\-*/()%^a-z]+$/.test(s)) return null;
      // Must contain an operator (+, -, *, /, %, ^) or function (root, sqrt, cbrt)
      if (!/[+\\-*/%^]|root\\(|sqrt\\(|cbrt\\(/.test(s)) return null;

      let i = 0;
      function parseExpr() {
        let v = parseTerm();
        while (i < s.length && (s[i] === '+' || s[i] === '-')) {
          const op = s[i++];
          const r = parseTerm();
          v = op === '+' ? v + r : v - r;
        }
        return v;
      }
      function parseTerm() {
        let v = parseFactor();
        while (i < s.length && (s[i] === '*' || s[i] === '/' || s[i] === '%')) {
          const op = s[i++];
          const r = parseFactor();
          if (op === '*') v = v * r;
          else if (op === '/') v = v / r;
          else v = v % r;
        }
        return v;
      }
      function parseFactor() {
        let v = parseUnary();
        if (i < s.length && s[i] === '^') {
          i++;
          const r = parseFactor();
          v = Math.pow(v, r);
        }
        return v;
      }
      function parseUnary() {
        if (s[i] === '-') { i++; return -parseUnary(); }
        if (s[i] === '+') { i++; return parseUnary(); }
        return parseAtom();
      }
      function parseAtom() {
        // Кубический корень: число, которое при умножении на себя 3 раза дает подкоренное число (Math.cbrt)
        // cbrt(27) = 3, cbrt(-27) = -3, cbrt(8) = 2, cbrt(125) = 5
        if (s.startsWith('cbrt(', i)) {
          i += 5;
          const v = parseExpr();
          if (s[i] !== ')') throw 0;
          i++;
          return Math.cbrt(v);
        }
        // Квадратный корень
        if (s.startsWith('root(', i)) {
          i += 5;
          const v = parseExpr();
          if (s[i] !== ')') throw 0;
          i++;
          if (v < 0) throw 0;
          return Math.sqrt(v);
        }
        if (s.startsWith('sqrt(', i)) {
          i += 5;
          const v = parseExpr();
          if (s[i] !== ')') throw 0;
          i++;
          if (v < 0) throw 0;
          return Math.sqrt(v);
        }
        if (s[i] === '(') {
          i++;
          const v = parseExpr();
          if (s[i] !== ')') throw 0;
          i++;
          return v;
        }
        const m = /^\\d*\\.?\\d+/.exec(s.slice(i));
        if (!m) throw 0;
        i += m[0].length;
        return parseFloat(m[0]);
      }

      try {
        const v = parseExpr();
        if (i !== s.length) return null;
        if (typeof v !== 'number' || !isFinite(v)) return null;
        return v;
      } catch (e) {
        return null;
      }
    }
    `;

html = html.slice(0, calcStart) + newCalcEval + html.slice(calcEnd);
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated calcEval with cubic roots in public/index.html');
