const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Cut off everything after </html>
const htmlEnd = html.lastIndexOf('</html>');
if (htmlEnd === -1) {
  console.error('Cannot find </html>');
  process.exit(1);
}
html = html.slice(0, htmlEnd + '</html>'.length);
console.log('Trimmed text after </html>');

// 2. Define `esc` and `formatAiMarkdown`
const aiHubMarker = '/* ═══ ИИ ХАБ (AI HUB) & БЫСТРЫЕ КОМАНДЫ (GEMINI, GROK, CLAUDE) ═══ */';
const aiHubIdx = html.indexOf(aiHubMarker);

if (aiHubIdx === -1) {
  console.error('Cannot find aiHubMarker!');
  process.exit(1);
}

const helpersJs = [
  "",
  "    /* Безопасное экранирование для ИИ Хаба */",
  "    function esc(s) {",
  "      if (typeof escHtml === 'function') return escHtml(s);",
  "      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');",
  "    }",
  "",
  "    function formatAiMarkdown(raw) {",
  "      if (!raw) return '';",
  "      let s = String(raw).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');",
  "      ",
  "      // Triple backtick code blocks with copy button",
  "      s = s.replace(/```([a-zA-Z0-9_-]*)\\n?([\\s\\S]*?)```/g, function(m, lang, code) {",
  "        const l = lang ? lang.trim() : 'код';",
  "        return '<div class=\"ai-code-wrap\"><div class=\"ai-code-hdr\"><span>' + l + '</span><button type=\"button\" class=\"ai-copy-btn\" onclick=\"copyAiCode(this)\"><i class=\"fa-solid fa-copy\"></i> Копировать</button></div><pre><code>' + code.trim() + '</code></pre></div>';",
  "      });",
  "",
  "      // Inline code",
  "      s = s.replace(/`([^`\\n]+)`/g, '<code class=\"ai-inline-code\">$1</code>');",
  "",
  "      // Bold & Italic",
  "      s = s.replace(/\\*\\*([^\\*\\n]+)\\*\\*/g, '<b>$1</b>');",
  "      s = s.replace(/\\*([^\\*\\n]+)\\*/g, '<i>$1</i>');",
  "",
  "      // Line breaks",
  "      s = s.replace(/\\n/g, '<br>');",
  "",
  "      return (typeof processLinks === 'function') ? processLinks(s) : s;",
  "    }",
  "",
  "    function copyAiCode(btn) {",
  "      if (!btn) return;",
  "      const code = btn.closest('.ai-code-wrap')?.querySelector('code')?.innerText || '';",
  "      if (!code) return;",
  "      navigator.clipboard.writeText(code).then(function() {",
  "        const orig = btn.innerHTML;",
  "        btn.innerHTML = '<i class=\"fa-solid fa-check\" style=\"color:#22c55e\"></i> Скопировано!';",
  "        setTimeout(function() { btn.innerHTML = orig; }, 1800);",
  "      }).catch(function() {",
  "        if (typeof showToast === 'function') showToast('Копирование', 'Не удалось скопировать', 'error');",
  "      });",
  "    }"
].join('\n');

if (!html.includes('function esc(s) {')) {
  const insertPos = aiHubIdx + aiHubMarker.length;
  html = html.slice(0, insertPos) + helpersJs + html.slice(insertPos);
  console.log('Inserted esc, formatAiMarkdown, copyAiCode inside script tag');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Saved fixed index.html');
