const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const targetMarker = '// Глобальный перехватчик ошибок: логирует в консоль и показывает мягкий toast вместо браузерного alert';
const targetIdx = html.indexOf(targetMarker);

if (targetIdx === -1) {
  console.error('Target marker not found!');
  process.exit(1);
}

const safeUriCode = `/* ═══ ЗАЩИТА ОТ URIError: URI malformed ═══ */
    (function () {
      const _origDecode = window.decodeURIComponent;
      const _origEncode = window.encodeURIComponent;
      window.decodeURIComponent = function (s) {
        if (s == null) return '';
        try {
          return _origDecode(s);
        } catch (_) {
          try { return unescape(s); } catch (__) { return String(s || ''); }
        }
      };
      window.encodeURIComponent = function (s) {
        if (s == null) return '';
        try {
          return _origEncode(s);
        } catch (_) {
          try {
            const clean = String(s || '').replace(/[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]/g, '');
            return _origEncode(clean);
          } catch (__) {
            try { return escape(s); } catch (___) { return ''; }
          }
        }
      };
      window.safeDecode = window.decodeURIComponent;
      window.safeEncode = window.encodeURIComponent;
    })();

    `;

if (!html.includes('/* ═══ ЗАЩИТА ОТ URIError: URI malformed ═══ */')) {
  html = html.slice(0, targetIdx) + safeUriCode + html.slice(targetIdx);
  console.log('Injected safe URI wrapper');
}

// Update window.onerror and window.onunhandledrejection to also ignore transient urierror
html = html.replace(
  `if (typeof showToast === 'function' && !/resizeobserver|script error|non-critical/i.test(String(msg))) {`,
  `if (typeof showToast === 'function' && !/resizeobserver|script error|non-critical|urierror/i.test(String(msg))) {`
);

html = html.replace(
  `if (typeof showToast === 'function' && !/resizeobserver|non-critical/i.test(reason)) {`,
  `if (typeof showToast === 'function' && !/resizeobserver|non-critical|urierror/i.test(reason)) {`
);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated index.html with Safe URI protection!');
