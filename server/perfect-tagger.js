// server/perfect-tagger.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

// Exact text replacements targeting the remaining HTML patterns
const EXACT_REPLACEMENTS = [
  // Document title
  ['<title>Беспонтовый Чат ™</title>', '<title data-i18n="appTitle">Беспонтовый Чат ™</title>'],

  // Update reload button
  [
    `id="updateReloadBtn">\r\n      <i class="fa-solid fa-rotate-right" style="font-size:12px"></i> Обновить\r\n    </button>`,
    `id="updateReloadBtn"><i class="fa-solid fa-rotate-right" style="font-size:12px"></i> <span data-i18n="updateBtn">Обновить</span></button>`
  ],
  [
    `id="updateReloadBtn">\n      <i class="fa-solid fa-rotate-right" style="font-size:12px"></i> Обновить\n    </button>`,
    `id="updateReloadBtn"><i class="fa-solid fa-rotate-right" style="font-size:12px"></i> <span data-i18n="updateBtn">Обновить</span></button>`
  ],

  // Call bar expand / end
  [
    `<button class="call-bar-btn expand" id="callBarExpand" onclick="expandCall()">\r\n        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>\r\n        Развернуть\r\n      </button>`,
    `<button class="call-bar-btn expand" id="callBarExpand" onclick="expandCall()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> <span data-i18n="expand">Развернуть</span></button>`
  ],
  [
    `<button class="call-bar-btn expand" id="callBarExpand" onclick="expandCall()">\n        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>\n        Развернуть\n      </button>`,
    `<button class="call-bar-btn expand" id="callBarExpand" onclick="expandCall()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> <span data-i18n="expand">Развернуть</span></button>`
  ],
  [
    `<button class="call-bar-btn end" id="callBarEnd" onclick="endCall()">✕ Завершить</button>`,
    `<button class="call-bar-btn end" id="callBarEnd" onclick="endCall()" data-i18n="endCall">✕ Завершить</button>`
  ],

  // Auth logo name & status
  [
    `<span class="auth-logo-name">Беспонтовый Чат</span>`,
    `<span class="auth-logo-name" data-i18n="appTitle">Беспонтовый Чат</span>`
  ],
  [
    `<div class="my-sub" id="mySub">В сети</div>`,
    `<div class="my-sub" id="mySub" data-i18n="online">В сети</div>`
  ],
  [
    `<span class="pinned-fwd-label">Пересылка: </span>`,
    `<span class="pinned-fwd-label" data-i18n="forwardPrefix">Пересылка: </span>`
  ],

  // Attach menu items
  [
    `class="fa-regular fa-image"></i></span>Фото и видео</div>`,
    `class="fa-regular fa-image"></i></span><span data-i18n="attachPhoto">Фото и видео</span></div>`
  ],
  [
    `class="fa-solid fa-music"></i></span>Музыка</div>`,
    `class="fa-solid fa-music"></i></span><span data-i18n="attachMusic">Музыка</span></div>`
  ],
  [
    `class="fa-regular fa-file"></i></span>Файл</div>`,
    `class="fa-regular fa-file"></i></span><span data-i18n="attachFile">Файл</span></div>`
  ],
  [
    `class="fa-solid fa-chart-simple"></i></span>Голосование</div>`,
    `class="fa-solid fa-chart-simple"></i></span><span data-i18n="attachPoll">Голосование</span></div>`
  ],

  // Header call / voice / profile titles & buttons
  [
    `onclick="openProfileModal()" title="Профиль">`,
    `onclick="openProfileModal()" title="Профиль" data-i18n-title="profile">`
  ],
  [
    `<div id="dcCallSidebarTitle">Голосовой канал</div>`,
    `<div id="dcCallSidebarTitle" data-i18n="voiceChannel">Голосовой канал</div>`
  ],
  [
    `onclick="startCall()" title="Звонок">`,
    `onclick="startCall()" title="Звонок" data-i18n-title="callBtn">`
  ],
  [
    `onclick="startCall(true)" title="Звонок">`,
    `onclick="startCall(true)" title="Звонок" data-i18n-title="callBtn">`
  ],
  [
    `<div id="dcCallSidebarStatus" class="connecting">● Соединение...</div>`,
    `<div id="dcCallSidebarStatus" class="connecting" data-i18n="connecting">● Соединение...</div>`
  ],
  [
    `<div class="call-connecting-sub">Соединение...</div>`,
    `<div class="call-connecting-sub" data-i18n="connecting">Соединение...</div>`
  ],
  [
    `<div class="connecting-text">Загрузка...</div>`,
    `<div class="connecting-text" data-i18n="loading">Загрузка...</div>`
  ],
  [
    `id="btnJoinCall" onclick="joinCall()">Присоединиться к звонку</button>`,
    `id="btnJoinCall" onclick="joinCall()" data-i18n="callJoinBtn">Присоединиться к звонку</button>`
  ],

  // In-call buttons tooltips & labels
  [
    `title="Микрофон">🎤</button>`,
    `title="Микрофон" data-i18n-title="mic">🎤</button>`
  ],
  [
    `title="Выкл. микрофон">`,
    `title="Выкл. микрофон" data-i18n-title="muteMic">`
  ],
  [
    `title="Камера">📷</button>`,
    `title="Камера" data-i18n-title="cam">📷</button>`
  ],
  [
    `title="Выкл. камеру">`,
    `title="Выкл. камеру" data-i18n-title="muteCam">`
  ],
  [
    `title="Вывод звука">`,
    `title="Вывод звука" data-i18n-title="audioOutput">`
  ],
  [
    `<span class="call-btn-lbl">Звук</span>`,
    `<span class="call-btn-lbl" data-i18n="sound">Звук</span>`
  ],
  [
    `title="Трансляция экрана">`,
    `title="Трансляция экрана" data-i18n-title="screenShare">`
  ],
  [
    `<span class="call-btn-lbl">Экран</span>`,
    `<span class="call-btn-lbl" data-i18n="screen">Экран</span>`
  ],
  [
    `title="Пригласить в звонок">`,
    `title="Пригласить в звонок" data-i18n-title="inviteToCall">`
  ],
  [
    `<span class="call-btn-lbl">Пригласить</span>`,
    `<span class="call-btn-lbl" data-i18n="invite">Пригласить</span>`
  ],
  [
    `title="Покинуть звонок">`,
    `title="Покинуть звонок" data-i18n-title="leaveCall">`
  ],
  [
    `<span class="call-btn-lbl">Покинуть</span>`,
    `<span class="call-btn-lbl" data-i18n="leave">Покинуть</span>`
  ],
  [
    `<div class="read-by-title">Прочитали:</div>`,
    `<div class="read-by-title" data-i18n="readBy">Прочитали:</div>`
  ],

  // Context menu message items
  [
    `onmousedown="ctxReply();return false">Ответить <span><i class="fa-solid fa-reply"></i></span></div>`,
    `onmousedown="ctxReply();return false"><span data-i18n="ctxReply">Ответить</span> <span><i class="fa-solid fa-reply"></i></span></div>`
  ],
  [
    `onmousedown="ctxForward();return false">Переслать <span><i class="fa-solid fa-share"></i></span></div>`,
    `onmousedown="ctxForward();return false"><span data-i18n="ctxForward">Переслать</span> <span><i class="fa-solid fa-share"></i></span></div>`
  ],
  [
    `onmousedown="ctxCopy();return false">Копировать текст <span><i class="fa-solid fa-copy"></i></span></div>`,
    `onmousedown="ctxCopy();return false"><span data-i18n="ctxCopyText">Копировать текст</span> <span><i class="fa-solid fa-copy"></i></span></div>`
  ],
  [
    `onmousedown="ctxCopyPhoto();return false">Копировать фото <span><i class="fa-solid fa-copy"></i></span></div>`,
    `onmousedown="ctxCopyPhoto();return false"><span data-i18n="ctxCopyPhoto">Копировать фото</span> <span><i class="fa-solid fa-copy"></i></span></div>`
  ],
  [
    `onmousedown="ctxStickerPack();return false">Стикерпак <span><i class="fa-solid fa-icons"></i></span></div>`,
    `onmousedown="ctxStickerPack();return false"><span data-i18n="ctxStickerpack">Стикерпак</span> <span><i class="fa-solid fa-icons"></i></span></div>`
  ],
  [
    `onmousedown="ctxPin();return false">Закрепить <span><i class="fa-solid fa-thumbtack"></i></span></div>`,
    `onmousedown="ctxPin();return false"><span data-i18n="ctxPin">Закрепить</span> <span><i class="fa-solid fa-thumbtack"></i></span></div>`
  ],
  [
    `onmousedown="ctxDelete();return false">Удалить <span><i class="fa-solid fa-trash"></i></span></div>`,
    `onmousedown="ctxDelete();return false"><span data-i18n="ctxDelete">Удалить</span> <span><i class="fa-solid fa-trash"></i></span></div>`
  ],

  // Context formatting menu
  [
    `onmousedown="fmtApply('bold');return false">Жирный <span><i class="fa-solid fa-bold"></i></span></div>`,
    `onmousedown="fmtApply('bold');return false"><span data-i18n="ctxBold">Жирный</span> <span><i class="fa-solid fa-bold"></i></span></div>`
  ],
  [
    `onmousedown="fmtApply('italic');return false">Курсив <span><i class="fa-solid fa-italic"></i></span></div>`,
    `onmousedown="fmtApply('italic');return false"><span data-i18n="ctxItalic">Курсив</span> <span><i class="fa-solid fa-italic"></i></span></div>`
  ],
  [
    `onmousedown="fmtApply('underline');return false">Подчёркнутый <span><i class="fa-solid fa-underline"></i></span></div>`,
    `onmousedown="fmtApply('underline');return false"><span data-i18n="ctxUnderline">Подчёркнутый</span> <span><i class="fa-solid fa-underline"></i></span></div>`
  ],
  [
    `onmousedown="fmtApply('strike');return false">Зачёркнутый <span><i class="fa-solid fa-strikethrough"></i></span></div>`,
    `onmousedown="fmtApply('strike');return false"><span data-i18n="ctxStrike">Зачёркнутый</span> <span><i class="fa-solid fa-strikethrough"></i></span></div>`
  ],

  // Context chat menu
  [
    `onmousedown="ctxChatPin();return false">Закрепить чат <span><i class="fa-solid fa-thumbtack"></i></span></div>`,
    `onmousedown="ctxChatPin();return false"><span data-i18n="ctxPinChat">Закрепить чат</span> <span><i class="fa-solid fa-thumbtack"></i></span></div>`
  ],
  [
    `onmousedown="ctxChatFolder();return false">В папку <span><i class="fa-solid fa-folder-plus"></i></span></div>`,
    `onmousedown="ctxChatFolder();return false"><span data-i18n="ctxToFolder">В папку</span> <span><i class="fa-solid fa-folder-plus"></i></span></div>`
  ],
  [
    `onmousedown="ctxChatArchive();return false">Архивировать <span><i class="fa-solid fa-box-archive"></i></span></div>`,
    `onmousedown="ctxChatArchive();return false"><span data-i18n="ctxArchive">Архивировать</span> <span><i class="fa-solid fa-box-archive"></i></span></div>`
  ],
  [
    `onmousedown="ctxChatMute();return false">Откл. уведомления <span><i class="fa-solid fa-bell-slash"></i></span></div>`,
    `onmousedown="ctxChatMute();return false"><span data-i18n="ctxMute">Откл. уведомления</span> <span><i class="fa-solid fa-bell-slash"></i></span></div>`
  ],
  [
    `onmousedown="ctxChatLeave();return false">Покинуть/удалить <span><i class="fa-solid fa-arrow-right-from-bracket"></i></span></div>`,
    `onmousedown="ctxChatLeave();return false"><span data-i18n="ctxLeaveDelete">Покинуть/удалить</span> <span><i class="fa-solid fa-arrow-right-from-bracket"></i></span></div>`
  ],

  // About app modal
  [
    `<div class="mhead"><h3>О приложении</h3>`,
    `<div class="mhead"><h3 data-i18n="appInfoTitle">О приложении</h3>`
  ],
  [
    `<div class="app-info-label">Год выпуска</div>`,
    `<div class="app-info-label" data-i18n="yearLabel">Год выпуска</div>`
  ],
  [
    `<div class="app-info-label">Разработчик</div>`,
    `<div class="app-info-label" data-i18n="devLabel">Разработчик</div>`
  ],
  [
    `<div class="app-info-label">Версия</div>`,
    `<div class="app-info-label" data-i18n="versionLabel">Версия</div>`
  ],
  [
    `style="text-align:center;margin-top:18px;font-size:12px;color:var(--text2)">© 2026 ООО Беспонтовый Пирожок ™. Все права защищены.</div>`,
    `style="text-align:center;margin-top:18px;font-size:12px;color:var(--text2)" data-i18n="copyright">© 2026 ООО Беспонтовый Пирожок ™. Все права защищены.</div>`
  ],

  // Incoming call overlay
  [
    `<span class="ic-sub-dot"></span><span id="icType">Входящий звонок</span>`,
    `<span class="ic-sub-dot"></span><span id="icType" data-i18n="incomingCall">Входящий звонок</span>`
  ],
  [
    `<span class="ic-btn-label">Отклонить</span>`,
    `<span class="ic-btn-label" data-i18n="decline">Отклонить</span>`
  ],

  // Edit profile & info
  [
    `<div class="mhead"><h3>Изменить профиль</h3>`,
    `<div class="mhead"><h3 data-i18n="editProfile">Изменить профиль</h3>`
  ],
  [
    `title="Нажмите чтобы скопировать">`,
    `title="Нажмите чтобы скопировать" data-i18n-title="clickToCopy">`
  ],
  [
    `<div class="tgp-row-lbl">Юзернейм</div>`,
    `<div class="tgp-row-lbl" data-i18n="username">Юзернейм</div>`
  ],
  [
    `<span class="tgp-row-icon">💬</span>Написать сообщение</button>`,
    `<span class="tgp-row-icon">💬</span><span data-i18n="sendMsgBtn">Написать сообщение</span></button>`
  ],
  [
    `<span class="tgp-row-icon">👤</span>Добавить в друзья</button>`,
    `<span class="tgp-row-icon">👤</span><span data-i18n="addFriendBtn">Добавить в друзья</span></button>`
  ],
  [
    `<div class="mhead"><h3><i class="fa-solid fa-gear"></i> Группа</h3>`,
    `<div class="mhead"><h3><i class="fa-solid fa-gear"></i> <span data-i18n="groupTitle">Группа</span></h3>`
  ],
  [
    `<div class="mlabel" style="margin-top:14px">УЧАСТНИКИ (`,
    `<div class="mlabel" style="margin-top:14px"><span data-i18n="membersLabel">УЧАСТНИКИ</span> (`
  ],
  [
    `onclick="deleteGroup()">🗑 Удалить группу</button>`,
    `onclick="deleteGroup()" data-i18n="deleteGroup">🗑 Удалить группу</button>`
  ],
  [
    `<div class="mhead"><h3><i class="fa-solid fa-user-plus"></i> Добавить друга</h3>`,
    `<div class="mhead"><h3><i class="fa-solid fa-user-plus"></i> <span data-i18n="addFriendTitle">Добавить друга</span></h3>`
  ],
  [
    `onclick="addFriend()">Отправить заявку</button>`,
    `onclick="addFriend()" data-i18n="sendReqBtn">Отправить заявку</button>`
  ],
  [
    `<div class="mhead"><h3><i class="fa-solid fa-users"></i> Новая группа</h3>`,
    `<div class="mhead"><h3><i class="fa-solid fa-users"></i> <span data-i18n="newGroupTitle">Новая группа</span></h3>`
  ],
  [
    `<h3 id="fileUploadTitle"><i class="fa-regular fa-image"></i> Загрузить фото</h3>`,
    `<h3 id="fileUploadTitle"><i class="fa-regular fa-image"></i> <span data-i18n="uploadPhotoTitle">Загрузить фото</span></h3>`
  ],
  [
    `letter-spacing:.03em;text-transform:uppercase">🔖 Из избранного</span>`,
    `letter-spacing:.03em;text-transform:uppercase" data-i18n="fromFavorites">🔖 Из избранного</span>`
  ],
  [
    `<div class="mhead"><h3><i class="fa-solid fa-thumbtack"></i> Закреплённые сообщения</h3>`,
    `<div class="mhead"><h3><i class="fa-solid fa-thumbtack"></i> <span data-i18n="pinnedPlural">Закреплённые сообщения</span></h3>`
  ],
  [
    `<div class="mhead"><h3><i class="fa-solid fa-chart-bar"></i> Новый опрос</h3>`,
    `<div class="mhead"><h3><i class="fa-solid fa-chart-bar"></i> <span data-i18n="newPollTitle">Новый опрос</span></h3>`
  ],
  [
    `letter-spacing:.5px;margin-bottom:8px">ВОПРОС</div>`,
    `letter-spacing:.5px;margin-bottom:8px" data-i18n="pollQuestionLabel">ВОПРОС</div>`
  ],
  [
    `letter-spacing:.5px">ВАРИАНТЫ ОТВЕТА</div>`,
    `letter-spacing:.5px" data-i18n="pollAnswersLabel">ВАРИАНТЫ ОТВЕТА</div>`
  ],
  [
    `<span>Добавить ответ...</span>`,
    `<span data-i18n="addAnswerPh">Добавить ответ...</span>`
  ],
  [
    `<div style="font-size:11px;color:var(--text2);margin-top:6px;margin-bottom:2px" id="pollAddNote">Можно добавить ещё <span id="pollAddCount">10</span> вариантов ответа.</div>`,
    `<div style="font-size:11px;color:var(--text2);margin-top:6px;margin-bottom:2px" id="pollAddNote"><span data-i18n="canAddMoreAnswers">Можно добавить ещё</span> <span id="pollAddCount">10</span> <span data-i18n="answerOptionsCount">вариантов ответа.</span></div>`
  ],
  [
    `letter-spacing:.5px;margin-bottom:12px">НАСТРОЙКИ</div>`,
    `letter-spacing:.5px;margin-bottom:12px" data-i18n="pollSettingsLabel">НАСТРОЙКИ</div>`
  ],
  [
    `<h3 id="packModalTitle"><i class="fa-regular fa-heart"></i> Создать стикерпак</h3>`,
    `<h3 id="packModalTitle"><i class="fa-regular fa-heart"></i> <span data-i18n="createStickerpack">Создать стикерпак</span></h3>`
  ],
  [
    `onclick="document.getElementById('packIconFile').click()">Загрузить иконку</button>`,
    `onclick="document.getElementById('packIconFile').click()" data-i18n="uploadIcon">Загрузить иконку</button>`
  ],
  [
    `onclick="document.getElementById('stickerFileInput').click()">＋ Добавить картинку</button>`,
    `onclick="document.getElementById('stickerFileInput').click()" data-i18n="addImageBtn">＋ Добавить картинку</button>`
  ],
  [
    `Добавьте картинки, GIF, анимированные WebP или короткие видео — каждый файл станет стикером.<br>Под каждым укажите эмодзи (как в @fStikBot).`,
    `<span data-i18n="packEmptyHint1">Добавьте картинки, GIF, анимированные WebP или короткие видео — каждый файл станет стикером.</span><br><span data-i18n="packEmptyHint2">Под каждым укажите эмодзи (как в @fStikBot).</span>`
  ],
  [
    `onclick="deletePackPermanently(editingPackId)">🗑 Удалить пак</button>`,
    `onclick="deletePackPermanently(editingPackId)" data-i18n="deletePack">🗑 Удалить пак</button>`
  ],
  [
    `onclick="closeModal('modal-forward')">Отмена</button>`,
    `onclick="closeModal('modal-forward')" data-i18n="cancel">Отмена</button>`
  ],
  [
    `<div class="mhead"><h3><i class="fa-solid fa-folder"></i> Управление папками</h3>`,
    `<div class="mhead"><h3><i class="fa-solid fa-folder"></i> <span data-i18n="manageFolders">Управление папками</span></h3>`
  ],
  [
    `<div class="mhead"><h3><i class="fa-solid fa-folder-plus"></i> Добавить в папку</h3>`,
    `<div class="mhead"><h3><i class="fa-solid fa-folder-plus"></i> <span data-i18n="addToFolder">Добавить в папку</span></h3>`
  ],
  [
    `<span class="ns-pill-label">Шумоподавление <span class="ns-pill-badge" id="nsPillBadge">OFF</span></span>`,
    `<span class="ns-pill-label"><span data-i18n="nsTitle">Шумоподавление</span> <span class="ns-pill-badge" id="nsPillBadge">OFF</span></span>`
  ],
  [
    `<span>АУДИО ПОТОК</span>`,
    `<span data-i18n="nsAudioStream">АУДИО ПОТОК</span>`
  ],
  [
    `<div class="ns-slider-labels"><span>Мягко</span><span>Сбалансировано</span><span>Максимум</span></div>`,
    `<div class="ns-slider-labels"><span data-i18n="nsSoft">Мягко</span><span data-i18n="nsBalanced">Сбалансировано</span><span data-i18n="nsMax">Максимум</span></div>`
  ]
];

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  let applied = 0;
  for (const [target, replacement] of EXACT_REPLACEMENTS) {
    if (code.includes(target)) {
      code = code.split(target).join(replacement);
      applied++;
    }
  }
  console.log(`✓ Applied ${applied} exact replacements in ${filePath}`);

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

console.log('\nAll targets updated with 100% precision!');
