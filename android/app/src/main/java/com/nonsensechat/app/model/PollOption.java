package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

@IgnoreExtraProperties
public class PollOption implements Serializable {
    public String id;
    public String text;
    public int votes;
    public Map<String, Boolean> voters = new HashMap<>();

    public PollOption() {}

    public PollOption(String id, String text) {
        this.id = id;
        this.text = text;
        this.votes = 0;
    }

    public boolean hasVoted(String uid) {
        return voters != null && Boolean.TRUE.equals(voters.get(uid));
    }

    public int getPercentage(int total) {
        if (total <= 0 || votes <= 0) return 0;
        return (int) Math.round(((double) votes / total) * 100);
    }
}
