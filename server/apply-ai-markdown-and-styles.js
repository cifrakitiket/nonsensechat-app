const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Add Code block CSS
const codeCss = `
    .ai-code-wrap {
      margin: 6px 0;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.25);
      overflow: hidden;
    }
    .ai-code-hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 10px;
      background: rgba(14, 165, 233, 0.12);
      border-bottom: 1px solid rgba(56, 189, 248, 0.15);
      font-size: 11px;
      color: #38bdf8;
      font-weight: 600;
      text-transform: uppercase;
    }
    .ai-code-wrap pre {
      margin: 0;
      padding: 8px 12px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12.5px;
      line-height: 1.45;
      color: #e2e8f0;
    }
    .ai-inline-code {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      padding: 1px 5px;
      border-radius: 4px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
    }
    .ai-empty-welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: auto;
      padding: 30px 20px;
      text-align: center;
    }
`;

if (!html.includes('.ai-code-wrap')) {
  const cssIdx = html.indexOf('/* ═══ ИИ ХАБ (AI HUB) & БЫСТРЫЕ КОМАНДЫ');
  html = html.slice(0, cssIdx) + codeCss + html.slice(cssIdx);
  console.log('Added AI Code block CSS');
}

// 2. Add formatAiMarkdown and copyAiCode functions
const formatAiJs = `
    function formatAiMarkdown(raw) {
      if (!raw) return '';
      let s = String(raw).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Triple backtick code blocks with copy button
      s = s.replace(/\`\`\`([a-zA-Z0-9_-]*)\\n?([\\s\\S]*?)\`\`\`/g, (m, lang, code) => {
        const l = lang ? lang.trim() : 'код';
        return '<div class="ai-code-wrap"><div class="ai-code-hdr"><span>' + l + '</span><button type="button" class="ai-copy-btn" onclick="copyAiCode(this)"><i class="fa-solid fa-copy"></i> Копировать</button></div><pre><code>' + code.trim() + '</code></pre></div>';
      });

      // Inline code
      s = s.replace(/\`([^\`\\n]+)\`/g, '<code class="ai-inline-code">$1</code>');

      // Bold & Italic
      s = s.replace(/\\*\\*([^\\*\\n]+)\\*\\*/g, '<b>$1</b>');
      s = s.replace(/\\*([^\\*\\n]+)\\*/g, '<i>$1</i>');

      // Line breaks
      s = s.replace(/\\n/g, '<br>');

      return (typeof processLinks === 'function') ? processLinks(s) : s;
    }

    function copyAiCode(btn) {
      if (!btn) return;
      const code = btn.closest('.ai-code-wrap')?.querySelector('code')?.innerText || '';
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check" style="color:#22c55e"></i> Скопировано!';
        setTimeout(() => { btn.innerHTML = orig; }, 1800);
      }).catch(() => {
        if (typeof showToast === 'function') showToast('Копирование', 'Не удалось скопировать', 'error');
      });
    }
`;

if (!html.includes('function formatAiMarkdown(')) {
  const insertMarker = 'function getAiSettings() {';
  const insIdx = html.indexOf(insertMarker);
  html = html.slice(0, insIdx) + formatAiJs + '\n    ' + html.slice(insIdx);
  console.log('Added formatAiMarkdown and copyAiCode functions');
}

// 3. Update message content rendering
const contentTarget = `content = \`<span class="msg-text-content">\${processLinks(txt)}</span>\`;`;
if (html.includes(contentTarget) && !html.includes('formatAiMarkdown(txt)')) {
  const newContent = `content = isAiMsg ? \`<div class="msg-text-content ai-text-content">\${formatAiMarkdown(txt)}</div>\` : \`<span class="msg-text-content">\${processLinks(txt)}</span>\`;`;
  html = html.replace(contentTarget, newContent);
  console.log('Updated message content rendering to use formatAiMarkdown for AI messages');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('All AI markdown and styling additions saved to public/index.html');
