// server/upgrade-android-quality.js
const fs = require('fs');
const path = require('path');

const androidRoot = path.join(__dirname, '..', 'android');

function writeAndroidFile(relPath, content) {
  const fullPath = path.join(androidRoot, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('✓ Upgraded:', relPath);
}

console.log('Upgrading Android Native Java app with top-tier quality...');

// ════════════════════════════════════════════════════════════════════════
// 1. HIGH-QUALITY VECTOR ICONS
// ════════════════════════════════════════════════════════════════════════

// ic_tab_all.xml
writeAndroidFile('app/src/main/res/drawable/ic_tab_all.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="20dp"
    android:height="20dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_primary"
        android:pathData="M20,2H4C2.9,2 2,2.9 2,4v18l4,-4h14c1.1,0 2,-0.9 2,-2V4C22,2.9 21.1,2 20,2zM20,16H6l-2,2V4h16V16z" />
</vector>
`);

// ic_tab_direct.xml
writeAndroidFile('app/src/main/res/drawable/ic_tab_direct.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="20dp"
    android:height="20dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_secondary"
        android:pathData="M12,12c2.21,0 4,-1.79 4,-4s-1.79,-4 -4,-4 -4,1.79 -4,4 1.79,4 4,4zm0,2c-2.67,0 -8,1.34 -8,4v2h16v-2c0,-2.66 -5.33,-4 -8,-4z" />
</vector>
`);

// ic_tab_groups.xml
writeAndroidFile('app/src/main/res/drawable/ic_tab_groups.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="20dp"
    android:height="20dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_secondary"
        android:pathData="M16.5,13c-1.2,0 -3.07,0.34 -4.5,1 -1.43,-0.66 -3.3,-1 -4.5,-1C4.42,13 0,14.43 0,17.5V20h23v-2.5C23,14.43 18.58,13 16.5,13zM7.5,11c1.93,0 3.5,-1.57 3.5,-3.5S9.43,4 7.5,4 4,5.57 4,7.5 5.57,11 7.5,11zm9,0c1.93,0 3.5,-1.57 3.5,-3.5S18.43,4 16.5,4 13,5.57 13,7.5s1.57,3.5 3.5,3.5z" />
</vector>
`);

// ic_tab_channels.xml
writeAndroidFile('app/src/main/res/drawable/ic_tab_channels.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="20dp"
    android:height="20dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_secondary"
        android:pathData="M18,11c0,-1.66 -1.34,-3 -3,-3h-1.5L10,5H8v14h2l3.5,-3H15c1.66,0 3,-1.34 3,-3v-2zm4,0c0,-2.76 -2.24,-5 -5,-5v2c1.66,0 3,1.34 3,3s-1.34,3 -3,3v2c2.76,0 5,-2.24 5,-5zm-18,6v4h2v-4H4z" />
</vector>
`);

// ic_bookmark.xml (Saved messages / Fav)
writeAndroidFile('app/src/main/res/drawable/ic_bookmark.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_cyan"
        android:pathData="M17,3H7C5.9,3 5,3.9 5,5v16l7,-3 7,3V5C19,3.9 18.1,3 17,3z" />
</vector>
`);

// ic_send_airplane.xml
writeAndroidFile('app/src/main/res/drawable/ic_send_airplane.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_green"
        android:pathData="M3.4,20.4l17.45,-7.48a1,1 0 0,0 0,-1.84L3.4,3.6a0.993,0.993 0 0,0 -1.39,0.91L2,9.12c0,0.5 0.37,0.93 0.87,0.98L17,12 2.87,13.9c-0.5,0.05 -0.87,0.48 -0.87,0.98l0.01,4.61c0,0.67 0.73,1.1 1.39,0.91z" />
</vector>
`);

// ic_microphone.xml
writeAndroidFile('app/src/main/res/drawable/ic_microphone.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_secondary"
        android:pathData="M12,14c1.66,0 3,-1.34 3,-3V5c0,-1.66 -1.34,-3 -3,-3S9,3.34 9,5v6c0,1.66 1.34,3 3,3zm5.3,-3c0,3 -2.54,5.1 -5.3,5.1S6.7,14 6.7,11H5c0,3.41 2.72,6.23 6,6.72V21h2v-3.28c3.28,-0.48 6,-3.3 6,-6.72h-1.7z" />
</vector>
`);

// ic_paperclip.xml
writeAndroidFile('app/src/main/res/drawable/ic_paperclip.xml', `<?xml version="1.0" encoding="utf-8"?>
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

// ic_phone_call.xml
writeAndroidFile('app/src/main/res/drawable/ic_phone_call.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="22dp"
    android:height="22dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_cyan"
        android:pathData="M20.01,15.38c-1.23,0 -2.42,-0.2 -3.53,-0.56 -0.35,-0.12 -0.74,-0.03 -1.02,0.24l-2.2,2.2c-2.83,-1.44 -5.15,-3.75 -6.59,-6.59l2.2,-2.21c0.28,-0.26 0.36,-0.65 0.25,-1C8.76,6.35 8.56,5.16 8.56,3.93 8.56,3.42 8.14,3 7.63,3H4.06C3.55,3 3,3.37 3,3.93c0,9.42 7.64,17.07 17.01,17.07 0.57,0 1,-0.55 1,-1.06v-3.56c0,-0.51 -0.42,-0.93 -1,-0.93z" />
</vector>
`);

// ic_more_vert.xml
writeAndroidFile('app/src/main/res/drawable/ic_more_vert.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_primary"
        android:pathData="M12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zm0,2c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2zm0,6c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2z" />
</vector>
`);

// ic_gallery.xml
writeAndroidFile('app/src/main/res/drawable/ic_gallery.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/accent_purple"
        android:pathData="M21,19V5c0,-1.1 -0.9,-2 -2,-2H5c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2zM8.5,13.5l2.5,3.01L14.5,12l4.5,6H5l3.5,-4.5z" />
</vector>
`);

// ic_poll_chart.xml
writeAndroidFile('app/src/main/res/drawable/ic_poll_chart.xml', `<?xml version="1.0" encoding="utf-8"?>
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

// ic_settings_gear.xml
writeAndroidFile('app/src/main/res/drawable/ic_settings_gear.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/text_primary"
        android:pathData="M19.14,12.94c0.04,-0.3 0.06,-0.61 0.06,-0.94 0,-0.32 -0.02,-0.64 -0.07,-0.94l2.03,-1.58c0.18,-0.14 0.23,-0.41 0.12,-0.61l-1.92,-3.32c-0.12,-0.22 -0.37,-0.29 -0.59,-0.22l-2.39,0.96c-0.5,-0.38 -1.03,-0.7 -1.62,-0.94L14.4,2.81c-0.04,-0.24 -0.24,-0.41 -0.48,-0.41h-3.84c-0.24,0 -0.43,0.17 -0.47,0.41L9.25,5.35C8.66,5.59 8.12,5.92 7.63,6.29L5.24,5.33c-0.22,-0.08 -0.47,0 -0.59,0.22L2.74,8.87c-0.12,0.21 -0.08,0.47 0.12,0.61l2.03,1.58c-0.05,0.3 -0.09,0.63 -0.09,0.94s0.02,0.64 0.07,0.94l-2.03,1.58c-0.18,0.14 -0.23,0.41 -0.12,0.61l1.92,3.32c0.12,0.22 0.37,0.29 0.59,0.22l2.39,-0.96c0.5,0.38 1.03,0.7 1.62,0.94l0.36,2.54c0.05,0.24 0.24,0.41 0.48,0.41h3.84c0.24,0 0.44,-0.17 0.47,-0.41l0.36,-2.54c0.59,-0.24 1.13,-0.56 1.62,-0.94l2.39,0.96c0.22,0.08 0.47,0 0.59,-0.22l1.92,-3.32c0.12,-0.22 0.07,-0.47 -0.12,-0.61l-2.01,-1.58zM12,15.6c-1.98,0 -3.6,-1.62 -3.6,-3.6s1.62,-3.6 3.6,-3.6 3.6,1.62 3.6,3.6 -1.62,3.6 -3.6,3.6z" />
</vector>
`);

// ic_logout_door.xml
writeAndroidFile('app/src/main/res/drawable/ic_logout_door.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@color/danger_red"
        android:pathData="M17,7l-1.41,1.41L18.17,11H8v2h10.17l-2.58,2.58L17,17l5,-5zM4,5h8V3H4c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h8v-2H4V5z" />
</vector>
`);

// ════════════════════════════════════════════════════════════════════════
// 2. DATA MODELS UPGRADE (Chat, Message, User)
// ════════════════════════════════════════════════════════════════════════

// model/User.java
writeAndroidFile('app/src/main/java/com/nonsensechat/app/model/User.java', `package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import com.google.firebase.database.PropertyName;
import java.io.Serializable;

@IgnoreExtraProperties
public class User implements Serializable {
    public String uid;
    public String nick;
    public String displayName;
    public String email;
    public String avatar;
    public String photoURL;
    public String bio;
    public boolean online;
    public Object lastSeen;
    public String typingIn;
    public Object typingAt;
    public String customStatus;
    public boolean verified;

    public User() {}

    public User(String uid, String nick, String email) {
        this.uid = uid;
        this.nick = nick;
        this.displayName = nick;
        this.email = email;
        this.online = true;
    }

    public String getDisplayNameOrNick() {
        if (displayName != null && !displayName.trim().isEmpty()) return displayName;
        if (nick != null && !nick.trim().isEmpty()) return nick;
        if (email != null && !email.trim().isEmpty()) return email.split("@")[0];
        return "Пользователь";
    }

    public String getEffectiveAvatar() {
        if (avatar != null && !avatar.trim().isEmpty()) return avatar;
        if (photoURL != null && !photoURL.trim().isEmpty()) return photoURL;
        return null;
    }

    public long getTypingAtMillis() {
        if (typingAt instanceof Long) return (Long) typingAt;
        if (typingAt instanceof Double) return ((Double) typingAt).longValue();
        return 0;
    }

    public boolean isTypingInChat(String chatId) {
        if (chatId == null || !chatId.equals(typingIn)) return false;
        long time = getTypingAtMillis();
        if (time <= 0) return false;
        long diff = System.currentTimeMillis() - time;
        return diff >= 0 && diff < 4500;
    }

    public long getLastSeenMillis() {
        if (lastSeen instanceof Long) return (Long) lastSeen;
        if (lastSeen instanceof Double) return ((Double) lastSeen).longValue();
        return 0;
    }
}
`);

// model/Chat.java
writeAndroidFile('app/src/main/java/com/nonsensechat/app/model/Chat.java', `package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import com.google.firebase.database.PropertyName;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@IgnoreExtraProperties
public class Chat implements Serializable {
    public String id;
    public String title;
    public String name;
    public String type = "dm"; // dm, group, channel, fav
    public String avatar;
    public String lastMsg;
    public String lastMessage;
    public Object lastMsgAt;
    public Object lastAt;
    public String lastMsgUid;
    public Object createdAt;
    public String creatorUid;
    public Object members; // List<String> or Map<String, Boolean>
    public int unreadCount;
    public boolean pinned;
    public Map<String, Object> typing; // uid -> timestamp

    public Chat() {}

    public boolean isGroup() {
        return "group".equalsIgnoreCase(type) || "channel".equalsIgnoreCase(type);
    }

    public boolean isFav() {
        return "fav".equalsIgnoreCase(type);
    }

    public List<String> getMemberList() {
        List<String> list = new ArrayList<>();
        if (members instanceof List) {
            for (Object item : (List<?>) members) {
                if (item != null) list.add(String.valueOf(item));
            }
        } else if (members instanceof Map) {
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) members).entrySet()) {
                if (Boolean.TRUE.equals(entry.getValue()) || "true".equals(String.valueOf(entry.getValue()))) {
                    list.add(String.valueOf(entry.getKey()));
                }
            }
        }
        return list;
    }

    public String getOtherMemberUid(String currentUid) {
        List<String> mems = getMemberList();
        for (String m : mems) {
            if (m != null && !m.equals(currentUid)) return m;
        }
        return null;
    }

    public String getLastMessageText() {
        if (lastMsg != null && !lastMsg.trim().isEmpty()) return lastMsg;
        if (lastMessage != null && !lastMessage.trim().isEmpty()) return lastMessage;
        return "Нет сообщений";
    }

    public long getLastMessageTimestamp() {
        Object at = lastMsgAt != null ? lastMsgAt : lastAt;
        if (at instanceof Long) return (Long) at;
        if (at instanceof Double) return ((Double) at).longValue();
        return 0;
    }
}
`);

// model/Message.java
writeAndroidFile('app/src/main/java/com/nonsensechat/app/model/Message.java', `package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import com.google.firebase.database.PropertyName;
import java.io.Serializable;
import java.util.Map;

@IgnoreExtraProperties
public class Message implements Serializable {
    public String id;
    public String uid;
    public String author;
    public String senderName;
    public String text;
    public String type = "text"; // text, image, audio, video, poll, system, sticker
    public String fileUrl;
    public String url;
    public String img;
    public String mediaUrl;
    public Object at;
    public Object timestamp;
    public boolean spoiler;
    public long duration;
    public String replyTo;
    public Poll poll;
    public Map<String, Map<String, Boolean>> reactions;

    public Message() {}

    public boolean isOutgoing(String currentUid) {
        return uid != null && uid.equals(currentUid);
    }

    public String getSenderDisplayName() {
        if (author != null && !author.trim().isEmpty()) return author;
        if (senderName != null && !senderName.trim().isEmpty()) return senderName;
        return "Пользователь";
    }

    public String getMediaUrl() {
        if (fileUrl != null && !fileUrl.trim().isEmpty()) return fileUrl;
        if (url != null && !url.trim().isEmpty()) return url;
        if (mediaUrl != null && !mediaUrl.trim().isEmpty()) return mediaUrl;
        if (img != null && !img.trim().isEmpty()) return img;
        return null;
    }

    public long getTimestampMillis() {
        Object t = at != null ? at : timestamp;
        if (t instanceof Long) return (Long) t;
        if (t instanceof Double) return ((Double) t).longValue();
        return System.currentTimeMillis();
    }
}
`);

// ════════════════════════════════════════════════════════════════════════
// 3. DATA LAYER: FirebaseManager (Correct paths, User cache, Typing TTL)
// ════════════════════════════════════════════════════════════════════════

writeAndroidFile('app/src/main/java/com/nonsensechat/app/data/FirebaseManager.java', `package com.nonsensechat.app.data;

import android.content.Context;
import androidx.annotation.NonNull;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ServerValue;
import com.google.firebase.database.ValueEventListener;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.PollOption;
import com.nonsensechat.app.model.User;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class FirebaseManager {
    private static FirebaseManager instance;
    private FirebaseAuth auth;
    private FirebaseDatabase database;
    private final Map<String, User> userCache = new ConcurrentHashMap<>();

    private FirebaseManager() {}

    public static synchronized FirebaseManager getInstance() {
        if (instance == null) {
            instance = new FirebaseManager();
        }
        return instance;
    }

    public void init(Context context) {
        auth = FirebaseAuth.getInstance();
        database = FirebaseDatabase.getInstance("https://nonsensechattm-e5d18-default-rtdb.firebaseio.com");
    }

    public FirebaseAuth getAuth() {
        if (auth == null) auth = FirebaseAuth.getInstance();
        return auth;
    }

    public FirebaseUser getCurrentUser() {
        return getAuth().getCurrentUser();
    }

    public String getCurrentUid() {
        FirebaseUser user = getCurrentUser();
        return user != null ? user.getUid() : null;
    }

    public DatabaseReference getDb() {
        if (database == null) {
            database = FirebaseDatabase.getInstance("https://nonsensechattm-e5d18-default-rtdb.firebaseio.com");
        }
        return database.getReference();
    }

    public DatabaseReference getUsersRef() {
        return getDb().child("users");
    }

    public DatabaseReference getUserRef(String uid) {
        return getUsersRef().child(uid);
    }

    public DatabaseReference getChatsRef() {
        return getDb().child("chats");
    }

    public DatabaseReference getChatRef(String chatId) {
        return getChatsRef().child(chatId);
    }

    // ⚠️ CRITICAL FIX: Realtime Database stores messages at /messages/{chatId}, NOT /chats/{chatId}/messages
    public DatabaseReference getMessagesRef(String chatId) {
        return getDb().child("messages").child(chatId);
    }

    // User Cache & Real-time Profile Prefetch
    public User getCachedUser(String uid) {
        return uid != null ? userCache.get(uid) : null;
    }

    public void prefetchUsers(List<String> uids, Runnable onComplete) {
        if (uids == null || uids.isEmpty()) {
            if (onComplete != null) onComplete.run();
            return;
        }
        int[] pending = {uids.size()};
        for (String uid : uids) {
            if (uid == null) {
                if (--pending[0] <= 0 && onComplete != null) onComplete.run();
                continue;
            }
            getUserRef(uid).addListenerForSingleValueEvent(new ValueEventListener() {
                @Override
                public void onDataChange(@NonNull DataSnapshot snapshot) {
                    User u = snapshot.getValue(User.class);
                    if (u != null) {
                        u.uid = snapshot.getKey();
                        userCache.put(u.uid, u);
                    }
                    if (--pending[0] <= 0 && onComplete != null) onComplete.run();
                }

                @Override
                public void onCancelled(@NonNull DatabaseError error) {
                    if (--pending[0] <= 0 && onComplete != null) onComplete.run();
                }
            });
        }
    }

    // Presence management
    public void setupPresence() {
        String uid = getCurrentUid();
        if (uid == null) return;

        DatabaseReference userRef = getUserRef(uid);
        DatabaseReference connectedRef = getDb().child(".info/connected");

        connectedRef.addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                boolean connected = Boolean.TRUE.equals(snapshot.getValue(Boolean.class));
                if (connected) {
                    Map<String, Object> onlineMap = new HashMap<>();
                    onlineMap.put("online", true);
                    onlineMap.put("lastSeen", ServerValue.TIMESTAMP);
                    userRef.updateChildren(onlineMap);

                    Map<String, Object> offlineMap = new HashMap<>();
                    offlineMap.put("online", false);
                    offlineMap.put("lastSeen", ServerValue.TIMESTAMP);
                    userRef.onDisconnect().updateChildren(offlineMap);
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    // Typing: DM writes to /users/{uid}/typingIn & typingAt. Group writes to /chats/{chatId}/typing/{uid}
    public void setTyping(String chatId, boolean isGroup, boolean typing) {
        String uid = getCurrentUid();
        if (uid == null || chatId == null) return;

        if (isGroup) {
            DatabaseReference groupTypingRef = getChatRef(chatId).child("typing").child(uid);
            if (typing) {
                groupTypingRef.setValue(ServerValue.TIMESTAMP);
            } else {
                groupTypingRef.removeValue();
            }
        } else {
            DatabaseReference myUserRef = getUserRef(uid);
            if (typing) {
                Map<String, Object> map = new HashMap<>();
                map.put("typingIn", chatId);
                map.put("typingAt", ServerValue.TIMESTAMP);
                myUserRef.updateChildren(map);
            } else {
                myUserRef.child("typingIn").removeValue();
                myUserRef.child("typingAt").setValue(0);
            }
        }
    }

    // Send Message: Writes to /messages/{chatId} and updates chat lastMsg/lastMsgAt
    public void sendMessage(String chatId, Message message, DatabaseReference.CompletionListener listener) {
        DatabaseReference msgRef = getMessagesRef(chatId).push();
        message.id = msgRef.getKey();
        message.at = ServerValue.TIMESTAMP;
        
        User me = getCachedUser(message.uid);
        if (me != null && message.author == null) {
            message.author = me.getDisplayNameOrNick();
        }

        msgRef.setValue(message, (error, ref) -> {
            if (error == null) {
                Map<String, Object> chatUpdate = new HashMap<>();
                String preview = message.text != null && !message.text.trim().isEmpty() 
                    ? message.text 
                    : ("image".equals(message.type) ? "📷 Фотография" : ("poll".equals(message.type) ? "📊 Опрос" : "Сообщение"));
                chatUpdate.put("lastMsg", preview);
                chatUpdate.put("lastMessage", preview);
                chatUpdate.put("lastMsgAt", ServerValue.TIMESTAMP);
                chatUpdate.put("lastAt", ServerValue.TIMESTAMP);
                chatUpdate.put("lastMsgUid", message.uid);
                getChatRef(chatId).updateChildren(chatUpdate);
            }
            if (listener != null) listener.onComplete(error, ref);
        });
    }

    public void votePoll(String chatId, String messageId, int optionIndex, boolean multiple) {
        String uid = getCurrentUid();
        if (uid == null || chatId == null || messageId == null) return;

        DatabaseReference pollRef = getMessagesRef(chatId).child(messageId).child("poll");
        pollRef.runTransaction(new com.google.firebase.database.Transaction.Handler() {
            @NonNull
            @Override
            public com.google.firebase.database.Transaction.Result doTransaction(@NonNull com.google.firebase.database.MutableData currentData) {
                Poll poll = currentData.getValue(Poll.class);
                if (poll == null || poll.options == null || optionIndex < 0 || optionIndex >= poll.options.size()) {
                    return com.google.firebase.database.Transaction.success(currentData);
                }

                PollOption targetOpt = poll.options.get(optionIndex);
                if (targetOpt.voters == null) targetOpt.voters = new HashMap<>();

                boolean wasVoted = Boolean.TRUE.equals(targetOpt.voters.get(uid));
                if (wasVoted) {
                    targetOpt.voters.remove(uid);
                    targetOpt.votes = Math.max(0, targetOpt.votes - 1);
                    poll.totalVotes = Math.max(0, poll.totalVotes - 1);
                } else {
                    if (!multiple) {
                        for (PollOption opt : poll.options) {
                            if (opt.voters != null && Boolean.TRUE.equals(opt.voters.remove(uid))) {
                                opt.votes = Math.max(0, opt.votes - 1);
                                poll.totalVotes = Math.max(0, poll.totalVotes - 1);
                            }
                        }
                    }
                    targetOpt.voters.put(uid, true);
                    targetOpt.votes++;
                    poll.totalVotes++;
                }

                currentData.setValue(poll);
                return com.google.firebase.database.Transaction.success(currentData);
            }

            @Override
            public void onComplete(com.google.firebase.database.DatabaseError error, boolean committed, com.google.firebase.database.DataSnapshot currentData) {}
        });
    }
}
`);

// ════════════════════════════════════════════════════════════════════════
// 4. UI FIXES: Window Insets, Responsive Layouts & Screens
// ════════════════════════════════════════════════════════════════════════

// activity_main.xml (with insets support & tab icons)
writeAndroidFile('app/src/main/res/layout/activity_main.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/mainCoordinator"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_main">

    <com.google.android.material.appbar.AppBarLayout
        android:id="@+id/appBarLayout"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="@color/bg_main"
        app:elevation="0dp">

        <!-- Top Header Bar (padded for status bar dynamically) -->
        <androidx.appcompat.widget.Toolbar
            android:id="@+id/mainToolbar"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:minHeight="56dp"
            app:contentInsetStart="16dp"
            app:contentInsetEnd="16dp">

            <androidx.constraintlayout.widget.ConstraintLayout
                android:layout_width="match_parent"
                android:layout_height="match_parent">

                <!-- Avatar with online dot -->
                <com.nonsensechat.app.ui.custom.AvatarView
                    android:id="@+id/btnProfileAvatar"
                    android:layout_width="38dp"
                    android:layout_height="38dp"
                    app:layout_constraintStart_toStartOf="parent"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <!-- Logo / App Name -->
                <TextView
                    android:id="@+id/mainTitle"
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="12dp"
                    android:layout_marginEnd="8dp"
                    android:text="@string/app_name"
                    android:textColor="@color/text_primary"
                    android:textSize="19sp"
                    android:textStyle="bold"
                    android:ellipsize="end"
                    android:maxLines="1"
                    app:layout_constraintStart_toEndOf="@+id/btnProfileAvatar"
                    app:layout_constraintEnd_toStartOf="@+id/btnSearchToggle"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <ImageView
                    android:id="@+id/btnSearchToggle"
                    android:layout_width="36dp"
                    android:layout_height="36dp"
                    android:background="?attr/selectableItemBackgroundBorderless"
                    android:padding="7dp"
                    android:src="@drawable/ic_search"
                    app:tint="@color/text_secondary"
                    app:layout_constraintEnd_toStartOf="@+id/btnSettings"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <ImageView
                    android:id="@+id/btnSettings"
                    android:layout_width="36dp"
                    android:layout_height="36dp"
                    android:layout_marginStart="4dp"
                    android:background="?attr/selectableItemBackgroundBorderless"
                    android:padding="7dp"
                    android:src="@drawable/ic_settings_gear"
                    app:tint="@color/text_secondary"
                    app:layout_constraintEnd_toStartOf="@+id/btnNewChat"
                    app:layout_constraintTop_toTopOf="parent"
                    app:layout_constraintBottom_toBottomOf="parent" />

                <ImageView
                    android:id="@+id/btnNewChat"
                    android:layout_width="36dp"
                    android:layout_height="36dp"
                    android:layout_marginStart="4dp"
                    android:background="?attr/selectableItemBackgroundBorderless"
                    android:padding="6dp"
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
            android:layout_height="46dp"
            android:paddingHorizontal="12dp"
            android:scrollbars="none">

            <LinearLayout
                android:id="@+id/tabsContainer"
                android:layout_width="wrap_content"
                android:layout_height="match_parent"
                android:gravity="center_vertical"
                android:orientation="horizontal">

                <LinearLayout
                    android:id="@+id/tabAll"
                    android:layout_width="wrap_content"
                    android:layout_height="32dp"
                    android:background="@drawable/bg_primary_button"
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:paddingHorizontal="14dp">

                    <ImageView
                        android:layout_width="16dp"
                        android:layout_height="16dp"
                        android:layout_marginEnd="6dp"
                        android:src="@drawable/ic_tab_all"
                        app:tint="#080C14" />

                    <TextView
                        android:id="@+id/tvTabAll"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="@string/tab_all"
                        android:textColor="#080C14"
                        android:textSize="13sp"
                        android:textStyle="bold" />

                </LinearLayout>

                <LinearLayout
                    android:id="@+id/tabDirect"
                    android:layout_width="wrap_content"
                    android:layout_height="32dp"
                    android:layout_marginStart="8dp"
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:paddingHorizontal="14dp">

                    <ImageView
                        android:layout_width="16dp"
                        android:layout_height="16dp"
                        android:layout_marginEnd="6dp"
                        android:src="@drawable/ic_tab_direct"
                        app:tint="@color/text_secondary" />

                    <TextView
                        android:id="@+id/tvTabDirect"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="@string/tab_direct"
                        android:textColor="@color/text_secondary"
                        android:textSize="13sp" />

                </LinearLayout>

                <LinearLayout
                    android:id="@+id/tabGroups"
                    android:layout_width="wrap_content"
                    android:layout_height="32dp"
                    android:layout_marginStart="8dp"
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:paddingHorizontal="14dp">

                    <ImageView
                        android:layout_width="16dp"
                        android:layout_height="16dp"
                        android:layout_marginEnd="6dp"
                        android:src="@drawable/ic_tab_groups"
                        app:tint="@color/text_secondary" />

                    <TextView
                        android:id="@+id/tvTabGroups"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="@string/tab_groups"
                        android:textColor="@color/text_secondary"
                        android:textSize="13sp" />

                </LinearLayout>

                <LinearLayout
                    android:id="@+id/tabChannels"
                    android:layout_width="wrap_content"
                    android:layout_height="32dp"
                    android:layout_marginStart="8dp"
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:paddingHorizontal="14dp">

                    <ImageView
                        android:layout_width="16dp"
                        android:layout_height="16dp"
                        android:layout_marginEnd="6dp"
                        android:src="@drawable/ic_tab_channels"
                        app:tint="@color/text_secondary" />

                    <TextView
                        android:id="@+id/tvTabChannels"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="@string/tab_channels"
                        android:textColor="@color/text_secondary"
                        android:textSize="13sp" />

                </LinearLayout>

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
                android:paddingBottom="80dp" />

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
                    android:src="@drawable/ic_tab_all"
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
        android:layout_marginEnd="20dp"
        android:layout_marginBottom="24dp"
        android:backgroundTint="@color/accent_green"
        android:src="@drawable/ic_add"
        app:tint="#080C14" />

</androidx.coordinatorlayout.widget.CoordinatorLayout>
`);

// item_chat.xml (Enhanced with clean typography, partner resolution & icons)
writeAndroidFile('app/src/main/res/layout/item_chat.xml', `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="?attr/selectableItemBackground"
    android:paddingHorizontal="16dp"
    android:paddingVertical="11dp">

    <com.nonsensechat.app.ui.custom.AvatarView
        android:id="@+id/chatAvatar"
        android:layout_width="50dp"
        android:layout_height="50dp"
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
        android:layout_marginTop="3dp"
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

// activity_chat.xml (With complete window insets & modern calling/menu icons)
writeAndroidFile('app/src/main/res/layout/activity_chat.xml', `<?xml version="1.0" encoding="utf-8"?>
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
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="10dp"
            android:layout_marginEnd="8dp"
            android:orientation="vertical"
            app:layout_constraintStart_toEndOf="@+id/headerAvatar"
            app:layout_constraintEnd_toStartOf="@+id/btnCall"
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
            android:layout_marginStart="4dp"
            android:background="?attr/selectableItemBackgroundBorderless"
            android:padding="6dp"
            android:src="@drawable/ic_more_vert"
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
        android:paddingHorizontal="10dp"
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
            android:src="@drawable/ic_microphone"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintBottom_toBottomOf="parent" />

    </androidx.constraintlayout.widget.ConstraintLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
`);

// ════════════════════════════════════════════════════════════════════════
// 5. ACTIVITIES CODE UPGRADE (MainActivity, ChatListAdapter, ChatActivity)
// ════════════════════════════════════════════════════════════════════════

// ui/main/MainActivity.java
writeAndroidFile('app/src/main/java/com/nonsensechat/app/ui/main/MainActivity.java', `package com.nonsensechat.app.ui.main;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.ValueEventListener;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.auth.AuthActivity;
import com.nonsensechat.app.ui.chat.ChatActivity;
import com.nonsensechat.app.ui.custom.AvatarView;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends AppCompatActivity {
    private RecyclerView rvChats;
    private ChatListAdapter adapter;
    private SwipeRefreshLayout swipeRefresh;
    private View emptyStateView, searchContainer;
    private EditText etSearchChats;
    private AvatarView btnProfileAvatar;
    private final List<Chat> allChats = new ArrayList<>();
    private String currentTab = "all";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Responsive Window Insets (Status bar & Navigation bar)
        View mainCoord = findViewById(R.id.mainCoordinator);
        View appBar = findViewById(R.id.appBarLayout);
        ViewCompat.setOnApplyWindowInsetsListener(mainCoord, (v, insets) -> {
            Insets sysBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            appBar.setPadding(0, sysBars.top, 0, 0);
            v.setPadding(sysBars.left, 0, sysBars.right, 0);
            return insets;
        });

        rvChats = findViewById(R.id.rvChats);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        emptyStateView = findViewById(R.id.emptyStateView);
        searchContainer = findViewById(R.id.searchContainer);
        etSearchChats = findViewById(R.id.etSearchChats);
        btnProfileAvatar = findViewById(R.id.btnProfileAvatar);

        rvChats.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ChatListAdapter(chat -> {
            Intent intent = new Intent(MainActivity.this, ChatActivity.class);
            intent.putExtra("chat", chat);
            startActivity(intent);
        });
        rvChats.setAdapter(adapter);

        setupTabs();
        setupSearch();
        loadCurrentUser();
        loadChats();

        findViewById(R.id.btnSearchToggle).setOnClickListener(v -> {
            boolean visible = searchContainer.getVisibility() == View.VISIBLE;
            searchContainer.setVisibility(visible ? View.GONE : View.VISIBLE);
            if (!visible) etSearchChats.requestFocus();
        });

        findViewById(R.id.btnSettings).setOnClickListener(v -> showProfileDialog());
        findViewById(R.id.btnNewChat).setOnClickListener(v -> showNewChatDialog());
        findViewById(R.id.fabNewChat).setOnClickListener(v -> showNewChatDialog());
        btnProfileAvatar.setOnClickListener(v -> showProfileDialog());

        swipeRefresh.setOnRefreshListener(this::loadChats);
    }

    private void setupTabs() {
        LinearLayout tabAll = findViewById(R.id.tabAll);
        LinearLayout tabDirect = findViewById(R.id.tabDirect);
        LinearLayout tabGroups = findViewById(R.id.tabGroups);
        LinearLayout tabChannels = findViewById(R.id.tabChannels);

        View.OnClickListener listener = v -> {
            int id = v.getId();
            resetTabPills();
            if (id == R.id.tabAll) {
                currentTab = "all";
                highlightTab(tabAll, R.id.tvTabAll);
            } else if (id == R.id.tabDirect) {
                currentTab = "dm";
                highlightTab(tabDirect, R.id.tvTabDirect);
            } else if (id == R.id.tabGroups) {
                currentTab = "group";
                highlightTab(tabGroups, R.id.tvTabGroups);
            } else if (id == R.id.tabChannels) {
                currentTab = "channel";
                highlightTab(tabChannels, R.id.tvTabChannels);
            }
            filterChats();
        };

        tabAll.setOnClickListener(listener);
        tabDirect.setOnClickListener(listener);
        tabGroups.setOnClickListener(listener);
        tabChannels.setOnClickListener(listener);
    }

    private void resetTabPills() {
        int[] layoutIds = {R.id.tabAll, R.id.tabDirect, R.id.tabGroups, R.id.tabChannels};
        int[] textIds = {R.id.tvTabAll, R.id.tvTabDirect, R.id.tvTabGroups, R.id.tvTabChannels};
        for (int i = 0; i < layoutIds.length; i++) {
            LinearLayout l = findViewById(layoutIds[i]);
            TextView t = findViewById(textIds[i]);
            l.setBackground(null);
            t.setTextColor(getColor(R.color.text_secondary));
            t.setTypeface(null, android.graphics.Typeface.NORMAL);
        }
    }

    private void highlightTab(LinearLayout layout, int textId) {
        layout.setBackgroundResource(R.drawable.bg_primary_button);
        TextView t = layout.findViewById(textId);
        t.setTextColor(Color.parseColor("#080C14"));
        t.setTypeface(null, android.graphics.Typeface.BOLD);
    }

    private void setupSearch() {
        etSearchChats.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterChats();
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void loadCurrentUser() {
        String uid = FirebaseManager.getInstance().getCurrentUid();
        if (uid == null) return;
        FirebaseManager.getInstance().getUserRef(uid).addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                User user = snapshot.getValue(User.class);
                if (user != null) {
                    btnProfileAvatar.setUser(user.getDisplayNameOrNick(), user.getEffectiveAvatar(), true);
                }
            }
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void loadChats() {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        if (myUid == null) {
            swipeRefresh.setRefreshing(false);
            return;
        }

        FirebaseManager.getInstance().getChatsRef().addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                allChats.clear();
                Set<String> dmUidsToFetch = new HashSet<>();

                for (DataSnapshot ds : snapshot.getChildren()) {
                    Chat c = ds.getValue(Chat.class);
                    if (c != null) {
                        c.id = ds.getKey();
                        List<String> members = c.getMemberList();
                        if (members.isEmpty() || members.contains(myUid)) {
                            allChats.add(c);
                            if ("dm".equalsIgnoreCase(c.type)) {
                                String otherUid = c.getOtherMemberUid(myUid);
                                if (otherUid != null) dmUidsToFetch.add(otherUid);
                            }
                        }
                    }
                }

                // Sort chats by most recent activity
                Collections.sort(allChats, (a, b) -> Long.compare(b.getLastMessageTimestamp(), a.getLastMessageTimestamp()));

                // Prefetch DM partners profiles before display
                if (!dmUidsToFetch.isEmpty()) {
                    FirebaseManager.getInstance().prefetchUsers(new ArrayList<>(dmUidsToFetch), () -> {
                        runOnUiThread(() -> {
                            swipeRefresh.setRefreshing(false);
                            filterChats();
                        });
                    });
                } else {
                    swipeRefresh.setRefreshing(false);
                    filterChats();
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                swipeRefresh.setRefreshing(false);
            }
        });
    }

    private void filterChats() {
        String query = etSearchChats.getText().toString().trim().toLowerCase();
        List<Chat> filtered = new ArrayList<>();
        String myUid = FirebaseManager.getInstance().getCurrentUid();

        for (Chat c : allChats) {
            boolean tabMatch = "all".equals(currentTab);
            if ("dm".equals(currentTab)) tabMatch = "dm".equalsIgnoreCase(c.type) || c.isFav();
            else if ("group".equals(currentTab)) tabMatch = "group".equalsIgnoreCase(c.type);
            else if ("channel".equals(currentTab)) tabMatch = "channel".equalsIgnoreCase(c.type);

            String chatTitle = getResolvedChatTitle(c, myUid).toLowerCase();
            boolean queryMatch = query.isEmpty() || chatTitle.contains(query);

            if (tabMatch && queryMatch) filtered.add(c);
        }

        adapter.submitList(filtered);
        emptyStateView.setVisibility(filtered.isEmpty() ? View.VISIBLE : View.GONE);
    }

    public static String getResolvedChatTitle(Chat chat, String myUid) {
        if (chat.isFav()) return "Избранное";
        if ("dm".equalsIgnoreCase(chat.type)) {
            String otherUid = chat.getOtherMemberUid(myUid);
            if (otherUid != null) {
                User partner = FirebaseManager.getInstance().getCachedUser(otherUid);
                if (partner != null) return partner.getDisplayNameOrNick();
            }
            if (chat.title != null && !chat.title.trim().isEmpty()) return chat.title;
            return "Личный диалог";
        }
        if (chat.title != null && !chat.title.trim().isEmpty()) return chat.title;
        if (chat.name != null && !chat.name.trim().isEmpty()) return chat.name;
        return "Групповой чат";
    }

    public static String getResolvedChatAvatar(Chat chat, String myUid) {
        if ("dm".equalsIgnoreCase(chat.type)) {
            String otherUid = chat.getOtherMemberUid(myUid);
            if (otherUid != null) {
                User partner = FirebaseManager.getInstance().getCachedUser(otherUid);
                if (partner != null) return partner.getEffectiveAvatar();
            }
        }
        return chat.avatar;
    }

    private void showNewChatDialog() {
        final EditText input = new EditText(this);
        input.setHint("Название группы или никнейм");
        input.setPadding(32, 24, 32, 24);
        new AlertDialog.Builder(this)
            .setTitle(R.string.new_chat)
            .setView(input)
            .setPositiveButton("Создать", (dialog, which) -> {
                String title = input.getText().toString().trim();
                if (!title.isEmpty()) createGroupChat(title);
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void createGroupChat(String title) {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        Chat chat = new Chat();
        chat.title = title;
        chat.type = "group";
        chat.creatorUid = myUid;
        List<String> members = new ArrayList<>();
        members.add(myUid);
        chat.members = members;

        String chatId = FirebaseManager.getInstance().getChatsRef().push().getKey();
        if (chatId != null) {
            chat.id = chatId;
            FirebaseManager.getInstance().getChatRef(chatId).setValue(chat)
                .addOnSuccessListener(aVoid -> {
                    Intent intent = new Intent(MainActivity.this, ChatActivity.class);
                    intent.putExtra("chat", chat);
                    startActivity(intent);
                });
        }
    }

    private void showProfileDialog() {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        User me = FirebaseManager.getInstance().getCachedUser(myUid);
        String name = me != null ? me.getDisplayNameOrNick() : myUid;

        new AlertDialog.Builder(this)
            .setTitle(R.string.settings)
            .setMessage("Профиль: " + name + "\\nUID: " + myUid)
            .setIcon(R.drawable.ic_settings_gear)
            .setPositiveButton(R.string.logout, (dialog, which) -> {
                FirebaseManager.getInstance().getAuth().signOut();
                startActivity(new Intent(MainActivity.this, AuthActivity.class));
                finish();
            })
            .setNegativeButton("Закрыть", null)
            .show();
    }
}
`);

// ui/main/ChatListAdapter.java
writeAndroidFile('app/src/main/java/com/nonsensechat/app/ui/main/ChatListAdapter.java', `package com.nonsensechat.app.ui.main;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class ChatListAdapter extends RecyclerView.Adapter<ChatListAdapter.ChatViewHolder> {
    public interface OnChatClickListener {
        void onChatClick(Chat chat);
    }

    private final List<Chat> list = new ArrayList<>();
    private final OnChatClickListener listener;
    private final SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
    private final SimpleDateFormat dayFormat = new SimpleDateFormat("dd MMM", Locale.getDefault());

    public ChatListAdapter(OnChatClickListener listener) {
        this.listener = listener;
    }

    public void submitList(List<Chat> chats) {
        list.clear();
        if (chats != null) list.addAll(chats);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ChatViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_chat, parent, false);
        return new ChatViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ChatViewHolder holder, int position) {
        Chat chat = list.get(position);
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        
        String title = MainActivity.getResolvedChatTitle(chat, myUid);
        String avatar = MainActivity.getResolvedChatAvatar(chat, myUid);
        boolean isOnline = false;

        if ("dm".equalsIgnoreCase(chat.type)) {
            String otherUid = chat.getOtherMemberUid(myUid);
            User partner = FirebaseManager.getInstance().getCachedUser(otherUid);
            if (partner != null) isOnline = partner.online;
        }

        holder.tvChatTitle.setText(title);
        
        String lastMsg = chat.getLastMessageText();
        if (chat.lastMsgUid != null && chat.lastMsgUid.equals(myUid)) {
            holder.tvLastMessage.setText("Вы: " + lastMsg);
        } else {
            holder.tvLastMessage.setText(lastMsg);
        }

        long time = chat.getLastMessageTimestamp();
        if (time > 0) {
            holder.tvChatTime.setText(formatTime(time));
        } else {
            holder.tvChatTime.setText("");
        }

        holder.chatAvatar.setUser(title, avatar, isOnline);
        holder.itemView.setOnClickListener(v -> listener.onChatClick(chat));
    }

    private String formatTime(long millis) {
        long diff = System.currentTimeMillis() - millis;
        if (diff < 24 * 3600 * 1000) {
            return timeFormat.format(new Date(millis));
        }
        return dayFormat.format(new Date(millis));
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class ChatViewHolder extends RecyclerView.ViewHolder {
        AvatarView chatAvatar;
        TextView tvChatTitle, tvLastMessage, tvChatTime, tvUnreadBadge;

        public ChatViewHolder(@NonNull View itemView) {
            super(itemView);
            chatAvatar = itemView.findViewById(R.id.chatAvatar);
            tvChatTitle = itemView.findViewById(R.id.tvChatTitle);
            tvLastMessage = itemView.findViewById(R.id.tvLastMessage);
            tvChatTime = itemView.findViewById(R.id.tvChatTime);
            tvUnreadBadge = itemView.findViewById(R.id.tvUnreadBadge);
        }
    }
}
`);

// ui/chat/ChatActivity.java (Full WindowInsets, /messages/ loading, Ghost Typing Fix with TTL & Ticker)
writeAndroidFile('app/src/main/java/com/nonsensechat/app/ui/chat/ChatActivity.java', `package com.nonsensechat.app.ui.chat;

import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.firebase.database.ChildEventListener;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.ValueEventListener;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.PollOption;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import com.nonsensechat.app.ui.main.MainActivity;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class ChatActivity extends AppCompatActivity {
    private Chat chat;
    private RecyclerView rvMessages;
    private MessageAdapter adapter;
    private EditText etMessage;
    private ImageView btnSendOrVoice;
    private TextView tvHeaderTitle, tvHeaderSubtitle;
    private AvatarView headerAvatar;
    private final List<Message> messages = new ArrayList<>();
    private boolean isTextMode = false;
    private final Handler tickerHandler = new Handler(Looper.getMainLooper());
    private Runnable tickerRunnable;
    private String dmPartnerUid;
    private User dmPartnerUser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        chat = (Chat) getIntent().getSerializableExtra("chat");
        if (chat == null) {
            finish();
            return;
        }

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        dmPartnerUid = chat.getOtherMemberUid(myUid);

        // Window Insets Handling (Status bar top padding & Navigation bar bottom padding)
        View chatRoot = findViewById(R.id.chatRoot);
        View chatHeader = findViewById(R.id.chatHeader);
        View bottomBar = findViewById(R.id.bottomBar);

        ViewCompat.setOnApplyWindowInsetsListener(chatRoot, (v, insets) -> {
            Insets sysBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            chatHeader.setPadding(chatHeader.getPaddingLeft(), sysBars.top, chatHeader.getPaddingRight(), chatHeader.getPaddingBottom());
            int bottomPadding = Math.max(sysBars.bottom, ime.bottom);
            bottomBar.setPadding(bottomBar.getPaddingLeft(), bottomBar.getPaddingTop(), bottomBar.getPaddingRight(), bottomPadding);
            return insets;
        });

        initViews();
        setupListeners();
        loadMessages();
        setupTypingAndPresence();
    }

    private void initViews() {
        rvMessages = findViewById(R.id.rvMessages);
        etMessage = findViewById(R.id.etMessage);
        btnSendOrVoice = findViewById(R.id.btnSendOrVoice);
        tvHeaderTitle = findViewById(R.id.tvHeaderTitle);
        tvHeaderSubtitle = findViewById(R.id.tvHeaderSubtitle);
        headerAvatar = findViewById(R.id.headerAvatar);

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        String title = MainActivity.getResolvedChatTitle(chat, myUid);
        String avatar = MainActivity.getResolvedChatAvatar(chat, myUid);

        tvHeaderTitle.setText(title);
        headerAvatar.setUser(title, avatar, false);

        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        layoutManager.setStackFromEnd(true);
        rvMessages.setLayoutManager(layoutManager);

        adapter = new MessageAdapter(this, (message, optionIndex) -> {
            FirebaseManager.getInstance().votePoll(chat.id, message.id, optionIndex, message.poll != null && message.poll.multiple);
        });
        rvMessages.setAdapter(adapter);

        findViewById(R.id.btnChatBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnCall).setOnClickListener(v -> Toast.makeText(this, "Звонки доступны в веб-версии", Toast.LENGTH_SHORT).show());
        findViewById(R.id.btnChatMenu).setOnClickListener(v -> showChatMenu());
        findViewById(R.id.btnAttach).setOnClickListener(v -> showAttachMenu());
    }

    private void setupListeners() {
        etMessage.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                boolean hasText = s != null && s.toString().trim().length() > 0;
                if (hasText != isTextMode) {
                    isTextMode = hasText;
                    btnSendOrVoice.setImageResource(isTextMode ? R.drawable.ic_send_airplane : R.drawable.ic_microphone);
                }
                FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), hasText);
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnSendOrVoice.setOnClickListener(v -> {
            if (isTextMode) {
                sendMessage();
            } else {
                Toast.makeText(this, "Удерживайте микрофон для записи голосового", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void sendMessage() {
        String text = etMessage.getText().toString().trim();
        if (text.isEmpty()) return;

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        Message msg = new Message();
        msg.uid = myUid;
        msg.text = text;
        msg.type = "text";

        etMessage.setText("");
        FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), false);
        FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
    }

    // ⚠️ CRITICAL FIX: Load from /messages/{chatId} with initial population & realtime updates
    private void loadMessages() {
        FirebaseManager.getInstance().getMessagesRef(chat.id).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                messages.clear();
                for (DataSnapshot ds : snapshot.getChildren()) {
                    Message m = ds.getValue(Message.class);
                    if (m != null) {
                        m.id = ds.getKey();
                        messages.add(m);
                    }
                }
                Collections.sort(messages, (a, b) -> Long.compare(a.getTimestampMillis(), b.getTimestampMillis()));
                adapter.submitList(messages);
                if (!messages.isEmpty()) {
                    rvMessages.scrollToPosition(messages.size() - 1);
                }
                listenRealtimeMessages();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                listenRealtimeMessages();
            }
        });
    }

    private void listenRealtimeMessages() {
        FirebaseManager.getInstance().getMessagesRef(chat.id).addChildEventListener(new ChildEventListener() {
            @Override
            public void onChildAdded(@NonNull DataSnapshot snapshot, String previousChildName) {
                String key = snapshot.getKey();
                for (Message m : messages) {
                    if (m.id != null && m.id.equals(key)) return; // already added
                }
                Message m = snapshot.getValue(Message.class);
                if (m != null) {
                    m.id = key;
                    messages.add(m);
                    adapter.submitList(messages);
                    rvMessages.smoothScrollToPosition(messages.size() - 1);
                }
            }

            @Override
            public void onChildChanged(@NonNull DataSnapshot snapshot, String previousChildName) {
                Message updated = snapshot.getValue(Message.class);
                if (updated != null) {
                    updated.id = snapshot.getKey();
                    for (int i = 0; i < messages.size(); i++) {
                        if (messages.get(i).id.equals(updated.id)) {
                            messages.set(i, updated);
                            adapter.notifyItemChanged(i);
                            break;
                        }
                    }
                }
            }

            @Override
            public void onChildRemoved(@NonNull DataSnapshot snapshot) {}
            @Override
            public void onChildMoved(@NonNull DataSnapshot snapshot, String previousChildName) {}
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    // ⚠️ CRITICAL FIX: Ghost Typing Fix with 4.5s TTL & Ticker
    private void setupTypingAndPresence() {
        if (chat.isGroup()) {
            listenGroupTyping();
        } else if (dmPartnerUid != null) {
            listenDmPartnerPresence();
        }

        // Periodic ticker every 2.5s to clear expired typing indicators
        tickerRunnable = new Runnable() {
            @Override
            public void run() {
                updateSubtitleStatus();
                tickerHandler.postDelayed(this, 2500);
            }
        };
        tickerHandler.postDelayed(tickerRunnable, 2500);
    }

    private void listenGroupTyping() {
        FirebaseManager.getInstance().getChatRef(chat.id).child("typing").addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                updateGroupTypingStatus(snapshot);
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void updateGroupTypingStatus(DataSnapshot snapshot) {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        long now = System.currentTimeMillis();
        List<String> activeTyperUids = new ArrayList<>();

        if (snapshot != null) {
            for (DataSnapshot ds : snapshot.getChildren()) {
                if (ds.getKey() != null && !ds.getKey().equals(myUid)) {
                    Object val = ds.getValue();
                    long time = 0;
                    if (val instanceof Long) time = (Long) val;
                    else if (val instanceof Double) time = ((Double) val).longValue();

                    if (time > 0 && (now - time) >= 0 && (now - time) < 4500) {
                        activeTyperUids.add(ds.getKey());
                    }
                }
            }
        }

        if (!activeTyperUids.isEmpty()) {
            String firstUid = activeTyperUids.get(0);
            User u = FirebaseManager.getInstance().getCachedUser(firstUid);
            String name = u != null ? u.getDisplayNameOrNick() : "Участник";
            tvHeaderSubtitle.setText("✏️ " + name + " печатает...");
            tvHeaderSubtitle.setTextColor(getColor(R.color.accent_green));
        } else {
            int membersCount = chat.getMemberList().size();
            tvHeaderSubtitle.setText(membersCount > 0 ? (membersCount + " участников") : "группа");
            tvHeaderSubtitle.setTextColor(getColor(R.color.text_tertiary));
        }
    }

    private void listenDmPartnerPresence() {
        FirebaseManager.getInstance().getUserRef(dmPartnerUid).addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                dmPartnerUser = snapshot.getValue(User.class);
                if (dmPartnerUser != null) {
                    dmPartnerUser.uid = snapshot.getKey();
                    headerAvatar.setUser(dmPartnerUser.getDisplayNameOrNick(), dmPartnerUser.getEffectiveAvatar(), dmPartnerUser.online);
                }
                updateSubtitleStatus();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void updateSubtitleStatus() {
        if (chat.isGroup()) return; // handled by group listener

        if (dmPartnerUser == null) {
            tvHeaderSubtitle.setText("в сети");
            tvHeaderSubtitle.setTextColor(getColor(R.color.text_tertiary));
            return;
        }

        if (dmPartnerUser.isTypingInChat(chat.id)) {
            tvHeaderSubtitle.setText("✏️ печатает...");
            tvHeaderSubtitle.setTextColor(getColor(R.color.accent_green));
        } else if (dmPartnerUser.online) {
            tvHeaderSubtitle.setText("в сети");
            tvHeaderSubtitle.setTextColor(getColor(R.color.online_green));
        } else {
            long ls = dmPartnerUser.getLastSeenMillis();
            if (ls > 0) {
                tvHeaderSubtitle.setText("был(а) недавно");
            } else {
                tvHeaderSubtitle.setText("не в сети");
            }
            tvHeaderSubtitle.setTextColor(getColor(R.color.text_tertiary));
        }
    }

    private void showAttachMenu() {
        String[] options = {"📊 Создать опрос", "📷 Отправить фото со спойлером"};
        new AlertDialog.Builder(this)
            .setItems(options, (dialog, which) -> {
                if (which == 0) createPollDialog();
                else if (which == 1) sendDemoImageSpoiler();
            })
            .show();
    }

    private void showChatMenu() {
        String[] options = {"Очистить историю", "Информация о чате"};
        new AlertDialog.Builder(this)
            .setItems(options, (dialog, which) -> {
                if (which == 0) Toast.makeText(this, "История чата синхронизирована", Toast.LENGTH_SHORT).show();
                else if (which == 1) Toast.makeText(this, "ID: " + chat.id, Toast.LENGTH_SHORT).show();
            })
            .show();
    }

    private void createPollDialog() {
        final EditText inputQuestion = new EditText(this);
        inputQuestion.setHint("Вопрос опроса");
        inputQuestion.setPadding(32, 24, 32, 24);
        new AlertDialog.Builder(this)
            .setTitle(R.string.create_poll_title)
            .setView(inputQuestion)
            .setPositiveButton("Создать", (dialog, which) -> {
                String q = inputQuestion.getText().toString().trim();
                if (!q.isEmpty()) {
                    List<PollOption> opts = new ArrayList<>();
                    opts.add(new PollOption("0", "Да"));
                    opts.add(new PollOption("1", "Нет"));
                    opts.add(new PollOption("2", "Возможно"));
                    Poll poll = new Poll(q, opts, false, true);

                    Message msg = new Message();
                    msg.uid = FirebaseManager.getInstance().getCurrentUid();
                    msg.type = "poll";
                    msg.poll = poll;
                    FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
                }
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void sendDemoImageSpoiler() {
        Message msg = new Message();
        msg.uid = FirebaseManager.getInstance().getCurrentUid();
        msg.type = "image";
        msg.fileUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
        msg.spoiler = true;
        FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        tickerHandler.removeCallbacks(tickerRunnable);
        FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), false);
    }
}
`);

console.log('All upgrades written successfully!');
