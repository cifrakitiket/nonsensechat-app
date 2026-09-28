package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import java.io.Serializable;
import java.util.Map;

@IgnoreExtraProperties
public class Message implements Serializable {
    public String id;
    public String uid;
    public String senderName;
    public String text;
    public String type = "text"; // text, image, audio, video, poll, system
    public String fileUrl;
    public Object at; // Server timestamp or Long
    public boolean spoiler;
    public long duration;
    public String replyTo;
    public Poll poll;
    public Map<String, Map<String, Boolean>> reactions;

    public Message() {}

    public boolean isOutgoing(String currentUid) {
        return uid != null && uid.equals(currentUid);
    }

    public long getTimestampMillis() {
        if (at instanceof Long) {
            return (Long) at;
        } else if (at instanceof Double) {
            return ((Double) at).longValue();
        }
        return System.currentTimeMillis();
    }
}
