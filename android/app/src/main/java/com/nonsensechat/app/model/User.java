package com.nonsensechat.app.model;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.IgnoreExtraProperties;
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

    public static User fromSnapshot(DataSnapshot ds) {
        if (ds == null || !ds.exists()) return null;
        User u = new User();
        u.uid = ds.getKey();
        try {
            User direct = ds.getValue(User.class);
            if (direct != null) {
                direct.uid = ds.getKey();
                return direct;
            }
        } catch (Exception ignored) {}

        try {
            u.nick = ds.child("nick").getValue(String.class);
            u.displayName = ds.child("displayName").getValue(String.class);
            u.email = ds.child("email").getValue(String.class);
            u.avatar = ds.child("avatar").getValue(String.class);
            u.photoURL = ds.child("photoURL").getValue(String.class);
            u.bio = ds.child("bio").getValue(String.class);
            u.customStatus = ds.child("customStatus").getValue(String.class);
            Boolean onl = ds.child("online").getValue(Boolean.class);
            u.online = Boolean.TRUE.equals(onl);
            Boolean ver = ds.child("verified").getValue(Boolean.class);
            u.verified = Boolean.TRUE.equals(ver);
            u.lastSeen = ds.child("lastSeen").getValue();
            u.typingIn = ds.child("typingIn").getValue(String.class);
            u.typingAt = ds.child("typingAt").getValue();
        } catch (Exception ignored) {}
        return u;
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
