const fs = require('fs');
const path = require('path');

const layoutDir = path.join('android', 'app', 'src', 'main', 'res', 'layout');

// 1. activity_chat.xml
const activityChatXml = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/chatRoot"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_main">

    <!-- Header Toolbar -->
    <androidx.constraintlayout.widget.ConstraintLayout
        android:id="@+id/chatHeader"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:minHeight="56dp"
        android:background="@color/bg_main"
        android:paddingHorizontal="8dp"
        android:paddingVertical="4dp"
        app:layout_constraintTop_toTopOf="parent">

        <ImageView
            android:id="@+id/btnChatBack"
            android:layout_width="38dp"
            android:layout_height="38dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="7dp"
            android:src="@drawable/ic_back"
            app:tint="@color/text_primary"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

        <com.nonsensechat.app.ui.custom.AvatarView
            android:id="@+id/headerAvatar"
            android:layout_width="38dp"
            android:layout_height="38dp"
            android:layout_marginStart="6dp"
            app:layout_constraintStart_toEndOf="@+id/btnChatBack"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

        <LinearLayout
            android:id="@+id/headerTextContainer"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="10dp"
            android:layout_marginEnd="6dp"
            android:orientation="vertical"
            app:layout_constraintStart_toEndOf="@+id/headerAvatar"
            app:layout_constraintEnd_toStartOf="@+id/btnChatSearch"
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
            android:id="@+id/btnChatSearch"
            android:layout_width="36dp"
            android:layout_height="36dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="7dp"
            android:src="@drawable/ic_search"
            app:tint="@color/text_secondary"
            app:layout_constraintEnd_toStartOf="@+id/btnCall"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

        <ImageView
            android:id="@+id/btnCall"
            android:layout_width="36dp"
            android:layout_height="36dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="7dp"
            android:src="@drawable/ic_phone_call"
            app:layout_constraintEnd_toStartOf="@+id/btnChatMenu"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

        <ImageView
            android:id="@+id/btnChatMenu"
            android:layout_width="36dp"
            android:layout_height="36dp"
            android:layout_marginStart="2dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="6dp"
            android:src="@drawable/ic_more_vert"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

    </androidx.constraintlayout.widget.ConstraintLayout>

    <!-- In-Chat Search Bar -->
    <LinearLayout
        android:id="@+id/chatSearchContainer"
        android:layout_width="match_parent"
        android:layout_height="44dp"
        android:background="#152130"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingHorizontal="12dp"
        android:visibility="gone"
        app:layout_constraintTop_toBottomOf="@+id/chatHeader">

        <ImageView
            android:layout_width="20dp"
            android:layout_height="20dp"
            android:src="@drawable/ic_search"
            app:tint="@color/text_secondary" />

        <EditText
            android:id="@+id/etChatSearch"
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_marginStart="10dp"
            android:layout_weight="1"
            android:background="@null"
            android:hint="Поиск сообщений..."
            android:textColor="@color/text_primary"
            android:textColorHint="@color/text_tertiary"
            android:textSize="14sp" />

        <ImageView
            android:id="@+id/btnCloseChatSearch"
            android:layout_width="28dp"
            android:layout_height="28dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="5dp"
            android:src="@drawable/ic_close"
            app:tint="@color/text_secondary" />
    </LinearLayout>

    <!-- Pinned Message Banner -->
    <LinearLayout
        android:id="@+id/pinnedBar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="@drawable/bg_pinned_bar"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingHorizontal="12dp"
        android:paddingVertical="7dp"
        android:visibility="gone"
        app:layout_constraintTop_toBottomOf="@+id/chatSearchContainer">

        <ImageView
            android:layout_width="18dp"
            android:layout_height="18dp"
            android:src="@drawable/ic_pin"
            app:tint="@color/accent_cyan" />

        <View
            android:layout_width="2.5dp"
            android:layout_height="28dp"
            android:layout_marginStart="8dp"
            android:background="@color/accent_cyan" />

        <LinearLayout
            android:id="@+id/pinnedContent"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="8dp"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:id="@+id/tvPinnedTitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="📌 Закрепленное сообщение"
                android:textColor="@color/accent_cyan"
                android:textSize="12sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/tvPinnedPreview"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:ellipsize="end"
                android:maxLines="1"
                android:textColor="@color/text_secondary"
                android:textSize="13sp" />
        </LinearLayout>

        <ImageView
            android:id="@+id/btnUnpinCurrent"
            android:layout_width="28dp"
            android:layout_height="28dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="6dp"
            android:src="@drawable/ic_close"
            app:tint="@color/text_tertiary" />
    </LinearLayout>

    <View
        android:id="@+id/headerDivider"
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:background="@color/border_subtle"
        app:layout_constraintTop_toBottomOf="@+id/pinnedBar" />

    <!-- Messages RecyclerView -->
    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/rvMessages"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:clipToPadding="false"
        android:paddingHorizontal="10dp"
        android:paddingVertical="8dp"
        app:layout_constraintTop_toBottomOf="@+id/headerDivider"
        app:layout_constraintBottom_toTopOf="@+id/replyEditBar" />

    <!-- Reply / Edit Preview Bar -->
    <LinearLayout
        android:id="@+id/replyEditBar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="#121D2C"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingHorizontal="12dp"
        android:paddingVertical="6dp"
        android:visibility="gone"
        app:layout_constraintBottom_toTopOf="@+id/bottomBar">

        <ImageView
            android:id="@+id/ivReplyEditIcon"
            android:layout_width="20dp"
            android:layout_height="20dp"
            android:src="@drawable/ic_reply"
            app:tint="@color/accent_cyan" />

        <View
            android:layout_width="2dp"
            android:layout_height="26dp"
            android:layout_marginStart="8dp"
            android:background="@color/accent_cyan" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="8dp"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:id="@+id/tvReplyEditTitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textColor="@color/accent_cyan"
                android:textSize="12sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/tvReplyEditSubtitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:ellipsize="end"
                android:maxLines="1"
                android:textColor="@color/text_secondary"
                android:textSize="13sp" />
        </LinearLayout>

        <ImageView
            android:id="@+id/btnCloseReplyEdit"
            android:layout_width="28dp"
            android:layout_height="28dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="6dp"
            android:src="@drawable/ic_close"
            app:tint="@color/text_tertiary" />
    </LinearLayout>

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
            android:src="@drawable/ic_paperclip"
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
                android:hint="Сообщение..."
                android:maxLines="5"
                android:paddingVertical="6dp"
                android:textColor="@color/text_primary"
                android:textColorHint="@color/text_tertiary"
                android:textSize="15sp" />

        </LinearLayout>

        <!-- Voice Recording Overlay -->
        <LinearLayout
            android:id="@+id/audioRecordOverlay"
            android:layout_width="0dp"
            android:layout_height="42dp"
            android:layout_marginStart="4dp"
            android:layout_marginEnd="6dp"
            android:background="#1F2A38"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingHorizontal="12dp"
            android:visibility="gone"
            app:layout_constraintStart_toEndOf="@+id/btnAttach"
            app:layout_constraintEnd_toStartOf="@+id/btnSendOrVoice"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintTop_toTopOf="parent">

            <View
                android:layout_width="10dp"
                android:layout_height="10dp"
                android:background="@drawable/bg_online_dot"
                android:backgroundTint="#FF4D4D" />

            <TextView
                android:id="@+id/tvRecordDuration"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="8dp"
                android:text="00:00"
                android:textColor="#FF4D4D"
                android:textSize="14sp"
                android:textStyle="bold" />

            <TextView
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginStart="10dp"
                android:layout_weight="1"
                android:text="Запись..."
                android:textColor="@color/text_secondary"
                android:textSize="13sp" />

            <TextView
                android:id="@+id/btnCancelRecord"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:padding="6dp"
                android:text="Отмена"
                android:textColor="#FF4D4D"
                android:textSize="13sp" />
        </LinearLayout>

        <ImageView
            android:id="@+id/btnSendOrVoice"
            android:layout_width="40dp"
            android:layout_height="40dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="8dp"
            android:src="@drawable/ic_microphone"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

    </androidx.constraintlayout.widget.ConstraintLayout>

