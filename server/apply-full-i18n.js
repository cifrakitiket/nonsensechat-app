// server/apply-full-i18n.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

// Полный словарь для 4 языков
const FULL_I18N_OBJECT = `
    const I18N = {
      ru: {
        appTitle: 'Беспонтовый Чат',
        tm: '™',
        folders: 'Папки',
        changeTheme: 'Сменить тему',
        changeLang: 'Язык интерфейса',
        themes: {
          dark: 'Тёмная (стандарт)',
          coffeeDark: 'Кофейная тёмная',
          coffeeLight: 'Кофейная светлая',
          moss: 'Моховая тёмная'
        },
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
        createEmoji: '＋ Создать эмодзи',
        emptyStickers: 'У вас пока нет стикеров.\\nНажмите ＋ внизу, чтобы создать пак, или нажмите на присланный стикер, чтобы добавить чужой.',
        emptyCustomEmoji: 'У вас пока нет своих эмодзи.\\nСоздайте свой набор картинок или GIF!',
        editProfile: 'Изменить профиль',
        about: 'О себе',
        aboutPh: 'О себе',
        aboutHint: 'Например: 23 года, дизайнер из Москвы. Любые подробности о себе.',
        username: 'Юзернейм',
        usernamePh: 'Юзернейм',
        usernameHint: 'По юзернейму вас смогут находить другие пользователи.',
        contacts: 'Контакты',
        phone: 'Телефон',
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
        reqSent: 'Заявка отправлена',
        groupTitle: 'Группа',
        createGroupTitle: 'Создать группу',
        groupName: 'НАЗВАНИЕ',
        groupNamePh: 'Название группы',
        groupDesc: 'ОПИСАНИЕ',
        groupDescPh: 'Описание...',
        groupPrivacy: 'ПРИВАТНОСТЬ',
        public: 'Публичная',
        private: 'Приватная',
        addMember: 'ДОБАВИТЬ УЧАСТНИКА',
        members: 'УЧАСТНИКИ',
        photos: 'ФОТОГРАФИИ',
        leaveGroup: 'Покинуть группу',
        deleteGroup: '🗑 Удалить группу',
        addFriendTitle: 'Добавить друга',
        friendNickPh: 'Юзернейм пользователя',
        sendReqBtn: 'Отправить заявку',
        newPoll: 'Новый опрос',
        pollQ: 'ВОПРОС',
        pollQPh: 'Текст вопроса',
        pollDescPh: 'Описание (необязательно)',
        pollOpts: 'ВАРИАНТЫ ОТВЕТА',
        pollAddOpt: 'Добавить вариант',
        pollSettings: 'НАСТРОЙКИ',
        pollAnon: 'Анонимное голосование',
        pollMulti: 'Выбор нескольких ответов',
        pollCreateBtn: 'Создать опрос',
        forwardTitle: 'Переслать сообщение',
        chooseChat: 'ВЫБЕРИТЕ ЧАТ',
        searchChatPh: 'Поиск чата...',
        forwardBtn: 'Переслать',
        foldersTitle: 'Управление папками',
        createFolder: 'СОЗДАТЬ ПАПКУ',
        folderNamePh: 'Название папки',
        folderIconPh: 'Иконка',
        myFolders: 'МОИ ПАПКИ',
        appInfoTitle: 'О приложении',
        yearLabel: 'Год выпуска',
        devLabel: 'Разработчик',
        versionLabel: 'Версия',
        authLogin: 'Вход',
        authReg: 'Регистрация',
        loginBtn: 'Войти',
        regBtn: 'Зарегистрироваться',
        noAccLink: 'Нет аккаунта? Зарегистрироваться',
        hasAccLink: 'Уже есть аккаунт? Войти',
        confirmEmailTitle: 'Подтвердите почту',
        confirmEmailDesc: 'Почта не подтверждена',
        resendCode: 'Отправить код ещё раз',
        switchAcc: '← Выйти и войти под другим аккаунтом',
        typing: 'печатает...',
        membersCount: 'участников',
        callTitle: 'Звонок',
        joinCall: 'Присоединиться к звонку',
        mic: 'Микрофон',
        cam: 'Камера',
        screen: 'Экран',
        invite: 'Пригласить',
        leaveCall: 'Покинуть звонок',
        incomingCall: 'Входящий звонок',
        answer: 'Ответить',
        decline: 'Отклонить',
        unpin: 'Открепить',
        deleteMsg: 'Удалить сообщение',
        copyText: 'Копировать текст',
        reply: 'Ответить',
        forward: 'Переслать',
        confirmTitle: 'Подтверждение',
        confirmText: 'Вы уверены?',
        ok: 'OK',
        delete: 'Удалить',
        published: 'Опубликовать пак',
        saveChanges: 'Сохранить изменения',
        deletePack: '🗑 Удалить пак',
        deletePermanently: '🗑 Удалить навсегда',
        addPack: 'Добавить пак',
        installed: 'Установлен',
        editPack: '✏️ Редактировать',
        packTitleLabel: 'НАЗВАНИЕ ПАКА',
        packTitlePh: 'Например: Мои мемы',
        packIconLabel: 'ИКОНКА НАБОРА',
        uploadIconBtn: 'Загрузить иконку',
        packIconHint: 'по умолчанию — первый стикер',
        packItemsLabel: 'СТИКЕРЫ',
        packItemsEmojiLabel: 'ЭМОДЗИ',
        addImageBtn: '＋ Добавить картинку',
        addEmojiBtn: '＋ Добавить эмодзи',
        mediaLabel: 'Медиа',
        filesLabel: 'Файлы',
        emptyPhotos: 'Нет недавних фото',
        emptyFiles: 'Нет недавних файлов'
      },

      en: {
        appTitle: 'Nonsense Chat',
        tm: '™',
        folders: 'Folders',
        changeTheme: 'Change theme',
        changeLang: 'Language',
        themes: {
          dark: 'Dark (default)',
          coffeeDark: 'Coffee dark',
          coffeeLight: 'Coffee light',
          moss: 'Moss dark'
        },
        online: 'Online',
        offline: 'Offline',
        loading: 'Loading…',
        friendBtn: '+ Friend',
        groupBtn: '+ Group',
        searchPh: 'Search username or group...',
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
        createEmoji: '＋ Create emoji pack',
        emptyStickers: 'You have no stickers yet.\\nClick ＋ below to create a pack, or tap a sticker in chat to add someone else’s.',
        emptyCustomEmoji: 'You have no custom emojis yet.\\nCreate your own image or GIF pack!',
        editProfile: 'Edit Profile',
        about: 'About me',
        aboutPh: 'About me',
        aboutHint: 'For example: 23 y.o., designer from NYC. Any details about you.',
        username: 'Username',
        usernamePh: 'Username',
        usernameHint: 'Other users can find you by your username.',
        contacts: 'Contacts',
        phone: 'Phone',
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
        reqSent: 'Request sent',
        groupTitle: 'Group',
        createGroupTitle: 'Create group',
        groupName: 'TITLE',
        groupNamePh: 'Group title',
        groupDesc: 'DESCRIPTION',
        groupDescPh: 'Description...',
        groupPrivacy: 'PRIVACY',
        public: 'Public',
        private: 'Private',
        addMember: 'ADD MEMBER',
        members: 'MEMBERS',
        photos: 'PHOTOS',
        leaveGroup: 'Leave group',
        deleteGroup: '🗑 Delete group',
        addFriendTitle: 'Add friend',
        friendNickPh: 'User username',
        sendReqBtn: 'Send request',
        newPoll: 'New poll',
        pollQ: 'QUESTION',
        pollQPh: 'Question text',
        pollDescPh: 'Description (optional)',
        pollOpts: 'OPTIONS',
        pollAddOpt: 'Add option',
        pollSettings: 'SETTINGS',
        pollAnon: 'Anonymous voting',
        pollMulti: 'Multiple answers',
        pollCreateBtn: 'Create poll',
        forwardTitle: 'Forward message',
        chooseChat: 'CHOOSE CHAT',
        searchChatPh: 'Search chat...',
        forwardBtn: 'Forward',
        foldersTitle: 'Manage folders',
        createFolder: 'CREATE FOLDER',
        folderNamePh: 'Folder name',
        folderIconPh: 'Icon',
        myFolders: 'MY FOLDERS',
        appInfoTitle: 'About App',
        yearLabel: 'Release year',
        devLabel: 'Developer',
        versionLabel: 'Version',
        authLogin: 'Sign In',
        authReg: 'Sign Up',
        loginBtn: 'Sign In',
        regBtn: 'Create Account',
        noAccLink: 'No account? Sign up',
        hasAccLink: 'Already have an account? Sign in',
        confirmEmailTitle: 'Verify your email',
        confirmEmailDesc: 'Email not verified',
        resendCode: 'Resend code',
        switchAcc: '← Log out and sign in with another account',
        typing: 'is typing...',
        membersCount: 'members',
        callTitle: 'Call',
        joinCall: 'Join call',
        mic: 'Microphone',
        cam: 'Camera',
        screen: 'Screen',
        invite: 'Invite',
        leaveCall: 'Leave call',
        incomingCall: 'Incoming call',
        answer: 'Answer',
        decline: 'Decline',
        unpin: 'Unpin',
        deleteMsg: 'Delete message',
        copyText: 'Copy text',
        reply: 'Reply',
        forward: 'Forward',
        confirmTitle: 'Confirmation',
        confirmText: 'Are you sure?',
        ok: 'OK',
        delete: 'Delete',
        published: 'Publish pack',
        saveChanges: 'Save changes',
        deletePack: '🗑 Delete pack',
        deletePermanently: '🗑 Delete permanently',
        addPack: 'Add pack',
        installed: 'Added',
        editPack: '✏️ Edit',
        packTitleLabel: 'PACK TITLE',
        packTitlePh: 'For example: My memes',
        packIconLabel: 'PACK ICON',
        uploadIconBtn: 'Upload icon',
        packIconHint: 'default: first sticker',
        packItemsLabel: 'STICKERS',
        packItemsEmojiLabel: 'EMOJI',
        addImageBtn: '＋ Add image',
        addEmojiBtn: '＋ Add emoji',
        mediaLabel: 'Media',
        filesLabel: 'Files',
        emptyPhotos: 'No recent photos',
        emptyFiles: 'No recent files'
      },

      uk: {
        appTitle: 'Безпонтовий Чат',
        tm: '™',
        folders: 'Папки',
        changeTheme: 'Змінити тему',
        changeLang: 'Мова інтерфейсу',
        themes: {
          dark: 'Темна (стандарт)',
          coffeeDark: 'Кавова темна',
          coffeeLight: 'Кавова світла',
          moss: 'Мохова темна'
        },
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
        createEmoji: '＋ Створити емодзі',
        emptyStickers: 'У вас поки немає стікерів.\\nНатисніть ＋ внизу, щоб створити пак, або натисніть на надісланий стікер, щоб додати його собі.',
        emptyCustomEmoji: 'У вас поки немає своїх емодзі.\\nСтворіть свій набір картинок або GIF!',
        editProfile: 'Редагувати профіль',
        about: 'Про себе',
        aboutPh: 'Про себе',
        aboutHint: 'Наприклад: дизайнер із Києва. Будь-які подробиці про себе.',
        username: 'Юзернейм',
        usernamePh: 'Юзернейм',
        usernameHint: 'За юзернеймом вас зможуть знайти інші користувачі.',
        contacts: 'Контакти',
        phone: 'Телефон',
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
        reqSent: 'Запит надіслано',
        groupTitle: 'Група',
        createGroupTitle: 'Створити групу',
        groupName: 'НАЗВА',
        groupNamePh: 'Назва групи',
        groupDesc: 'ОПИС',
        groupDescPh: 'Опис...',
        groupPrivacy: 'ПРИВАТНІСТЬ',
        public: 'Публічна',
        private: 'Приватна',
        addMember: 'ДОДАТИ УЧАСНИКА',
        members: 'УЧАСНИКИ',
        photos: 'ФОТОГРАФІЇ',
        leaveGroup: 'Покинути групу',
        deleteGroup: '🗑 Видалити групу',
        addFriendTitle: 'Додати друга',
        friendNickPh: 'Юзернейм користувача',
        sendReqBtn: 'Надіслати запит',
        newPoll: 'Нове опитування',
        pollQ: 'ПИТАННЯ',
        pollQPh: 'Текст питання',
        pollDescPh: 'Опис (необов\\'язково)',
        pollOpts: 'ВАРІАНТИ ВІДПОВІДІ',
        pollAddOpt: 'Додати варіант',
        pollSettings: 'НАЛАШТУВАННЯ',
        pollAnon: 'Анонімне голосування',
        pollMulti: 'Вибір кількох відповідей',
        pollCreateBtn: 'Створити опитування',
        forwardTitle: 'Переслати повідомлення',
        chooseChat: 'ОБЕРІТЬ ЧАТ',
        searchChatPh: 'Пошук чату...',
        forwardBtn: 'Переслати',
        foldersTitle: 'Керування папками',
        createFolder: 'СТВОРИТИ ПАПКУ',
        folderNamePh: 'Назва папки',
        folderIconPh: 'Іконка',
        myFolders: 'МОЇ ПАПКИ',
        appInfoTitle: 'Про додаток',
        yearLabel: 'Рік випуску',
        devLabel: 'Розробник',
        versionLabel: 'Версія',
        authLogin: 'Вхід',
        authReg: 'Реєстрація',
        loginBtn: 'Увійти',
        regBtn: 'Зареєструватися',
        noAccLink: 'Немає акаунту? Зареєструватися',
        hasAccLink: 'Вже є акаунт? Увійти',
        confirmEmailTitle: 'Підтвердіть пошту',
        confirmEmailDesc: 'Пошта не підтверджена',
        resendCode: 'Надіслати код ще раз',
        switchAcc: '← Вийти та увійти під іншим акаунтом',
        typing: 'друкує...',
        membersCount: 'учасників',
        callTitle: 'Дзвінок',
        joinCall: 'Приєднатися до дзвінка',
        mic: 'Мікрофон',
        cam: 'Камера',
        screen: 'Екран',
        invite: 'Запросити',
        leaveCall: 'Залишити дзвінок',
        incomingCall: 'Вхідний дзвінок',
        answer: 'Відповісти',
        decline: 'Відхилити',
        unpin: 'Відкріпити',
        deleteMsg: 'Видалити повідомлення',
        copyText: 'Копіювати текст',
        reply: 'Відповісти',
        forward: 'Переслати',
        confirmTitle: 'Підтвердження',
        confirmText: 'Ви впевнені?',
        ok: 'OK',
        delete: 'Видалити',
        published: 'Опублікувати пак',
        saveChanges: 'Зберегти зміни',
        deletePack: '🗑 Видалити пак',
        deletePermanently: '🗑 Видалити назавжди',
        addPack: 'Додати пак',
        installed: 'Встановлено',
        editPack: '✏️ Редагувати',
        packTitleLabel: 'НАЗВА ПАКА',
        packTitlePh: 'Наприклад: Мої меми',
        packIconLabel: 'ІКОНКА НАБОРУ',
        uploadIconBtn: 'Завантажити іконку',
        packIconHint: 'за замовчуванням — перший стікер',
        packItemsLabel: 'СТІКЕРИ',
        packItemsEmojiLabel: 'ЕМОДЗІ',
        addImageBtn: '＋ Додати зображення',
        addEmojiBtn: '＋ Додати емодзі',
        mediaLabel: 'Медіа',
        filesLabel: 'Файли',
        emptyPhotos: 'Немає нещодавніх фото',
        emptyFiles: 'Немає нещодавніх файлів'
      },

      'ru-pre': {
        appTitle: 'Безпонтовый Чатъ',
        tm: '™',
        folders: 'Папки',
        changeTheme: 'Перемѣнить тему',
        changeLang: 'Языкъ интерфейса',
        themes: {
          dark: 'Темная (стандартъ)',
          coffeeDark: 'Кофейная темная',
          coffeeLight: 'Кофейная свѣтлая',
          moss: 'Мховая темная'
        },
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
        createEmoji: '＋ Создать наборъ эмодзи',
        emptyStickers: 'У васъ пока нѣтъ стикеровъ.\\nНажмите ＋ внизу, дабы создать пакъ, или нажмите на присланный стикеръ, дабы добавить его.',
        emptyCustomEmoji: 'У васъ пока нѣтъ своихъ эмодзи.\\nСоздайте свой наборъ картинокъ или GIF!',
        editProfile: 'Измѣнить профиль',
        about: 'О себѣ',
        aboutPh: 'О себѣ',
        aboutHint: 'Напримѣръ: художникъ изъ Москвы. Любыя подробности о себѣ.',
        username: 'Юзернеймъ',
        usernamePh: 'Юзернеймъ',
        usernameHint: 'По юзернейму васъ смогутъ находить прочiе пользователи.',
        contacts: 'Контакты',
        phone: 'Телефонъ',
        birthday: 'День рожденiя',
        privacy: 'Конфиденцiальность',
        hideLastSeen: 'Скрывать время входа',
        hideLastSeenHint: 'Прочiе не узрятъ когда вы были въ сѣти',
        yourUid: 'Вашъ UID',
        language: 'Языкъ интерфейса',
        save: 'Сохранить',
        cancel: 'Отмѣна',
        logout: 'Выйти изъ аккаунта',
        sendMsg: 'Написать сообщенiе',
        addFriend: 'Добавить въ друзья',
        reqSent: 'Заявка отправлена',
        groupTitle: 'Группа',
        createGroupTitle: 'Создать группу',
        groupName: 'НАЗВАНIЕ',
        groupNamePh: 'Названiе группы',
        groupDesc: 'ОПИСАНIЕ',
        groupDescPh: 'Описанiе...',
        groupPrivacy: 'ПРИВАТНОСТЬ',
        public: 'Общественная',
        private: 'Приватная',
        addMember: 'ДОБАВИТЬ УЧАСТНИКА',
        members: 'УЧАСНИКИ',
        photos: 'ФОТОГРАФIИ',
        leaveGroup: 'Покинуть группу',
        deleteGroup: '🗑 Удалить группу',
        addFriendTitle: 'Добавить друга',
        friendNickPh: 'Юзернеймъ пользователя',
        sendReqBtn: 'Отправить заявку',
        newPoll: 'Новый опросъ',
        pollQ: 'ВОПРОСЪ',
        pollQPh: 'Текст вопроса',
        pollDescPh: 'Описанiе (необязательно)',
        pollOpts: 'ВАРIАНТЫ ОТВѢТА',
        pollAddOpt: 'Добавить варiантъ',
        pollSettings: 'НАСТРОЙКИ',
        pollAnon: 'Анонимное голосованіе',
        pollMulti: 'Выборъ нѣсколькихъ отвѣтовъ',
        pollCreateBtn: 'Создать опросъ',
        forwardTitle: 'Переслать сообщенiе',
        chooseChat: 'ВЫБЕРИТЕ ЧАТЪ',
        searchChatPh: 'Поискъ чата...',
        forwardBtn: 'Переслать',
        foldersTitle: 'Управленiе папками',
        createFolder: 'СОЗДАТЬ ПАПКУ',
        folderNamePh: 'Названiе папки',
        folderIconPh: 'Иконка',
        myFolders: 'МОИ ПАПКИ',
        appInfoTitle: 'О приложенiи',
        yearLabel: 'Годъ выпуска',
        devLabel: 'Разработчикъ',
        versionLabel: 'Версiя',
        authLogin: 'Входъ',
        authReg: 'Регистрацiя',
        loginBtn: 'Войти',
        regBtn: 'Создать аккаунтъ',
        noAccLink: 'Нѣтъ аккаунта? Зарегистрироваться',
        hasAccLink: 'Уже есть аккаунтъ? Войти',
        confirmEmailTitle: 'Подтвердите почту',
        confirmEmailDesc: 'Почта не подтверждена',
        resendCode: 'Отправить кодъ еще разъ',
        switchAcc: '← Выйти и войти подъ другимъ аккаунтомъ',
        typing: 'пишетъ...',
        membersCount: 'участниковъ',
        callTitle: 'Звонокъ',
        joinCall: 'Присоединиться къ звонку',
        mic: 'Микрофонъ',
        cam: 'Камера',
        screen: 'Экранъ',
        invite: 'Пригласить',
        leaveCall: 'Покинуть звонокъ',
        incomingCall: 'Входящiй звонокъ',
        answer: 'Отвѣтить',
        decline: 'Отклонить',
        unpin: 'Открѣпить',
        deleteMsg: 'Удалить сообщенiе',
        copyText: 'Копировать текстъ',
        reply: 'Отвѣтить',
        forward: 'Переслать',
        confirmTitle: 'Подтвержденiе',
        confirmText: 'Вы уверены?',
        ok: 'OK',
        delete: 'Удалить',
        published: 'Опубликовать пакъ',
        saveChanges: 'Сохранить измѣненiя',
        deletePack: '🗑 Удалить пакъ',
        deletePermanently: '🗑 Удалить навсегда',
        addPack: 'Добавить пакъ',
        installed: 'Установленъ',
        editPack: '✏️ Редактировать',
        packTitleLabel: 'НАЗВАНIЕ ПАКА',
        packTitlePh: 'Напримѣръ: Мои мемы',
        packIconLabel: 'ИКОНКА НАБОРА',
        uploadIconBtn: 'Загрузить иконку',
        packIconHint: 'по умолчанию — первый стикеръ',
        packItemsLabel: 'СТИКЕРЫ',
        packItemsEmojiLabel: 'ЭМОДЗИ',
        addImageBtn: '＋ Добавить картинку',
        addEmojiBtn: '＋ Добавить эмодзи',
        mediaLabel: 'Медiа',
        filesLabel: 'Файлы',
        emptyPhotos: 'Нѣтъ недавнихъ фото',
        emptyFiles: 'Нѣтъ недавнихъ файловъ'
      }
    };
`;

