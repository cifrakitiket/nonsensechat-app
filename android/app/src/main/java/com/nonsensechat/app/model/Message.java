package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

@IgnoreExtraProperties
public class Message implements Serializable {
    public String id;
    public String uid;
    public String author;
    public String senderName;
    public String text;
    public String type = "text"; // text, photo, audio, video, file, poll, system, sticker
    public String photoUrl;
    public String fileUrl;
    public String url;
    public String img;
    public String mediaUrl;
    public String fileName;
    public long fileSize;
    public String fileData; // base64 payload if any
    public String caption;
    public boolean isSpoiler;
    public boolean spoiler;
    public long duration;
    public Object at;
    public Object timestamp;
    public Object replyTo; // Can be Map { id, author, text } or String
    public String forwardFrom;
    public boolean _deleted;
    public boolean edited;
    public Poll poll;
    public Map<String, Object> reactions = new HashMap<>();
    public Map<String, Object> readAt = new HashMap<>();

    public Message() {}

    public boolean isOutgoing(String currentUid) {
        return uid != null && uid.equals(currentUid);
    }

    public String getSenderDisplayName() {
        if (author != null && !author.trim().isEmpty()) return author;
        if (senderName != null && !senderName.trim().isEmpty()) return senderName;
        return "Пользователь";
    }

    public String getEffectiveMediaUrl() {
        if (photoUrl != null && !photoUrl.trim().isEmpty()) return photoUrl;
        if (fileUrl != null && !fileUrl.trim().isEmpty()) return fileUrl;
        if (mediaUrl != null && !mediaUrl.trim().isEmpty()) return mediaUrl;
        if (url != null && !url.trim().isEmpty()) return url;
        if (img != null && !img.trim().isEmpty()) return img;
        if (fileData != null && !fileData.trim().isEmpty()) {
            if (fileData.startsWith("data:")) return fileData;
            return "data:image/jpeg;base64," + fileData;
        }
        return null;
    }

    public long getTimestampMillis() {
        Object t = at != null ? at : timestamp;
        if (t instanceof Long) return (Long) t;
        if (t instanceof Double) return ((Double) t).longValue();
        if (t instanceof Map) {
            Object s = ((Map<?, ?>) t).get("seconds");
            if (s instanceof Long) return (Long) s * 1000L;
            if (s instanceof Double) return ((Double) s).longValue() * 1000L;
        }
        return System.currentTimeMillis();
    }

    public boolean isSpoilerMedia() {
        return isSpoiler || spoiler;
    }

    // Helper to get reply author and text safely
    public String getReplyAuthor() {
        if (replyTo instanceof Map) {
            Object a = ((Map<?, ?>) replyTo).get("author");
            return a != null ? a.toString() : "";
        }
        return "";
    }

    public String getReplyText() {
        if (replyTo instanceof Map) {
            Object t = ((Map<?, ?>) replyTo).get("text");
            return t != null ? t.toString() : "";
        }
        if (replyTo instanceof String) {
            return (String) replyTo;
        }
        return "";
    }

    public String getReplyId() {
        if (replyTo instanceof Map) {
            Object i = ((Map<?, ?>) replyTo).get("id");
            return i != null ? i.toString() : "";
        }
        return "";
    }
}
