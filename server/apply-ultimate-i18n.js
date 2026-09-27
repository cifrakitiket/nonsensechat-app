// server/apply-ultimate-i18n.js — Полная локализация 100% интерфейса
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targets = [
  path.join(__dirname, '..', 'public', 'index.html'),
  path.join(__dirname, '..', 'electron-desktop', 'public', 'index.html')
];

// Полный словарь для 4 языков (ru, en, uk, ru-pre)
const ULTIMATE_I18N_OBJECT = `
    const I18N = {
      ru: {
        appTitle: 'Беспонтовый Чат',
        tm: '™',
        folders: 'Папки',
        changeTheme: 'Сменить тему',
        changeLang: 'Язык интерфейса',
        themeDark: 'Тёмная (стандарт)',
        themeCoffeeDark: 'Кофейная тёмная',
        themeCoffeeLight: 'Кофейная светлая',
        themeMoss: 'Моховая тёмная',
        online: 'В сети',
        offline: 'Не в сети',
        loading: 'Загрузка…',
        typing: 'печатает...',
        friendBtn: '+ Друга',
        groupBtn: '+ Группу',
        searchPh: 'Поиск по юзернейму или группе...',
        all: 'ВСЕ',
        dm: 'ЛС',
        groups: 'ГРУППЫ',
        reqs: 'ЗАЯВКИ',
        selectChatHint: 'Выберите чат для начала общения',
        typeMsgPh: 'Сообщение...',
        send: 'Отправить',
        pinned: 'Закреплённое сообщение',
        pinnedPlural: 'Закреплённые сообщения',
        pinnedBadge: 'ЗАКРЕПЛЕНО',
        call: 'Позвонить',
        searchInChat: 'Поиск в чате',
        details: 'Подробнее',
        voiceChannel: 'Голосовой канал',
        voiceCall: 'Звонок',
        readBy: 'Прочитали:',
        forwardPrefix: 'Пересылка:',
        ctxReply: 'Ответить',
        ctxForward: 'Переслать',
        ctxCopyText: 'Копировать текст',
        ctxCopyPhoto: 'Копировать фото',
        ctxStickerpack: 'Стикерпак',
        ctxPin: 'Закрепить',
        ctxUnpin: 'Открепить',
        ctxEdit: 'Редактировать',
        ctxDelete: 'Удалить',
        ctxDeleteAll: 'Удалить для всех',
        ctxPinChat: 'Закрепить чат',
        ctxToFolder: 'В папку',
        ctxArchive: 'Архивировать',
        ctxMute: 'Откл. уведомления',
        ctxLeaveDelete: 'Покинуть/удалить',
        ctxBold: 'Жирный',
        ctxItalic: 'Курсив',
        ctxUnderline: 'Подчёркнутый',
        ctxStrike: 'Зачёркнутый',
        ctxQuote: 'Цитата',
        ctxSpoiler: 'Спойлер',
        mediaLabel: 'Медиа',
        filesLabel: 'Файлы',
        membersLabel: 'Участники',
        attachPhoto: 'Фото и видео',
        attachMusic: 'Музыка',
        attachFile: 'Файл',
        attachPoll: 'Голосование',
        emoji: 'Эмодзи',
        customEmoji: 'Свои эмодзи',
        stickers: 'Стикеры',
        gif: 'GIF',
        createPack: '＋ Создать стикерпак',
        createEmoji: '＋ Создать эмодзи',
        emptyStickers: 'У вас пока нет стикеров.\\nНажмите ＋ внизу, чтобы создать пак, или нажмите на присланный стикер, чтобы добавить чужой.',
        emptyCustomEmoji: 'У вас пока нет своих эмодзи.\\nСоздайте свой набор картинок или GIF!',
        installed: 'Установлен',
        addPack: 'Добавить пак',
        editPack: '✏️ Редактировать',
        deletePackPerm: '🗑 Удалить навсегда',
        packTitleLabel: 'НАЗВАНИЕ ПАКА',
        packTitlePh: 'Например: Мои мемы',
        packIconLabel: 'ИКОНКА НАБОРА',
        packIconHint: 'по умолчанию — первый стикер',
        uploadIconBtn: 'Загрузить иконку',
        packItemsLabel: 'СТИКЕРЫ',
        packItemsEmojiLabel: 'ЭМОДЗИ',
        addImageBtn: '＋ Добавить картинку',
        addEmojiBtn: '＋ Добавить эмодзи',
        packCreateHint: 'Добавьте картинки, GIF, анимированные WebP или короткие видео — каждый файл станет стикером.\\nПод каждым укажите эмодзи (как в @fStikBot).',
        publishPackBtn: 'Опубликовать пак',
        deletePackBtn: '🗑 Удалить пак',
        uploadPhotoTitle: 'Загрузить фото',
        fromFavorites: '🔖 Из избранного',
        orUploadFile: 'или загрузите файл',
        dropFileHint: 'Нажмите или перетащите файл сюда',
        fileHostsFree: '☁️ Быстрое облако · 100% БЕСПЛАТНО',
        sendAsSpoiler: 'Отправить как спойлер',
        uploadBtnText: 'Загрузить',
        newPoll: 'Новый опрос',
        pollQuestionLabel: 'ВОПРОС',
        pollQPh: 'Текст вопроса',
        pollDescPh: 'Описание (необязательно)',
        pollAnswersLabel: 'ВАРИАНТЫ ОТВЕТА',
        addAnswerOption: 'Добавить ответ...',
        canAddMore: 'Можно добавить ещё',
        optionsCount: 'вариантов ответа.',
        pollSettingsLabel: 'НАСТРОЙКИ',
        pollNames: 'Имена участников',
        pollNamesDesc: 'Рядом с ответами отображаются имена всех голосовавших.',
        pollMultiple: 'Несколько ответов',
        pollMultipleDesc: 'Участники могут выбрать более одного варианта ответа.',
        pollQuiz: 'Правильный ответ',
        pollQuizDesc: 'Отметьте один или несколько правильных вариантов.',
        sendPollBtn: 'Отправить опрос',
        foldersTitle: 'Управление папками',
        createFolderSection: 'СОЗДАТЬ ПАПКУ',
        myFoldersSection: 'МОИ ПАПКИ',
        addToFolderTitle: 'Добавить в папку',
        folderDefault: 'По умолчанию',
        folderNamePh: 'Название папки',
        folderIconPh: 'Иконка',
        callGroupTitle: 'Групповой звонок',
        callOngoing: 'Идёт звонок',
        callExpand: 'Развернуть',
        callEnd: '✕ Завершить',
        callConnecting: '● Соединение...',
        callJoinBtn: 'Присоединиться к звонку',
        copyInviteLink: '🔗 Скопировать ссылку-приглашение',
        mic: 'Микрофон',
        micMuted: 'Выкл. микрофон',
        cam: 'Камера',
        camOff: 'Выкл. камеру',
        soundOut: 'Вывод звука',
        sound: 'Звук',
        screenShare: 'Трансляция экрана',
        screen: 'Экран',
        inviteToCall: 'Пригласить в звонок',
        invite: 'Пригласить',
        leaveCall: 'Покинуть звонок',
        leave: 'Покинуть',
        incomingCall: 'Входящий звонок',
        decline: 'Отклонить',
        answer: 'Ответить',
        callLinkTitle: 'Ссылка на звонок',
        callLinkDesc: 'Скопируйте ссылку, чтобы пригласить участников, или вставьте ссылку для присоединения:',
        copyBtn: '📋 Скопировать',
        closeDialog: '✕ Закрыть',
        orJoinByLink: 'или присоединиться по ссылке',
        joinBtn: '🔗 Присоединиться',
        linkCopied: 'Ссылка скопирована!',
        nsTitle: 'Шумоподавление',
        nsClickConfig: 'Нажмите для настройки',
        nsAiSubtitle: 'Шумоподавление нейросетью • реальное время',
        nsEnabled: 'Подавление шумов',
        nsOffHint: 'Выключено — нажмите для включения',
        nsAudioStream: 'АУДИО ПОТОК',
        nsNoSignal: 'НЕТ СИГНАЛА',
        nsInput: 'Вход',
        nsOutput: 'Выход',
        nsIntensity: 'Интенсивность',
        nsMild: 'Мягко',
        nsBalanced: 'Сбалансировано',
        nsMax: 'Максимум',
        nsOffice: 'Офис',
        nsHome: 'Дома',
        nsStreet: 'Улица',
        nsSuppressed: 'Подавлено',
        nsLatency: 'Задержка',
        nsLoad: 'Нагрузка',
        appInfoTitle: 'О приложении',
        yearLabel: 'Год выпуска',
        devLabel: 'Разработчик',
        versionLabel: 'Версия',
        copyright: '© 2026 ООО Беспонтовый Пирожок ™. Все права защищены.',
        updateAvailable: 'Доступно обновление',
        updateText: 'Вышла новая версия приложения',
        updateBtn: 'Обновить',
        confirmTitle: 'Подтверждение',
        areYouSure: 'Вы уверены?',
        cancel: 'Отмена',
        confirm: 'Подтвердить',
        deletePermanently: 'Удалить навсегда',
        notification: 'Уведомление',
        error: 'Ошибка',
        success: 'Успешно',
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
        logout: 'Выйти из аккаунта',
        manageVerification: 'Управление верификацией',
        grantVerification: 'Выдать верификацию',
        groupTitle: 'Группа',
        groupName: 'НАЗВАНИЕ',
        groupNamePh: 'Название группы',
        groupDesc: 'ОПИСАНИЕ',
        groupDescPh: 'Описание...',
        groupPrivacy: 'ПРИВАТНОСТЬ',
        public: 'Публичная',
        private: 'Приватная',
        addMember: 'ДОБАВИТЬ УЧАСТНИКА',
        photos: 'ФОТОГРАФИИ',
        leaveGroup: 'Покинуть группу',
        deleteGroup: '🗑 Удалить группу',
        createGroupTitle: 'Создать группу',
        newGroupTitle: 'Новая группа',
        addFriendTitle: 'Добавить друга',
        friendNickPh: 'Юзернейм пользователя',
        sendReqBtn: 'Отправить заявку',
        sendMsgBtn: 'Написать сообщение',
        addFriendBtn: 'Добавить в друзья',
        removeFriendBtn: 'Удалить из друзей',
        reqSentBtn: 'Заявка отправлена',
        forwardTitle: 'Переслать сообщение',
        searchChatPh: 'Поиск чата...',
        selectChatHeader: 'ВЫБЕРИТЕ ЧАТ',
        authLogin: 'Вход',
        authReg: 'Регистрация',
        loginBtn: 'Войти',
        regBtn: 'Зарегистрироваться',
        noAccLink: 'Нет аккаунта? Зарегистрироваться',
        hasAccLink: 'Уже есть аккаунт? Войти',
        passPh: 'Пароль',
        verifyEmailTitle: 'Подтвердите почту',
        verifyEmailSub: 'Мы отправили 6-значный код на',
        resendCode: 'Отправить код ещё раз',
        resendCodeWait: 'Отправить код ещё раз ({n} с)',
        emailNotVerified: 'Почта не подтверждена',
        emailNotVerifiedDesc: 'Чтобы пользоваться приложением, нужно подтвердить почту',
        confirmAccount: 'Подтвердить аккаунт',
        exitAndSwitch: '← Выйти и войти под другим аккаунтом',
        clickToCopy: 'Нажмите чтобы скопировать',
        copied: 'Скопировано!'
      },
      en: {
        appTitle: 'Nonsense Chat',
        tm: '™',
        folders: 'Folders',
        changeTheme: 'Change theme',
        changeLang: 'Interface language',
        themeDark: 'Dark (default)',
        themeCoffeeDark: 'Coffee dark',
        themeCoffeeLight: 'Coffee light',
        themeMoss: 'Moss dark',
        online: 'Online',
        offline: 'Offline',
        loading: 'Loading…',
        typing: 'typing...',
        friendBtn: '+ Friend',
        groupBtn: '+ Group',
        searchPh: 'Search by username or group...',
        all: 'ALL',
        dm: 'DM',
        groups: 'GROUPS',
        reqs: 'REQUESTS',
        selectChatHint: 'Select a chat to start messaging',
        typeMsgPh: 'Message...',
        send: 'Send',
        pinned: 'Pinned message',
        pinnedPlural: 'Pinned messages',
        pinnedBadge: 'PINNED',
        call: 'Call',
        searchInChat: 'Search in chat',
        details: 'Details',
        voiceChannel: 'Voice channel',
        voiceCall: 'Call',
        readBy: 'Read by:',
        forwardPrefix: 'Forward:',
        ctxReply: 'Reply',
        ctxForward: 'Forward',
        ctxCopyText: 'Copy text',
        ctxCopyPhoto: 'Copy photo',
        ctxStickerpack: 'Sticker pack',
        ctxPin: 'Pin',
        ctxUnpin: 'Unpin',
        ctxEdit: 'Edit',
        ctxDelete: 'Delete',
        ctxDeleteAll: 'Delete for everyone',
        ctxPinChat: 'Pin chat',
        ctxToFolder: 'To folder',
        ctxArchive: 'Archive',
        ctxMute: 'Mute notifications',
        ctxLeaveDelete: 'Leave/delete',
        ctxBold: 'Bold',
        ctxItalic: 'Italic',
        ctxUnderline: 'Underline',
        ctxStrike: 'Strikethrough',
        ctxQuote: 'Quote',
        ctxSpoiler: 'Spoiler',
        mediaLabel: 'Media',
        filesLabel: 'Files',
        membersLabel: 'Members',
        attachPhoto: 'Photo & video',
        attachMusic: 'Audio',
        attachFile: 'File',
        attachPoll: 'Poll',
        emoji: 'Emoji',
        customEmoji: 'Custom emoji',
        stickers: 'Stickers',
        gif: 'GIF',
        createPack: '＋ Create stickerpack',
        createEmoji: '＋ Create emojis',
        emptyStickers: 'You have no stickers yet.\\nClick ＋ below to create a pack, or click a received sticker to add one.',
        emptyCustomEmoji: 'You have no custom emojis yet.\\nCreate your own set of images or GIFs!',
        installed: 'Installed',
        addPack: 'Add pack',
        editPack: '✏️ Edit',
        deletePackPerm: '🗑 Delete permanently',
        packTitleLabel: 'PACK TITLE',
        packTitlePh: 'E.g.: My memes',
        packIconLabel: 'PACK ICON',
        packIconHint: 'default: first sticker',
        uploadIconBtn: 'Upload icon',
        packItemsLabel: 'STICKERS',
        packItemsEmojiLabel: 'EMOJI',
        addImageBtn: '＋ Add image',
        addEmojiBtn: '＋ Add emoji',
        packCreateHint: 'Add pictures, GIFs, animated WebP, or short videos — each file will become a sticker.\\nSpecify an emoji for each.',
        publishPackBtn: 'Publish pack',
        deletePackBtn: '🗑 Delete pack',
        uploadPhotoTitle: 'Upload photo',
        fromFavorites: '🔖 From favorites',
        orUploadFile: 'or upload a file',
        dropFileHint: 'Click or drag file here',
        fileHostsFree: '☁️ Fast cloud storage · 100% FREE',
        sendAsSpoiler: 'Send as spoiler',
        uploadBtnText: 'Upload',
        newPoll: 'New poll',
        pollQuestionLabel: 'QUESTION',
        pollQPh: 'Question text',
        pollDescPh: 'Description (optional)',
        pollAnswersLabel: 'ANSWER OPTIONS',
        addAnswerOption: 'Add option...',
        canAddMore: 'You can add up to',
        optionsCount: 'answer options.',
        pollSettingsLabel: 'SETTINGS',
        pollNames: 'Voter names',
        pollNamesDesc: 'Names of voters are shown next to their answers.',
        pollMultiple: 'Multiple answers',
        pollMultipleDesc: 'Participants can choose more than one option.',
        pollQuiz: 'Quiz mode',
        pollQuizDesc: 'Mark one or more correct options.',
        sendPollBtn: 'Send poll',
        foldersTitle: 'Folder management',
        createFolderSection: 'CREATE FOLDER',
        myFoldersSection: 'MY FOLDERS',
        addToFolderTitle: 'Add to folder',
        folderDefault: 'Default',
        folderNamePh: 'Folder name',
        folderIconPh: 'Icon',
        callGroupTitle: 'Group call',
        callOngoing: 'Call in progress',
        callExpand: 'Expand',
        callEnd: '✕ End call',
        callConnecting: '● Connecting...',
        callJoinBtn: 'Join call',
        copyInviteLink: '🔗 Copy invite link',
        mic: 'Mic',
        micMuted: 'Mute',
        cam: 'Camera',
        camOff: 'Turn off cam',
        soundOut: 'Audio output',
        sound: 'Sound',
        screenShare: 'Screen share',
        screen: 'Screen',
        inviteToCall: 'Invite to call',
        invite: 'Invite',
        leaveCall: 'Leave call',
        leave: 'Leave',
        incomingCall: 'Incoming call',
        decline: 'Decline',
        answer: 'Answer',
        callLinkTitle: 'Call link',
        callLinkDesc: 'Copy the link to invite participants, or paste a link to join:',
        copyBtn: '📋 Copy',
        closeDialog: '✕ Close',
        orJoinByLink: 'or join via link',
        joinBtn: '🔗 Join',
        linkCopied: 'Link copied!',
        nsTitle: 'Noise suppression',
        nsClickConfig: 'Click to configure',
        nsAiSubtitle: 'Neural noise suppression • real-time',
        nsEnabled: 'Noise cancellation',
        nsOffHint: 'Disabled — click to enable',
        nsAudioStream: 'AUDIO STREAM',
        nsNoSignal: 'NO SIGNAL',
        nsInput: 'Input',
        nsOutput: 'Output',
        nsIntensity: 'Intensity',
        nsMild: 'Mild',
        nsBalanced: 'Balanced',
        nsMax: 'Maximum',
        nsOffice: 'Office',
        nsHome: 'Home',
        nsStreet: 'Street',
        nsSuppressed: 'Suppressed',
        nsLatency: 'Latency',
        nsLoad: 'Load',
        appInfoTitle: 'About application',
        yearLabel: 'Release year',
        devLabel: 'Developer',
        versionLabel: 'Version',
        copyright: '© 2026 Nonsense Pie LLC ™. All rights reserved.',
        updateAvailable: 'Update available',
        updateText: 'A new version of the app is available',
        updateBtn: 'Update',
        confirmTitle: 'Confirmation',
        areYouSure: 'Are you sure?',
        cancel: 'Cancel',
        confirm: 'Confirm',
        deletePermanently: 'Delete permanently',
        notification: 'Notification',
        error: 'Error',
        success: 'Success',
        editProfile: 'Edit profile',
        about: 'About',
        aboutPh: 'About me',
        aboutHint: 'E.g.: 23 y.o., designer from London. Any details about yourself.',
        username: 'Username',
        usernamePh: 'Username',
        usernameHint: 'Others can find you by your username.',
        contacts: 'Contacts',
        phone: 'Phone',
        birthday: 'Birthday',
        privacy: 'Privacy',
        hideLastSeen: 'Hide last seen',
        hideLastSeenHint: 'Others will not see when you were online',
        yourUid: 'Your UID',
        language: 'Interface language',
        save: 'Save',
        logout: 'Log out',
        manageVerification: 'Verification Management',
        grantVerification: 'Grant verification',
        groupTitle: 'Group',
        groupName: 'TITLE',
        groupNamePh: 'Group title',
        groupDesc: 'DESCRIPTION',
        groupDescPh: 'Description...',
        groupPrivacy: 'PRIVACY',
        public: 'Public',
        private: 'Private',
        addMember: 'ADD MEMBER',
        photos: 'PHOTOS',
        leaveGroup: 'Leave group',
        deleteGroup: '🗑 Delete group',
        createGroupTitle: 'Create group',
        newGroupTitle: 'New group',
        addFriendTitle: 'Add friend',
        friendNickPh: 'User’s username',
        sendReqBtn: 'Send request',
        sendMsgBtn: 'Send message',
        addFriendBtn: 'Add friend',
        removeFriendBtn: 'Remove friend',
        reqSentBtn: 'Request sent',
        forwardTitle: 'Forward message',
        searchChatPh: 'Search chat...',
        selectChatHeader: 'SELECT CHAT',
        authLogin: 'Log in',
        authReg: 'Sign up',
        loginBtn: 'Log in',
        regBtn: 'Sign up',
        noAccLink: 'No account? Sign up',
        hasAccLink: 'Already have an account? Log in',
        passPh: 'Password',
        verifyEmailTitle: 'Verify email',
        verifyEmailSub: 'We sent a 6-digit code to',
        resendCode: 'Resend code',
        resendCodeWait: 'Resend code ({n} s)',
        emailNotVerified: 'Email not verified',
        emailNotVerifiedDesc: 'You must verify your email to use the application',
        confirmAccount: 'Verify account',
        exitAndSwitch: '← Exit and log in with another account',
        clickToCopy: 'Click to copy',
        copied: 'Copied!'
      },
      uk: {
        appTitle: 'Безпонтовий Чат',
        tm: '™',
        folders: 'Папки',
        changeTheme: 'Змінити тему',
        changeLang: 'Мова інтерфейсу',
        themeDark: 'Темна (стандарт)',
        themeCoffeeDark: 'Кавова темна',
        themeCoffeeLight: 'Кавова світла',
        themeMoss: 'Мохова темна',
        online: 'В мережі',
        offline: 'Не в мережі',
        loading: 'Завантаження…',
        typing: 'друкує...',
        friendBtn: '+ Друга',
        groupBtn: '+ Групу',
        searchPh: 'Пошук за юзернеймом чи групою...',
        all: 'ВСІ',
        dm: 'ОП',
        groups: 'ГРУПИ',
        reqs: 'ЗАПИТИ',
        selectChatHint: 'Оберіть чат для початку спілкування',
        typeMsgPh: 'Повідомлення...',
        send: 'Надіслати',
        pinned: 'Закріплене повідомлення',
        pinnedPlural: 'Закріплені повідомлення',
        pinnedBadge: 'ЗАКРІПЛЕНО',
        call: 'Зателефонувати',
        searchInChat: 'Пошук у чаті',
        details: 'Детальніше',
        voiceChannel: 'Голосовий канал',
        voiceCall: 'Дзвінок',
        readBy: 'Прочитали:',
        forwardPrefix: 'Пересилання:',
        ctxReply: 'Відповісти',
        ctxForward: 'Переслати',
        ctxCopyText: 'Копіювати текст',
        ctxCopyPhoto: 'Копіювати фото',
        ctxStickerpack: 'Стікерпак',
        ctxPin: 'Закріпити',
        ctxUnpin: 'Відкріпити',
        ctxEdit: 'Редагувати',
        ctxDelete: 'Видалити',
        ctxDeleteAll: 'Видалити для всіх',
        ctxPinChat: 'Закріпити чат',
        ctxToFolder: 'У папку',
        ctxArchive: 'Архівувати',
        ctxMute: 'Вимк. сповіщення',
        ctxLeaveDelete: 'Залишити/видалити',
        ctxBold: 'Жирний',
        ctxItalic: 'Курсив',
        ctxUnderline: 'Підкреслений',
        ctxStrike: 'Закреслений',
        ctxQuote: 'Цитата',
        ctxSpoiler: 'Спойлер',
        mediaLabel: 'Медіа',
        filesLabel: 'Файли',
        membersLabel: 'Учасники',
        attachPhoto: 'Фото та відео',
        attachMusic: 'Музика',
        attachFile: 'Файл',
        attachPoll: 'Опитування',
        emoji: 'Емодзі',
        customEmoji: 'Свої емодзі',
        stickers: 'Стікери',
        gif: 'GIF',
        createPack: '＋ Створити стікерпак',
        createEmoji: '＋ Створити емодзі',
        emptyStickers: 'У вас поки немає стікерів.\\nНатисніть ＋ внизу, щоб створити пак, або натисніть на отриманий стікер, щоб додати його.',
        emptyCustomEmoji: 'У вас поки немає своїх емодзі.\\nСтворіть свій набір картинок чи GIF!',
        installed: 'Встановлено',
        addPack: 'Додати пак',
        editPack: '✏️ Редагувати',
        deletePackPerm: '🗑 Видалити назавжди',
        packTitleLabel: 'НАЗВА ПАКУ',
        packTitlePh: 'Наприклад: Мої меми',
        packIconLabel: 'ІКОНКА НАБОРУ',
        packIconHint: 'за замовчуванням — перший стікер',
        uploadIconBtn: 'Завантажити іконку',
        packItemsLabel: 'СТІКЕРИ',
        packItemsEmojiLabel: 'ЕМОДЗІ',
        addImageBtn: '＋ Додати картинку',
        addEmojiBtn: '＋ Додати емодзі',
        packCreateHint: 'Додайте картинки, GIF, анімовані WebP чи короткі відео — кожен файл стане стікером.\\nПід кожним вкажіть емодзі.',
        publishPackBtn: 'Опублікувати пак',
        deletePackBtn: '🗑 Видалити пак',
        uploadPhotoTitle: 'Завантажити фото',
        fromFavorites: '🔖 З обраного',
        orUploadFile: 'або завантажте файл',
        dropFileHint: 'Натисніть або перетягніть файл сюди',
        fileHostsFree: '☁️ Швидке сховище · 100% БЕЗКОШТОВНО',
        sendAsSpoiler: 'Надіслати як спойлер',
        uploadBtnText: 'Завантажити',
        newPoll: 'Нове опитування',
        pollQuestionLabel: 'ПИТАННЯ',
        pollQPh: 'Текст питання',
        pollDescPh: 'Опис (необовʼязково)',
        pollAnswersLabel: 'ВАРІАНТИ ВІДПОВІДІ',
        addAnswerOption: 'Додати варіант...',
        canAddMore: 'Можна додати ще',
        optionsCount: 'варіантів відповіді.',
        pollSettingsLabel: 'НАЛАШТУВАННЯ',
        pollNames: 'Імена учасників',
        pollNamesDesc: 'Поруч із відповідями відображаються імена всіх, хто проголосував.',
        pollMultiple: 'Кілька відповідей',
        pollMultipleDesc: 'Учасники можуть обрати більше одного варіанта.',
        pollQuiz: 'Правильна відповідь',
        pollQuizDesc: 'Позначте один або кілька правильних варіантів.',
        sendPollBtn: 'Надіслати опитування',
        foldersTitle: 'Керування папками',
        createFolderSection: 'СТВОРИТИ ПАПКУ',
        myFoldersSection: 'МОЇ ПАПКИ',
        addToFolderTitle: 'Додати в папку',
        folderDefault: 'За замовчуванням',
        folderNamePh: 'Назва папки',
        folderIconPh: 'Іконка',
        callGroupTitle: 'Груповий дзвінок',
        callOngoing: 'Йде дзвінок',
        callExpand: 'Розгорнути',
        callEnd: '✕ Завершити',
        callConnecting: '● Зʼєднання...',
        callJoinBtn: 'Приєднатися до дзвінка',
        copyInviteLink: '🔗 Скопіювати посилання-запрошення',
        mic: 'Мікрофон',
        micMuted: 'Вимк. мікрофон',
        cam: 'Камера',
        camOff: 'Вимк. камеру',
        soundOut: 'Виведення звуку',
        sound: 'Звук',
        screenShare: 'Трансляція екрана',
        screen: 'Екран',
        inviteToCall: 'Запросити у дзвінок',
        invite: 'Запросити',
        leaveCall: 'Залишити дзвінок',
        leave: 'Залишити',
        incomingCall: 'Вхідний дзвінок',
        decline: 'Відхилити',
        answer: 'Відповісти',
        callLinkTitle: 'Посилання на дзвінок',
        callLinkDesc: 'Скопіюйте посилання, щоб запросити учасників, або вставте посилання для приєднання:',
        copyBtn: '📋 Скопіювати',
        closeDialog: '✕ Закрити',
        orJoinByLink: 'або приєднатися за посиланням',
        joinBtn: '🔗 Приєднатися',
        linkCopied: 'Посилання скопійовано!',
        nsTitle: 'Шумозаглушення',
        nsClickConfig: 'Натисніть для налаштування',
        nsAiSubtitle: 'Шумозаглушення нейромережею • реальний час',
        nsEnabled: 'Заглушення шумів',
        nsOffHint: 'Вимкнено — натисніть для ввімкнення',
        nsAudioStream: 'АУДІО ПОТІК',
        nsNoSignal: 'НЕМАЄ СИГНАЛУ',
        nsInput: 'Вхід',
        nsOutput: 'Вихід',
        nsIntensity: 'Інтенсивність',
        nsMild: 'Мʼяко',
        nsBalanced: 'Збалансовано',
        nsMax: 'Максимум',
        nsOffice: 'Офіс',
        nsHome: 'Вдома',
        nsStreet: 'Вулиця',
        nsSuppressed: 'Заглушено',
        nsLatency: 'Затримка',
        nsLoad: 'Навантаження',
        appInfoTitle: 'Про додаток',
        yearLabel: 'Рік випуску',
        devLabel: 'Розробник',
        versionLabel: 'Версія',
        copyright: '© 2026 ТОВ Безпонтовий Пиріжок ™. Всі права захищені.',
        updateAvailable: 'Доступне оновлення',
        updateText: 'Вийшла нова версія додатку',
        updateBtn: 'Оновити',
        confirmTitle: 'Підтвердження',
        areYouSure: 'Ви впевнені?',
        cancel: 'Скасувати',
        confirm: 'Підтвердити',
        deletePermanently: 'Видалити назавжди',
        notification: 'Сповіщення',
        error: 'Помилка',
        success: 'Успішно',
        editProfile: 'Редагувати профіль',
        about: 'Про себе',
        aboutPh: 'Про себе',
        aboutHint: 'Наприклад: 23 роки, дизайнер з Києва. Будь-які подробиці про себе.',
        username: 'Юзернейм',
        usernamePh: 'Юзернейм',
        usernameHint: 'За юзернеймом вас зможуть знаходити інші користувачі.',
        contacts: 'Контакти',
        phone: 'Телефон',
        birthday: 'День народження',
        privacy: 'Конфіденційність',
        hideLastSeen: 'Приховати час входу',
        hideLastSeenHint: 'Інші не побачать коли ви були в мережі',
        yourUid: 'Ваш UID',
        language: 'Мова інтерфейсу',
        save: 'Зберегти',
        logout: 'Вийти з акаунта',
        manageVerification: 'Керування верифікацією',
        grantVerification: 'Видати верифікацію',
        groupTitle: 'Група',
        groupName: 'НАЗВА',
        groupNamePh: 'Назва групи',
        groupDesc: 'ОПИС',
        groupDescPh: 'Опис...',
        groupPrivacy: 'ПРИВАТНІСТЬ',
        public: 'Публічна',
        private: 'Приватна',
        addMember: 'ДОДАТИ УЧАСНИКА',
        photos: 'ФОТОГРАФІЇ',
        leaveGroup: 'Покинути групу',
        deleteGroup: '🗑 Видалити групу',
        createGroupTitle: 'Створити групу',
        newGroupTitle: 'Нова група',
        addFriendTitle: 'Додати друга',
        friendNickPh: 'Юзернейм користувача',
        sendReqBtn: 'Надіслати запит',
        sendMsgBtn: 'Написати повідомлення',
        addFriendBtn: 'Додати в друзі',
        removeFriendBtn: 'Видалити з друзів',
        reqSentBtn: 'Запит надіслано',
        forwardTitle: 'Переслати повідомлення',
        searchChatPh: 'Пошук чату...',
        selectChatHeader: 'ОБЕРІТЬ ЧАТ',
        authLogin: 'Вхід',
        authReg: 'Реєстрація',
        loginBtn: 'Увійти',
        regBtn: 'Зареєструватися',
        noAccLink: 'Немає акаунту? Зареєструватися',
        hasAccLink: 'Вже є акаунт? Увійти',
        passPh: 'Пароль',
        verifyEmailTitle: 'Підтвердьте пошту',
        verifyEmailSub: 'Ми надіслали 6-значний код на',
        resendCode: 'Надіслати код ще раз',
        resendCodeWait: 'Надіслати код ще раз ({n} с)',
        emailNotVerified: 'Пошта не підтверджена',
        emailNotVerifiedDesc: 'Щоб користуватися додатком, потрібно підтвердити пошту',
        confirmAccount: 'Підтвердити акаунт',
        exitAndSwitch: '← Вийти і увійти під іншим акаунтом',
        clickToCopy: 'Натисніть щоб скопіювати',
        copied: 'Скопійовано!'
      },
      'ru-pre': {
        appTitle: 'Безпонтовый Чатъ',
        tm: '™',
        folders: 'Папки',
        changeTheme: 'Смѣнить тему',
        changeLang: 'Языкъ интерфейса',
        themeDark: 'Темная (стандартъ)',
        themeCoffeeDark: 'Кофейная темная',
        themeCoffeeLight: 'Кофейная свѣтлая',
        themeMoss: 'Моховая темная',
        online: 'Въ сѣти',
        offline: 'Не въ сѣти',
        loading: 'Загрузка…',
        typing: 'печатаетъ...',
        friendBtn: '+ Друга',
        groupBtn: '+ Группу',
        searchPh: 'Поискъ по юзернейму или группѣ...',
        all: 'ВСѢ',
        dm: 'ЛС',
        groups: 'ГРУППЫ',
        reqs: 'ЗАЯВКИ',
        selectChatHint: 'Выберите чатъ для начала общенiя',
        typeMsgPh: 'Сообщенiе...',
        send: 'Отправить',
        pinned: 'Закрѣпленное сообщенiе',
        pinnedPlural: 'Закрѣпленныя сообщенiя',
        pinnedBadge: 'ЗАКРѢПЛЕНО',
        call: 'Позвонить',
        searchInChat: 'Поискъ въ чатѣ',
        details: 'Подробнѣе',
        voiceChannel: 'Голосовой каналъ',
        voiceCall: 'Звонокъ',
        readBy: 'Прочитали:',
        forwardPrefix: 'Пересылка:',
        ctxReply: 'Отвѣтить',
        ctxForward: 'Переслать',
        ctxCopyText: 'Копировать текстъ',
        ctxCopyPhoto: 'Копировать фото',
        ctxStickerpack: 'Стикерпакъ',
        ctxPin: 'Закрѣпить',
        ctxUnpin: 'Открѣпить',
        ctxEdit: 'Редактировать',
        ctxDelete: 'Удалить',
        ctxDeleteAll: 'Удалить для всѣхъ',
        ctxPinChat: 'Закрѣпить чатъ',
        ctxToFolder: 'Въ папку',
        ctxArchive: 'Архивировать',
        ctxMute: 'Откл. увѣдомленiя',
        ctxLeaveDelete: 'Покинуть/удалить',
        ctxBold: 'Жирный',
        ctxItalic: 'Курсивъ',
        ctxUnderline: 'Подчеркнутый',
        ctxStrike: 'Зачеркнутый',
        ctxQuote: 'Цитата',
        ctxSpoiler: 'Спойлеръ',
        mediaLabel: 'Медiа',
        filesLabel: 'Файлы',
        membersLabel: 'Участники',
        attachPhoto: 'Фото и видео',
        attachMusic: 'Музыка',
        attachFile: 'Файлъ',
        attachPoll: 'Голосованіе',
        emoji: 'Эмодзи',
        customEmoji: 'Свои эмодзи',
        stickers: 'Стикеры',
        gif: 'GIF',
        createPack: '＋ Создать стикерпакъ',
        createEmoji: '＋ Создать эмодзи',
        emptyStickers: 'У васъ пока нѣтъ стикеровъ.\\nНажмите ＋ внизу, дабы создать пакъ, или нажмите на присланный стикеръ, чтобы добавить чужой.',
        emptyCustomEmoji: 'У васъ пока нѣтъ своихъ эмодзи.\\nСоздайте свой наборъ картинокъ или GIF!',
        installed: 'Установленъ',
        addPack: 'Добавить пакъ',
        editPack: '✏️ Редактировать',
        deletePackPerm: '🗑 Удалить навсегда',
        packTitleLabel: 'НАЗВАНIЕ ПАКА',
        packTitlePh: 'Напримѣръ: Мои мемы',
        packIconLabel: 'ИКОНКА НАБОРА',
        packIconHint: 'по умолчанию — первый стикеръ',
        uploadIconBtn: 'Загрузить иконку',
        packItemsLabel: 'СТИКЕРЫ',
        packItemsEmojiLabel: 'ЭМОДЗИ',
        addImageBtn: '＋ Добавить картинку',
        addEmojiBtn: '＋ Добавить эмодзи',
        packCreateHint: 'Добавьте картинки, GIF, анимированные WebP или короткiя видео — каждый файлъ станетъ стикеромъ.\\nПодъ каждымъ укажите эмодзи.',
        publishPackBtn: 'Опубликовать пакъ',
        deletePackBtn: '🗑 Удалить пакъ',
        uploadPhotoTitle: 'Загрузить фото',
        fromFavorites: '🔖 Изъ избраннаго',
        orUploadFile: 'или загрузите файлъ',
        dropFileHint: 'Нажмите или перетащите файлъ сюда',
        fileHostsFree: '☁️ Быстрое облако · 100% БЕЗПЛАТНО',
        sendAsSpoiler: 'Отправить какъ спойлеръ',
        uploadBtnText: 'Загрузить',
        newPoll: 'Новый опросъ',
        pollQuestionLabel: 'ВОПРОСЪ',
        pollQPh: 'Текст вопроса',
        pollDescPh: 'Описанiе (необязательно)',
        pollAnswersLabel: 'ВАРIАНТЫ ОТВѢТА',
        addAnswerOption: 'Добавить отвѣтъ...',
        canAddMore: 'Можно добавить еще',
        optionsCount: 'варiантовъ отвѣта.',
        pollSettingsLabel: 'НАСТРОЙКИ',
        pollNames: 'Имена участниковъ',
        pollNamesDesc: 'Рядомъ съ отвѣтами отображаются имена всѣхъ голосовавшихъ.',
        pollMultiple: 'Нѣсколько отвѣтовъ',
        pollMultipleDesc: 'Участники могутъ выбрать болѣе одного варiанта отвѣта.',
        pollQuiz: 'Правильный отвѣтъ',
        pollQuizDesc: 'Отмѣтьте одинъ или нѣсколько правильныхъ варiантовъ.',
        sendPollBtn: 'Отправить опросъ',
        foldersTitle: 'Управленiе папками',
        createFolderSection: 'СОЗДАТЬ ПАПКУ',
        myFoldersSection: 'МОИ ПАПКИ',
        addToFolderTitle: 'Добавить въ папку',
        folderDefault: 'По умолчанiю',
        folderNamePh: 'Названiе папки',
        folderIconPh: 'Иконка',
        callGroupTitle: 'Групповой звонокъ',
        callOngoing: 'Идетъ звонокъ',
        callExpand: 'Развернуть',
        callEnd: '✕ Завершить',
        callConnecting: '● Соединенiе...',
        callJoinBtn: 'Присоединиться къ звонку',
        copyInviteLink: '🔗 Скопировать ссылку-приглашенiе',
        mic: 'Микрофонъ',
        micMuted: 'Выкл. микрофонъ',
        cam: 'Камера',
        camOff: 'Выкл. камеру',
        soundOut: 'Выводъ звука',
        sound: 'Звукъ',
        screenShare: 'Трансляцiя экрана',
        screen: 'Экранъ',
        inviteToCall: 'Пригласить въ звонокъ',
        invite: 'Пригласить',
        leaveCall: 'Покинуть звонокъ',
        leave: 'Покинуть',
        incomingCall: 'Входящiй звонокъ',
        decline: 'Отклонить',
        answer: 'Отвѣтить',
        callLinkTitle: 'Ссылка на звонокъ',
        callLinkDesc: 'Скопируйте ссылку, чтобы пригласить участниковъ, или вставьте ссылку для присоединенiя:',
        copyBtn: '📋 Скопировать',
        closeDialog: '✕ Закрыть',
        orJoinByLink: 'или присоединиться по ссылкѣ',
        joinBtn: '🔗 Присоединиться',
        linkCopied: 'Ссылка скопирована!',
        nsTitle: 'Шумоподавленiе',
        nsClickConfig: 'Нажмите для настройки',
        nsAiSubtitle: 'Шумоподавленiе нейросѣтью • реальное время',
        nsEnabled: 'Подавленiе шумовъ',
        nsOffHint: 'Выключено — нажмите для включенiя',
        nsAudioStream: 'АУДIО ПОТОКЪ',
        nsNoSignal: 'НѢТЪ СИГНАЛА',
        nsInput: 'Входъ',
        nsOutput: 'Выходъ',
        nsIntensity: 'Интенсивность',
        nsMild: 'Мягко',
        nsBalanced: 'Сбалансировано',
        nsMax: 'Максимумъ',
        nsOffice: 'Офисъ',
        nsHome: 'Дома',
        nsStreet: 'Улица',
        nsSuppressed: 'Подавлено',
        nsLatency: 'Задержка',
        nsLoad: 'Нагрузка',
        appInfoTitle: 'О приложенiи',
        yearLabel: 'Годъ выпуска',
        devLabel: 'Разработчикъ',
        versionLabel: 'Версiя',
        copyright: '© 2026 ООО Безпонтовый Пирожокъ ™. Всѣ права защищены.',
        updateAvailable: 'Доступно обновленiе',
        updateText: 'Вышла новая версiя приложенiя',
        updateBtn: 'Обновить',
        confirmTitle: 'Подтвержденiе',
        areYouSure: 'Вы уверены?',
        cancel: 'Отмѣна',
        confirm: 'Подтвердить',
        deletePermanently: 'Удалить навсегда',
        notification: 'Увѣдомленiе',
        error: 'Ошибка',
        success: 'Успѣшно',
        editProfile: 'Измѣнить профиль',
        about: 'О себѣ',
        aboutPh: 'О себѣ',
        aboutHint: 'Напримѣръ: 23 года, дизайнеръ изъ Москвы. Любыя подробности о себѣ.',
        username: 'Юзернеймъ',
        usernamePh: 'Юзернеймъ',
        usernameHint: 'По юзернейму васъ смогутъ находить другiе пользователи.',
        contacts: 'Контакты',
        phone: 'Телефонъ',
        birthday: 'День рожденiя',
        privacy: 'Конфиденцiальность',
        hideLastSeen: 'Скрывать время входа',
        hideLastSeenHint: 'Другiе не увидятъ когда вы были въ сѣти',
        yourUid: 'Вашъ UID',
        language: 'Языкъ интерфейса',
        save: 'Сохранить',
        logout: 'Выйти изъ аккаунта',
        manageVerification: 'Управленiе верификацiей',
        grantVerification: 'Выдать верификацiю',
        groupTitle: 'Группа',
        groupName: 'НАЗВАНIЕ',
        groupNamePh: 'Названiе группы',
        groupDesc: 'ОПИСАНIЕ',
        groupDescPh: 'Описанiе...',
        groupPrivacy: 'ПРИВАТНОСТЬ',
        public: 'Публичная',
        private: 'Приватная',
        addMember: 'ДОБАВИТЬ УЧАСНИКА',
        photos: 'ФОТОГРАФIИ',
        leaveGroup: 'Покинуть группу',
        deleteGroup: '🗑 Удалить группу',
        createGroupTitle: 'Создать группу',
        newGroupTitle: 'Новая группа',
        addFriendTitle: 'Добавить друга',
        friendNickPh: 'Юзернеймъ пользователя',
        sendReqBtn: 'Отправить заявку',
        sendMsgBtn: 'Написать сообщенiе',
        addFriendBtn: 'Добавить въ друзья',
        removeFriendBtn: 'Удалить изъ друзей',
        reqSentBtn: 'Заявка отправлена',
        forwardTitle: 'Переслать сообщенiе',
        searchChatPh: 'Поискъ чата...',
        selectChatHeader: 'ВЫБЕРИТЕ ЧАТЪ',
        authLogin: 'Входъ',
        authReg: 'Регистрацiя',
        loginBtn: 'Войти',
        regBtn: 'Зарегистрироваться',
        noAccLink: 'Нѣтъ аккаунта? Зарегистрироваться',
        hasAccLink: 'Уже есть аккаунтъ? Войти',
        passPh: 'Пароль',
        verifyEmailTitle: 'Подтвердите почту',
        verifyEmailSub: 'Мы отправили 6-значный кодъ на',
        resendCode: 'Отправить кодъ еще разъ',
        resendCodeWait: 'Отправить кодъ еще разъ ({n} с)',
        emailNotVerified: 'Почта не подтверждена',
        emailNotVerifiedDesc: 'Чтобы пользоваться приложенiемъ, нужно подтвердить почту',
        confirmAccount: 'Подтвердить аккаунтъ',
        exitAndSwitch: '← Выйти и войти подъ другимъ аккаунтомъ',
        clickToCopy: 'Нажмите чтобы скопировать',
        copied: 'Скопировано!'
      }
    };
    window.I18N = I18N;
`;