</androidx.constraintlayout.widget.ConstraintLayout>`;

fs.writeFileSync(path.join(layoutDir, 'activity_chat.xml'), activityChatXml, 'utf8');
console.log('activity_chat.xml written');

// 2. item_message_text_me.xml
const textMeXml = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="2dp">

    <LinearLayout
        android:id="@+id/bubbleMe"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:background="@drawable/bg_bubble_me"
        android:maxWidth="295dp"
        android:orientation="vertical"
        android:paddingHorizontal="13dp"
        android:paddingVertical="7dp"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <!-- Forward header -->
        <TextView
            android:id="@+id/tvForwardFrom"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginBottom="3dp"
            android:textColor="@color/accent_cyan"
            android:textSize="11sp"
            android:visibility="gone" />

        <!-- Reply block -->
        <LinearLayout
            android:id="@+id/replyContainer"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="4dp"
            android:background="@drawable/bg_reply_box"
            android:orientation="horizontal"
            android:padding="6dp"
            android:visibility="gone">

            <View
                android:layout_width="2.5dp"
                android:layout_height="match_parent"
                android:background="@color/accent_cyan" />

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginStart="6dp"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:id="@+id/tvReplyAuthor"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:textColor="@color/accent_cyan"
                    android:textSize="11sp"
                    android:textStyle="bold" />

                <TextView
                    android:id="@+id/tvReplyText"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:ellipsize="end"
                    android:maxLines="1"
                    android:textColor="@color/text_secondary"
                    android:textSize="12sp" />
            </LinearLayout>
        </LinearLayout>

        <TextView
            android:id="@+id/tvMessageText"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="@color/text_primary"
            android:textSize="15sp"
            android:lineSpacingExtra="2dp" />

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="end"
            android:layout_marginTop="2dp"
            android:gravity="center_vertical"
            android:orientation="horizontal">

            <TextView
                android:id="@+id/tvEdited"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginEnd="4dp"
                android:text="изм."
                android:textColor="@color/text_tertiary"
                android:textSize="10sp"
                android:visibility="gone" />

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

        <!-- Reactions Row -->
        <LinearLayout
            android:id="@+id/reactionsContainer"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:orientation="horizontal"
            android:visibility="gone" />

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>`;