const NEW_SET_LANGUAGE_CODE = `
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

      // 5. Update logo & titles
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

      // 8. Update inputs placeholders
      const msgInp = document.getElementById('msgInput');
      if (msgInp) msgInp.placeholder = dict.typeMsgPh;
      const searchInp = document.getElementById('searchInput');
      if (searchInp) searchInp.placeholder = dict.searchPh;

      // 9. Update status if user has no custom bio
      const mySub = document.getElementById('mySub');
      if (mySub && (!window.me || !window.me.bio)) mySub.textContent = dict.online;

      // 10. Update Auth Screens
      const authTitle = document.getElementById('atitle');
      const authSub = document.getElementById('asub');
      const authBtn = document.getElementById('abtn');
      const authTog = document.getElementById('atoggle');
      if (typeof authMode !== 'undefined') {
        if (authMode === 'login') {
          if (authTitle) authTitle.textContent = dict.authLogin;
          if (authSub) authSub.textContent = dict.appTitle;
          if (authBtn) authBtn.textContent = dict.loginBtn;
          if (authTog) authTog.textContent = dict.noAccLink;
        } else {
          if (authTitle) authTitle.textContent = dict.authReg;
          if (authBtn) authBtn.textContent = dict.regBtn;
          if (authTog) authTog.textContent = dict.hasAccLink;
        }
      }
      const anick = document.getElementById('anick'); if (anick) anick.placeholder = dict.username;
      const vlogout = document.querySelector('.vlogout-btn'); if (vlogout) vlogout.textContent = dict.logout;
      const vresend = document.getElementById('vresend'); if (vresend) vresend.textContent = dict.resendCode;

      // 11. Update modals & headers
      // Modal My Profile
      const mpHead = document.querySelector('#modal-myprofile .mhead h3');
      if (mpHead) mpHead.textContent = dict.editProfile;
      const mpBio = document.getElementById('mpBio');
      if (mpBio) mpBio.placeholder = dict.aboutPh;
      const mpUsername = document.getElementById('mpUsername');
      if (mpUsername) mpUsername.placeholder = dict.usernamePh;

      // Modal Group Settings
      const gsHead = document.querySelector('#modal-groupsettings .mhead h3');
      if (gsHead) gsHead.innerHTML = '<i class="fa-solid fa-gear"></i> ' + dict.groupTitle;
      const gsName = document.getElementById('gsName');
      if (gsName) gsName.placeholder = dict.groupNamePh;
      const gsDesc = document.getElementById('gsDesc');
      if (gsDesc) gsDesc.placeholder = dict.groupDescPh;
      const gsAddNick = document.getElementById('gsAddNick');
      if (gsAddNick) gsAddNick.placeholder = dict.usernamePh;

      // Modal Create Group
      const gHead = document.querySelector('#modal-group .mhead h3');
      if (gHead) gHead.innerHTML = '<i class="fa-solid fa-users"></i> ' + dict.createGroupTitle;
      const gName = document.getElementById('groupName');
      if (gName) gName.placeholder = dict.groupNamePh;
      const gDesc = document.getElementById('groupDesc');
      if (gDesc) gDesc.placeholder = dict.groupDescPh;

      // Modal Add Friend
      const fHead = document.querySelector('#modal-friend .mhead h3');
      if (fHead) fHead.innerHTML = '<i class="fa-solid fa-user-plus"></i> ' + dict.addFriendTitle;
      const friendNick = document.getElementById('friendNick');
      if (friendNick) friendNick.placeholder = dict.friendNickPh;
      const addFriendBtn = document.querySelector('#modal-friend .mrow button.mbtn');
      if (addFriendBtn) addFriendBtn.textContent = dict.sendReqBtn;

      // Modal Create Pack
      const packTitle = document.getElementById('packTitle');
      if (packTitle) packTitle.placeholder = dict.packTitlePh;

      // Modal Forward
      const fwdHead = document.querySelector('#modal-forward .mhead h3');
      if (fwdHead) fwdHead.innerHTML = '<i class="fa-solid fa-share"></i> ' + dict.forwardTitle;
      const fwdSearch = document.getElementById('forwardSearch');
      if (fwdSearch) fwdSearch.placeholder = dict.searchChatPh;

      // Modal Folders
      const fldHead = document.querySelector('#modal-folders .mhead h3');
      if (fldHead) fldHead.innerHTML = '<i class="fa-solid fa-folder"></i> ' + dict.foldersTitle;
      const newFolderName = document.getElementById('newFolderName');
      if (newFolderName) newFolderName.placeholder = dict.folderNamePh;
      const newFolderIcon = document.getElementById('newFolderIcon');
      if (newFolderIcon) newFolderIcon.placeholder = dict.folderIconPh;

      // Modal App Info
      const aiHead = document.querySelector('#modal-appinfo .mhead h3');
      if (aiHead) aiHead.innerHTML = '<i class="fa-solid fa-circle-info"></i> ' + dict.appInfoTitle;

      // Modal Poll
      const pollHead = document.querySelector('#modal-poll .mhead h3');
      if (pollHead) pollHead.innerHTML = '<i class="fa-solid fa-chart-bar"></i> ' + dict.newPoll;
      const pollQ = document.getElementById('pollQuestion');
      if (pollQ) pollQ.placeholder = dict.pollQPh;
      const pollDesc = document.getElementById('pollDesc');
      if (pollDesc) pollDesc.placeholder = dict.pollDescPh;

      // Pinned bar
      const pinLbl = document.querySelector('.pinned-label');
      if (pinLbl) pinLbl.textContent = dict.pinned;

      // Right panel labels if open
      const rpSecs = document.querySelectorAll('#rightPanel .rp-sec');
      if (rpSecs.length >= 2) {
        const cnt0 = rpSecs[0].querySelector('.rp-cnt')?.outerHTML || '';
        const cnt1 = rpSecs[1].querySelector('.rp-cnt')?.outerHTML || '';
        rpSecs[0].innerHTML = dict.mediaLabel + ' ' + cnt0;
        rpSecs[1].innerHTML = dict.filesLabel + ' ' + cnt1;
      }
      const rpBtn = document.querySelector('.rp-detail');
      if (rpBtn) rpBtn.textContent = dict.details;

      // Re-render picker tabs if open
      try {
        if (typeof window.tgpOpen !== 'undefined' && window.tgpOpen && typeof renderTgpBody === 'function') {
          renderTgpBody();
          if (typeof renderTgpFoot === 'function') renderTgpFoot();
        }
      } catch (_) {}

      // Close menu
      const lp = document.getElementById('langPicker');
      if (lp) lp.classList.remove('open');
    }
    window.setLanguage = setLanguage;
`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Заменяем старый блок I18N_CODE
  const i18nStart = code.indexOf('/* ═══ I18N LOCALIZATION ENGINE ═══ */');
  if (i18nStart > 0) {
    const i18nEnd = code.indexOf('window.toggleLangPicker = toggleLangPicker;', i18nStart) + 'window.toggleLangPicker = toggleLangPicker;'.length;
    code = code.slice(0, i18nStart) + '/* ═══ I18N LOCALIZATION ENGINE ═══ */\n' + FULL_I18N_OBJECT + '\n' + NEW_SET_LANGUAGE_CODE + '\n    function toggleLangPicker(e) { if(e&&e.stopPropagation)e.stopPropagation(); const tp=document.getElementById(\'themePicker\'); if(tp)tp.classList.remove(\'open\'); const lp=document.getElementById(\'langPicker\'); if(lp)lp.classList.toggle(\'open\'); } window.toggleLangPicker = toggleLangPicker;' + code.slice(i18nEnd);
    console.log('Updated FULL_I18N in:', filePath);
  }

  // 2. Обновляем setPackModalMode чтобы использовал словарь I18N
  const oldSetPackModeIdx = code.indexOf('function setPackModalMode(editing) {');
  if (oldSetPackModeIdx > 0) {
    const nextFnIdx = code.indexOf('function openCreatePack(', oldSetPackModeIdx);
    const newSetPackMode = `function setPackModalMode(editing) {
      const h = document.getElementById('packModalTitle'), b = document.getElementById('packPublishBtn');
      const emo = packKind === 'emoji';
      if (h) {
        if (curLang === 'en') h.textContent = (editing ? '✏️ Edit ' : '＋ Create ') + (emo ? 'emoji pack' : 'stickerpack');
        else if (curLang === 'uk') h.textContent = (editing ? '✏️ Редагувати ' : '＋ Створити ') + (emo ? 'набір емодзі' : 'стікерпак');
        else if (curLang === 'ru-pre') h.textContent = (editing ? '✏️ Измѣнить ' : '＋ Создать ') + (emo ? 'наборъ эмодзи' : 'стикерпакъ');
        else h.textContent = (editing ? '✏️ Редактировать ' : '＋ Создать ') + (emo ? 'набор эмодзи' : 'стикерпак');
      }
      if (b) {
        if (curLang === 'en') b.textContent = editing ? 'Save changes' : (emo ? 'Publish emojis' : 'Publish pack');
        else if (curLang === 'uk') b.textContent = editing ? 'Зберегти зміни' : (emo ? 'Опублікувати емодзі' : 'Опублікувати пак');
        else if (curLang === 'ru-pre') b.textContent = editing ? 'Сохранить измѣненiя' : (emo ? 'Опубликовать наборъ' : 'Опубликовать пакъ');
        else b.textContent = editing ? 'Сохранить изменения' : (emo ? 'Опубликовать набор' : 'Опубликовать пак');
      }
      const lbl = document.getElementById('packItemsLabel'); if (lbl) lbl.textContent = emo ? (t('packItemsEmojiLabel', 'ЭМОДЗИ')) : (t('packItemsLabel', 'СТИКЕРЫ'));
      const add = document.getElementById('packAddBtn'); if (add) add.textContent = emo ? (t('addEmojiBtn', '＋ Добавить эмодзи')) : (t('addImageBtn', '＋ Добавить картинку'));
      const inp = document.getElementById('stickerFileInput'); if (inp) inp.accept = emo ? 'image/*' : 'image/*,video/webm,video/mp4';
      const modalDel = document.getElementById('packModalDeleteBtn');
      if (modalDel) modalDel.classList.toggle('hidden', !editing);
    }
`;
    code = code.slice(0, oldSetPackModeIdx) + newSetPackMode + '\n    ' + code.slice(nextFnIdx);
    console.log('Updated setPackModalMode in:', filePath);
  }

  // 3. Обновляем renderPackView action button text (Добавить / Установлен)
  if (code.includes("document.getElementById('packViewActionBtn').innerText = installed ? 'Установлен' : 'Добавить пак';")) {
    code = code.replace(
      "document.getElementById('packViewActionBtn').innerText = installed ? 'Установлен' : 'Добавить пак';",
      "document.getElementById('packViewActionBtn').innerText = installed ? t('installed', 'Установлен') : t('addPack', 'Добавить пак');"
    );
    console.log('Updated packViewActionBtn with i18n in:', filePath);
  }

  // 4. Обновляем userStatusText чтобы он выводил статус на выбранном языке
  if (code.includes("function userStatusText(u, chatId) {")) {
    code = code.replace(
      /function userStatusText\(u, chatId\) \{[\s\S]*?return isOnline \? 'В сети' : lastSeenText\(u\);[\s\S]*?\}/,
      `function userStatusText(u, chatId) {
      if (!u) return '';
      const isOnline = isUserOnline(u);
      return isOnline ? t('online', 'В сети') : lastSeenText(u);
    }`
    );
    console.log('Updated userStatusText with i18n in:', filePath);
  }

  // 5. Обновляем lastSeenText для 4 языков
  if (code.includes("function lastSeenText(u) {")) {
    code = code.replace(
      /function lastSeenText\(u\) \{[\s\S]*?return diff < 604800000 \? \`был\(а\) \$\{diffDays\} дн\. назад\` : \`был\(а\) \$\{d\.toLocaleDateString\('ru'\)\}\`;[\s\S]*?\}/,
      `function lastSeenText(u) {
      if (!u || !u.lastSeen) return t('offline', 'Не в сети');
      if (u.hideLastSeen) return t('offline', 'Не в сети');
      const at = u.lastSeen?.toDate ? u.lastSeen.toDate() : new Date(u.lastSeen);
      const diff = Date.now() - at.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 2) return t('online', 'В сети');
      if (curLang === 'en') {
        if (mins < 60) return 'last seen ' + mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return 'last seen ' + hrs + 'h ago';
        return 'last seen ' + at.toLocaleDateString('en');
      } else if (curLang === 'uk') {
        if (mins < 60) return 'був(ла) ' + mins + ' хв. тому';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return 'був(ла) ' + hrs + ' год. тому';
        return 'був(ла) ' + at.toLocaleDateString('uk');
      } else if (curLang === 'ru-pre') {
        if (mins < 60) return 'былъ въ сѣти ' + mins + ' мин. назадъ';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return 'былъ въ сѣти ' + hrs + ' ч. назадъ';
        return 'былъ въ сѣти ' + at.toLocaleDateString('ru');
      }
      if (mins < 60) return 'был(а) ' + mins + ' мин. назад';
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return 'был(а) ' + hrs + ' ч. назад';
      return 'был(а) ' + at.toLocaleDateString('ru');
    }`
    );
    console.log('Updated lastSeenText with i18n in:', filePath);
  }

  // 6. Обновляем табы стикерного пикера (renderTgpFoot)
  if (code.includes("btn.title = 'Стикеры';") || code.includes("btn.title = 'Эмодзи';")) {
    code = code.replace("btn.title = 'Эмодзи';", "btn.title = t('emoji', 'Эмодзи');");
    code = code.replace("btn.title = 'Свои эмодзи';", "btn.title = t('customEmoji', 'Свои эмодзи');");
    code = code.replace("btn.title = 'Стикеры';", "btn.title = t('stickers', 'Стикеры');");
    code = code.replace("btn.title = 'GIF';", "btn.title = t('gif', 'GIF');");
    console.log('Updated picker tabs titles in:', filePath);
  }

  // 7. Обновляем кнопку "+ Создать стикерпак" в пикере
  if (code.includes("b.textContent = '＋ Создать стикерпак';")) {
    code = code.replace(
      "b.textContent = '＋ Создать стикерпак';",
      "b.textContent = (tgpMode === 'customEmoji') ? t('createEmoji', '＋ Создать эмодзи') : t('createPack', '＋ Создать стикерпак');"
    );
    console.log('Updated picker add pack button text in:', filePath);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Saved:', filePath);

  // Валидация синтаксиса встроенного JS
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

console.log('apply-full-i18n completed successfully!');
