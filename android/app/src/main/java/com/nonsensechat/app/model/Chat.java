package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@IgnoreExtraProperties
public class Chat implements Serializable {
    public String id;
    public String title;
    public String name;
    public String type = "direct"; // direct, group, channel
    public String avatar;
    public String lastMessage;
    public Object lastAt;
    public Object createdAt;
    public String creatorUid;
    public Object members; // Can be List<String> or Map<String, Boolean>
    public int unreadCount;
    public boolean pinned;

    public Chat() {}

    public boolean isGroup() {
        return "group".equalsIgnoreCase(type) || "channel".equalsIgnoreCase(type);
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

    public String getEffectiveTitle(String currentUid) {
        if (title != null && !title.trim().isEmpty()) return title;
        if (name != null && !name.trim().isEmpty()) return name;
        return isGroup() ? "Групповой чат" : "Личные сообщения";
    }
}
