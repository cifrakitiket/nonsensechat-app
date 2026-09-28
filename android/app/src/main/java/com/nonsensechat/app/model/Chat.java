package com.nonsensechat.app.model;

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
