package com.nonsensechat.app.model;

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
