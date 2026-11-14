const { testCalc } = require('./test-cbrt-calc');

function normalizeCbrt(expr) {
  let s = (expr || '').toLowerCase()
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/:/g, '/');

  // 1. Unicode root characters
  // ∛ is cube root (\u221B)
  s = s.replace(/∛\s*\(/g, 'cbrt(');
  s = s.replace(/∛\s*(-?\d+(?:[.,]\d+)?)/g, 'cbrt($1)');
  
  // 3√ is cube root (e.g. 3√27 or 3√(27))
  s = s.replace(/3\s*√\s*\(/g, 'cbrt(');
  s = s.replace(/3\s*√\s*(-?\d+(?:[.,]\d+)?)/g, 'cbrt($1)');

  // √ is square root (\u221A)
  s = s.replace(/√\s*\(/g, 'root(');
  s = s.replace(/√\s*(-?\d+(?:[.,]\d+)?)/g, 'root($1)');

  // 2. Russian wording
  s = s.replace(/кубический\s*корень\s*(?:из)?\s*\(/gi, 'cbrt(')
       .replace(/кубический\s*корень\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
       .replace(/кубкорень\s*(?:из)?\s*\(/gi, 'cbrt(')
       .replace(/кубкорень\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
       .replace(/куб\.?\s*корень\s*(?:из)?\s*\(/gi, 'cbrt(')
       .replace(/куб\.?\s*корень\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
       .replace(/корень\s*3\s*(?:-?\s*(?:ей|ой|й))?\s*степени\s*(?:из)?\s*\(/gi, 'cbrt(')
       .replace(/корень\s*3\s*(?:-?\s*(?:ей|ой|й))?\s*степени\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
       .replace(/корень\s*(?:из)?\s*\(/gi, 'root(')
       .replace(/корень\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'root($1)');

  // 3. Aliases
  s = s.replace(/root3\s*\(/gi, 'cbrt(')
       .replace(/root3\s+(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
       .replace(/cbroot\s*\(/gi, 'cbrt(')
       .replace(/cbroot\s+(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
       .replace(/croot\s*\(/gi, 'cbrt(')
       .replace(/croot\s+(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
       .replace(/cbrt\s+(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
       .replace(/root\s+(-?\d+(?:[.,]\d+)?)/gi, 'root($1)');

  // 4. Two-argument form: root(expr, 3) or root(expr; 3) => cbrt(expr)
  // Repeat while matching to handle nested expressions
  while (/root\s*\(\s*(.+?)\s*[,;]\s*3\s*\)/i.test(s)) {
    s = s.replace(/root\s*\(\s*(.+?)\s*[,;]\s*3\s*\)/gi, 'cbrt($1)');
  }
  while (/root\s*\(\s*(.+?)\s*[,;]\s*2\s*\)/i.test(s)) {
    s = s.replace(/root\s*\(\s*(.+?)\s*[,;]\s*2\s*\)/gi, 'root($1)');
  }

  // 5. Convert decimal commas to dots
  s = s.replace(/,/g, '.').replace(/\s+/g, '');
  return s;
}

function calcEval(expr) {
  const s = normalizeCbrt(expr);

  if (!s || !/\d/.test(s)) return null;
  if (!/^[\d.+\-*/()%^a-z]+$/.test(s)) return null;
  // Must contain an operator (+, -, *, /, %, ^) or function (root, sqrt, cbrt)
  if (!/[+\-*/%^]|root\(|sqrt\(|cbrt\(/.test(s)) return null;

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
    // Cubic root: Math.cbrt(x) gives the number which cubed gives x (e.g. cbrt(27) = 3, cbrt(-27) = -3)
    if (s.startsWith('cbrt(', i)) {
      i += 5;
      const v = parseExpr();
      if (s[i] !== ')') throw 0;
      i++;
      return Math.cbrt(v);
    }
    // Square root
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
    const m = /^\d*\.?\d+/.exec(s.slice(i));
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

// Extra tests
const extraCases = [
  { expr: 'root(9) + cbrt(27)', expected: 6 },
  { expr: 'cbrt(8) + cbrt(-8)', expected: 0 },
  { expr: 'кубкорень 8', expected: 2 },
  { expr: 'кубкорень 27', expected: 3 },
  { expr: 'кубический корень 27', expected: 3 },
  { expr: 'корень 64', expected: 8 },
  { expr: 'cbrt 27', expected: 3 },
  { expr: 'root 64', expected: 8 },
  { expr: 'cbrt 125', expected: 5 },
  { expr: 'cbrt -27', expected: -3 },
  { expr: 'cbrt(27) + 5 * 2', expected: 13 },
  { expr: 'cbrt ( 27 )', expected: 3 },
  // Negative validation tests (must return null)
  { expr: 'cbrt()', expected: null },
  { expr: 'cbrt(abc)', expected: null },
  { expr: 'random message with 27 in it', expected: null },
  { expr: 'hello 123 world', expected: null }
];

let okAll = testCalc(calcEval);

let extraPassed = 0;
for (const tc of extraCases) {
  const res = calcEval(tc.expr);
  let ok = false;
  if (tc.expected === null) {
    ok = (res === null);
  } else {
    ok = (res !== null && Math.abs(res - tc.expected) < 1e-9);
  }
  if (ok) {
    extraPassed++;
  } else {
    console.error(`EXTRA FAIL: "${tc.expr}" => expected ${tc.expected}, got ${res}`);
    okAll = false;
  }
}
console.log(`Extra tests: ${extraPassed}/${extraCases.length} passed.`);
if (!okAll) process.exit(1);
