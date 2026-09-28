package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@IgnoreExtraProperties
public class Poll implements Serializable {
    public String question;
    public List<PollOption> options = new ArrayList<>();
    public boolean multiple;
    public boolean anonymous;
    public int totalVotes;

    public Poll() {}

    public Poll(String question, List<PollOption> options, boolean multiple, boolean anonymous) {
        this.question = question;
        this.options = options;
        this.multiple = multiple;
        this.anonymous = anonymous;
    }

    public boolean hasUserVoted(String uid) {
        if (options == null || uid == null) return false;
        for (PollOption opt : options) {
            if (opt.hasVoted(uid)) return true;
        }
        return false;
    }
}
