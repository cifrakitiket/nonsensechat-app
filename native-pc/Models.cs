using System;
using System.Collections.Generic;

namespace NonsenseChat.Native {
    public class User {
        public string uid { get; set; }
        public string nick { get; set; }
        public string displayName { get; set; }
        public string email { get; set; }
        public string avatar { get; set; }
        public string bio { get; set; }
        public bool online { get; set; }
        public long lastSeen { get; set; }
        public long typingAt { get; set; }
        public string customStatus { get; set; }

        public User() {
            online = true;
            lastSeen = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }

        public User(string uid, string nick, string email) : this() {
            this.uid = uid;
            this.nick = nick;
            this.displayName = nick;
            this.email = email;
        }

        public string GetDisplayNameOrNick() {
            if (!string.IsNullOrEmpty(displayName) && displayName.Trim().Length > 0) return displayName.Trim();
            if (!string.IsNullOrEmpty(nick) && nick.Trim().Length > 0) return nick.Trim();
            if (!string.IsNullOrEmpty(email) && email.Contains("@")) return email.Split('@')[0];
            return "Пользователь";
        }

        public string GetInitials() {
            string name = GetDisplayNameOrNick();
            if (string.IsNullOrEmpty(name)) return "?";
            string[] parts = name.Trim().Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2 && parts[0].Length > 0 && parts[1].Length > 0) {
                return (parts[0].Substring(0, 1) + parts[1].Substring(0, 1)).ToUpper();
            }
            return name.Substring(0, Math.Min(2, name.Length)).ToUpper();
        }