fs.writeFileSync(path.join(layoutDir, 'item_message_text_me.xml'), textMeXml, 'utf8');
console.log('item_message_text_me.xml written');

// 3. item_message_text_other.xml
const textOtherXml = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="2dp">

    <com.nonsensechat.app.ui.custom.AvatarView
        android:id="@+id/senderAvatar"
        android:layout_width="28dp"
        android:layout_height="28dp"
        android:visibility="gone"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintBottom_toBottomOf="@+id/bubbleOther" />

    <LinearLayout
        android:id="@+id/bubbleOther"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginStart="6dp"
        android:background="@drawable/bg_bubble_other"
        android:maxWidth="295dp"
        android:orientation="vertical"
        android:paddingHorizontal="13dp"
        android:paddingVertical="7dp"
        app:layout_constraintStart_toEndOf="@+id/senderAvatar"
        app:layout_goneMarginStart="0dp"
        app:layout_constraintTop_toTopOf="parent">

        <!-- Sender name in group -->
        <TextView
            android:id="@+id/tvSenderName"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginBottom="2dp"
            android:textColor="@color/accent_cyan"
            android:textSize="12sp"
            android:textStyle="bold"
            android:visibility="gone" />

        <!-- Forward header -->
        <TextView
            android:id="@+id/tvForwardFrom"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginBottom="3dp"
            android:textColor="@color/accent_cyan"
            android:textSize="11sp"
            android:visibility="gone" />

        <!-- Reply block -->
        <LinearLayout
            android:id="@+id/replyContainer"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="4dp"
            android:background="@drawable/bg_reply_box"
            android:orientation="horizontal"
            android:padding="6dp"
            android:visibility="gone">

            <View
                android:layout_width="2.5dp"
                android:layout_height="match_parent"
                android:background="@color/accent_cyan" />

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginStart="6dp"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:id="@+id/tvReplyAuthor"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:textColor="@color/accent_cyan"
                    android:textSize="11sp"
                    android:textStyle="bold" />

                <TextView
                    android:id="@+id/tvReplyText"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:ellipsize="end"
                    android:maxLines="1"
                    android:textColor="@color/text_secondary"
                    android:textSize="12sp" />
            </LinearLayout>
        </LinearLayout>

        <TextView
            android:id="@+id/tvMessageText"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="@color/text_primary"
            android:textSize="15sp"
            android:lineSpacingExtra="2dp" />

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="end"
            android:layout_marginTop="2dp"
            android:gravity="center_vertical"
            android:orientation="horizontal">

            <TextView
                android:id="@+id/tvEdited"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginEnd="4dp"
                android:text="изм."
                android:textColor="@color/text_tertiary"
                android:textSize="10sp"
                android:visibility="gone" />

            <TextView
                android:id="@+id/tvMessageTime"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textColor="@color/text_tertiary"
                android:textSize="11sp" />
        </LinearLayout>

        <!-- Reactions Row -->
        <LinearLayout
            android:id="@+id/reactionsContainer"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:orientation="horizontal"
            android:visibility="gone" />

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>`;

fs.writeFileSync(path.join(layoutDir, 'item_message_text_other.xml'), textOtherXml, 'utf8');
console.log('item_message_text_other.xml written');

// 4. item_message_image_me.xml (and used for media)
const imageMeXml = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="3dp">

    <androidx.cardview.widget.CardView
        android:id="@+id/cardMediaMe"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:cardCornerRadius="14dp"
        app:cardElevation="0dp"
        app:cardBackgroundColor="@color/bg_card_dark"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:orientation="vertical">

            <FrameLayout
                android:layout_width="250dp"
                android:layout_height="220dp">

                <ImageView
                    android:id="@+id/ivMessageMedia"
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:scaleType="centerCrop" />

                <com.nonsensechat.app.ui.custom.TelegramSpoilerView
                    android:id="@+id/spoilerView"
                    android:layout_width="match_parent"
                    android:layout_height="match_parent" />

                <TextView
                    android:id="@+id/tvMediaTime"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_gravity="bottom|end"
                    android:layout_margin="8dp"
                    android:background="#99000000"
                    android:paddingHorizontal="6dp"
                    android:paddingVertical="2dp"
                    android:textColor="@color/text_primary"
                    android:textSize="11sp" />
            </FrameLayout>

            <TextView
                android:id="@+id/tvMediaCaption"
                android:layout_width="250dp"
                android:layout_height="wrap_content"
                android:paddingHorizontal="10dp"
                android:paddingVertical="6dp"
                android:textColor="@color/text_primary"
                android:textSize="14sp"
                android:visibility="gone" />

            <!-- Reactions Row -->
            <LinearLayout
                android:id="@+id/reactionsContainer"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:paddingHorizontal="10dp"
                android:paddingBottom="6dp"
                android:orientation="horizontal"
                android:visibility="gone" />
        </LinearLayout>

    </androidx.cardview.widget.CardView>

</androidx.constraintlayout.widget.ConstraintLayout>`;

