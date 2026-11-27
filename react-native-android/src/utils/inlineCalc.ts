/**
 * Inline live math evaluator ported from NonsenseChat Web (server/patch-cbrt.js).
 * Supports +, -, *, /, %, ^, parentheses, sqrt, cbrt, and Russian root phrases.
 */
export function evalInlineMath(expr: string): string | null {
  if (!expr || expr.length > 140) return null;

  let raw = expr
    .toLowerCase()
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/:/g, '/');

  raw = raw
    .replace(/∛\s*\(/g, 'cbrt(')
    .replace(/∛\s*(-?\d+(?:[.,]\d+)?)/g, 'cbrt($1)')
    .replace(/3\s*√\s*\(/g, 'cbrt(')
    .replace(/3\s*√\s*(-?\d+(?:[.,]\d+)?)/g, 'cbrt($1)')
    .replace(/√\s*\(/g, 'root(')
    .replace(/√\s*(-?\d+(?:[.,]\d+)?)/g, 'root($1)');

  raw = raw
    .replace(/кубический\s*корень\s*(?:из)?\s*\(/gi, 'cbrt(')
    .replace(/кубический\s*корень\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
    .replace(/кубкорень\s*(?:из)?\s*\(/gi, 'cbrt(')
    .replace(/кубкорень\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
    .replace(/куб\.?\s*корень\s*(?:из)?\s*\(/gi, 'cbrt(')
    .replace(/куб\.?\s*корень\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
    .replace(/корень\s*3\s*(?:-?\s*(?:ей|ой|й))?\s*степени\s*(?:из)?\s*\(/gi, 'cbrt(')
    .replace(/корень\s*3\s*(?:-?\s*(?:ей|ой|й))?\s*степени\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
    .replace(/корень\s*(?:из)?\s*\(/gi, 'root(')
    .replace(/корень\s*(?:из)?\s*(-?\d+(?:[.,]\d+)?)/gi, 'root($1)');

  raw = raw
    .replace(/root3\s*\(/gi, 'cbrt(')
    .replace(/root3\s+(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
    .replace(/cbroot\s*\(/gi, 'cbrt(')
    .replace(/cbroot\s+(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
    .replace(/croot\s*\(/gi, 'cbrt(')
    .replace(/croot\s+(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
    .replace(/cbrt\s+(-?\d+(?:[.,]\d+)?)/gi, 'cbrt($1)')
    .replace(/root\s+(-?\d+(?:[.,]\d+)?)/gi, 'root($1)');

  while (/root\s*\(\s*(.+?)\s*[,;]\s*3\s*\)/i.test(raw)) {
    raw = raw.replace(/root\s*\(\s*(.+?)\s*[,;]\s*3\s*\)/gi, 'cbrt($1)');
  }
  while (/root\s*\(\s*(.+?)\s*[,;]\s*2\s*\)/i.test(raw)) {
    raw = raw.replace(/root\s*\(\s*(.+?)\s*[,;]\s*2\s*\)/gi, 'root($1)');
  }

  const s = raw.replace(/,/g, '.').replace(/\s+/g, '');
  if (!s || !/\d/.test(s)) return null;
  if (!/^[\d.+\-*/()%^a-z]+$/.test(s)) return null;
  if (!/[+\-*/%^]|root\(|sqrt\(|cbrt\(/.test(s)) return null;

  let i = 0;
  function parseExpr(): number {
    let v = parseTerm();
    while (i < s.length && (s[i] === '+' || s[i] === '-')) {
      const op = s[i++];
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function parseTerm(): number {
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
  function parseFactor(): number {
    let v = parseUnary();
    if (i < s.length && s[i] === '^') {
      i++;
      const r = parseFactor();
      v = Math.pow(v, r);
    }
    return v;
  }
  function parseUnary(): number {
    if (s[i] === '-') {
      i++;
      return -parseUnary();
    }
    if (s[i] === '+') {
      i++;
      return parseUnary();
    }
    return parseAtom();
  }
  function parseAtom(): number {
    if (s.startsWith('cbrt(', i)) {
      i += 5;
      const v = parseExpr();
      if (s[i] !== ')') throw 0;
      i++;
      return Math.cbrt(v);
    }
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
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    const rounded = Math.round(v * 1e6) / 1e6;
    return String(rounded);
  } catch {
    return null;
  }
}
