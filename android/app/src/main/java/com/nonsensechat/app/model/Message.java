package com.nonsensechat.app.model;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.IgnoreExtraProperties;
import java.io.Serializable;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@IgnoreExtraProperties
public class Message implements Serializable {
    public String id;
    public String uid;
    public String author;
    public String senderName;
    public String text = "";
    public String type = "text"; // text, photo, image, audio, video, file, poll, system, sticker
    public String photoUrl;
    public String fileUrl;
    public String url;
    public String img;
    public String mediaUrl;
    public String fileName;
    public long fileSize;
    public String fileData;
    public String caption;
    public boolean isSpoiler;
    public boolean spoiler;
    public long duration;
    public Object at;
    public Object timestamp;
    public Object replyTo; // Can be Map or String
    public String forwardFrom;
    public boolean _deleted;
    public boolean edited;
    public Poll poll;
    public Map<String, Object> reactions = new HashMap<>();
    public Map<String, Object> readAt = new HashMap<>();

    public Message() {}

    /**
     * Bulletproof parser that never crashes on corrupted or polymorphic RTDB data.
     */
    public static Message fromSnapshot(DataSnapshot ds) {
        if (ds == null || !ds.exists()) return null;

        Message m = new Message();
        m.id = ds.getKey();

        try {
            // First try standard reflection
            Message direct = ds.getValue(Message.class);
            if (direct != null) {
                direct.id = ds.getKey();
                return direct;
            }
        } catch (Exception ignored) {
            // Fallback to manual safe extraction
        }

        try {
            m.uid = ds.child("uid").getValue(String.class);
            m.author = ds.child("author").getValue(String.class);
            m.senderName = ds.child("senderName").getValue(String.class);

            Object textVal = ds.child("text").getValue();
            m.text = textVal != null ? String.valueOf(textVal) : "";

            Object typeVal = ds.child("type").getValue();
            m.type = typeVal != null ? String.valueOf(typeVal) : "text";

            m.photoUrl = ds.child("photoUrl").getValue(String.class);
            m.fileUrl = ds.child("fileUrl").getValue(String.class);
            m.url = ds.child("url").getValue(String.class);
            m.mediaUrl = ds.child("mediaUrl").getValue(String.class);
            m.img = ds.child("img").getValue(String.class);
            m.fileData = ds.child("fileData").getValue(String.class);
            m.fileName = ds.child("fileName").getValue(String.class);
            m.caption = ds.child("caption").getValue(String.class);
            m.forwardFrom = ds.child("forwardFrom").getValue(String.class);

            Boolean del = ds.child("_deleted").getValue(Boolean.class);
            m._deleted = Boolean.TRUE.equals(del);

            Boolean ed = ds.child("edited").getValue(Boolean.class);
            m.edited = Boolean.TRUE.equals(ed);

            Boolean sp = ds.child("isSpoiler").getValue(Boolean.class);
            if (sp == null) sp = ds.child("spoiler").getValue(Boolean.class);
            m.isSpoiler = Boolean.TRUE.equals(sp);
            m.spoiler = m.isSpoiler;

            m.at = ds.child("at").getValue();
            m.timestamp = ds.child("timestamp").getValue();
            m.replyTo = ds.child("replyTo").getValue();

            // Duration
            Object durObj = ds.child("duration").getValue();
            if (durObj instanceof Number) {
                m.duration = ((Number) durObj).longValue();
            }

            // FileSize
            Object sizeObj = ds.child("fileSize").getValue();
            if (sizeObj instanceof Number) {
                m.fileSize = ((Number) sizeObj).longValue();
            }

            // Reactions safe extraction
            DataSnapshot reactDs = ds.child("reactions");
            if (reactDs.exists()) {
                m.reactions = new HashMap<>();
                for (DataSnapshot r : reactDs.getChildren()) {
                    if (r.getKey() != null && r.getValue() != null) {
                        m.reactions.put(r.getKey(), r.getValue());
                    }
                }
            }

            // Poll safe extraction
            DataSnapshot pollDs = ds.child("poll");
            if (pollDs.exists()) {
                m.poll = new Poll();
                m.poll.question = pollDs.child("question").getValue(String.class);
                m.poll.options = pollDs.child("options").getValue();
                DataSnapshot votesDs = pollDs.child("votes");
                if (votesDs.exists()) {
                    m.poll.votes = new HashMap<>();
                    for (DataSnapshot v : votesDs.getChildren()) {
                        if (v.getKey() != null && v.getValue() != null) {
                            m.poll.votes.put(v.getKey(), v.getValue());
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        return m;
    }

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
