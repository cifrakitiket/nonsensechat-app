function testCalc(calcEval) {
  const cases = [
    // Standard cubic root calls
    { expr: 'cbrt(27)', expected: 3 },
    { expr: 'cbrt(8)', expected: 2 },
    { expr: 'cbrt(1)', expected: 1 },
    { expr: 'cbrt(0)', expected: 0 },
    { expr: 'cbrt(125)', expected: 5 },
    { expr: 'cbrt(64)', expected: 4 },
    { expr: 'cbrt(1000)', expected: 10 },
    { expr: 'cbrt(512)', expected: 8 },
    { expr: 'cbrt(0.125)', expected: 0.5 },

    // Negative numbers under cubic root: (-x)^3 = -x^3 => cbrt(-27) = -3
    { expr: 'cbrt(-27)', expected: -3 },
    { expr: 'cbrt(-8)', expected: -2 },
    { expr: 'cbrt(-1)', expected: -1 },
    { expr: 'cbrt(-125)', expected: -5 },
    { expr: 'cbrt(-64)', expected: -4 },

    // Aliases
    { expr: 'root3(27)', expected: 3 },
    { expr: 'root3(8)', expected: 2 },
    { expr: 'croot(27)', expected: 3 },
    { expr: 'cbroot(27)', expected: 3 },
    { expr: 'кубкорень(27)', expected: 3 },
    { expr: 'кубкорень(-8)', expected: -2 },
    { expr: 'кубическийкорень(27)', expected: 3 },
    { expr: 'кубический корень(64)', expected: 4 },
    { expr: 'кубический корень из 125', expected: 5 },
    { expr: 'куб корень из 27', expected: 3 },
    { expr: 'куб.корень(27)', expected: 3 },
    { expr: 'корень 3 степени из 27', expected: 3 },
    { expr: 'корень 3-ей степени из 8', expected: 2 },

    // Two-argument forms: root(x, 3), root(x; 3), корень(x, 3)
    { expr: 'root(27, 3)', expected: 3 },
    { expr: 'root(27; 3)', expected: 3 },
    { expr: 'корень(27, 3)', expected: 3 },
    { expr: 'корень(125; 3)', expected: 5 },
    { expr: 'root(-27, 3)', expected: -3 },

    // Unicode symbols: ∛
    { expr: '∛27', expected: 3 },
    { expr: '∛(27)', expected: 3 },
    { expr: '∛8', expected: 2 },
    { expr: '∛-8', expected: -2 },
    { expr: '3√27', expected: 3 },
    { expr: '3√(27)', expected: 3 },
    { expr: '3√8', expected: 2 },

    // Square root checks (make sure we didn't break square roots)
    { expr: 'root(64)', expected: 8 },
    { expr: 'sqrt(64)', expected: 8 },
    { expr: 'корень(64)', expected: 8 },
    { expr: 'корень из 64', expected: 8 },
    { expr: '√64', expected: 8 },
    { expr: '√(64)', expected: 8 },
    { expr: 'root(64, 2)', expected: 8 },
    { expr: 'корень(64, 2)', expected: 8 },

    // Nested roots!
    { expr: 'cbrt(cbrt(512))', expected: 2 },
    { expr: 'cbrt(root(64))', expected: 2 },
    { expr: 'root(cbrt(64))', expected: 2 },
    { expr: 'cbrt(10 + 17)', expected: 3 },
    { expr: 'cbrt(30 - 3)', expected: 3 },
    { expr: 'cbrt(27) + cbrt(8)', expected: 5 },
    { expr: 'cbrt(27) * 4', expected: 12 },
    { expr: 'cbrt(27) ^ 2', expected: 9 },
    { expr: '2 * cbrt(27)', expected: 6 },
    { expr: 'cbrt(27) / 3', expected: 1 },

    // Decimal comma in Russian
    { expr: 'cbrt(0,125)', expected: 0.5 },
    { expr: 'cbrt(3,375)', expected: 1.5 },

    // Regular operations (should still work 100%)
    { expr: '2 + 2', expected: 4 },
    { expr: '10 * 5 - 8 / 2', expected: 46 },
    { expr: '2 ^ 3', expected: 8 },
    { expr: '10 % 3', expected: 1 }
  ];

  let passed = 0;
  let failed = 0;
  for (const tc of cases) {
    const res = calcEval(tc.expr);
    const ok = res !== null && Math.abs(res - tc.expected) < 1e-9;
    if (ok) {
      passed++;
    } else {
      failed++;
      console.error(`FAIL: "${tc.expr}" => expected ${tc.expected}, got ${res}`);
    }
  }
  console.log(`Results: ${passed} passed, ${failed} failed out of ${cases.length} tests.`);
  return failed === 0;
}

module.exports = { testCalc };
