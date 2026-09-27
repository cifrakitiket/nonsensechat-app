// server/tag-i18n-html.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let c = fs.readFileSync(filePath, 'utf8');

  // Tag sidebar logo, buttons, tabs
  c = c.replace('<div class="logo-text-name">Беспонтовый Чат</div>', '<div class="logo-text-name" data-i18n="appTitle">Беспонтовый Чат</div>');
  c = c.replace('<div class="tab active" id="tab-all" onclick="setTab(\'all\')">ВСЕ</div>', '<div class="tab active" id="tab-all" onclick="setTab(\'all\')" data-i18n="all">ВСЕ</div>');
  c = c.replace('<div class="tab" id="tab-dm" onclick="setTab(\'dm\')">ЛС</div>', '<div class="tab" id="tab-dm" onclick="setTab(\'dm\')" data-i18n="dm">ЛС</div>');
  c = c.replace('<div class="tab" id="tab-groups" onclick="setTab(\'groups\')">ГРУППЫ</div>', '<div class="tab" id="tab-groups" onclick="setTab(\'groups\')" data-i18n="groups">ГРУППЫ</div>');
  c = c.replace('<div class="tab" id="tab-reqs" onclick="setTab(\'reqs\')">ЗАЯВКИ</div>', '<div class="tab" id="tab-reqs" onclick="setTab(\'reqs\')" data-i18n="reqs">ЗАЯВКИ</div>');

  c = c.replace('<button class="action-btn" onclick="openModal(\'modal-friend\')">+ Друга</button>', '<button class="action-btn" onclick="openModal(\'modal-friend\')" data-i18n="friendBtn">+ Друга</button>');
  c = c.replace('<button class="action-btn" onclick="openModal(\'modal-group\')">+ Группу</button>', '<button class="action-btn" onclick="openModal(\'modal-group\')" data-i18n="groupBtn">+ Группу</button>');

  // Modals labels
  c = c.replace('<div class="tgme-hint">Например: 23 года, дизайнер из Москвы. Любые подробности о себе.</div>', '<div class="tgme-hint" data-i18n="aboutHint">Например: 23 года, дизайнер из Москвы. Любые подробности о себе.</div>');
  c = c.replace('<div class="tgme-card-title">Юзернейм</div>', '<div class="tgme-card-title" data-i18n="username">Юзернейм</div>');
  c = c.replace('<div class="tgme-hint">По юзернейму вас смогут находить другие пользователи.</div>', '<div class="tgme-hint" data-i18n="usernameHint">По юзернейму вас смогут находить другие пользователи.</div>');
  c = c.replace('<div class="tgme-card-title">Контакты</div>', '<div class="tgme-card-title" data-i18n="contacts">Контакты</div>');
  c = c.replace('<div class="tgme-card-title">Конфиденциальность</div>', '<div class="tgme-card-title" data-i18n="privacy">Конфиденциальность</div>');
  c = c.replace('<div style="font-size:13.5px;font-weight:600">Скрывать время входа</div>', '<div style="font-size:13.5px;font-weight:600" data-i18n="hideLastSeen">Скрывать время входа</div>');
  c = c.replace('<div style="font-size:11.5px;color:var(--text2);margin-top:2px">Другие не увидят когда вы были в сети', '<div style="font-size:11.5px;color:var(--text2);margin-top:2px" data-i18n="hideLastSeenHint">Другие не увидят когда вы были в сети');
  c = c.replace('<div class="tgme-card-title">Ваш UID</div>', '<div class="tgme-card-title" data-i18n="yourUid">Ваш UID</div>');

  // Group settings
  c = c.replace('<div class="mlabel">НАЗВАНИЕ</div><input class="mf" id="gsName"', '<div class="mlabel" data-i18n="groupName">НАЗВАНИЕ</div><input class="mf" id="gsName"');
  c = c.replace('<div class="mlabel">ОПИСАНИЕ</div><textarea class="mf" id="gsDesc"', '<div class="mlabel" data-i18n="groupDesc">ОПИСАНИЕ</div><textarea class="mf" id="gsDesc"');
  c = c.replace('<div class="mlabel">ПРИВАТНОСТЬ</div>', '<div class="mlabel" data-i18n="groupPrivacy">ПРИВАТНОСТЬ</div>');
  c = c.replace('<option value="public">Публичная</option>', '<option value="public" data-i18n="public">Публичная</option>');
  c = c.replace('<option value="private">Приватная</option>', '<option value="private" data-i18n="private">Приватная</option>');
  c = c.replace('<div class="mlabel">ДОБАВИТЬ УЧАСТНИКА</div>', '<div class="mlabel" data-i18n="addMember">ДОБАВИТЬ УЧАСТНИКА</div>');
  c = c.replace('<div class="mlabel">ФОТОГРАФИИ</div>', '<div class="mlabel" data-i18n="photos">ФОТОГРАФИИ</div>');
  c = c.replace('<button class="mbtn red" style="margin-top:8px" onclick="leaveGroup()">Покинуть группу</button>', '<button class="mbtn red" style="margin-top:8px" onclick="leaveGroup()" data-i18n="leaveGroup">Покинуть группу</button>');
  c = c.replace('Удалить группу</button>', 'Удалить группу</button>');

  // Create pack
  c = c.replace('<div class="mlabel">НАЗВАНИЕ ПАКА</div>', '<div class="mlabel" data-i18n="packTitleLabel">НАЗВАНИЕ ПАКА</div>');
  c = c.replace('<div class="mlabel" style="margin-top:14px">ИКОНКА НАБОРА</div>', '<div class="mlabel" style="margin-top:14px" data-i18n="packIconLabel">ИКОНКА НАБОРА</div>');
  c = c.replace('<span style="font-size:12px;color:var(--text2)">по умолчанию — первый стикер</span>', '<span style="font-size:12px;color:var(--text2)" data-i18n="packIconHint">по умолчанию — первый стикер</span>');

  // App Info
  c = c.replace('<div class="app-info-lbl">Год выпуска</div>', '<div class="app-info-lbl" data-i18n="yearLabel">Год выпуска</div>');
  c = c.replace('<div class="app-info-lbl">Разработчик</div>', '<div class="app-info-lbl" data-i18n="devLabel">Разработчик</div>');
  c = c.replace('<div class="app-info-lbl">Версия</div>', '<div class="app-info-lbl" data-i18n="versionLabel">Версия</div>');

  // Call overlay buttons
  c = c.replace('<span class="call-btn-lbl">Микрофон</span>', '<span class="call-btn-lbl" data-i18n="mic">Микрофон</span>');
  c = c.replace('<span class="call-btn-lbl">Камера</span>', '<span class="call-btn-lbl" data-i18n="cam">Камера</span>');
  c = c.replace('<span class="call-btn-lbl">Экран</span>', '<span class="call-btn-lbl" data-i18n="screen">Экран</span>');
  c = c.replace('<span class="call-btn-lbl">Пригласить</span>', '<span class="call-btn-lbl" data-i18n="invite">Пригласить</span>');
  c = c.replace('<span class="call-btn-lbl">Покинуть</span>', '<span class="call-btn-lbl" data-i18n="leaveCall">Покинуть</span>');
  c = c.replace('<div class="incoming-call-title">Входящий звонок</div>', '<div class="incoming-call-title" data-i18n="incomingCall">Входящий звонок</div>');
  c = c.replace('<div class="call-action-lbl">Отклонить</div>', '<div class="call-action-lbl" data-i18n="decline">Отклонить</div>');
  c = c.replace('<div class="call-action-lbl">Ответить</div>', '<div class="call-action-lbl" data-i18n="answer">Ответить</div>');

  fs.writeFileSync(filePath, c, 'utf8');

  // Validate syntax
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m, cnt = 0;
  while ((m = scriptRegex.exec(c)) !== null) {
    cnt++;
    new vm.Script(m[1]);
  }
  console.log(filePath, 'Updated tags & validated', cnt, 'scripts OK');
}

console.log('tag-i18n-html done successfully!');
