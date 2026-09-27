// server/apply-final-tagging.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

const REPLACEMENTS = [
  // Call bar buttons
  [
    `id="callBarExpand" onclick="expandCall()">\r\n        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>\r\n       Развернуть\r\n     </button>`,
    `id="callBarExpand" onclick="expandCall()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> <span data-i18n="expand">Развернуть</span></button>`
  ],
  [
    `id="callBarExpand" onclick="expandCall()">\n        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>\n       Развернуть\n     </button>`,
    `id="callBarExpand" onclick="expandCall()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> <span data-i18n="expand">Развернуть</span></button>`
  ],
  [
    `class="call-bar-btn call-bar-btn-end" id="callBarEnd" onclick="endCall()">✕ Завершить</button>`,
    `class="call-bar-btn call-bar-btn-end" id="callBarEnd" onclick="endCall()" data-i18n="endCall">✕ Завершить</button>`
  ],

  // Forward preview
  [
    `<i class="fa-solid fa-share"></i> Пересылка:</b>`,
    `<i class="fa-solid fa-share"></i> <span data-i18n="forwardPrefix">Пересылка:</span></b>`
  ],

  // Attach menu
  [
    `-icon"><i class="fa-solid fa-paperclip"></i></span>Файл</div>`,
    `-icon"><i class="fa-solid fa-paperclip"></i></span><span data-i18n="attachFile">Файл</span></div>`
  ],
  [
    `-icon"><i class="fa-solid fa-chart-bar"></i></span>Голосование</div>`,
    `-icon"><i class="fa-solid fa-chart-bar"></i></span><span data-i18n="attachPoll">Голосование</span></div>`
  ],

  // Right panel title
  [
    `<div class="rp-htitle">Профиль</div>`,
    `<div class="rp-htitle" data-i18n="profile">Профиль</div>`
  ],

  // Call names
  [
    `<span id="callName">Звонок</span>`,
    `<span id="callName" data-i18n="callBtn">Звонок</span>`
  ],
  [
    `<span id="callNameCenter">Звонок</span>`,
    `<span id="callNameCenter" data-i18n="callBtn">Звонок</span>`
  ],
  [
    `<span class="call-status-indicator connecting"></span>Соединение...`,
    `<span class="call-status-indicator connecting"></span><span data-i18n="connecting">Соединение...</span>`
  ],
  [
    `<div class="vk-call-name" id="callNameWaiting">Загрузка...</div>`,
    `<div class="vk-call-name" id="callNameWaiting" data-i18n="loading">Загрузка...</div>`
  ],
  [
    `<button class="call-join-btn hidden" id="callJoinBtn">Присоединиться к звонку</button>`,
    `<button class="call-join-btn hidden" id="callJoinBtn" data-i18n="callJoinBtn">Присоединиться к звонку</button>`
  ],

  // Video call controls
  [
    `<span class="vk-ctrl-tip">Микрофон</span>`,
    `<span class="vk-ctrl-tip" data-i18n="mic">Микрофон</span>`
  ],
  [
    `<span class="vk-ctrl-label" id="lblMic">Выкл. микрофон</span>`,
    `<span class="vk-ctrl-label" id="lblMic" data-i18n="muteMic">Выкл. микрофон</span>`
  ],
  [
    `<div class="vk-device-popup-title">Микрофон</div>`,
    `<div class="vk-device-popup-title" data-i18n="mic">Микрофон</div>`
  ],
  [
    `<span class="vk-ctrl-tip">Камера</span>`,
    `<span class="vk-ctrl-tip" data-i18n="cam">Камера</span>`
  ],
  [
    `<span class="vk-ctrl-label" id="lblCam">Выкл. камеру</span>`,
    `<span class="vk-ctrl-label" id="lblCam" data-i18n="muteCam">Выкл. камеру</span>`
  ],
  [
    `<div class="vk-device-popup-title">Камера</div>`,
    `<div class="vk-device-popup-title" data-i18n="cam">Камера</div>`
  ],
  [
    `<span class="vk-ctrl-tip">Вывод звука</span>`,
    `<span class="vk-ctrl-tip" data-i18n="audioOutput">Вывод звука</span>`
  ],
  [
    `<span class="vk-ctrl-label">Звук</span>`,
    `<span class="vk-ctrl-label" data-i18n="sound">Звук</span>`
  ],
  [
    `<div class="vk-device-popup-title">Вывод звука</div>`,
    `<div class="vk-device-popup-title" data-i18n="audioOutput">Вывод звука</div>`
  ],
  [
    `<span class="vk-ctrl-tip">Трансляция экрана</span>`,
    `<span class="vk-ctrl-tip" data-i18n="screenShare">Трансляция экрана</span>`
  ],
  [
    `<span class="vk-ctrl-label">Экран</span>`,
    `<span class="vk-ctrl-label" data-i18n="screen">Экран</span>`
  ],
  [
    `<span class="vk-ctrl-tip">Пригласить в звонок</span>`,
    `<span class="vk-ctrl-tip" data-i18n="inviteToCall">Пригласить в звонок</span>`
  ],
  [
    `<span class="vk-ctrl-label" style="color:#4ade80">Пригласить</span>`,
    `<span class="vk-ctrl-label" style="color:#4ade80" data-i18n="invite">Пригласить</span>`
  ],
  [
    `<span class="vk-ctrl-tip">Покинуть звонок</span>`,
    `<span class="vk-ctrl-tip" data-i18n="leaveCall">Покинуть звонок</span>`
  ],
  [
    `<span class="vk-ctrl-label">Покинуть</span>`,
    `<span class="vk-ctrl-label" data-i18n="leave">Покинуть</span>`
  ],

  // Context menus
  [
    `class="ctx-readby-title"><i class="fa-solid fa-eye"></i> Прочитали:</div>`,
    `class="ctx-readby-title"><i class="fa-solid fa-eye"></i> <span data-i18n="readBy">Прочитали:</span></div>`
  ],
  [
    `id="ctxCopyText">Копировать текст <span><i class="fa-regular fa-copy"></i></span></div>`,
    `id="ctxCopyText"><span data-i18n="ctxCopyText">Копировать текст</span> <span><i class="fa-regular fa-copy"></i></span></div>`
  ],
  [
    `id="ctxCopyPhoto" style="display:none">Копировать фото <span><i class="fa-regular fa-image"></i></span></div>`,
    `id="ctxCopyPhoto" style="display:none"><span data-i18n="ctxCopyPhoto">Копировать фото</span> <span><i class="fa-regular fa-image"></i></span></div>`
  ],
  [
    `id="ctxStickerPack" style="display:none">Стикерпак <span><i class="fa-regular fa-heart"></i></span></div>`,
    `id="ctxStickerPack" style="display:none"><span data-i18n="ctxStickerpack">Стикерпак</span> <span><i class="fa-regular fa-heart"></i></span></div>`
  ],
  [
    `onmousedown="fmt('bold');return false"><b>Жирный</b>`,
    `onmousedown="fmt('bold');return false"><b data-i18n="ctxBold">Жирный</b>`
  ],
  [
    `onmousedown="fmt('italic');return false"><i>Курсив</i>`,
    `onmousedown="fmt('italic');return false"><i data-i18n="ctxItalic">Курсив</i>`
  ],
  [
    `onmousedown="fmt('underline');return false"><u>Подчёркнутый</u>`,
    `onmousedown="fmt('underline');return false"><u data-i18n="ctxUnderline">Подчёркнутый</u>`
  ],
  [
    `onmousedown="fmt('strikeThrough');return false"><s>Зачёркнутый</s>`,
    `onmousedown="fmt('strikeThrough');return false"><s data-i18n="ctxStrike">Зачёркнутый</s>`
  ],
  [
    `id="ctxChatPinBtn">Закрепить чат <span><i class="fa-solid fa-thumbtack"></i></span></div>`,
    `id="ctxChatPinBtn"><span data-i18n="ctxPinChat">Закрепить чат</span> <span><i class="fa-solid fa-thumbtack"></i></span></div>`
  ],
  [
    `onmousedown="ctxChatFolder();return false">В папку <span><i class="fa-solid fa-folder"></i></span></div>`,
    `onmousedown="ctxChatFolder();return false"><span data-i18n="ctxToFolder">В папку</span> <span><i class="fa-solid fa-folder"></i></span></div>`
  ],
  [
    `id="ctxChatArchiveBtn">Архивировать <span><i class="fa-solid fa-box-archive"></i></span></div>`,
    `id="ctxChatArchiveBtn"><span data-i18n="ctxArchive">Архивировать</span> <span><i class="fa-solid fa-box-archive"></i></span></div>`
  ],
  [
    `id="ctxChatLeaveBtn">Покинуть/удалить <span><i class="fa-solid fa-right-from-bracket"></i></span></div>`,
    `id="ctxChatLeaveBtn"><span data-i18n="ctxLeaveDelete">Покинуть/удалить</span> <span><i class="fa-solid fa-right-from-bracket"></i></span></div>`
  ],

  // About modal app name
  [
    `<div class="app-info-name">Беспонтовый Чат</div>`,
    `<div class="app-info-name" data-i18n="appTitle">Беспонтовый Чат</div>`
  ],
  [
    `<span class="ic-btn-label">Ответить</span>`,
    `<span class="ic-btn-label" data-i18n="answer">Ответить</span>`
  ],
  [
    `<div class="tgp-head-status" id="vpStatus">Загрузка...</div>`,
    `<div class="tgp-head-status" id="vpStatus" data-i18n="loading">Загрузка...</div>`
  ],
  [
    `<h3 id="packViewTitle">Стикерпак</h3>`,
    `<h3 id="packViewTitle" data-i18n="ctxStickerpack">Стикерпак</h3>`
  ],
  [
    `<button class="mbtn" onclick="doForward()">Переслать</button>`,
    `<button class="mbtn" onclick="doForward()" data-i18n="ctxForward">Переслать</button>`
  ]
];

