package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import java.io.Serializable;

@IgnoreExtraProperties
public class User implements Serializable {
    public String uid;
    public String nick;
    public String displayName;
    public String email;
    public String avatar;
    public String bio;
    public boolean online;
    public long lastSeen;
    public long typingAt;
    public String customStatus;

    public User() {}

    public User(String uid, String nick, String email) {
        this.uid = uid;
        this.nick = nick;
        this.displayName = nick;
        this.email = email;
        this.online = true;
        this.lastSeen = System.currentTimeMillis();
    }

    public String getDisplayNameOrNick() {
        if (displayName != null && !displayName.trim().isEmpty()) return displayName;
        if (nick != null && !nick.trim().isEmpty()) return nick;
        if (email != null && !email.trim().isEmpty()) return email.split("@")[0];
        return "Пользователь";
    }

    public String getInitials() {
        String name = getDisplayNameOrNick();
        if (name.isEmpty()) return "?";
        String[] parts = name.trim().split("\\s+");
        if (parts.length >= 2 && !parts[0].isEmpty() && !parts[1].isEmpty()) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        }
        return name.substring(0, Math.min(2, name.length())).toUpperCase();
    }

    public boolean isTypingNow() {
        return (System.currentTimeMillis() - typingAt) < 4500;
    }
}
