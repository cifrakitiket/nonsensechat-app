// server/generate-android-resources.js
const fs = require('fs');
const path = require('path');

const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

function writeRes(relPath, content) {
  const fullPath = path.join(resDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('✓ Res:', relPath);
}

// 1. values/colors.xml
writeRes('values/colors.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Backgrounds (Deep Space Dark / Obsidian) -->
    <color name="bg_main">#080C14</color>
    <color name="bg_surface">#0F172A</color>
    <color name="bg_card">#131D31</color>
    <color name="bg_card_hover">#1A263E</color>
    <color name="bg_elevated">#1E293B</color>

    <!-- Bubbles -->
    <color name="bubble_outgoing">#102E42</color>
    <color name="bubble_outgoing_border">#1D4A66</color>
    <color name="bubble_incoming">#152033</color>
    <color name="bubble_incoming_border">#22324D</color>

    <!-- Accents & Highlights -->
    <color name="accent_green">#00FF88</color>
    <color name="accent_green_glow">#3300FF88</color>
    <color name="accent_cyan">#00D2FF</color>
    <color name="accent_purple">#8B5CF6</color>
    <color name="accent_indigo">#6366F1</color>

    <!-- Typography -->
    <color name="text_primary">#F8FAFC</color>
    <color name="text_secondary">#94A3B8</color>
    <color name="text_tertiary">#64748B</color>
    <color name="text_disabled">#475569</color>

    <!-- Statuses -->
    <color name="online_green">#22C55E</color>
    <color name="online_glow">#4D22C55E</color>
    <color name="danger_red">#EF4444</color>
    <color name="warning_orange">#F59E0B</color>

    <!-- Borders & Dividers -->
    <color name="border_subtle">#1E293B</color>
    <color name="border_focus">#00FF88</color>
    <color name="border_glass">#1AFFFFFF</color>

    <!-- Overlay & Spoilers -->
    <color name="spoiler_dust_tint">#0D1626</color>
    <color name="overlay_dim">#99000000</color>
    <color name="frosted_button">#40111827</color>
</resources>
`);

// 2. values/strings.xml
writeRes('values/strings.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Беспонтовый Чат</string>
    <string name="tagline">Приватный мессенджер нового поколения</string>

    <!-- Auth -->
    <string name="login_title">С возвращением</string>
    <string name="login_subtitle">Войдите в свой аккаунт, чтобы продолжить</string>
    <string name="register_title">Создать аккаунт</string>
    <string name="register_subtitle">Придумайте никнейм и пароль для входа</string>
    <string name="email_hint">Электронная почта</string>
    <string name="password_hint">Пароль</string>
    <string name="nickname_hint">Никнейм (без пробелов)</string>
    <string name="action_login">Войти</string>
    <string name="action_register">Зарегистрироваться</string>
    <string name="action_guest_login">Быстрый гостевой вход</string>
    <string name="dont_have_account">Нет аккаунта? Зарегистрироваться</string>
    <string name="have_account">Уже есть аккаунт? Войти</string>
    <string name="invalid_email">Введите корректный email</string>
    <string name="short_password">Пароль должен содержать минимум 6 символов</string>
    <string name="empty_nickname">Никнейм не может быть пустым</string>

    <!-- Main -->
    <string name="tab_all">Все</string>
    <string name="tab_direct">Личные</string>
    <string name="tab_groups">Группы</string>
    <string name="tab_channels">Каналы</string>
    <string name="search_chats_hint">Поиск чатов и сообщений...</string>
    <string name="no_chats_title">Пока нет сообщений</string>
    <string name="no_chats_subtitle">Нажмите +, чтобы начать диалог или создать группу</string>
    <string name="new_chat">Новый диалог</string>
    <string name="create_group">Создать группу</string>
    <string name="settings">Настройки</string>
    <string name="logout">Выйти из аккаунта</string>

    <!-- Chat -->
    <string name="type_message_hint">Сообщение...</string>
    <string name="typing_single">%1$s печатает...</string>
    <string name="typing_default">печатает...</string>
    <string name="online_now">в сети</string>
    <string name="offline_last_seen">был(а) недавно</string>
    <string name="photo_attachment">Фотография</string>
    <string name="voice_message">Голосовое сообщение</string>
    <string name="poll_attachment">Опрос</string>
    <string name="spoiler_hint">Спойлер</string>
    <string name="tap_to_reveal">Нажмите, чтобы открыть</string>
    <string name="recording_audio">Запись аудио...</string>
    <string name="slide_to_cancel">&lt; Свайп для отмены</string>

    <!-- Polls -->
    <string name="create_poll_title">Создать опрос</string>
    <string name="poll_question_hint">Задайте вопрос...</string>
    <string name="poll_option_hint">Вариант ответа</string>
    <string name="add_poll_option">+ Добавить вариант</string>
    <string name="poll_multiple_answers">Несколько ответов</string>
    <string name="poll_anonymous">Анонимное голосование</string>
    <string name="action_create_poll">Создать</string>
    <string name="poll_votes_count">%1$d голосов</string>
    <string name="poll_voted">Вы проголосовали</string>
</resources>
`);

// 3. values/themes.xml
writeRes('values/themes.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="Theme.NonsenseChat" parent="Theme.Material3.Dark.NoActionBar">
        <!-- System bar styling -->
        <item name="android:statusBarColor">@color/bg_main</item>
        <item name="android:navigationBarColor">@color/bg_main</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowBackground">@color/bg_main</item>

        <!-- Brand colors -->
        <item name="colorPrimary">@color/accent_green</item>
        <item name="colorOnPrimary">#080C14</item>
        <item name="colorSecondary">@color/accent_cyan</item>
        <item name="colorSurface">@color/bg_surface</item>
        <item name="colorOnSurface">@color/text_primary</item>

        <!-- Text Appearances -->
        <item name="android:textColor">@color/text_primary</item>
        <item name="android:textColorHint">@color/text_tertiary</item>
    </style>

    <style name="Theme.NonsenseChat.Splash" parent="Theme.NonsenseChat">
        <item name="android:windowBackground">@color/bg_main</item>
    </style>
</resources>
`);

// 4. values/styles.xml
writeRes('values/styles.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Primary Neon Gradient Button -->
    <style name="Widget.NonsenseChat.Button.Primary" parent="Widget.Material3.Button">
        <item name="android:background">@drawable/bg_primary_button</item>
        <item name="android:textColor">#080C14</item>
        <item name="android:textStyle">bold</item>
        <item name="android:textAllCaps">false</item>
        <item name="android:stateListAnimator">@null</item>
        <item name="android:paddingTop">12dp</item>
        <item name="android:paddingBottom">12dp</item>
    </style>

    <!-- Glassmorphic Input Edit Text -->
    <style name="Widget.NonsenseChat.EditText" parent="Widget.Material3.TextInputEditText.OutlinedBox">
        <item name="android:background">@drawable/bg_input_field</item>
        <item name="android:textColor">@color/text_primary</item>
        <item name="android:textColorHint">@color/text_tertiary</item>
        <item name="android:paddingStart">16dp</item>
        <item name="android:paddingEnd">16dp</item>
        <item name="android:paddingTop">14dp</item>
        <item name="android:paddingBottom">14dp</item>
    </style>

    <!-- Bottom Sheet Dark Glass Style -->
    <style name="Widget.NonsenseChat.BottomSheet" parent="Widget.Material3.BottomSheet.Modal">
        <item name="android:background">@drawable/bg_bottom_sheet</item>
    </style>
</resources>
`);

// Drawables: Shapes
writeRes('drawable/bg_primary_button.xml', `<?xml version="1.0" encoding="utf-8"?>
<ripple xmlns:android="http://schemas.android.com/apk/res/android"
    android:color="#40FFFFFF">
    <item>
        <shape android:shape="rectangle">
            <gradient
                android:angle="0"
                android:startColor="#00FF88"
                android:endColor="#00D2FF"
                android:type="linear" />
            <corners android:radius="14dp" />
        </shape>
    </item>
</ripple>
`);

writeRes('drawable/bg_bubble_me.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/bubble_outgoing" />
    <stroke android:width="1dp" android:color="@color/bubble_outgoing_border" />
    <corners
        android:topLeftRadius="18dp"
        android:topRightRadius="18dp"
        android:bottomLeftRadius="18dp"
        android:bottomRightRadius="4dp" />
</shape>
`);

writeRes('drawable/bg_bubble_other.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/bubble_incoming" />
    <stroke android:width="1dp" android:color="@color/bubble_incoming_border" />
    <corners
        android:topLeftRadius="18dp"
        android:topRightRadius="18dp"
        android:bottomLeftRadius="4dp"
        android:bottomRightRadius="18dp" />
</shape>
`);

writeRes('drawable/bg_input_field.xml', `<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:state_focused="true">
        <shape android:shape="rectangle">
            <solid android:color="@color/bg_card" />
            <stroke android:width="1.5dp" android:color="@color/accent_green" />
            <corners android:radius="14dp" />
        </shape>
    </item>
    <item>
        <shape android:shape="rectangle">
            <solid android:color="@color/bg_card" />
            <stroke android:width="1dp" android:color="@color/border_subtle" />
            <corners android:radius="14dp" />
        </shape>
    </item>
</selector>
`);

writeRes('drawable/bg_input_bar.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/bg_card" />
    <stroke android:width="1dp" android:color="@color/border_subtle" />
    <corners android:radius="24dp" />
</shape>
`);

writeRes('drawable/bg_card_dark.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/bg_card" />
    <stroke android:width="1dp" android:color="@color/border_subtle" />
    <corners android:radius="18dp" />
</shape>
`);

writeRes('drawable/bg_bottom_sheet.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/bg_surface" />
    <stroke android:width="1dp" android:color="@color/border_subtle" />
    <corners
        android:topLeftRadius="24dp"
        android:topRightRadius="24dp"
        android:bottomLeftRadius="0dp"
        android:bottomRightRadius="0dp" />
</shape>
`);

writeRes('drawable/bg_unread_badge.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/accent_green" />
    <corners android:radius="12dp" />
    <padding
        android:left="6dp"
        android:right="6dp"
        android:top="2dp"
        android:bottom="2dp" />
</shape>
`);

writeRes('drawable/bg_online_dot.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="@color/online_green" />
    <stroke android:width="2dp" android:color="@color/bg_main" />
</shape>
`);

writeRes('drawable/bg_poll_option.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#1A283E" />
    <stroke android:width="1dp" android:color="#243854" />
    <corners android:radius="10dp" />
</shape>
`);

writeRes('drawable/bg_poll_option_selected.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#163836" />
    <stroke android:width="1.5dp" android:color="@color/accent_green" />
    <corners android:radius="10dp" />
</shape>
`);

// Vector Icons
writeRes('drawable/ic_send.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_green"
        android:pathData="M2.01,21L23,12 2.01,3 2,10l15,2 -15,2z" />
</vector>
`);

writeRes('drawable/ic_mic.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_secondary"
        android:pathData="M12,14c1.66,0 3,-1.34 3,-3V5c0,-1.66 -1.34,-3 -3,-3S9,3.34 9,5v6c0,1.66 1.34,3 3,3zM17.3,11c0,3 -2.54,5.1 -5.3,5.1S6.7,14 6.7,11H5c0,3.41 2.72,6.23 6,6.72V21h2v-3.28c3.28,-0.48 6,-3.3 6,-6.72h-1.7z" />
</vector>
`);

writeRes('drawable/ic_attach.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_secondary"
        android:pathData="M16.5,6v11.5c0,2.21 -1.79,4 -4,4s-4,-1.79 -4,-4V5c0,-1.38 1.12,-2.5 2.5,-2.5s2.5,1.12 2.5,2.5v10.5c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1V6H10v9.5c0,1.38 1.12,2.5 2.5,2.5s2.5,-1.12 2.5,-2.5V5c0,-2.21 -1.79,-4 -4,-4S7,2.79 7,5v12.5c0,3.04 2.46,5.5 5.5,5.5s5.5,-2.46 5.5,-5.5V6h-1.5z" />
</vector>
`);

writeRes('drawable/ic_back.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_primary"
        android:pathData="M20,11H7.83l5.59,-5.59L12,4l-8,8 8,8 1.41,-1.41L7.83,13H20v-2z" />
</vector>
`);

writeRes('drawable/ic_search.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_secondary"
        android:pathData="M15.5,14h-0.79l-0.28,-0.27C15.41,12.59 16,11.11 16,9.5 16,5.91 13.09,3 9.5,3S3,5.91 3,9.5 5.91,16 9.5,16c1.61,0 3.09,-0.59 4.23,-1.57l0.27,0.28v0.79l5,4.99L20.49,19l-4.99,-5zm-6,0C7.01,14 5,11.99 5,9.5S7.01,5 9.5,5 14,7.01 14,9.5 11.99,14 9.5,14z" />
</vector>
`);

writeRes('drawable/ic_menu.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_primary"
        android:pathData="M3,18h18v-2H3v2zm0,-5h18v-2H3v2zm0,-7v2h18V6H3z" />
</vector>
`);

writeRes('drawable/ic_add.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#080C14"
        android:pathData="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
</vector>
`);

writeRes('drawable/ic_poll.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_cyan"
        android:pathData="M19,3H5c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2V5c0,-1.1 -0.9,-2 -2,-2zm-8,14H7v-4h4v4zm0,-6H7V7h4v4zm6,6h-4V7h4v10z" />
</vector>
`);

writeRes('drawable/ic_eye_slash.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="28dp"
    android:height="28dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_primary"
        android:pathData="M12,7c2.76,0 5,2.24 5,5 0,0.65 -0.13,1.26 -0.36,1.82l2.92,2.92c1.51,-1.26 2.7,-2.89 3.44,-4.74 -1.73,-4.39 -6,-7.5 -11,-7.5 -1.4,0 -2.74,0.25 -3.98,0.7l2.16,2.16C10.74,7.13 11.35,7 12,7zM2,4.27l2.28,2.28 0.46,0.46C3.08,8.3 1.78,10.02 1,12c1.73,4.39 6,7.5 11,7.5 1.55,0 3.03,-0.3 4.38,-0.84l0.42,0.42L19.73,22 21,20.73 3.27,3 2,4.27zM7.53,9.8l1.55,1.55c-0.05,0.21 -0.08,0.43 -0.08,0.65 0,1.66 1.34,3 3,3 0.22,0 0.44,-0.03 0.65,-0.08l1.55,1.55c-0.67,0.33 -1.41,0.53 -2.2,0.53 -2.76,0 -5,-2.24 -5,-5 0,-0.79 0.2,-1.53 0.53,-2.2zm4.31,-0.78l3.15,3.15 0.02,-0.16c0,-1.66 -1.34,-3 -3,-3l-0.17,0.01z" />
</vector>
`);

writeRes('drawable/ic_check.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="16dp"
    android:height="16dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_green"
        android:pathData="M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41,-1.41z" />
</vector>
`);

writeRes('drawable/ic_double_check.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="16dp"
    android:height="16dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_green"
        android:pathData="M18,7l-1.41,-1.41 -6.34,6.34 1.41,1.41L18,7zm4.24,-1.41L11.66,16.17 7.48,12l-1.41,1.41L11.66,19l12,-12 -1.42,-1.41zM0.41,13.41L6,19l1.41,-1.41L1.83,12 0.41,13.41z" />
</vector>
`);

writeRes('drawable/ic_play.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_green"
        android:pathData="M8,5v14l11,-7z" />
</vector>
`);

writeRes('drawable/ic_pause.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_green"
        android:pathData="M6,19h4V5H6v14zm8,-14v14h4V5h-4z" />
</vector>
`);

console.log('All resources, colors, themes, styles and drawables generated!');