// Placeholders
const PH_FIXES = [
  [`placeholder="Поиск"`, `placeholder="Поиск" data-i18n-ph="searchPh"`],
  [`placeholder="Юзернейм"`, `placeholder="Юзернейм" data-i18n-ph="usernamePh"`],
  [`placeholder="Подпись к изображению"`, `placeholder="Подпись к изображению" data-i18n-ph="imageCaptionPh"`]
];

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  let applied = 0;
  for (const [target, replacement] of REPLACEMENTS) {
    if (code.includes(target)) {
      code = code.split(target).join(replacement);
      applied++;
    }
  }
  console.log(`✓ Applied ${applied} HTML replacements in ${filePath}`);

  let phApplied = 0;
  for (const [target, replacement] of PH_FIXES) {
    if (code.includes(target) && !code.includes(replacement)) {
      code = code.split(target).join(replacement);
      phApplied++;
    }
  }
  console.log(`✓ Applied ${phApplied} placeholder replacements in ${filePath}`);

  // Validate scripts
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let scriptCount = 0;
  while ((m = scriptRegex.exec(code)) !== null) {
    scriptCount++;
    if (m[1].trim()) {
      try {
        new vm.Script(m[1].trim());
      } catch (err) {
        console.error(`Syntax error in script #${scriptCount} of ${filePath}:`, err.stack || err.message);
        process.exit(1);
      }
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✓ Validated and saved ${filePath}`);
}

console.log('\nFinal tagging completed successfully!');
