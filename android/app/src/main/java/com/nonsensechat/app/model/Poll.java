package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@IgnoreExtraProperties
public class Poll implements Serializable {
    public String question;
    public Object options; // Can be List<String> or List<Map<String, Object>>
    public Map<String, Object> votes = new HashMap<>();
    public boolean multiple;
    public boolean isMultiple;
    public boolean anonymous;
    public boolean isAnonymous;
    public boolean isQuiz;
    public List<Object> correctIdxs;

    public Poll() {}

    public Poll(String question, List<String> optionStrings, boolean multiple, boolean anonymous) {
        this.question = question;
        this.options = new ArrayList<>(optionStrings);
        this.multiple = multiple;
        this.isMultiple = multiple;
        this.anonymous = anonymous;
        this.isAnonymous = anonymous;
        this.votes = new HashMap<>();
    }

    public List<String> getOptionTexts() {
        List<String> result = new ArrayList<>();
        if (options instanceof List) {
            for (Object item : (List<?>) options) {
                if (item instanceof String) {
                    result.add((String) item);
                } else if (item instanceof Map) {
                    Object t = ((Map<?, ?>) item).get("text");
                    result.add(t != null ? t.toString() : "");
                }
            }
        }
        return result;
    }

    public int getTotalVotes() {
        return votes != null ? votes.size() : 0;
    }

    public int getOptionVoteCount(int optionIndex) {
        if (votes == null) return 0;
        int count = 0;
        for (Object val : votes.values()) {
            if (val instanceof Number && ((Number) val).intValue() == optionIndex) {
                count++;
            } else if (val instanceof List) {
                for (Object subVal : (List<?>) val) {
                    if (subVal instanceof Number && ((Number) subVal).intValue() == optionIndex) {
                        count++;
                        break;
                    }
                }
            }
        }
        return count;
    }

    public int getOptionPercentage(int optionIndex) {
        int total = getTotalVotes();
        if (total == 0) return 0;
        return Math.round((getOptionVoteCount(optionIndex) * 100f) / total);
    }

    public boolean hasUserVoted(String uid) {
        return votes != null && votes.containsKey(uid);
    }

    public boolean hasUserVotedForOption(String uid, int optionIndex) {
        if (votes == null || uid == null) return false;
        Object val = votes.get(uid);
        if (val instanceof Number && ((Number) val).intValue() == optionIndex) return true;
        if (val instanceof List) {
            for (Object subVal : (List<?>) val) {
                if (subVal instanceof Number && ((Number) subVal).intValue() == optionIndex) return true;
            }
        }
        return false;
    }
}
