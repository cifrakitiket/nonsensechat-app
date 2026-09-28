// server/generate-android-layouts.js
const fs = require('fs');
const path = require('path');

const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'layout');

function writeLayout(relPath, content) {
  const fullPath = path.join(resDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('✓ Layout:', relPath);
}

// 1. activity_splash.xml
writeLayout('activity_splash.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_main">

    <ImageView
        android:id="@+id/ivLogo"
        android:layout_width="96dp"
        android:layout_height="96dp"
        android:src="@drawable/ic_send"
        app:tint="@color/accent_green"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toTopOf="@+id/tvAppName"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintVertical_chainStyle="packed" />

    <TextView
        android:id="@+id/tvAppName"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:text="@string/app_name"
        android:textColor="@color/text_primary"
        android:textSize="26sp"
        android:textStyle="bold"
        app:layout_constraintTop_toBottomOf="@+id/ivLogo"
        app:layout_constraintBottom_toTopOf="@+id/tvTagline"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <TextView
        android:id="@+id/tvTagline"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:text="@string/tagline"
        android:textColor="@color/accent_cyan"
        android:textSize="14sp"
        app:layout_constraintTop_toBottomOf="@+id/tvAppName"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <ProgressBar
        android:layout_width="32dp"
        android:layout_height="32dp"
        android:layout_marginBottom="48dp"
        android:indeterminateTint="@color/accent_green"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// 2. activity_auth.xml
writeLayout('activity_auth.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_main"
    android:padding="24dp">

    <ScrollView
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:fillViewport="true">

        <androidx.constraintlayout.widget.ConstraintLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content">

            <ImageView
                android:id="@+id/authLogo"
                android:layout_width="64dp"
                android:layout_height="64dp"
                android:layout_marginTop="40dp"
                android:src="@drawable/ic_send"
                app:tint="@color/accent_green"
                app:layout_constraintTop_toTopOf="parent"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent" />

            <TextView
                android:id="@+id/authTitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="16dp"
                android:text="@string/login_title"
                android:textColor="@color/text_primary"
                android:textSize="24sp"
                android:textStyle="bold"
                app:layout_constraintTop_toBottomOf="@+id/authLogo"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent" />

            <TextView
                android:id="@+id/authSubtitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="8dp"
                android:text="@string/login_subtitle"
                android:textColor="@color/text_secondary"
                android:textSize="14sp"
                app:layout_constraintTop_toBottomOf="@+id/authTitle"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent" />

            <!-- Input Container Card -->
            <LinearLayout
                android:id="@+id/inputCard"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginTop="32dp"
                android:background="@drawable/bg_card_dark"
                android:orientation="vertical"
                android:padding="20dp"
                app:layout_constraintTop_toBottomOf="@+id/authSubtitle">

                <EditText
                    android:id="@+id/etNickname"
                    style="@style/Widget.NonsenseChat.EditText"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:hint="@string/nickname_hint"
                    android:inputType="textPersonName"
                    android:visibility="gone" />

                <EditText
                    android:id="@+id/etEmail"
                    style="@style/Widget.NonsenseChat.EditText"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="12dp"
                    android:hint="@string/email_hint"
                    android:inputType="textEmailAddress" />

                <EditText
                    android:id="@+id/etPassword"
                    style="@style/Widget.NonsenseChat.EditText"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="12dp"
                    android:hint="@string/password_hint"
                    android:inputType="textPassword" />

                <Button
                    android:id="@+id/btnSubmit"
                    style="@style/Widget.NonsenseChat.Button.Primary"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="20dp"
                    android:text="@string/action_login" />

                <ProgressBar
                    android:id="@+id/authProgress"
                    android:layout_width="28dp"
                    android:layout_height="28dp"
                    android:layout_gravity="center_horizontal"
                    android:layout_marginTop="16dp"
                    android:indeterminateTint="@color/accent_green"
                    android:visibility="gone" />

            </LinearLayout>

            <TextView
                android:id="@+id/tvToggleMode"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="20dp"
                android:padding="8dp"
                android:text="@string/dont_have_account"
                android:textColor="@color/accent_cyan"
                android:textSize="14sp"
                app:layout_constraintTop_toBottomOf="@+id/inputCard"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent" />

            <TextView
                android:id="@+id/btnGuestLogin"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="8dp"
                android:padding="8dp"
                android:text="@string/action_guest_login"
                android:textColor="@color/text_tertiary"
                android:textSize="14sp"
                app:layout_constraintTop_toBottomOf="@+id/tvToggleMode"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent" />

        </androidx.constraintlayout.widget.ConstraintLayout>
    </ScrollView>

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// 3. activity_main.xml
writeLayout('activity_main.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_main">

    <com.google.android.material.appbar.AppBarLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="@color/bg_main">

        <!-- Top Header Bar -->
        <androidx.appcompat.widget.Toolbar
            android:id="@+id/mainToolbar"
            android:layout_width="match_parent"
            android:layout_height="60dp"
            app:contentInsetStart="16dp"
            app:contentInsetEnd="16dp">

            <androidx.constraintlayout.widget.ConstraintLayout
                android:layout_width="match_parent"
                android:layout_height="match_parent">

                <!-- Avatar with online dot -->
                <com.nonsensechat.app.ui.custom.AvatarView
                    android:id="@+id/btnProfileAvatar"
                    android:layout_width="40dp"
                    android:layout_height="40dp"
                    app:layout_constraintStart_toStartOf="parent"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <!-- Logo / App Name -->
                <TextView
                    android:id="@+id/mainTitle"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="12dp"
                    android:text="@string/app_name"
                    android:textColor="@color/text_primary"
                    android:textSize="20sp"
                    android:textStyle="bold"
                    app:layout_constraintStart_toEndOf="@+id/btnProfileAvatar"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <ImageView
                    android:id="@+id/btnSearchToggle"
                    android:layout_width="38dp"
                    android:layout_height="38dp"
                    android:background="?attr/selectableItemBackgroundBorderless"
                    android:padding="8dp"
                    android:src="@drawable/ic_search"
                    app:layout_constraintEnd_toStartOf="@+id/btnNewChat"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <ImageView
                    android:id="@+id/btnNewChat"
                    android:layout_width="38dp"
                    android:layout_height="38dp"
                    android:layout_marginStart="8dp"
                    android:background="?attr/selectableItemBackgroundBorderless"
                    android:padding="7dp"
                    android:src="@drawable/ic_add"
                    app:tint="@color/accent_green"
                    app:layout_constraintEnd_toEndOf="parent"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

            </androidx.constraintlayout.widget.ConstraintLayout>

        </androidx.appcompat.widget.Toolbar>

        <!-- Search Bar Container (Collapsible) -->
        <FrameLayout
            android:id="@+id/searchContainer"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:paddingHorizontal="16dp"
            android:paddingBottom="8dp"
            android:visibility="gone">

            <EditText
                android:id="@+id/etSearchChats"
                style="@style/Widget.NonsenseChat.EditText"
                android:layout_width="match_parent"
                android:layout_height="44dp"
                android:hint="@string/search_chats_hint"
                android:paddingStart="16dp"
                android:paddingEnd="16dp"
                android:textSize="14sp" />

        </FrameLayout>

        <!-- Folders Tab Strip -->
        <HorizontalScrollView
            android:layout_width="match_parent"
            android:layout_height="44dp"
            android:paddingHorizontal="16dp"
            android:scrollbars="none">

            <LinearLayout
                android:id="@+id/tabsContainer"
                android:layout_width="wrap_content"
                android:layout_height="match_parent"
                android:gravity="center_vertical"
                android:orientation="horizontal">

                <TextView
                    android:id="@+id/tabAll"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:background="@drawable/bg_primary_button"
                    android:paddingHorizontal="16dp"
                    android:paddingVertical="6dp"
                    android:text="@string/tab_all"
                    android:textColor="#080C14"
                    android:textStyle="bold" />

                <TextView
                    android:id="@+id/tabDirect"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="8dp"
                    android:paddingHorizontal="14dp"
                    android:paddingVertical="6dp"
                    android:text="@string/tab_direct"
                    android:textColor="@color/text_secondary" />

                <TextView
                    android:id="@+id/tabGroups"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="8dp"
                    android:paddingHorizontal="14dp"
                    android:paddingVertical="6dp"
                    android:text="@string/tab_groups"
                    android:textColor="@color/text_secondary" />

                <TextView
                    android:id="@+id/tabChannels"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="8dp"
                    android:paddingHorizontal="14dp"
                    android:paddingVertical="6dp"
                    android:text="@string/tab_channels"
                    android:textColor="@color/text_secondary" />

            </LinearLayout>

        </HorizontalScrollView>

        <View
            android:layout_width="match_parent"
            android:layout_height="1dp"
            android:background="@color/border_subtle" />

    </com.google.android.material.appbar.AppBarLayout>

    <androidx.swiperefreshlayout.widget.SwipeRefreshLayout
        android:id="@+id/swipeRefresh"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layout_behavior="@string/appbar_scrolling_view_behavior">

        <FrameLayout
            android:layout_width="match_parent"
            android:layout_height="match_parent">

            <androidx.recyclerview.widget.RecyclerView
                android:id="@+id/rvChats"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:clipToPadding="false"
                android:paddingVertical="4dp" />

            <!-- Empty State -->
            <LinearLayout
                android:id="@+id/emptyStateView"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_gravity="center"
                android:gravity="center"
                android:orientation="vertical"
                android:padding="32dp"
                android:visibility="gone">

                <ImageView
                    android:layout_width="64dp"
                    android:layout_height="64dp"
                    android:src="@drawable/ic_send"
                    app:tint="@color/text_tertiary" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="16dp"
                    android:text="@string/no_chats_title"
                    android:textColor="@color/text_primary"
                    android:textSize="18sp"
                    android:textStyle="bold" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="8dp"
                    android:gravity="center"
                    android:text="@string/no_chats_subtitle"
                    android:textColor="@color/text_secondary"
                    android:textSize="14sp" />

            </LinearLayout>

        </FrameLayout>

    </androidx.swiperefreshlayout.widget.SwipeRefreshLayout>

    <!-- FAB for quick new chat -->
    <com.google.android.material.floatingactionbutton.FloatingActionButton
        android:id="@+id/fabNewChat"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="bottom|end"
        android:layout_margin="20dp"
        android:backgroundTint="@color/accent_green"
        android:src="@drawable/ic_add"
        app:tint="#080C14" />

</androidx.coordinatorlayout.widget.CoordinatorLayout>
`);

// 4. item_chat.xml
writeLayout('item_chat.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="?attr/selectableItemBackground"
    android:paddingHorizontal="16dp"
    android:paddingVertical="12dp">

    <com.nonsensechat.app.ui.custom.AvatarView
        android:id="@+id/chatAvatar"
        android:layout_width="52dp"
        android:layout_height="52dp"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toBottomOf="parent" />

    <TextView
        android:id="@+id/tvChatTitle"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_marginStart="14dp"
        android:layout_marginEnd="8dp"
        android:ellipsize="end"
        android:maxLines="1"
        android:textColor="@color/text_primary"
        android:textSize="16sp"
        android:textStyle="bold"
        app:layout_constraintStart_toEndOf="@+id/chatAvatar"
        app:layout_constraintTop_toTopOf="@+id/chatAvatar"
        app:layout_constraintEnd_toStartOf="@+id/tvChatTime" />

    <TextView
        android:id="@+id/tvChatTime"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="@color/text_tertiary"
        android:textSize="12sp"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="@+id/tvChatTitle" />

    <TextView
        android:id="@+id/tvLastMessage"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_marginStart="14dp"
        android:layout_marginTop="4dp"
        android:layout_marginEnd="8dp"
        android:ellipsize="end"
        android:maxLines="1"
        android:textColor="@color/text_secondary"
        android:textSize="14sp"
        app:layout_constraintStart_toEndOf="@+id/chatAvatar"
        app:layout_constraintTop_toBottomOf="@+id/tvChatTitle"
        app:layout_constraintEnd_toStartOf="@+id/tvUnreadBadge" />

    <TextView
        android:id="@+id/tvUnreadBadge"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:background="@drawable/bg_unread_badge"
        android:textColor="#080C14"
        android:textSize="11sp"
        android:textStyle="bold"
        android:visibility="gone"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintBottom_toBottomOf="@+id/tvLastMessage" />

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// 5. activity_chat.xml
writeLayout('activity_chat.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_main">

    <!-- Header Toolbar -->
    <androidx.constraintlayout.widget.ConstraintLayout
        android:id="@+id/chatHeader"
        android:layout_width="match_parent"
        android:layout_height="60dp"
        android:background="@color/bg_main"
        android:paddingHorizontal="12dp"
        app:layout_constraintTop_toTopOf="parent">

        <ImageView
            android:id="@+id/btnChatBack"
            android:layout_width="36dp"
            android:layout_height="36dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="6dp"
            android:src="@drawable/ic_back"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

        <com.nonsensechat.app.ui.custom.AvatarView
            android:id="@+id/headerAvatar"
            android:layout_width="40dp"
            android:layout_height="40dp"
            android:layout_marginStart="8dp"
            app:layout_constraintStart_toEndOf="@+id/btnChatBack"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="12dp"
            android:layout_marginEnd="8dp"
            android:orientation="vertical"
            app:layout_constraintStart_toEndOf="@+id/headerAvatar"
            app:layout_constraintEnd_toStartOf="@+id/btnChatMenu"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent">

            <TextView
                android:id="@+id/tvHeaderTitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:ellipsize="end"
                android:maxLines="1"
                android:textColor="@color/text_primary"
                android:textSize="16sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/tvHeaderSubtitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:ellipsize="end"
                android:maxLines="1"
                android:textColor="@color/text_tertiary"
                android:textSize="12sp" />

        </LinearLayout>

        <ImageView
            android:id="@+id/btnChatMenu"
            android:layout_width="36dp"
            android:layout_height="36dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="6dp"
            android:src="@drawable/ic_menu"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

    </androidx.constraintlayout.widget.ConstraintLayout>

    <View
        android:id="@+id/headerDivider"
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:background="@color/border_subtle"
        app:layout_constraintTop_toBottomOf="@+id/chatHeader" />

    <!-- Messages RecyclerView -->
    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/rvMessages"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:clipToPadding="false"
        android:paddingHorizontal="12dp"
        android:paddingVertical="8dp"
        app:layout_constraintTop_toBottomOf="@+id/headerDivider"
        app:layout_constraintBottom_toTopOf="@+id/bottomBar" />

    <!-- Bottom Input Bar -->
    <androidx.constraintlayout.widget.ConstraintLayout
        android:id="@+id/bottomBar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="@color/bg_main"
        android:paddingHorizontal="8dp"
        android:paddingVertical="8dp"
        app:layout_constraintBottom_toBottomOf="parent">

        <ImageView
            android:id="@+id/btnAttach"
            android:layout_width="40dp"
            android:layout_height="40dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="8dp"
            android:src="@drawable/ic_attach"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

        <LinearLayout
            android:id="@+id/inputContainer"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="4dp"
            android:layout_marginEnd="6dp"
            android:background="@drawable/bg_input_bar"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingHorizontal="14dp"
            android:paddingVertical="4dp"
            app:layout_constraintStart_toEndOf="@+id/btnAttach"
            app:layout_constraintEnd_toStartOf="@+id/btnSendOrVoice"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintTop_toTopOf="parent">

            <EditText
                android:id="@+id/etMessage"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:background="@null"
                android:hint="@string/type_message_hint"
                android:maxLines="5"
                android:minHeight="38dp"
                android:textColor="@color/text_primary"
                android:textColorHint="@color/text_tertiary"
                android:textSize="15sp" />

        </LinearLayout>

        <ImageView
            android:id="@+id/btnSendOrVoice"
            android:layout_width="42dp"
            android:layout_height="42dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="9dp"
            android:src="@drawable/ic_mic"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

    </androidx.constraintlayout.widget.ConstraintLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// 6. item_message_text_me.xml
writeLayout('item_message_text_me.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="3dp">

    <LinearLayout
        android:id="@+id/bubbleMe"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:background="@drawable/bg_bubble_me"
        android:maxWidth="300dp"
        android:orientation="vertical"
        android:paddingHorizontal="14dp"
        android:paddingVertical="9dp"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <TextView
            android:id="@+id/tvMessageText"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="@color/text_primary"
            android:textSize="15sp" />

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="end"
            android:layout_marginTop="2dp"
            android:gravity="center_vertical"
            android:orientation="horizontal">

            <TextView
                android:id="@+id/tvMessageTime"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textColor="@color/text_tertiary"
                android:textSize="11sp" />

            <ImageView
                android:id="@+id/ivDeliveryStatus"
                android:layout_width="14dp"
                android:layout_height="14dp"
                android:layout_marginStart="4dp"
                android:src="@drawable/ic_double_check" />

        </LinearLayout>

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// 7. item_message_text_other.xml
writeLayout('item_message_text_other.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="3dp">

    <com.nonsensechat.app.ui.custom.AvatarView
        android:id="@+id/senderAvatar"
        android:layout_width="32dp"
        android:layout_height="32dp"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintBottom_toBottomOf="@+id/bubbleOther" />

    <LinearLayout
        android:id="@+id/bubbleOther"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginStart="8dp"
        android:background="@drawable/bg_bubble_other"
        android:maxWidth="300dp"
        android:orientation="vertical"
        android:paddingHorizontal="14dp"
        android:paddingVertical="9dp"
        app:layout_constraintStart_toEndOf="@+id/senderAvatar"
        app:layout_constraintTop_toTopOf="parent">

        <TextView
            android:id="@+id/tvSenderName"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="@color/accent_cyan"
            android:textSize="12sp"
            android:textStyle="bold"
            android:visibility="gone" />

        <TextView
            android:id="@+id/tvMessageText"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="@color/text_primary"
            android:textSize="15sp" />

        <TextView
            android:id="@+id/tvMessageTime"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="end"
            android:layout_marginTop="2dp"
            android:textColor="@color/text_tertiary"
            android:textSize="11sp" />

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// 8. item_message_image_me.xml
writeLayout('item_message_image_me.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="3dp">

    <com.nonsensechat.app.ui.custom.TelegramSpoilerView
        android:id="@+id/spoilerView"
        android:layout_width="240dp"
        android:layout_height="240dp"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <ImageView
            android:id="@+id/ivMessageMedia"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:scaleType="centerCrop" />

    </com.nonsensechat.app.ui.custom.TelegramSpoilerView>

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_margin="8dp"
        android:background="#80000000"
        android:gravity="center_vertical"
        android:paddingHorizontal="6dp"
        android:paddingVertical="2dp"
        app:layout_constraintBottom_toBottomOf="@+id/spoilerView"
        app:layout_constraintEnd_toEndOf="@+id/spoilerView">

        <TextView
            android:id="@+id/tvMediaTime"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="@color/text_primary"
            android:textSize="11sp" />

        <ImageView
            android:id="@+id/ivMediaDelivery"
            android:layout_width="14dp"
            android:layout_height="14dp"
            android:layout_marginStart="4dp"
            android:src="@drawable/ic_double_check" />

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// 9. item_message_poll.xml
writeLayout('item_message_poll.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="4dp">

    <LinearLayout
        android:id="@+id/pollCard"
        android:layout_width="280dp"
        android:layout_height="wrap_content"
        android:background="@drawable/bg_card_dark"
        android:orientation="vertical"
        android:padding="16dp"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <TextView
            android:id="@+id/tvPollQuestion"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:textColor="@color/text_primary"
            android:textSize="16sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/tvPollType"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="2dp"
            android:text="@string/poll_anonymous"
            android:textColor="@color/accent_cyan"
            android:textSize="12sp" />

        <!-- Options Container -->
        <LinearLayout
            android:id="@+id/pollOptionsContainer"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="12dp"
            android:orientation="vertical" />

        <TextView
            android:id="@+id/tvTotalVotes"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="10dp"
            android:textColor="@color/text_tertiary"
            android:textSize="12sp" />

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
`);

console.log('All layouts generated!');
