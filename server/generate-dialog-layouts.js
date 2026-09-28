const fs = require('fs');
const path = require('path');

const layoutDir = path.join('android', 'app', 'src', 'main', 'res', 'layout');

// 1. dialog_create_poll.xml
const createPollXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="@color/bg_card_dark"
    android:orientation="vertical"
    android:padding="20dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Создать опрос"
        android:textColor="@color/text_primary"
        android:textSize="18sp"
        android:textStyle="bold" />

    <EditText
        android:id="@+id/etPollQuestion"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:background="@drawable/bg_input_field"
        android:hint="Задайте вопрос..."
        android:padding="12dp"
        android:textColor="@color/text_primary"
        android:textColorHint="@color/text_tertiary"
        android:textSize="15sp" />

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="14dp"
        android:text="Варианты ответа:"
        android:textColor="@color/text_secondary"
        android:textSize="13sp" />

    <LinearLayout
        android:id="@+id/pollOptionsInputsContainer"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="6dp"
        android:orientation="vertical" />

    <TextView
        android:id="@+id/btnAddPollOption"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:padding="6dp"
        android:text="+ Добавить вариант"
        android:textColor="@color/accent_cyan"
        android:textSize="14sp"
        android:textStyle="bold" />

    <CheckBox
        android:id="@+id/cbPollAnonymous"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:checked="true"
        android:text="Анонимное голосование"
        android:textColor="@color/text_secondary" />

    <CheckBox
        android:id="@+id/cbPollMultiple"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Выбор нескольких вариантов"
        android:textColor="@color/text_secondary" />

</LinearLayout>`;

fs.writeFileSync(path.join(layoutDir, 'dialog_create_poll.xml'), createPollXml, 'utf8');
console.log('dialog_create_poll.xml written');

// 2. dialog_create_group.xml
const createGroupXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="@color/bg_card_dark"
    android:orientation="vertical"
    android:padding="20dp">

    <TextView
        android:id="@+id/tvCreateGroupTitle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Новая группа"
        android:textColor="@color/text_primary"
        android:textSize="18sp"
        android:textStyle="bold" />

    <EditText
        android:id="@+id/etGroupName"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="14dp"
        android:background="@drawable/bg_input_field"
        android:hint="Название группы..."
        android:padding="12dp"
        android:textColor="@color/text_primary"
        android:textColorHint="@color/text_tertiary"
        android:textSize="15sp" />

    <EditText
        android:id="@+id/etGroupAvatar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="10dp"
        android:background="@drawable/bg_input_field"
        android:hint="URL аватарки (необязательно)..."
        android:padding="12dp"
        android:textColor="@color/text_primary"
        android:textColorHint="@color/text_tertiary"
        android:textSize="14sp" />

    <CheckBox
        android:id="@+id/cbIsChannel"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="10dp"
        android:text="Создать как Канал (только для автора)"
        android:textColor="@color/text_secondary" />

</LinearLayout>`;

fs.writeFileSync(path.join(layoutDir, 'dialog_create_group.xml'), createGroupXml, 'utf8');
console.log('dialog_create_group.xml written');

// 3. dialog_my_profile.xml
const myProfileXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="@color/bg_card_dark"
    android:orientation="vertical"
    android:padding="20dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Мой профиль"
        android:textColor="@color/text_primary"
        android:textSize="18sp"
        android:textStyle="bold" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:gravity="center"
        android:orientation="vertical">

        <com.nonsensechat.app.ui.custom.AvatarView
            android:id="@+id/profileAvatarView"
            android:layout_width="72dp"
            android:layout_height="72dp" />

        <TextView
            android:id="@+id/tvProfileUid"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:textColor="@color/text_tertiary"
            android:textSize="11sp" />
    </LinearLayout>

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="14dp"
        android:text="Имя / Никнейм:"
        android:textColor="@color/text_secondary"
        android:textSize="13sp" />

    <EditText
        android:id="@+id/etProfileNick"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:background="@drawable/bg_input_field"
        android:hint="Ваш ник..."
        android:padding="10dp"
        android:textColor="@color/text_primary"
        android:textColorHint="@color/text_tertiary"
        android:textSize="15sp" />

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:text="О себе (био):"
        android:textColor="@color/text_secondary"
        android:textSize="13sp" />

    <EditText
        android:id="@+id/etProfileBio"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:background="@drawable/bg_input_field"
        android:hint="Расскажите о себе..."
        android:padding="10dp"
        android:textColor="@color/text_primary"
        android:textColorHint="@color/text_tertiary"
        android:textSize="14sp" />

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:text="URL Аватарки:"
        android:textColor="@color/text_secondary"
        android:textSize="13sp" />

    <EditText
        android:id="@+id/etProfileAvatarUrl"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:background="@drawable/bg_input_field"
        android:hint="https://..."
        android:padding="10dp"
        android:textColor="@color/text_primary"
        android:textColorHint="@color/text_tertiary"
        android:textSize="14sp" />

</LinearLayout>`;

fs.writeFileSync(path.join(layoutDir, 'dialog_my_profile.xml'), myProfileXml, 'utf8');
console.log('dialog_my_profile.xml written');

// 4. dialog_settings.xml
const settingsXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="@color/bg_card_dark"
    android:orientation="vertical"
    android:padding="20dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Настройки"
        android:textColor="@color/text_primary"
        android:textSize="18sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/tvAppInfoVersion"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="Беспонтовый Чат Android v2.0"
        android:textColor="@color/accent_cyan"
        android:textSize="12sp" />

    <View
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:layout_marginTop="14dp"
        android:background="@color/border_subtle" />

    <LinearLayout
        android:id="@+id/btnSettingProfile"
        android:layout_width="match_parent"
        android:layout_height="48dp"
        android:background="?attr/selectableItemBackground"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Редактировать профиль"
            android:textColor="@color/text_primary"
            android:textSize="15sp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="›"
            android:textColor="@color/text_tertiary"
            android:textSize="20sp" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="48dp"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Звуки и вибрация"
            android:textColor="@color/text_primary"
            android:textSize="15sp" />

        <androidx.appcompat.widget.SwitchCompat
            android:id="@+id/swSound"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:checked="true" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="48dp"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Уведомления"
            android:textColor="@color/text_primary"
            android:textSize="15sp" />

        <androidx.appcompat.widget.SwitchCompat
            android:id="@+id/swNotifications"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:checked="true" />
    </LinearLayout>

    <View
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:layout_marginTop="8dp"
        android:background="@color/border_subtle" />

    <LinearLayout
        android:id="@+id/btnLogout"
        android:layout_width="match_parent"
        android:layout_height="48dp"
        android:layout_marginTop="8dp"
        android:background="?attr/selectableItemBackground"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <ImageView
            android:layout_width="22dp"
            android:layout_height="22dp"
            android:src="@drawable/ic_logout_door"
            app:tint="#FF5252" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginStart="12dp"
            android:text="Выйти из аккаунта"
            android:textColor="#FF5252"
            android:textSize="15sp"
            android:textStyle="bold" />
    </LinearLayout>

</LinearLayout>`;

fs.writeFileSync(path.join(layoutDir, 'dialog_settings.xml'), settingsXml, 'utf8');
console.log('dialog_settings.xml written');