fs.writeFileSync(path.join(layoutDir, 'item_message_image_me.xml'), imageMeXml, 'utf8');
console.log('item_message_image_me.xml written');

// 5. item_message_audio.xml (Telegram voice message bubble)
const audioXml = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="3dp">

    <LinearLayout
        android:id="@+id/bubbleAudio"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:background="@drawable/bg_bubble_me"
        android:minWidth="230dp"
        android:maxWidth="290dp"
        android:orientation="vertical"
        android:paddingHorizontal="12dp"
        android:paddingVertical="8dp"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center_vertical"
            android:orientation="horizontal">

            <ImageView
                android:id="@+id/btnAudioPlayPause"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:background="@drawable/bg_primary_button"
                android:padding="10dp"
                android:src="@drawable/ic_play"
                app:tint="#080C14" />

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginStart="10dp"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:id="@+id/tvAudioTitle"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Голосовое сообщение"
                    android:textColor="@color/text_primary"
                    android:textSize="13sp"
                    android:textStyle="bold" />

                <ProgressBar
                    android:id="@+id/audioProgressBar"
                    style="?android:attr/progressBarStyleHorizontal"
                    android:layout_width="match_parent"
                    android:layout_height="4dp"
                    android:layout_marginTop="4dp"
                    android:max="100"
                    android:progress="0"
                    android:progressTint="@color/accent_cyan" />

                <TextView
                    android:id="@+id/tvAudioDuration"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="2dp"
                    android:text="0:00"
                    android:textColor="@color/text_tertiary"
                    android:textSize="11sp" />
            </LinearLayout>
        </LinearLayout>

        <TextView
            android:id="@+id/tvAudioTime"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="end"
            android:layout_marginTop="2dp"
            android:textColor="@color/text_tertiary"
            android:textSize="11sp" />

        <!-- Reactions Row -->
        <LinearLayout
            android:id="@+id/reactionsContainer"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:orientation="horizontal"
            android:visibility="gone" />

    </LinearLayout>