        public bool IsTypingNow() {
            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            return (now - typingAt) < 4500;
        }
    }

    public class Chat {
        public string id { get; set; }
        public string title { get; set; }
        public string name { get; set; }
        public string desc { get; set; }
        public string type { get; set; } // "dm", "group", "channel", "fav", "ai_hub"
        public string avatar { get; set; }
        public string lastMessage { get; set; }
        public string lastMsg { get; set; }
        public long lastAt { get; set; }
        public long lastMsgAt { get; set; }
        public string lastMsgUid { get; set; }
        public string lastMsgAuthor { get; set; }
        public long createdAt { get; set; }
        public string creatorUid { get; set; }
        public string admin { get; set; }
        public List<string> members { get; set; }
        public int unreadCount { get; set; }
        public bool pinned { get; set; }

        // Resolved title and avatar for current user view
        public string ResolvedTitle { get; set; }
        public string ResolvedAvatar { get; set; }

        public Chat() {
            type = "group";
            members = new List<string>();
            lastAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            lastMsgAt = lastAt;
            createdAt = lastAt;
        }

        public bool IsGroup() {
            return string.Equals(type, "group", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(type, "channel", StringComparison.OrdinalIgnoreCase);
        }

        public string GetLatestMessageText() {
            if (!string.IsNullOrEmpty(lastMsg)) return lastMsg;
            if (!string.IsNullOrEmpty(lastMessage)) return lastMessage;
            return "Нет сообщений";
        }

        public long GetLatestTime() {
            if (lastMsgAt > 0) return lastMsgAt;
            if (lastAt > 0) return lastAt;
            return createdAt;
        }

        public string GetEffectiveTitle(string currentUid, Dictionary<string, User> usersCache = null) {
            if (!string.IsNullOrEmpty(ResolvedTitle)) return ResolvedTitle;

            if (type == "fav") return "⭐ Избранное";
            if (type == "ai_hub") return "🤖 ИИ Хаб";

            if (type == "dm") {
                if (members != null && usersCache != null) {
                    foreach (var m in members) {
                        if (!string.Equals(m, currentUid, StringComparison.OrdinalIgnoreCase)) {
                            if (usersCache.ContainsKey(m)) {
                                return usersCache[m].GetDisplayNameOrNick();
                            }
                        }
                    }
                }
                return "Личные сообщения";
            }

            if (!string.IsNullOrEmpty(name) && name.Trim().Length > 0) return name.Trim();
            if (!string.IsNullOrEmpty(title) && title.Trim().Length > 0) return title.Trim();
            return IsGroup() ? "Групповой чат" : "Чат";
        }

        public string GetInitials(string currentUid, Dictionary<string, User> usersCache = null) {
            string t = GetEffectiveTitle(currentUid, usersCache);
            if (string.IsNullOrEmpty(t)) return "NC";
            string clean = t.Replace("⭐", "").Replace("🤖", "").Trim();
            string[] parts = clean.Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2 && parts[0].Length > 0 && parts[1].Length > 0) {
                return (parts[0].Substring(0, 1) + parts[1].Substring(0, 1)).ToUpper();
            }
            return clean.Substring(0, Math.Min(2, clean.Length)).ToUpper();
        }

        public string GetFormattedTime() {
            long t = GetLatestTime();
            if (t <= 0) return "";
            DateTime dt = DateTimeOffset.FromUnixTimeMilliseconds(t).LocalDateTime;
            DateTime today = DateTime.Today;
            if (dt.Date == today) {
                return dt.ToString("HH:mm");
            } else if (dt.Date == today.AddDays(-1)) {
                return "Вчера";
            } else {
                return dt.ToString("dd.MM");
            }
        }
    }

    public class Message {
        public string id { get; set; }
        public string uid { get; set; }
        public string author { get; set; }
        public string senderName { get; set; }
        public string text { get; set; }
        public string type { get; set; } // "text", "image", "audio", "video", "poll", "system"
        public string fileUrl { get; set; }
        public long at { get; set; }
        public bool spoiler { get; set; }
        public long duration { get; set; }
        public string replyTo { get; set; }
        public Poll poll { get; set; }
        public Dictionary<string, List<string>> reactions { get; set; } // emoji -> list of uids

        public Message() {
            type = "text";
            at = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            reactions = new Dictionary<string, List<string>>();
        }

        public string GetEffectiveAuthor() {
            if (!string.IsNullOrEmpty(author)) return author;
            if (!string.IsNullOrEmpty(senderName)) return senderName;
            return "Пользователь";
        }

        public bool IsOutgoing(string currentUid) {
            return !string.IsNullOrEmpty(uid) && string.Equals(uid, currentUid, StringComparison.OrdinalIgnoreCase);
        }

        public string GetFormattedTime() {
            if (at <= 0) return "";
            DateTime dt = DateTimeOffset.FromUnixTimeMilliseconds(at).LocalDateTime;
            return dt.ToString("HH:mm");
        }
    }

    public class Poll {
        public string question { get; set; }
        public List<PollOption> options { get; set; }
        public bool multiple { get; set; }
        public bool anonymous { get; set; }
        public int totalVotes { get; set; }

        public Poll() {
            options = new List<PollOption>();
        }

        public bool HasUserVoted(string uid) {
            if (options == null || string.IsNullOrEmpty(uid)) return false;
            foreach (var opt in options) {
                if (opt.HasVoted(uid)) return true;
            }
            return false;
        }

        public void RecalculateTotal() {
            int total = 0;
            if (options != null) {
                foreach (var opt in options) {
                    total += opt.votes;
                }
            }
            totalVotes = total;
        }
    }

    public class PollOption {
        public string id { get; set; }
        public string text { get; set; }
        public int votes { get; set; }
        public List<string> voters { get; set; }

        public PollOption() {
            voters = new List<string>();
        }

        public PollOption(string id, string text) : this() {
            this.id = id;
            this.text = text;
        }

        public bool HasVoted(string uid) {
            return voters != null && !string.IsNullOrEmpty(uid) && voters.Contains(uid);
        }

        public int GetPercentage(int total) {
            if (total <= 0 || votes <= 0) return 0;
            return (int)Math.Round(((double)votes / total) * 100);
        }
    }
}
