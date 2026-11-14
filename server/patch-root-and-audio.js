const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const calcStartMarker = 'function calcEval(expr) {';
const calcStart = html.indexOf(calcStartMarker);
const fmtCalcMarker = 'function fmtCalcNum(n) {';
const calcEnd = html.indexOf(fmtCalcMarker, calcStart);

const newCalcEval = `function calcEval(expr) {
      const s = (expr || '').toLowerCase()
        .replace(/,/g, '.')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/:/g, '/')
        .split('корень(').join('root(')
        .replace(/\\s+/g, '');

      if (!s || !/\\d/.test(s)) return null;
      if (!/^[\\d.+\\-*/()%^a-z]+$/.test(s)) return null;
      // Must contain an operator (+, -, *, /, %, ^) or function (root, sqrt)
      if (!/[+\\-*/%^]|root\\(|sqrt\\(/.test(s)) return null;

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
console.log('Fixed calcEval');
