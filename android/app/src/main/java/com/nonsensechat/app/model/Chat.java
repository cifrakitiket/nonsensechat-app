package com.nonsensechat.app.model;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.IgnoreExtraProperties;
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

    public static Chat fromSnapshot(DataSnapshot ds) {
        if (ds == null || !ds.exists()) return null;
        Chat c = new Chat();
        c.id = ds.getKey();
        try {
            Chat direct = ds.getValue(Chat.class);
            if (direct != null) {
                direct.id = ds.getKey();
                return direct;
            }
        } catch (Exception ignored) {}

        try {
            c.title = ds.child("title").getValue(String.class);
            c.name = ds.child("name").getValue(String.class);
            c.type = ds.child("type").getValue(String.class);
            c.avatar = ds.child("avatar").getValue(String.class);
            c.lastMsg = ds.child("lastMsg").getValue(String.class);
            c.lastMessage = ds.child("lastMessage").getValue(String.class);
            c.lastMsgAt = ds.child("lastMsgAt").getValue();
            c.lastAt = ds.child("lastAt").getValue();
            c.lastMsgUid = ds.child("lastMsgUid").getValue(String.class);
            c.createdAt = ds.child("createdAt").getValue();
            c.creatorUid = ds.child("creatorUid").getValue(String.class);
            c.members = ds.child("members").getValue();
            Boolean pin = ds.child("pinned").getValue(Boolean.class);
            c.pinned = Boolean.TRUE.equals(pin);
        } catch (Exception ignored) {}
        return c;
    }

    public boolean isGroup() {
        return "group".equalsIgnoreCase(type) || "channel".equalsIgnoreCase(type);
    }

    public boolean isDirect() {
        return "dm".equalsIgnoreCase(type) || (!isGroup() && !isFav());
    }

    public boolean isFav() {
        return "fav".equalsIgnoreCase(type);
    }

    public boolean isMember(String uid) {
        if (uid == null) return false;
        if (isFav()) return id != null && id.contains(uid);
        return getMemberList().contains(uid);
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

    public long getLastActivityMillis() {
        long ts = getLastMessageTimestamp();
        if (ts > 0) return ts;
        if (createdAt instanceof Long) return (Long) createdAt;
        if (createdAt instanceof Double) return ((Double) createdAt).longValue();
        return 0;
    }
}