const ULTIMATE_SET_LANGUAGE_CODE = `
    let curLang = localStorage.getItem('nonsense-lang') || 'ru';
    if (!I18N[curLang]) curLang = 'ru';

    function t(key, fallback) {
      const dict = I18N[curLang] || I18N['ru'] || {};
      return (dict[key] !== undefined) ? dict[key] : (fallback !== undefined ? fallback : key);
    }
    window.t = t;

    function setLanguage(lang) {
      if (!I18N[lang]) lang = 'ru';
      curLang = lang;
      localStorage.setItem('nonsense-lang', lang);
      document.documentElement.lang = lang === 'ru-pre' ? 'ru' : lang;

      const dict = I18N[lang] || I18N['ru'];

      // 1. Text elements with data-i18n
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.dataset.i18n;
        if (dict[k] !== undefined) el.textContent = dict[k];
      });

      // 2. Placeholders with data-i18n-ph
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const k = el.dataset.i18nPh;
        if (dict[k] !== undefined) el.placeholder = dict[k];
      });

      // 3. Titles with data-i18n-title
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const k = el.dataset.i18nTitle;
        if (dict[k] !== undefined) el.title = dict[k];
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

      // 11. Update Modals & Sections
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

      // Call Link Dialog
      const cldTitle = document.querySelector('#callLinkDialog .call-link-dialog-title');
      if (cldTitle) cldTitle.textContent = dict.callLinkTitle;
      const cldDesc = document.querySelector('#callLinkDialog .call-link-dialog-desc');
      if (cldDesc) cldDesc.textContent = dict.callLinkDesc;
      const copyBtnEl = document.getElementById('copyLinkBtnModal');
      if (copyBtnEl) copyBtnEl.textContent = dict.copyBtn;
      const closeBtnEl = document.getElementById('closeLinkDialog');
      if (closeBtnEl) closeBtnEl.textContent = dict.closeDialog;
      const orJoinEl = document.querySelector('#callLinkDialog .call-link-dialog-divider span');
      if (orJoinEl) orJoinEl.textContent = dict.orJoinByLink;
      const joinBtnEl = document.querySelector('#callLinkDialog .call-link-dialog-join button');
      if (joinBtnEl) joinBtnEl.textContent = dict.joinBtn;

      // Noise suppression panel
      const nsTitleEl = document.querySelector('.ns-panel-head h4');
      if (nsTitleEl) nsTitleEl.textContent = dict.nsTitle;
      const nsSubEl = document.querySelector('.ns-panel-sub');
      if (nsSubEl) nsSubEl.textContent = dict.nsAiSubtitle;
      const nsMainTog = document.querySelector('.ns-panel-toggle-title');
      if (nsMainTog) nsMainTog.textContent = dict.nsEnabled;

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

// Заменяем блок I18N в исходном коде
for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Заменяем блок I18N
  const i18nStart = code.indexOf('/* ═══ I18N LOCALIZATION ENGINE ═══ */');
  if (i18nStart > 0) {
    const i18nEnd = code.indexOf('window.toggleLangPicker = toggleLangPicker;', i18nStart) + 'window.toggleLangPicker = toggleLangPicker;'.length;
    const replacement = `/* ═══ I18N LOCALIZATION ENGINE ═══ */\n` + ULTIMATE_I18N_OBJECT + '\n' + ULTIMATE_SET_LANGUAGE_CODE + `\n    function toggleLangPicker(e) { if(e&&e.stopPropagation)e.stopPropagation(); const tp=document.getElementById('themePicker'); if(tp)tp.classList.remove('open'); const lp=document.getElementById('langPicker'); if(lp)lp.classList.toggle('open'); } window.toggleLangPicker = toggleLangPicker;`;
    code = code.slice(0, i18nStart) + replacement + code.slice(i18nEnd);
    console.log('✓ Injected ULTIMATE_I18N in:', filePath);
  }

  // 2. Добавляем data-i18n атрибуты ко всем статическим элементам HTML
  const tagsMap = [
    // Theme options
    ['Тёмная (стандарт)</div>', '<span data-i18n="themeDark">Тёмная (стандарт)</span></div>'],
    ['Кофейная тёмная</div>', '<span data-i18n="themeCoffeeDark">Кофейная тёмная</span></div>'],
    ['Кофейная светлая</div>', '<span data-i18n="themeCoffeeLight">Кофейная светлая</span></div>'],
    ['Моховая тёмная</div>', '<span data-i18n="themeMoss">Моховая тёмная</span></div>'],

    // Update banner
    ['<div class="app-update-title">Доступно обновление</div>', '<div class="app-update-title" data-i18n="updateAvailable">Доступно обновление</div>'],
    ['<div class="app-update-text">Вышла новая версия приложения</div>', '<div class="app-update-text" data-i18n="updateText">Вышла новая версия приложения</div>'],
    ['<button class="app-update-btn" onclick="applyUpdate()">Обновить</button>', '<button class="app-update-btn" onclick="applyUpdate()" data-i18n="updateBtn">Обновить</button>'],

    // Confirm modal
    ['<div class="confirm-modal-title" id="confirmTitle">Подтверждение</div>', '<div class="confirm-modal-title" id="confirmTitle" data-i18n="confirmTitle">Подтверждение</div>'],
    ['<div class="confirm-modal-text" id="confirmText">Вы уверены?</div>', '<div class="confirm-modal-text" id="confirmText" data-i18n="areYouSure">Вы уверены?</div>'],
    ['<button class="confirm-modal-btn cancel" id="confirmCancelBtn">Отмена</button>', '<button class="confirm-modal-btn cancel" id="confirmCancelBtn" data-i18n="cancel">Отмена</button>'],
    ['<button class="confirm-modal-btn ok" id="confirmOkBtn">Подтвердить</button>', '<button class="confirm-modal-btn ok" id="confirmOkBtn" data-i18n="confirm">Подтвердить</button>'],

    // Attach menu
    ['<span>Фото и видео</span>', '<span data-i18n="attachPhoto">Фото и видео</span>'],
    ['<span>Музыка</span>', '<span data-i18n="attachMusic">Музыка</span>'],
    ['<span>Файл</span>', '<span data-i18n="attachFile">Файл</span>'],
    ['<span>Голосование</span>', '<span data-i18n="attachPoll">Голосование</span>'],

    // Context menu
    ['<i class="fa-solid fa-reply"></i> Ответить', '<i class="fa-solid fa-reply"></i> <span data-i18n="ctxReply">Ответить</span>'],
    ['<i class="fa-solid fa-share"></i> Переслать', '<i class="fa-solid fa-share"></i> <span data-i18n="ctxForward">Переслать</span>'],
    ['<i class="fa-solid fa-copy"></i> Копировать текст', '<i class="fa-solid fa-copy"></i> <span data-i18n="ctxCopyText">Копировать текст</span>'],
    ['<i class="fa-solid fa-copy"></i> Копировать фото', '<i class="fa-solid fa-copy"></i> <span data-i18n="ctxCopyPhoto">Копировать фото</span>'],
    ['<i class="fa-solid fa-icons"></i> Стикерпак', '<i class="fa-solid fa-icons"></i> <span data-i18n="ctxStickerpack">Стикерпак</span>'],
    ['<i class="fa-solid fa-thumbtack"></i> Закрепить', '<i class="fa-solid fa-thumbtack"></i> <span data-i18n="ctxPin">Закрепить</span>'],
    ['<i class="fa-solid fa-trash"></i> Удалить', '<i class="fa-solid fa-trash"></i> <span data-i18n="ctxDelete">Удалить</span>'],

    // Chat context menu
    ['<i class="fa-solid fa-thumbtack"></i> Закрепить чат', '<i class="fa-solid fa-thumbtack"></i> <span data-i18n="ctxPinChat">Закрепить чат</span>'],
    ['<i class="fa-solid fa-folder-plus"></i> В папку', '<i class="fa-solid fa-folder-plus"></i> <span data-i18n="ctxToFolder">В папку</span>'],
    ['<i class="fa-solid fa-box-archive"></i> Архивировать', '<i class="fa-solid fa-box-archive"></i> <span data-i18n="ctxArchive">Архивировать</span>'],
    ['<i class="fa-solid fa-bell-slash"></i> Откл. уведомления', '<i class="fa-solid fa-bell-slash"></i> <span data-i18n="ctxMute">Откл. уведомления</span>'],
    ['<i class="fa-solid fa-arrow-right-from-bracket"></i> Покинуть/удалить', '<i class="fa-solid fa-arrow-right-from-bracket"></i> <span data-i18n="ctxLeaveDelete">Покинуть/удалить</span>'],

    // Text format context menu
    ['<i class="fa-solid fa-bold"></i> Жирный', '<i class="fa-solid fa-bold"></i> <span data-i18n="ctxBold">Жирный</span>'],
    ['<i class="fa-solid fa-italic"></i> Курсив', '<i class="fa-solid fa-italic"></i> <span data-i18n="ctxItalic">Курсив</span>'],
    ['<i class="fa-solid fa-underline"></i> Подчёркнутый', '<i class="fa-solid fa-underline"></i> <span data-i18n="ctxUnderline">Подчёркнутый</span>'],
    ['<i class="fa-solid fa-strikethrough"></i> Зачёркнутый', '<i class="fa-solid fa-strikethrough"></i> <span data-i18n="ctxStrike">Зачёркнутый</span>'],
    ['<i class="fa-solid fa-quote-left"></i> Цитата', '<i class="fa-solid fa-quote-left"></i> <span data-i18n="ctxQuote">Цитата</span>'],
    ['<i class="fa-solid fa-eye-slash"></i> Спойлер', '<i class="fa-solid fa-eye-slash"></i> <span data-i18n="ctxSpoiler">Спойлер</span>'],

    // Call Screen
    ['<span class="call-top-title">Групповой звонок</span>', '<span class="call-top-title" data-i18n="callGroupTitle">Групповой звонок</span>'],
    ['<span class="call-btn-lbl">Микрофон</span>', '<span class="call-btn-lbl" data-i18n="mic">Микрофон</span>'],
    ['<span class="call-btn-lbl">Камера</span>', '<span class="call-btn-lbl" data-i18n="cam">Камера</span>'],
    ['<span class="call-btn-lbl">Экран</span>', '<span class="call-btn-lbl" data-i18n="screen">Экран</span>'],
    ['<span class="call-btn-lbl">Пригласить</span>', '<span class="call-btn-lbl" data-i18n="invite">Пригласить</span>'],
    ['<span class="call-btn-lbl">Покинуть</span>', '<span class="call-btn-lbl" data-i18n="leave">Покинуть</span>'],
    ['<span class="vk-btn-icon">🔗</span> Присоединиться к звонку', '<span class="vk-btn-icon">🔗</span> <span data-i18n="callJoinBtn">Присоединиться к звонку</span>'],
    ['🔗 Скопировать ссылку-приглашение', '<span data-i18n="copyInviteLink">🔗 Скопировать ссылку-приглашение</span>'],
    ['<div class="incoming-call-title">Входящий звонок</div>', '<div class="incoming-call-title" data-i18n="incomingCall">Входящий звонок</div>'],
    ['<span class="call-btn-lbl">Отклонить</span>', '<span class="call-btn-lbl" data-i18n="decline">Отклонить</span>'],
    ['<span class="call-btn-lbl">Ответить</span>', '<span class="call-btn-lbl" data-i18n="answer">Ответить</span>'],

    // Noise suppression panel
    ['<h4>Шумоподавление</h4>', '<h4 data-i18n="nsTitle">Шумоподавление</h4>'],
    ['<p class="ns-panel-sub">Шумоподавление нейросетью • реальное время</p>', '<p class="ns-panel-sub" data-i18n="nsAiSubtitle">Шумоподавление нейросетью • реальное время</p>'],
    ['<div class="ns-panel-toggle-title">Подавление шумов</div>', '<div class="ns-panel-toggle-title" data-i18n="nsEnabled">Подавление шумов</div>'],
    ['<div class="ns-panel-toggle-sub" id="nsToggleSub">Выключено — нажмите для включения</div>', '<div class="ns-panel-toggle-sub" id="nsToggleSub" data-i18n="nsOffHint">Выключено — нажмите для включения</div>'],
    ['<div class="ns-panel-sec-title">АУДИО ПОТОК</div>', '<div class="ns-panel-sec-title" data-i18n="nsAudioStream">АУДИО ПОТОК</div>'],
    ['<span class="ns-mode-lbl">Вход</span>', '<span class="ns-mode-lbl" data-i18n="nsInput">Вход</span>'],
    ['<span class="ns-mode-lbl">Выход</span>', '<span class="ns-mode-lbl" data-i18n="nsOutput">Выход</span>'],
    ['<div class="ns-panel-sec-title">ИНТЕНСИВНОСТЬ</div>', '<div class="ns-panel-sec-title" data-i18n="nsIntensity">ИНТЕНСИВНОСТЬ</div>'],
    ['<span class="ns-mode-lbl">Подавлено</span>', '<span class="ns-mode-lbl" data-i18n="nsSuppressed">Подавлено</span>'],
    ['<span class="ns-mode-lbl">Задержка</span>', '<span class="ns-mode-lbl" data-i18n="nsLatency">Задержка</span>'],
    ['<span class="ns-mode-lbl">Нагрузка</span>', '<span class="ns-mode-lbl" data-i18n="nsLoad">Нагрузка</span>'],

    // Profile modals
    ['<div class="tgme-card-title">Управление верификацией</div>', '<div class="tgme-card-title" data-i18n="manageVerification">Управление верификацией</div>'],
    ['<button class="mbtn" onclick="openGrantVerificationModal()">Выдать верификацию</button>', '<button class="mbtn" onclick="openGrantVerificationModal()" data-i18n="grantVerification">Выдать верификацию</button>'],
    ['<button class="mbtn red" onclick="auth.signOut()">Выйти из аккаунта</button>', '<button class="mbtn red" onclick="auth.signOut()" data-i18n="logout">Выйти из аккаунта</button>'],
    ['<button class="mbtn sec" onclick="closeModal(\'modal-myprofile\')">Отмена</button>', '<button class="mbtn sec" onclick="closeModal(\'modal-myprofile\')" data-i18n="cancel">Отмена</button>'],
    ['<button class="mbtn" onclick="saveMyProfile()">Сохранить</button>', '<button class="mbtn" onclick="saveMyProfile()" data-i18n="save">Сохранить</button>'],

    // View Profile
    ['<button class="mbtn" id="vpSendMsgBtn" onclick="vpSendMsg()">Написать сообщение</button>', '<button class="mbtn" id="vpSendMsgBtn" onclick="vpSendMsg()" data-i18n="sendMsgBtn">Написать сообщение</button>'],
    ['<button class="mbtn sec" id="vpFriendBtn" onclick="vpFriendAction()">Добавить в друзья</button>', '<button class="mbtn sec" id="vpFriendBtn" onclick="vpFriendAction()" data-i18n="addFriendBtn">Добавить в друзья</button>'],

    // Create Group modal
    ['<button class="mbtn sec" onclick="closeModal(\'modal-group\')">Отмена</button>', '<button class="mbtn sec" onclick="closeModal(\'modal-group\')" data-i18n="cancel">Отмена</button>'],
    ['<button class="mbtn" onclick="createGroup()">Создать</button>', '<button class="mbtn" onclick="createGroup()" data-i18n="createGroupTitle">Создать</button>'],
    ['<button class="mbtn red" style="margin-top:8px" onclick="deleteGroup()">🗑 Удалить группу</button>', '<button class="mbtn red" style="margin-top:8px" onclick="deleteGroup()" data-i18n="deleteGroup">🗑 Удалить группу</button>'],

    // Add friend modal
    ['<button class="mbtn sec" onclick="closeModal(\'modal-friend\')">Отмена</button>', '<button class="mbtn sec" onclick="closeModal(\'modal-friend\')" data-i18n="cancel">Отмена</button>'],

    // File upload modal
    ['<div class="mhead"><h3>Загрузить фото</h3>', '<div class="mhead"><h3 data-i18n="uploadPhotoTitle">Загрузить фото</h3>'],
    ['<span class="file-drop-or">или загрузите файл</span>', '<span class="file-drop-or" data-i18n="orUploadFile">или загрузите файл</span>'],
    ['<span class="file-drop-text">Нажмите или перетащите файл сюда</span>', '<span class="file-drop-text" data-i18n="dropFileHint">Нажмите или перетащите файл сюда</span>'],
    ['<span style="font-size:12px;color:var(--text)">Отправить как спойлер</span>', '<span style="font-size:12px;color:var(--text)" data-i18n="sendAsSpoiler">Отправить как спойлер</span>'],
    ['<button class="mbtn" id="fileUploadConfirmBtn" onclick="confirmFileUpload()">Загрузить</button>', '<button class="mbtn" id="fileUploadConfirmBtn" onclick="confirmFileUpload()" data-i18n="uploadBtnText">Загрузить</button>'],

    // Pinned messages modal
    ['<div class="mhead"><h3>Закреплённые сообщения</h3>', '<div class="mhead"><h3 data-i18n="pinnedPlural">Закреплённые сообщения</h3>'],

    // Poll modal
    ['<div class="mlabel">ВОПРОС</div>', '<div class="mlabel" data-i18n="pollQuestionLabel">ВОПРОС</div>'],
    ['<div class="mlabel">ВАРИАНТЫ ОТВЕТА</div>', '<div class="mlabel" data-i18n="pollAnswersLabel">ВАРИАНТЫ ОТВЕТА</div>'],
    ['<div class="mlabel">НАСТРОЙКИ</div>', '<div class="mlabel" data-i18n="pollSettingsLabel">НАСТРОЙКИ</div>'],
    ['<div style="font-size:13.5px;font-weight:600">Имена участников</div>', '<div style="font-size:13.5px;font-weight:600" data-i18n="pollNames">Имена участников</div>'],
    ['<div style="font-size:11.5px;color:var(--text2);margin-top:2px">Рядом с ответами отображаются имена всех голосовавших.</div>', '<div style="font-size:11.5px;color:var(--text2);margin-top:2px" data-i18n="pollNamesDesc">Рядом с ответами отображаются имена всех голосовавших.</div>'],
    ['<div style="font-size:13.5px;font-weight:600">Несколько ответов</div>', '<div style="font-size:13.5px;font-weight:600" data-i18n="pollMultiple">Несколько ответов</div>'],
    ['<div style="font-size:11.5px;color:var(--text2);margin-top:2px">Участники могут выбрать более одного варианта ответа.</div>', '<div style="font-size:11.5px;color:var(--text2);margin-top:2px" data-i18n="pollMultipleDesc">Участники могут выбрать более одного варианта ответа.</div>'],
    ['<div style="font-size:13.5px;font-weight:600">Правильный ответ</div>', '<div style="font-size:13.5px;font-weight:600" data-i18n="pollQuiz">Правильный ответ</div>'],
    ['<div style="font-size:11.5px;color:var(--text2);margin-top:2px">Отметьте один или несколько правильных вариантов.</div>', '<div style="font-size:11.5px;color:var(--text2);margin-top:2px" data-i18n="pollQuizDesc">Отметьте один или несколько правильных вариантов.</div>'],
    ['<button class="mbtn sec" onclick="closeModal(\'modal-poll\')">Отмена</button>', '<button class="mbtn sec" onclick="closeModal(\'modal-poll\')" data-i18n="cancel">Отмена</button>'],
    ['<button class="mbtn" onclick="sendPoll()">Отправить опрос</button>', '<button class="mbtn" onclick="sendPoll()" data-i18n="sendPollBtn">Отправить опрос</button>'],

    // Create pack modal
    ['<button class="mbtn sec" type="button" onclick="document.getElementById(\'packIconInput\').click()">Загрузить иконку</button>', '<button class="mbtn sec" type="button" onclick="document.getElementById(\'packIconInput\').click()" data-i18n="uploadIconBtn">Загрузить иконку</button>'],
    ['<button class="mbtn" type="button" id="packAddBtn" onclick="document.getElementById(\'stickerFileInput\').click()">＋ Добавить картинку</button>', '<button class="mbtn" type="button" id="packAddBtn" onclick="document.getElementById(\'stickerFileInput\').click()" data-i18n="addImageBtn">＋ Добавить картинку</button>'],
    ['<button class="mbtn red hidden" id="packModalDeleteBtn" type="button" onclick="deleteEditingPack()">🗑 Удалить пак</button>', '<button class="mbtn red hidden" id="packModalDeleteBtn" type="button" onclick="deleteEditingPack()" data-i18n="deletePackBtn">🗑 Удалить пак</button>'],
    ['<button class="mbtn sec" type="button" onclick="closeModal(\'modal-createpack\')">Отмена</button>', '<button class="mbtn sec" type="button" onclick="closeModal(\'modal-createpack\')" data-i18n="cancel">Отмена</button>'],
    ['<button class="mbtn" id="packPublishBtn" type="button" onclick="publishPack()">Опубликовать пак</button>', '<button class="mbtn" id="packPublishBtn" type="button" onclick="publishPack()" data-i18n="publishPackBtn">Опубликовать пак</button>'],

    // Pack view modal
    ['<button class="mbtn sec" onclick="closeModal(\'modal-packview\')">Закрыть</button>', '<button class="mbtn sec" onclick="closeModal(\'modal-packview\')" data-i18n="closeDialog">Закрыть</button>'],

    // Forward modal
    ['<div class="mlabel">ВЫБЕРИТЕ ЧАТ</div>', '<div class="mlabel" data-i18n="selectChatHeader">ВЫБЕРИТЕ ЧАТ</div>'],

    // Folders modal
    ['<div class="mlabel">СОЗДАТЬ ПАПКУ</div>', '<div class="mlabel" data-i18n="createFolderSection">СОЗДАТЬ ПАПКУ</div>'],
    ['<div class="mlabel" style="margin-top:14px">МОИ ПАПКИ</div>', '<div class="mlabel" style="margin-top:14px" data-i18n="myFoldersSection">МОИ ПАПКИ</div>'],
    ['<div class="mhead"><h3>Добавить в папку</h3>', '<div class="mhead"><h3 data-i18n="addToFolderTitle">Добавить в папку</h3>'],
    ['<span>По умолчанию</span>', '<span data-i18n="folderDefault">По умолчанию</span>'],

    // App info modal
    ['<div class="app-info-sub">© 2026 ООО Беспонтовый Пирожок ™. Все права защищены.</div>', '<div class="app-info-sub" data-i18n="copyright">© 2026 ООО Беспонтовый Пирожок ™. Все права защищены.</div>'],

    // Auth screen
    ['<button class="auth-btn" id="abtn" onclick="submitAuth()">Войти</button>', '<button class="auth-btn" id="abtn" onclick="submitAuth()" data-i18n="loginBtn">Войти</button>'],
    ['<div class="auth-toggle" id="atoggle" onclick="toggleAuth()">Нет аккаунта? Зарегистрироваться</div>', '<div class="auth-toggle" id="atoggle" onclick="toggleAuth()" data-i18n="noAccLink">Нет аккаунта? Зарегистрироваться</div>'],
    ['<h3>Почта не подтверждена</h3>', '<h3 data-i18n="emailNotVerified">Почта не подтверждена</h3>'],
    ['<p>Чтобы пользоваться приложением, нужно подтвердить почту</p>', '<p data-i18n="emailNotVerifiedDesc">Чтобы пользоваться приложением, нужно подтвердить почту</p>'],
    ['<button class="vchoice-btn primary" onclick="showVerifyScreen(auth.currentUser)">Подтвердить аккаунт</button>', '<button class="vchoice-btn primary" onclick="showVerifyScreen(auth.currentUser)" data-i18n="confirmAccount">Подтвердить аккаунт</button>'],
    ['<button class="vchoice-btn secondary vlogout-btn" onclick="verifyLogout()">Выйти из аккаунта</button>', '<button class="vchoice-btn secondary vlogout-btn" onclick="verifyLogout()" data-i18n="logout">Выйти из аккаунта</button>'],
    ['<h3>Подтвердите почту</h3>', '<h3 data-i18n="verifyEmailTitle">Подтвердите почту</h3>'],
    ['<button class="vresend-btn" id="vresend" onclick="resendVerifyCode()">Отправить код ещё раз</button>', '<button class="vresend-btn" id="vresend" onclick="resendVerifyCode()" data-i18n="resendCode">Отправить код ещё раз</button>'],
    ['<button class="vback-link" onclick="verifyLogout()">← Выйти и войти под другим аккаунтом</button>', '<button class="vback-link" onclick="verifyLogout()" data-i18n="exitAndSwitch">← Выйти и войти под другим аккаунтом</button>']
  ];

  for (const [target, replacement] of tagsMap) {
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    }
  }

  // 3. Добавляем data-i18n-ph к плейсхолдерам
  const phMap = [
    ['placeholder="Поиск по юзернейму или группе..."', 'placeholder="Поиск по юзернейму или группе..." data-i18n-ph="searchPh"'],
    ['placeholder="Сообщение..."', 'placeholder="Сообщение..." data-i18n-ph="typeMsgPh"'],
    ['placeholder="О себе"', 'placeholder="О себе" data-i18n-ph="aboutPh"'],
    ['placeholder="Юзернейм"', 'placeholder="Юзернейм" data-i18n-ph="usernamePh"'],
    ['placeholder="Название группы"', 'placeholder="Название группы" data-i18n-ph="groupNamePh"'],
    ['placeholder="Описание..."', 'placeholder="Описание..." data-i18n-ph="groupDescPh"'],
    ['placeholder="Юзернейм пользователя"', 'placeholder="Юзернейм пользователя" data-i18n-ph="friendNickPh"'],
    ['placeholder="Текст вопроса"', 'placeholder="Текст вопроса" data-i18n-ph="pollQPh"'],
    ['placeholder="Описание (необязательно)"', 'placeholder="Описание (необязательно)" data-i18n-ph="pollDescPh"'],
    ['placeholder="Например: Мои мемы"', 'placeholder="Например: Мои мемы" data-i18n-ph="packTitlePh"'],
    ['placeholder="Поиск чата..."', 'placeholder="Поиск чата..." data-i18n-ph="searchChatPh"'],
    ['placeholder="Название папки"', 'placeholder="Название папки" data-i18n-ph="folderNamePh"'],
    ['placeholder="Иконка"', 'placeholder="Иконка" data-i18n-ph="folderIconPh"'],
    ['placeholder="Пароль"', 'placeholder="Пароль" data-i18n-ph="passPh"']
  ];

  for (const [target, replacement] of phMap) {
    if (code.includes(target) && !code.includes(replacement)) {
      code = code.replace(target, replacement);
    }
  }

  // 4. Обновляем userStatusText чтобы использовал функцию t(...)
  const oldUserStatusText = `function userStatusText(u,chatId=null){
  if(userIsOnline(u)){
    if(chatId && u.typingIn===chatId) return '✏️ Печатает...';
    return 'В сети';
  }
  if(u?.hideLastSeen) return 'Не в сети';
  const lastSeen=asDate(u?.lastSeen);
  return lastSeen ? 'Был(а) '+fmtLastSeen(lastSeen) : 'Не в сети';
}`;
  const newUserStatusText = `function userStatusText(u,chatId=null){
  if(userIsOnline(u)){
    if(chatId && u.typingIn===chatId) return '✏️ ' + (typeof t === 'function' ? t('typing', 'печатает...') : 'печатает...');
    return (typeof t === 'function' ? t('online', 'В сети') : 'В сети');
  }
  if(u?.hideLastSeen) return (typeof t === 'function' ? t('offline', 'Не в сети') : 'Не в сети');
  const lastSeen=asDate(u?.lastSeen);
  return lastSeen ? (typeof fmtLastSeen === 'function' ? fmtLastSeen(lastSeen) : '') : (typeof t === 'function' ? t('offline', 'Не в сети') : 'Не в сети');
}`;
  if (code.includes(oldUserStatusText)) {
    code = code.replace(oldUserStatusText, newUserStatusText);
    console.log('✓ Updated userStatusText with i18n');
  }

  // 5. Валидация скриптов
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
        const lines = m[1].split(/\r?\n/);
        const match = (err.stack || '').match(/:(\d+)/);
        if (match) {
          const lineNum = parseInt(match[1], 10);
          console.error(`Around line ${lineNum}:`);
          for (let i = Math.max(0, lineNum - 6); i < Math.min(lines.length, lineNum + 5); i++) {
            console.error(`${i + 1}: ${lines[i]}`);
          }
        }
        process.exit(1);
      }
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✓ Saved and validated ${filePath} (${scriptCount} scripts valid)`);
}

console.log('\\n✅ Full interface localization applied successfully to all files!');