</androidx.constraintlayout.widget.ConstraintLayout>`;

fs.writeFileSync(path.join(layoutDir, 'item_message_audio.xml'), audioXml, 'utf8');
console.log('item_message_audio.xml written');

// 6. item_message_poll.xml
const pollXml = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:paddingVertical="4dp">

    <androidx.cardview.widget.CardView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginHorizontal="8dp"
        app:cardCornerRadius="16dp"
        app:cardElevation="2dp"
        app:cardBackgroundColor="@color/bg_card_dark"
        app:layout_constraintTop_toTopOf="parent">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:padding="16dp">

            <TextView
                android:id="@+id/tvPollBadge"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="📊 ГОЛОСОВАНИЕ"
                android:textColor="@color/accent_cyan"
                android:textSize="11sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/tvPollQuestion"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginTop="6dp"
                android:textColor="@color/text_primary"
                android:textSize="16sp"
                android:textStyle="bold" />

            <LinearLayout
                android:id="@+id/pollOptionsContainer"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginTop="10dp"
                android:orientation="vertical" />

            <View
                android:layout_width="match_parent"
                android:layout_height="1dp"
                android:layout_marginTop="12dp"
                android:background="@color/border_subtle" />

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginTop="8dp"
                android:gravity="center_vertical"
                android:orientation="horizontal">

                <TextView
                    android:id="@+id/tvTotalVotes"
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_weight="1"
                    android:text="0 голосов"
                    android:textColor="@color/text_secondary"
                    android:textSize="12sp" />

                <TextView
                    android:id="@+id/tvPollStatus"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Нажмите для выбора"
                    android:textColor="@color/accent_green"
                    android:textSize="12sp" />
            </LinearLayout>

        </LinearLayout>

    </androidx.cardview.widget.CardView>

</androidx.constraintlayout.widget.ConstraintLayout>`;

fs.writeFileSync(path.join(layoutDir, 'item_message_poll.xml'), pollXml, 'utf8');
console.log('item_message_poll.xml written');
