// server/apply-localization-and-oswald.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

const OSWALD_FONT_HEAD = `  <!-- Google Font: Oswald -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">`;

const I18N_CODE = `
    /* ═══ I18N LOCALIZATION ENGINE ═══ */
    const I18N = {
      ru: {
        appTitle: 'Беспонтовый Чат',
        tm: '™',
        folders: 'Папки',
        changeTheme: 'Сменить тему',
        changeLang: 'Язык интерфейса',
        online: 'В сети',
        offline: 'Не в сети',
        loading: 'Загрузка…',
        friendBtn: '+ Друга',
        groupBtn: '+ Группу',
        searchPh: 'Поиск по юзернейму или группе...',
        all: 'ВСЕ',
        dm: 'ЛС',
        groups: 'ГРУППЫ',
        reqs: 'ЗАЯВКИ',
        typeMsgPh: 'Сообщение...',
        send: 'Отправить',
        pinned: 'Закреплённое сообщение',
        call: 'Позвонить',
        searchInChat: 'Поиск в чате',
        details: 'Подробнее',
        emoji: 'Эмодзи',
        customEmoji: 'Свои эмодзи',
        stickers: 'Стикеры',
        gif: 'GIF',
        createPack: '＋ Создать стикерпак',
        editProfile: 'Изменить профиль',
        about: 'О себе',
        username: 'Юзернейм',
        contacts: 'Контакты',
        birthday: 'День рождения',
        privacy: 'Конфиденциальность',
        hideLastSeen: 'Скрывать время входа',
        hideLastSeenHint: 'Другие не увидят когда вы были в сети',
        yourUid: 'Ваш UID',
        language: 'Язык интерфейса',
        save: 'Сохранить',
        cancel: 'Отмена',
        logout: 'Выйти из аккаунта',
        sendMsg: 'Написать сообщение',
        addFriend: 'Добавить в друзья',
        groupTitle: 'Группа',
        groupNamePh: 'Название группы',
        groupDescPh: 'Описание...',
        typing: 'печатает...',
        members: 'участников'
      },
      en: {
        appTitle: 'Nonsense Chat',
        tm: '™',
        folders: 'Folders',
        changeTheme: 'Change theme',
        changeLang: 'Interface language',
        online: 'Online',
        offline: 'Offline',
        loading: 'Loading…',
        friendBtn: '+ Friend',
        groupBtn: '+ Group',
        searchPh: 'Search by username or group...',
        all: 'ALL',
        dm: 'DM',
        groups: 'GROUPS',
        reqs: 'REQUESTS',
        typeMsgPh: 'Message...',
        send: 'Send',
        pinned: 'Pinned message',
        call: 'Call',
        searchInChat: 'Search in chat',
        details: 'Details',
        emoji: 'Emoji',
        customEmoji: 'Custom emoji',
        stickers: 'Stickers',
        gif: 'GIF',
        createPack: '＋ Create stickerpack',
        editProfile: 'Edit profile',
        about: 'About me',
        username: 'Username',
        contacts: 'Contacts',
        birthday: 'Birthday',
        privacy: 'Privacy',
        hideLastSeen: 'Hide last seen',
        hideLastSeenHint: 'Others won’t see when you were online',
        yourUid: 'Your UID',
        language: 'Interface language',
        save: 'Save',
        cancel: 'Cancel',
        logout: 'Log out',
        sendMsg: 'Send message',
        addFriend: 'Add friend',
        groupTitle: 'Group',
        groupNamePh: 'Group name',
        groupDescPh: 'Description...',
        typing: 'is typing...',
        members: 'members'
      },
      uk: {
        appTitle: 'Безпонтовий Чат',
        tm: '™',
        folders: 'Папки',
        changeTheme: 'Змінити тему',
        changeLang: 'Мова інтерфейсу',
        online: 'В мережі',
        offline: 'Не в мережі',
        loading: 'Завантаження…',
        friendBtn: '+ Друга',
        groupBtn: '+ Групу',
        searchPh: 'Пошук за юзернеймом або групою...',
        all: 'ВСІ',
        dm: 'ОП',
        groups: 'ГРУПИ',
        reqs: 'ЗАПИТИ',
        typeMsgPh: 'Повідомлення...',
        send: 'Надіслати',
        pinned: 'Закріплене повідомлення',
        call: 'Подзвонити',
        searchInChat: 'Пошук у чаті',
        details: 'Детальніше',
        emoji: 'Емодзі',
        customEmoji: 'Свої емодзі',
        stickers: 'Стікери',
        gif: 'GIF',
        createPack: '＋ Створити стікерпак',
        editProfile: 'Редагувати профіль',
        about: 'Про себе',
        username: 'Юзернейм',
        contacts: 'Контакти',
        birthday: 'День народження',
        privacy: 'Конфіденційність',
        hideLastSeen: 'Приховувати час входу',
        hideLastSeenHint: 'Інші не побачать коли ви були в мережі',
        yourUid: 'Ваш UID',
        language: 'Мова інтерфейсу',
        save: 'Зберегти',
        cancel: 'Скасувати',
        logout: 'Вийти з акаунта',
        sendMsg: 'Написати повідомлення',
        addFriend: 'Додати в друзі',
        groupTitle: 'Група',
        groupNamePh: 'Назва групи',
        groupDescPh: 'Опис...',
        typing: 'друкує...',
        members: 'учасників'
      },
      'ru-pre': {
        appTitle: 'Безпонтовый Чатъ',
        tm: '™',
        folders: 'Папки',
        changeTheme: 'Перемѣнить тему',
        changeLang: 'Языкъ интерфейса',
        online: 'Въ сѣти',
        offline: 'Не въ сѣти',
        loading: 'Загрузка…',
        friendBtn: '+ Друга',
        groupBtn: '+ Группу',
        searchPh: 'Поискъ по юзернейму или группѣ...',
        all: 'ВСѢ',
        dm: 'ЛС',
        groups: 'ГРУППЫ',
        reqs: 'ЗАЯВКИ',
        typeMsgPh: 'Сообщенiе...',
        send: 'Отправить',
        pinned: 'Закрѣпленное сообщенiе',
        call: 'Позвонить',
        searchInChat: 'Поискъ въ чатѣ',
        details: 'Подробнѣе',
        emoji: 'Эмодзи',
        customEmoji: 'Свои эмодзи',
        stickers: 'Стикеры',
        gif: 'GIF',
        createPack: '＋ Создать стикерпакъ',
        editProfile: 'Измѣнить профиль',
        about: 'О себѣ',
        username: 'Юзернеймъ',
        contacts: 'Контакты',
        birthday: 'День рожденiя',
        privacy: 'Конфиденцiальность',
        hideLastSeen: 'Скрывать время входа',
        hideLastSeenHint: 'Прочiе не узрятъ, когда вы были въ сѣти',
        yourUid: 'Вашъ UID',
        language: 'Языкъ интерфейса',
        save: 'Сохранить',
        cancel: 'Отмѣна',
        logout: 'Выйти изъ аккаунта',
        sendMsg: 'Написать сообщенiе',
        addFriend: 'Добавить въ друзья',
        groupTitle: 'Группа',
        groupNamePh: 'Названiе группы',
        groupDescPh: 'Описанiе...',
        typing: 'пишетъ...',
        members: 'участниковъ'
      }
    };

    let curLang = localStorage.getItem('appLang') || 'ru';
    if (!I18N[curLang]) curLang = 'ru';

    function t(key, fallback = '') {
      const dict = I18N[curLang] || I18N.ru;
      if (dict && dict[key] != null) return dict[key];
      return (I18N.ru && I18N.ru[key] != null) ? I18N.ru[key] : fallback;
    }
    window.t = t;

    function setLanguage(lang) {
      if (!I18N[lang]) lang = 'ru';
      curLang = lang;
      localStorage.setItem('appLang', lang);
      document.documentElement.lang = (lang === 'uk' ? 'uk' : lang === 'en' ? 'en' : 'ru');

      const dict = I18N[lang] || I18N.ru;

      // 1. Static text with data-i18n
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.dataset.i18n;
        if (dict[k]) el.textContent = dict[k];
      });

      // 2. Placeholders with data-i18n-ph
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const k = el.dataset.i18nPh;
        if (dict[k]) el.placeholder = dict[k];
      });

      // 3. Titles with data-i18n-title
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const k = el.dataset.i18nTitle;
        if (dict[k]) el.title = dict[k];
      });

      // 4. Update dropdowns
      document.querySelectorAll('.lang-opt').forEach(el => {
        el.classList.toggle('active', el.id === 'lopt-' + lang);
      });
      const mpLang = document.getElementById('mpLang');
      if (mpLang) mpLang.value = lang;

      // 5. Update logo
      const logos = document.querySelectorAll('.logo-text-name, .auth-logo-name');
      logos.forEach(l => {
        if (!l.classList.contains('non-title')) l.textContent = dict.appTitle;
      });

      // 6. Update main tabs
      const tabAll = document.getElementById('tab-all'); if (tabAll) tabAll.textContent = dict.all;
      const tabDm = document.getElementById('tab-dm'); if (tabDm) tabDm.textContent = dict.dm;
      const tabGroups = document.getElementById('tab-groups'); if (tabGroups) tabGroups.textContent = dict.groups;
      const tabReqs = document.getElementById('tab-reqs'); if (tabReqs) tabReqs.textContent = dict.reqs;

      // 7. Update action buttons
      const friendBtn = document.querySelector('.action-btns button:first-child');
      if (friendBtn) friendBtn.textContent = dict.friendBtn;
      const groupBtn = document.querySelector('.action-btns button:last-child');
      if (groupBtn) groupBtn.textContent = dict.groupBtn;

      // 8. Update input ph
      const msgInp = document.getElementById('msgInput');
      if (msgInp) msgInp.placeholder = dict.typeMsgPh;
      const searchInp = document.getElementById('searchInput');
      if (searchInp) searchInp.placeholder = dict.searchPh;

      // 9. Update status if user has no custom bio
      const mySub = document.getElementById('mySub');
      if (mySub && (!window.me || !window.me.bio)) mySub.textContent = dict.online;

      // Закрываем меню языка
      const lp = document.getElementById('langPicker');
      if (lp) lp.classList.remove('open');
    }
    window.setLanguage = setLanguage;

    function toggleLangPicker(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      const tp = document.getElementById('themePicker');
      if (tp) tp.classList.remove('open');
      const lp = document.getElementById('langPicker');
      if (lp) lp.classList.toggle('open');
    }
    window.toggleLangPicker = toggleLangPicker;
`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) {
    console.log('Skipping (not found):', filePath);
    continue;
  }

  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Добавляем Google Font Oswald в <head>
  if (!code.includes('fonts.googleapis.com/css2?family=Oswald')) {
    code = code.replace('<link rel="stylesheet"', OSWALD_FONT_HEAD + '\n  <link rel="stylesheet"');
    console.log('Added Oswald font link in <head> in:', filePath);
  }

  // 2. Добавляем стиль для шрифта Oswald на логотипе и кнопках языка в <style>
  const OSWALD_CSS = `
    /* ═══ OSWALD FONT FOR APP LOGO & TITLES ═══ */
    .logo-text-name {
      font-family: 'Oswald', sans-serif !important;
      font-size: 18px !important;
      font-weight: 700 !important;
      letter-spacing: 0.6px !important;
      text-transform: uppercase !important;
      line-height: 1.15;
      background: var(--grad) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      transition: transform .2s ease;
    }
    .logo-wrap:hover .logo-text-name {
      transform: scale(1.02);
    }
    .auth-logo-name {
      font-family: 'Oswald', sans-serif !important;
      font-size: 26px !important;
      font-weight: 700 !important;
      letter-spacing: 0.6px !important;
      text-transform: uppercase !important;
    }
    .lang-opt {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 13px;
      cursor: pointer;
      border-radius: 11px;
      font-size: 13px;
      transition: background .12s;
      white-space: nowrap;
    }
    .lang-opt:hover {
      background: var(--hover);
    }
    .lang-opt.active {
      background: var(--hover);
      font-weight: 700;
      color: var(--acc, #64b5f6);
    }
`;
  if (!code.includes('/* ═══ OSWALD FONT FOR APP LOGO & TITLES ═══ */')) {
    code = code.replace('</style>', OSWALD_CSS + '\n</style>');
    console.log('Added OSWALD_CSS in:', filePath);
  }

  // 3. Добавляем кнопку языка langBtn и выпадающее меню langPicker в .sidebar-top
  if (!code.includes('id="langBtn"')) {
    const oldBtns = `<button class="iBtn" id="themeBtn" onclick="toggleThemePicker(event)" title="Сменить тему">🎨</button>`;
    const newBtns = `<button class="iBtn" id="themeBtn" onclick="toggleThemePicker(event)" title="Сменить тему" data-i18n-title="changeTheme">🎨</button>
      <button class="iBtn" id="langBtn" onclick="toggleLangPicker(event)" title="Сменить язык" data-i18n-title="changeLang">🌐</button>`;

    if (code.includes(oldBtns)) {
      code = code.replace(oldBtns, newBtns);
    } else {
      // Ищем themeBtn
      code = code.replace(/<button class="iBtn"[^>]*id="themeBtn"[^>]*>🎨<\/button>/, newBtns);
    }

    const langPickerHtml = `      <div class="theme-picker" id="langPicker" style="right:8px;top:54px;">
        <div class="theme-opt lang-opt active" id="lopt-ru" onclick="setLanguage('ru')">🇷🇺 Русский</div>
        <div class="theme-opt lang-opt" id="lopt-en" onclick="setLanguage('en')">🇬🇧 English</div>
        <div class="theme-opt lang-opt" id="lopt-uk" onclick="setLanguage('uk')">🇺🇦 Українська</div>
        <div class="theme-opt lang-opt" id="lopt-ru-pre" onclick="setLanguage('ru-pre')">📜 Русскій дореформенный</div>
      </div>`;

    // Вставляем langPicker сразу после themePicker
    const tpEndIdx = code.indexOf('</div>\n    </div>\n    <div class="profile-row"');
    if (tpEndIdx > 0) {
      code = code.slice(0, tpEndIdx + 6) + '\n' + langPickerHtml + code.slice(tpEndIdx + 6);
    } else {
      const tpIdx = code.indexOf('id="themePicker"');
      if (tpIdx > 0) {
        const afterTp = code.indexOf('</div>', tpIdx);
        code = code.slice(0, afterTp + 6) + '\n' + langPickerHtml + code.slice(afterTp + 6);
      }
    }
    console.log('Added langBtn and langPicker HTML in:', filePath);
  }

  // 4. Добавляем селектор языка в modal-myprofile
  if (!code.includes('id="mpLang"')) {
    const langCard = `        <div class="tgme-card">
          <div class="tgme-card-title" data-i18n="language">Язык интерфейса</div>
          <div class="tgme-field">
            <select id="mpLang" class="mf" style="margin-bottom:0" onchange="setLanguage(this.value)">
              <option value="ru">🇷🇺 Русский</option>
              <option value="en">🇬🇧 English</option>
              <option value="uk">🇺🇦 Українська</option>
              <option value="ru-pre">📜 Русскій дореформенный</option>
            </select>
          </div>
        </div>`;
    const uidCardIdx = code.indexOf('<div class="tgme-card-title">Ваш UID</div>');
    if (uidCardIdx > 0) {
      const parentCardStart = code.lastIndexOf('<div class="tgme-card">', uidCardIdx);
      code = code.slice(0, parentCardStart) + langCard + '\n\n        ' + code.slice(parentCardStart);
      console.log('Added mpLang card in modal-myprofile in:', filePath);
    }
  }

  // 5. Вставляем движок I18N_CODE перед функцией applyTheme
  if (!code.includes('/* ═══ I18N LOCALIZATION ENGINE ═══ */')) {
    const themeIdx = code.indexOf('/* ═══ THEME ═══ */');
    if (themeIdx > 0) {
      code = code.slice(0, themeIdx) + I18N_CODE + '\n    ' + code.slice(themeIdx);
      console.log('Added I18N_CODE in:', filePath);
    }
  }

  // 6. Обновляем toggleThemePicker чтобы он закрывал langPicker
  if (code.includes('function toggleThemePicker(e) {') && !code.includes('langPicker')) {
    code = code.replace(
      'function toggleThemePicker(e) { e.stopPropagation(); document.getElementById(\'themePicker\').classList.toggle(\'open\'); }',
      'function toggleThemePicker(e) { if(e&&e.stopPropagation)e.stopPropagation(); const lp=document.getElementById(\'langPicker\'); if(lp)lp.classList.remove(\'open\'); const tp=document.getElementById(\'themePicker\'); if(tp)tp.classList.toggle(\'open\'); }'
    );
    console.log('Updated toggleThemePicker in:', filePath);
  }

  // 7. Обновляем закрытие langPicker по клику вне и по Escape
  if (code.includes("document.getElementById('themePicker').classList.remove('open');") && !code.includes("const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');")) {
    code = code.replace(
      "document.getElementById('themePicker').classList.remove('open');",
      "document.getElementById('themePicker').classList.remove('open'); const lp = document.getElementById('langPicker'); if (lp) lp.classList.remove('open');"
    );
    console.log('Updated click outside & escape handler for langPicker in:', filePath);
  }

  // 8. Вызываем setLanguage(curLang) при старте (в enterApp или после init)
  if (code.includes('applyTheme(curTheme);') && !code.includes('setLanguage(curLang);')) {
    code = code.replace('applyTheme(curTheme);', 'applyTheme(curTheme); setLanguage(curLang);');
    console.log('Added initial setLanguage call in:', filePath);
  }

  // 9. В openMyProfile() выставляем mpLang.value = curLang
  if (code.includes("function openMyProfile() {") && !code.includes("document.getElementById('mpLang').value = curLang;")) {
    code = code.replace(
      "document.getElementById('mpBio').value = me.bio || '';",
      "document.getElementById('mpBio').value = me.bio || ''; const _mpl = document.getElementById('mpLang'); if (_mpl) _mpl.value = curLang;"
    );
    console.log('Updated openMyProfile to populate mpLang in:', filePath);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Saved:', filePath);

  // Валидация синтаксиса
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptCount = 0;
  while ((match = scriptRegex.exec(code)) !== null) {
    const scriptBody = match[1];
    scriptCount++;
    try {
      new vm.Script(scriptBody);
    } catch (e) {
      console.error(`Syntax error in script #${scriptCount} of ${filePath}:`, e.message);
      process.exit(1);
    }
  }
  console.log(`Validated ${scriptCount} scripts in ${filePath}: ALL OK!`);
}

console.log('All done apply-localization-and-oswald.js!');
