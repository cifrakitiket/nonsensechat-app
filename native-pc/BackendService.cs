using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace NonsenseChat.Native {
    public class BackendService {
        private static BackendService _instance;
        public static BackendService Instance {
            get {
                if (_instance == null) _instance = new BackendService();
                return _instance;
            }
        }

        private const string FirebaseApiKey = "AIzaSyCVH8_UhxO5hAj0ZBlA_lRw3B0hnN1zEOc";
        private const string FirebaseDbUrl = "https://nonsensechattm-e5d18-default-rtdb.firebaseio.com";

        private HttpClient _http;
        private JavaScriptSerializer _json;
        private string _sessionFilePath;
        private Timer _syncTimer;
        private bool _isSyncing = false;

        public User CurrentUser { get; private set; }
        public string IdToken { get; private set; }
        public string ActiveChatId { get; set; }

        public event Action<Message> OnMessageReceived;
        public event Action<Chat> OnChatUpdated;
        public event Action OnChatsReloaded;
        public event Action<string, bool> OnUserTyping;
        public event Action<string> OnStatusChanged;

        private List<Chat> _chats = new List<Chat>();
        private Dictionary<string, List<Message>> _messages = new Dictionary<string, List<Message>>();
        private Dictionary<string, User> _usersCache = new Dictionary<string, User>();
        private HashSet<string> _knownMessageIds = new HashSet<string>();

        public Dictionary<string, User> UsersCache {
            get { return _usersCache; }
        }

        public BackendService() {
            _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            _json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };

            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string nonsenseDir = Path.Combine(appData, "NonsenseChat");
            Directory.CreateDirectory(nonsenseDir);
            _sessionFilePath = Path.Combine(nonsenseDir, "session.json");

            LoadSession();

            // Background Realtime Synchronization with Firebase RTDB
            _syncTimer = new Timer(async (s) => await SyncFromFirebaseAsync(), null, 500, 2000);
        }

        private void LoadSession() {
            try {
                if (File.Exists(_sessionFilePath)) {
                    string json = File.ReadAllText(_sessionFilePath, Encoding.UTF8);
                    var dict = _json.Deserialize<Dictionary<string, object>>(json);
                    if (dict != null && dict.ContainsKey("uid") && !string.IsNullOrEmpty(dict["uid"].ToString())) {
                        string uid = dict["uid"].ToString();
                        // Ignore any legacy guest session
                        if (uid.StartsWith("u_guest") || uid == "u_me") {
                            CurrentUser = null;
                            IdToken = null;
                            return;
                        }

                        CurrentUser = new User {
                            uid = uid,
                            email = dict.ContainsKey("email") ? dict["email"].ToString() : "",
                            displayName = dict.ContainsKey("displayName") ? dict["displayName"].ToString() : "",
                            nick = dict.ContainsKey("nick") ? dict["nick"].ToString() : "",
                            online = true
                        };
                        if (dict.ContainsKey("idToken")) IdToken = dict["idToken"].ToString();
                    }
                }
            } catch {
                CurrentUser = null;
                IdToken = null;
            }
        }

        public void SaveSession() {
            try {
                if (CurrentUser == null) {
                    if (File.Exists(_sessionFilePath)) File.Delete(_sessionFilePath);
                    return;
                }

                var dict = new Dictionary<string, object> {
                    { "uid", CurrentUser.uid ?? "" },
                    { "email", CurrentUser.email ?? "" },
                    { "displayName", CurrentUser.displayName ?? "" },
                    { "nick", CurrentUser.nick ?? "" },
                    { "idToken", IdToken ?? "" },
                    { "mode", "Firebase" }
                };
                File.WriteAllText(_sessionFilePath, _json.Serialize(dict), Encoding.UTF8);
            } catch { }
        }

        public void SignOut() {
            CurrentUser = null;
            IdToken = null;
            _chats.Clear();
            _messages.Clear();
            _knownMessageIds.Clear();
            SaveSession();
            if (OnStatusChanged != null) OnStatusChanged("Не авторизован");
        }

        public async Task<bool> SignInFirebaseAsync(string email, string password) {
            try {
                string url = string.Format("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={0}", FirebaseApiKey);
                var payload = new Dictionary<string, object> {
                    { "email", email },
                    { "password", password },
                    { "returnSecureToken", true }
                };
                var content = new StringContent(_json.Serialize(payload), Encoding.UTF8, "application/json");
                var resp = await _http.PostAsync(url, content);
                if (resp.IsSuccessStatusCode) {
                    string resStr = await resp.Content.ReadAsStringAsync();
                    var dict = _json.Deserialize<Dictionary<string, object>>(resStr);
                    IdToken = dict["idToken"].ToString();
                    string localId = dict["localId"].ToString();

                    CurrentUser = new User(localId, email.Split('@')[0], email) {
                        displayName = email.Split('@')[0],
                        online = true
                    };

                    SaveSession();
                    if (OnStatusChanged != null) OnStatusChanged("Подключено: " + CurrentUser.email);

                    // Fetch user's profile from Firebase
                    await FetchUserProfileAsync(localId);
                    await SyncFromFirebaseAsync(true);
                    return true;
                }
            } catch { }
            return false;
        }

        public async Task<bool> SignUpFirebaseAsync(string email, string password, string displayName) {
            try {
                string url = string.Format("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={0}", FirebaseApiKey);
                var payload = new Dictionary<string, object> {
                    { "email", email },
                    { "password", password },
                    { "returnSecureToken", true }
                };
                var content = new StringContent(_json.Serialize(payload), Encoding.UTF8, "application/json");
                var resp = await _http.PostAsync(url, content);
                if (resp.IsSuccessStatusCode) {
                    string resStr = await resp.Content.ReadAsStringAsync();
                    var dict = _json.Deserialize<Dictionary<string, object>>(resStr);
                    IdToken = dict["idToken"].ToString();
                    string localId = dict["localId"].ToString();

                    CurrentUser = new User(localId, displayName, email) {
                        displayName = displayName,
                        online = true
                    };

                    // Save user profile to RTDB users/{localId}
                    try {
                        string userUrl = string.Format("{0}/users/{1}.json", FirebaseDbUrl, localId);
                        var userObj = new Dictionary<string, object> {
                            { "uid", localId },
                            { "nick", displayName },
                            { "nickLower", displayName.ToLower() },
                            { "email", email },
                            { "online", true },
                            { "lastSeen", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
                        };
                        var uContent = new StringContent(_json.Serialize(userObj), Encoding.UTF8, "application/json");
                        await _http.PutAsync(userUrl, uContent);
                    } catch { }

                    SaveSession();
                    if (OnStatusChanged != null) OnStatusChanged("Подключено: " + CurrentUser.email);

                    await SyncFromFirebaseAsync(true);
                    return true;
                }
            } catch { }
            return false;
        }

        private async Task FetchUserProfileAsync(string uid) {
            try {
                string url = string.Format("{0}/users/{1}.json", FirebaseDbUrl, uid);
                var resp = await _http.GetAsync(url);
                if (resp.IsSuccessStatusCode) {
                    string resStr = await resp.Content.ReadAsStringAsync();
                    if (!string.IsNullOrEmpty(resStr) && resStr != "null") {
                        var dict = _json.Deserialize<Dictionary<string, object>>(resStr);
                        if (dict != null) {
                            if (dict.ContainsKey("nick")) CurrentUser.nick = dict["nick"].ToString();
                            if (dict.ContainsKey("displayName")) CurrentUser.displayName = dict["displayName"].ToString();
                            if (dict.ContainsKey("avatar")) CurrentUser.avatar = dict["avatar"].ToString();
                            if (dict.ContainsKey("bio")) CurrentUser.bio = dict["bio"].ToString();
                            SaveSession();
                        }
                    }
                }
            } catch { }
        }

        public async Task SyncFromFirebaseAsync(bool force = false) {
            if (_isSyncing && !force) return;
            if (CurrentUser == null || string.IsNullOrEmpty(CurrentUser.uid)) return;

            _isSyncing = true;
            try {
                // 1. Fetch Users Cache
                await RefreshUsersCacheAsync();

                // 2. Fetch Real Chats from Firebase RTDB
                string chatsUrl = string.Format("{0}/chats.json", FirebaseDbUrl);
                var chatsResp = await _http.GetAsync(chatsUrl);
                if (chatsResp.IsSuccessStatusCode) {
                    string json = await chatsResp.Content.ReadAsStringAsync();
                    if (!string.IsNullOrEmpty(json) && json != "null") {
                        var rawChats = _json.Deserialize<Dictionary<string, object>>(json);
                        var newChatList = new List<Chat>();

                        foreach (var kvp in rawChats) {
                            string chatId = kvp.Key;
                            var chatDict = kvp.Value as Dictionary<string, object>;
                            if (chatDict == null) continue;

                            var chat = ParseChat(chatId, chatDict);

                            // Filter: show chats where user is member or public group or creator
                            if (IsChatRelevantToUser(chat, CurrentUser.uid)) {
                                chat.ResolvedTitle = chat.GetEffectiveTitle(CurrentUser.uid, _usersCache);
                                newChatList.Add(chat);
                            }
                        }

                        // Sort by last message timestamp descending
                        newChatList.Sort((a, b) => b.GetLatestTime().CompareTo(a.GetLatestTime()));

                        _chats = newChatList;
                        if (OnChatsReloaded != null) OnChatsReloaded();
                    }
                }

                // 3. If there is an active chat, fetch its real messages
                if (!string.IsNullOrEmpty(ActiveChatId)) {
                    await FetchChatMessagesAsync(ActiveChatId);
                }
            } catch { }
            finally {
                _isSyncing = false;
            }
        }

        private async Task RefreshUsersCacheAsync() {
            try {
                string usersUrl = string.Format("{0}/users.json", FirebaseDbUrl);
                var resp = await _http.GetAsync(usersUrl);
                if (resp.IsSuccessStatusCode) {
                    string json = await resp.Content.ReadAsStringAsync();
                    if (!string.IsNullOrEmpty(json) && json != "null") {
                        var rawUsers = _json.Deserialize<Dictionary<string, object>>(json);
                        foreach (var kvp in rawUsers) {
                            string uid = kvp.Key;
                            var dict = kvp.Value as Dictionary<string, object>;
                            if (dict == null) continue;

                            var u = new User { uid = uid };
                            if (dict.ContainsKey("nick")) u.nick = dict["nick"].ToString();
                            if (dict.ContainsKey("displayName")) u.displayName = dict["displayName"].ToString();
                            if (dict.ContainsKey("email")) u.email = dict["email"].ToString();
                            if (dict.ContainsKey("avatar")) u.avatar = dict["avatar"].ToString();
                            if (dict.ContainsKey("online")) {
                                bool on;
                                if (bool.TryParse(dict["online"].ToString(), out on)) u.online = on;
                            }
                            _usersCache[uid] = u;
                        }
                    }
                }
            } catch { }
        }

        private bool IsChatRelevantToUser(Chat chat, string currentUid) {
            if (chat.id == "fav_" + currentUid) return true;
            if (chat.id == "aihub_" + currentUid) return true;
            if (chat.members != null && chat.members.Contains(currentUid)) return true;
            if (chat.creatorUid == currentUid || chat.admin == currentUid) return true;
            if (chat.id.Contains(currentUid)) return true;
            // Public groups or channels
            if (chat.type == "group" || chat.type == "channel") return true;
            return false;
        }

        private Chat ParseChat(string id, Dictionary<string, object> dict) {
            var chat = new Chat { id = id };
            if (dict.ContainsKey("name") && dict["name"] != null) chat.name = dict["name"].ToString();
            if (dict.ContainsKey("title") && dict["title"] != null) chat.title = dict["title"].ToString();
            if (dict.ContainsKey("desc") && dict["desc"] != null) chat.desc = dict["desc"].ToString();
            if (dict.ContainsKey("type") && dict["type"] != null) chat.type = dict["type"].ToString();
            if (dict.ContainsKey("avatar") && dict["avatar"] != null) chat.avatar = dict["avatar"].ToString();
            if (dict.ContainsKey("lastMsg") && dict["lastMsg"] != null) chat.lastMsg = dict["lastMsg"].ToString();
            if (dict.ContainsKey("lastMessage") && dict["lastMessage"] != null) chat.lastMessage = dict["lastMessage"].ToString();
            if (dict.ContainsKey("lastMsgAuthor") && dict["lastMsgAuthor"] != null) chat.lastMsgAuthor = dict["lastMsgAuthor"].ToString();
            if (dict.ContainsKey("lastMsgUid") && dict["lastMsgUid"] != null) chat.lastMsgUid = dict["lastMsgUid"].ToString();
            if (dict.ContainsKey("admin") && dict["admin"] != null) chat.admin = dict["admin"].ToString();
            if (dict.ContainsKey("createdBy") && dict["createdBy"] != null) chat.creatorUid = dict["createdBy"].ToString();

            if (dict.ContainsKey("lastMsgAt") && dict["lastMsgAt"] != null) {
                long t;
                if (long.TryParse(dict["lastMsgAt"].ToString(), out t)) chat.lastMsgAt = t;
            }
            if (dict.ContainsKey("lastAt") && dict["lastAt"] != null) {
                long t;
                if (long.TryParse(dict["lastAt"].ToString(), out t)) chat.lastAt = t;
            }
            if (dict.ContainsKey("createdAt") && dict["createdAt"] != null) {
                long t;
                if (long.TryParse(dict["createdAt"].ToString(), out t)) chat.createdAt = t;
            }

            // Members parsing (can be Array or Object)
            if (dict.ContainsKey("members") && dict["members"] != null) {
                var memList = dict["members"] as System.Collections.ArrayList;
                if (memList != null) {
                    foreach (var item in memList) {
                        if (item != null) chat.members.Add(item.ToString());
                    }
                } else {
                    var memDict = dict["members"] as Dictionary<string, object>;
                    if (memDict != null) {
                        foreach (var kvp in memDict) chat.members.Add(kvp.Key);
                    }
                }
            }

            return chat;
        }

        public async Task<List<Message>> FetchChatMessagesAsync(string chatId) {
            if (string.IsNullOrEmpty(chatId)) return new List<Message>();

            try {
                string url = string.Format("{0}/messages/{1}.json", FirebaseDbUrl, chatId);
                var resp = await _http.GetAsync(url);
                if (resp.IsSuccessStatusCode) {
                    string json = await resp.Content.ReadAsStringAsync();
                    if (!string.IsNullOrEmpty(json) && json != "null") {
                        var rawMsgs = _json.Deserialize<Dictionary<string, object>>(json);
                        var msgList = new List<Message>();
                        bool hasNewMessages = false;

                        foreach (var kvp in rawMsgs) {
                            string msgId = kvp.Key;
                            var dict = kvp.Value as Dictionary<string, object>;
                            if (dict == null) continue;

                            var msg = ParseMessage(msgId, dict);
                            msgList.Add(msg);

                            if (!_knownMessageIds.Contains(msgId)) {
                                _knownMessageIds.Add(msgId);
                                hasNewMessages = true;
                            }
                        }

                        // Sort by timestamp ascending
                        msgList.Sort((a, b) => a.at.CompareTo(b.at));
                        _messages[chatId] = msgList;

                        if (hasNewMessages && msgList.Count > 0) {
                            var latest = msgList[msgList.Count - 1];
                            if (OnMessageReceived != null) OnMessageReceived(latest);
                        }

                        return msgList;
                    }
                }
            } catch { }

            if (!_messages.ContainsKey(chatId)) _messages[chatId] = new List<Message>();
            return _messages[chatId];
        }

        private Message ParseMessage(string id, Dictionary<string, object> dict) {
            var msg = new Message { id = id };
            if (dict.ContainsKey("uid") && dict["uid"] != null) msg.uid = dict["uid"].ToString();
            if (dict.ContainsKey("author") && dict["author"] != null) msg.author = dict["author"].ToString();
            if (dict.ContainsKey("senderName") && dict["senderName"] != null) msg.senderName = dict["senderName"].ToString();
            if (dict.ContainsKey("text") && dict["text"] != null) msg.text = dict["text"].ToString();
            if (dict.ContainsKey("type") && dict["type"] != null) msg.type = dict["type"].ToString();
            if (dict.ContainsKey("fileUrl") && dict["fileUrl"] != null) msg.fileUrl = dict["fileUrl"].ToString();
            if (dict.ContainsKey("url") && dict["url"] != null) msg.fileUrl = dict["url"].ToString();

            if (dict.ContainsKey("spoiler") && dict["spoiler"] != null) {
                bool sp;
                if (bool.TryParse(dict["spoiler"].ToString(), out sp)) msg.spoiler = sp;
            }

            if (dict.ContainsKey("at") && dict["at"] != null) {
                long t;
                if (long.TryParse(dict["at"].ToString(), out t)) msg.at = t;
            }

            if (dict.ContainsKey("duration") && dict["duration"] != null) {
                long d;
                if (long.TryParse(dict["duration"].ToString(), out d)) msg.duration = d;
            }

            // Poll parsing
            if (dict.ContainsKey("poll") && dict["poll"] != null) {
                var pDict = dict["poll"] as Dictionary<string, object>;
                if (pDict != null) {
                    var poll = new Poll();
                    if (pDict.ContainsKey("question")) poll.question = pDict["question"].ToString();
                    if (pDict.ContainsKey("isMultiple")) {
                        bool mul;
                        if (bool.TryParse(pDict["isMultiple"].ToString(), out mul)) poll.multiple = mul;
                    }
                    if (pDict.ContainsKey("isAnonymous")) {
                        bool anon;
                        if (bool.TryParse(pDict["isAnonymous"].ToString(), out anon)) poll.anonymous = anon;
                    }

                    // Options can be list of strings or list of objects
                    if (pDict.ContainsKey("options") && pDict["options"] != null) {
                        var optList = pDict["options"] as System.Collections.ArrayList;
                        if (optList != null) {
                            for (int i = 0; i < optList.Count; i++) {
                                var o = optList[i];
                                if (o is string) {
                                    poll.options.Add(new PollOption("opt_" + i, o.ToString()));
                                } else if (o is Dictionary<string, object>) {
                                    var od = o as Dictionary<string, object>;
                                    string text = od.ContainsKey("text") ? od["text"].ToString() : "";
                                    string optId = od.ContainsKey("id") ? od["id"].ToString() : ("opt_" + i);
                                    poll.options.Add(new PollOption(optId, text));
                                }
                            }
                        }
                    }

                    // Votes dictionary
                    if (pDict.ContainsKey("votes") && pDict["votes"] != null) {
                        var vDict = pDict["votes"] as Dictionary<string, object>;
                        if (vDict != null) {
                            foreach (var vKvp in vDict) {
                                string voterUid = vKvp.Key;
                                int votedIdx;
                                if (int.TryParse(vKvp.Value.ToString(), out votedIdx) && votedIdx >= 0 && votedIdx < poll.options.Count) {
                                    poll.options[votedIdx].voters.Add(voterUid);
                                    poll.options[votedIdx].votes++;
                                }
                            }
                        }
                    }
                    poll.RecalculateTotal();
                    msg.poll = poll;
                }
            }

            // Reactions parsing
            if (dict.ContainsKey("reactions") && dict["reactions"] != null) {
                var rDict = dict["reactions"] as Dictionary<string, object>;
                if (rDict != null) {
                    foreach (var rKvp in rDict) {
                        // Can be uid -> emoji
                        string key = rKvp.Key;
                        string val = rKvp.Value != null ? rKvp.Value.ToString() : "";
                        if (!string.IsNullOrEmpty(val)) {
                            if (!msg.reactions.ContainsKey(val)) msg.reactions[val] = new List<string>();
                            msg.reactions[val].Add(key);
                        }
                    }
                }
            }

            return msg;
        }

        public List<Chat> GetChats() {
            return new List<Chat>(_chats);
        }

        public List<Message> GetMessages(string chatId) {
            if (string.IsNullOrEmpty(chatId)) return new List<Message>();
            if (!_messages.ContainsKey(chatId)) _messages[chatId] = new List<Message>();
            return new List<Message>(_messages[chatId]);
        }

        public async Task<Message> SendMessageAsync(string chatId, string text, bool isSpoiler = false, string type = "text", string fileUrl = null, Poll poll = null) {
            if (string.IsNullOrEmpty(chatId) || CurrentUser == null) return null;

            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            string authorName = CurrentUser.GetDisplayNameOrNick();

            var payload = new Dictionary<string, object> {
                { "uid", CurrentUser.uid },
                { "author", authorName },
                { "text", text ?? "" },
                { "type", type },
                { "at", now },
                { "spoiler", isSpoiler }
            };

            if (!string.IsNullOrEmpty(fileUrl)) payload["fileUrl"] = fileUrl;

            // If poll
            if (poll != null) {
                var pollOpts = new List<string>();
                foreach (var opt in poll.options) pollOpts.Add(opt.text);

                var pollDict = new Dictionary<string, object> {
                    { "question", poll.question },
                    { "options", pollOpts },
                    { "isMultiple", poll.multiple },
                    { "isAnonymous", poll.anonymous },
                    { "votes", new Dictionary<string, object>() }
                };
                payload["poll"] = pollDict;
            }

            // 1. Post to Firebase /messages/{chatId}.json
            string msgUrl = string.Format("{0}/messages/{1}.json", FirebaseDbUrl, chatId);
            var content = new StringContent(_json.Serialize(payload), Encoding.UTF8, "application/json");
            var resp = await _http.PostAsync(msgUrl, content);

            string messageId = "m_" + Guid.NewGuid().ToString().Substring(0, 8);
            if (resp.IsSuccessStatusCode) {
                string resStr = await resp.Content.ReadAsStringAsync();
                var resDict = _json.Deserialize<Dictionary<string, object>>(resStr);
                if (resDict != null && resDict.ContainsKey("name")) {
                    messageId = resDict["name"].ToString();
                }
            }

            var msg = new Message {
                id = messageId,
                uid = CurrentUser.uid,
                author = authorName,
                senderName = authorName,
                text = text,
                type = type,
                fileUrl = fileUrl,
                spoiler = isSpoiler,
                poll = poll,
                at = now
            };

            if (!_messages.ContainsKey(chatId)) _messages[chatId] = new List<Message>();
            _messages[chatId].Add(msg);
            _knownMessageIds.Add(messageId);

            // 2. Patch Firebase /chats/{chatId}.json
            try {
                string chatPatchUrl = string.Format("{0}/chats/{1}.json", FirebaseDbUrl, chatId);
                string preview = (type == "poll") ? "📊 Опрос: " + (poll != null ? poll.question : "") :
                                 (type == "image") ? "📷 Фото" :
                                 (type == "audio") ? "🎤 Голосовое сообщение" : text;

                var chatPatch = new Dictionary<string, object> {
                    { "lastMsg", preview },
                    { "lastMsgAt", now },
                    { "lastMsgUid", CurrentUser.uid },
                    { "lastMsgAuthor", authorName }
                };
                var patchContent = new StringContent(_json.Serialize(chatPatch), Encoding.UTF8, "application/json");
                var method = new HttpMethod("PATCH");
                var request = new HttpRequestMessage(method, chatPatchUrl) { Content = patchContent };
                await _http.SendAsync(request);
            } catch { }

            var chat = _chats.Find(c => c.id == chatId);
            if (chat != null) {
                chat.lastMsg = text;
                chat.lastMsgAt = now;
                if (OnChatUpdated != null) OnChatUpdated(chat);
            }

            if (OnMessageReceived != null) OnMessageReceived(msg);
            return msg;
        }

        public async Task<Chat> CreateChatAsync(string title, string type = "group") {
            if (CurrentUser == null) return null;

            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var payload = new Dictionary<string, object> {
                { "name", title },
                { "title", title },
                { "type", type },
                { "admin", CurrentUser.uid },
                { "createdBy", CurrentUser.uid },
                { "members", new List<string> { CurrentUser.uid } },
                { "createdAt", now },
                { "lastMsg", "Чат создан" },
                { "lastMsgAt", now },
                { "lastMsgUid", CurrentUser.uid },
                { "lastMsgAuthor", CurrentUser.GetDisplayNameOrNick() }
            };

            string url = string.Format("{0}/chats.json", FirebaseDbUrl);
            var content = new StringContent(_json.Serialize(payload), Encoding.UTF8, "application/json");
            var resp = await _http.PostAsync(url, content);

            string chatId = "chat_" + Guid.NewGuid().ToString().Substring(0, 8);
            if (resp.IsSuccessStatusCode) {
                string resStr = await resp.Content.ReadAsStringAsync();
                var resDict = _json.Deserialize<Dictionary<string, object>>(resStr);
                if (resDict != null && resDict.ContainsKey("name")) {
                    chatId = resDict["name"].ToString();
                }
            }

            var newChat = new Chat {
                id = chatId,
                name = title,
                title = title,
                type = type,
                admin = CurrentUser.uid,
                creatorUid = CurrentUser.uid,
                members = new List<string> { CurrentUser.uid },
                lastMsg = "Чат создан",
                lastMsgAt = now,
                ResolvedTitle = title
            };

            _chats.Insert(0, newChat);
            _messages[newChat.id] = new List<Message>();

            // Initial system message in Firebase
            try {
                string sysMsgUrl = string.Format("{0}/messages/{1}.json", FirebaseDbUrl, chatId);
                var sysPayload = new Dictionary<string, object> {
                    { "uid", CurrentUser.uid },
                    { "author", CurrentUser.GetDisplayNameOrNick() },
                    { "text", "Чат создан" },
                    { "type", "system" },
                    { "at", now }
                };
                var sysContent = new StringContent(_json.Serialize(sysPayload), Encoding.UTF8, "application/json");
                await _http.PostAsync(sysMsgUrl, sysContent);
            } catch { }

            if (OnChatUpdated != null) OnChatUpdated(newChat);
            if (OnChatsReloaded != null) OnChatsReloaded();
            return newChat;
        }

        public async Task AddReactionAsync(string chatId, string messageId, string emoji) {
            if (string.IsNullOrEmpty(chatId) || string.IsNullOrEmpty(messageId) || CurrentUser == null) return;

            try {
                string url = string.Format("{0}/messages/{1}/{2}/reactions/{3}.json", FirebaseDbUrl, chatId, messageId, CurrentUser.uid);
                var content = new StringContent(_json.Serialize(emoji), Encoding.UTF8, "application/json");
                await _http.PutAsync(url, content);
                await FetchChatMessagesAsync(chatId);
            } catch { }
        }

        public async Task VotePollAsync(string chatId, string messageId, int optionIndex) {
            if (string.IsNullOrEmpty(chatId) || string.IsNullOrEmpty(messageId) || CurrentUser == null) return;

            try {
                string url = string.Format("{0}/messages/{1}/{2}/poll/votes/{3}.json", FirebaseDbUrl, chatId, messageId, CurrentUser.uid);
                var content = new StringContent(_json.Serialize(optionIndex), Encoding.UTF8, "application/json");
                await _http.PutAsync(url, content);
                await FetchChatMessagesAsync(chatId);
            } catch { }
        }

        public void SetTyping(string chatId, bool typing) {
            if (OnUserTyping != null) OnUserTyping(chatId, typing);
            if (string.IsNullOrEmpty(chatId) || CurrentUser == null) return;

            try {
                string url = string.Format("{0}/chats/{1}/typing/{2}.json", FirebaseDbUrl, chatId, CurrentUser.uid);
                var content = new StringContent(_json.Serialize(typing), Encoding.UTF8, "application/json");
                _http.PutAsync(url, content);
            } catch { }
        }
    }
}
