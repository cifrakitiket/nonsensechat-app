package com.nonsensechat.app.model;

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
