// server/apply-tg-spoilers.js
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

const tgSpoilerCss = `/* ═══ TELEGRAM SPOILERS ═══ */
    @keyframes tgDust1 {
      0% { background-position: 0 0; }
      100% { background-position: 120px 80px; }
    }
    @keyframes tgDust2 {
      0% { background-position: 0 0; }
      100% { background-position: -90px 110px; }
    }

    /* Common spoiler styles */
    .spoiler {
      position: relative;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      transition: color .25s ease, background-color .25s ease, filter .25s ease, opacity .25s ease;
    }

    /* Text Spoilers (span) */
    span.spoiler,
    .spoiler:not(div) {
      display: inline;
      border-radius: 4px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      padding: 1px 3px;
    }

    span.spoiler:not(.vis),
    .spoiler:not(div):not(.vis) {
      color: transparent !important;
      text-shadow: none !important;
      background-color: rgba(255, 255, 255, 0.14);
      background-image:
        url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIxIDAgMCAwIDEgIDAgMSAwIDAgMSAgMCAwIDEgMCAxICAwIDAgMCAxOSAtOCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC43NSIvPjwvc3ZnPg=="),
        url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIxIDAgMCAwIDEgIDAgMSAwIDAgMSAgMCAwIDEgMCAxICAwIDAgMCAxOSAtOCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC43NSIvPjwvc3ZnPg==");
      background-size: 70px 70px, 110px 110px;
      background-blend-mode: screen;
      animation: tgDust1 3.5s linear infinite, tgDust2 4.5s linear infinite;
      filter: contrast(120%) brightness(110%);
    }

    span.spoiler.vis,
    .spoiler:not(div).vis {
      color: inherit !important;
      background: transparent !important;
      filter: none !important;
    }

    /* Media/Photo Spoilers (div) */
    div.spoiler {
      position: relative;
      overflow: hidden;
      border-radius: 14px;
      color: inherit;
      background: #0b0e14;
      display: block;
      cursor: pointer;
    }

    div.spoiler:not(.vis) img,
    div.spoiler:not(.vis) .msg-photo {
      filter: blur(48px) brightness(0.25) saturate(0.2) !important;
      transform: scale(1.16);
      pointer-events: none;
      transition: filter .35s cubic-bezier(0.2, 0, 0, 1), transform .35s cubic-bezier(0.2, 0, 0, 1);
    }

    /* Shimmering particle dust layer over photo */
    div.spoiler:not(.vis)::before {
      content: '';
      position: absolute;
      inset: 0;
      background-color: rgba(10, 14, 22, 0.65);
      background-image:
        url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIxIDAgMCAwIDEgIDAgMSAwIDAgMSAgMCAwIDEgMCAxICAwIDAgMCAxOSAtOCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC43NSIvPjwvc3ZnPg=="),
        url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIxIDAgMCAwIDEgIDAgMSAwIDAgMSAgMCAwIDEgMCAxICAwIDAgMCAxOSAtOCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC43NSIvPjwvc3ZnPg==");
      background-size: 80px 80px, 130px 130px;
      background-blend-mode: screen;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      animation: tgDust1 4s linear infinite, tgDust2 6s linear infinite;
      z-index: 2;
      pointer-events: none;
      transition: opacity .35s cubic-bezier(0.2, 0, 0, 1), transform .35s cubic-bezier(0.2, 0, 0, 1);
    }

    /* Telegram center circular eye-slash button */
    div.spoiler:not(.vis)::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xNy45NCAxNy45NEExMC4wNyAxMC4wNyAwIDAgMSAxMiAyMGMtNyAwLTExLTgtMTEtOGExOC40NSAxOC40NSAwIDAgMSA1LjA2LTUuOTRNOS45IDQuMjRBOS4xMiA5LjEyIDAgMCAxIDEyIDRjNyAwIDExIDggMTEgOGExOC41IDE4LjUgMCAwIDEtMi4xNiAzLjE5bS02LjcyLTEuMDdhMyAzIDAgMSAxLTQuMjQtNC4yNCI+PC9wYXRoPjxsaW5lIHgxPSIxIiB5MT0iMSIgeDI9IjIzIiB5Mj0iMjMiPjwvbGluZT48L3N2Zz4=");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 26px 26px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6), inset 0 0 0 1.5px rgba(255, 255, 255, 0.22);
      z-index: 3;
      pointer-events: none;
      transition: transform .25s cubic-bezier(0.2, 0, 0, 1), opacity .3s ease;
    }

    div.spoiler:hover:not(.vis)::after {
      transform: translate(-50%, -50%) scale(1.08);
    }

    div.spoiler:not(.vis) .photo-time-overlay {
      display: none;
    }

    /* Revealed media spoiler */
    div.spoiler.vis {
      background: transparent;
    }

    div.spoiler.vis img,
    div.spoiler.vis .msg-photo {
      filter: none !important;
      transform: scale(1);
      transition: filter .35s cubic-bezier(0.2, 0, 0, 1), transform .35s cubic-bezier(0.2, 0, 0, 1);
    }

    div.spoiler.vis::before {
      opacity: 0;
      transform: scale(1.06);
      pointer-events: none;
    }

    div.spoiler.vis::after {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.6);
      pointer-events: none;
    }
`;

const spoilerCssBlockRegex = /\.spoiler\s*\{[\s\S]*?div\.spoiler\.vis::after\s*\{[^}]*\}\s*/;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('Processing:', filePath);

  // 1. Replace spoiler CSS
  if (!spoilerCssBlockRegex.test(content)) {
    console.error('spoilerCssBlockRegex did not match in', filePath);
    process.exit(1);
  }
  content = content.replace(spoilerCssBlockRegex, tgSpoilerCss);
  console.log('✓ Replaced spoiler CSS with authentic Telegram style');

  // 2. Click handler: use closest('.spoiler') so clicking any child reveals it
  const clickSpoilerRegex = /if\s*\(\s*e\.target\.classList\.contains\('spoiler'\)\s*\)\s*e\.target\.classList\.add\('vis'\);/;
  if (!clickSpoilerRegex.test(content)) {
    console.error('clickSpoilerRegex did not match in', filePath);
    process.exit(1);
  }
  content = content.replace(clickSpoilerRegex, `const sp = e.target.closest('.spoiler');
      if (sp && !sp.classList.contains('vis')) sp.classList.add('vis');`);
  console.log('✓ Updated click handler to support closest .spoiler');

  // 3. processLinks: support ||spoiler|| syntax
  const processLinksRegex = /function processLinks\(text\)\s*\{[\s\S]*?if\s*\(!text\)\s*return '';/;
  if (!processLinksRegex.test(content)) {
    console.error('processLinksRegex did not match in', filePath);
    process.exit(1);
  }
  content = content.replace(processLinksRegex, `function processLinks(text) {
      if (!text) return '';
      // Telegram spoiler syntax ||text||
      text = text.replace(/\\|\\|([^\\n|]+?)\\|\\|/g, '<span class="spoiler">$1</span>');`);
  console.log('✓ Added ||text|| spoiler markdown support in processLinks');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully written:', filePath);
}
console.log('Telegram spoilers successfully applied to all files!');
