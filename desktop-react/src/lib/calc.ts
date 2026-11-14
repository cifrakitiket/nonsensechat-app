// Safe math expression parser (recursive descent, zero eval)
// Evaluates expressions like "25*4", "100/5", "12+45-7", "(10+5)*2", "2^8"

export function calcEval(expr: string): number | null {
  const s = (expr || '')
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/:/g, '/')
    .replace(/\s+/g, '');

  if (!s || !/\d/.test(s)) return null;
  if (!/^[\d.+\-*/()%^]+$/.test(s)) return null;
  if (!/[+\-*/%^]/.test(s.slice(1))) return null; // Needs at least one operator

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
      else if (op === '/') v = r !== 0 ? v / r : 0;
      else v = v % r;
    }
    return v;
  }

  function parseFactor(): number {
    let v = parsePower();
    return v;
  }

  function parsePower(): number {
    let v = parsePrimary();
    if (i < s.length && s[i] === '^') {
      i++;
      const p = parsePower();
      v = Math.pow(v, p);
    }
    return v;
  }

  function parsePrimary(): number {
    if (i < s.length && s[i] === '-') {
      i++;
      return -parsePrimary();
    }
    if (i < s.length && s[i] === '+') {
      i++;
      return parsePrimary();
    }
    if (i < s.length && s[i] === '(') {
      i++;
      const v = parseExpr();
      if (i < s.length && s[i] === ')') i++;
      return v;
    }
    let numStr = '';
    while (i < s.length && /[\d.]/.test(s[i])) {
      numStr += s[i++];
    }
    return parseFloat(numStr) || 0;
  }

  try {
    const res = parseExpr();
    if (i === s.length && Number.isFinite(res)) {
      return Math.round(res * 1e8) / 1e8; // Avoid float inaccuracies like 0.30000000000000004
    }
    return null;
  } catch {
    return null;
  }
}
