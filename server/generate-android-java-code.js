// server/generate-android-java-code.js
const fs = require('fs');
const path = require('path');

const javaDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java', 'com', 'nonsensechat', 'app');

function writeJava(relPath, content) {
  const fullPath = path.join(javaDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('✓ Java:', relPath);
}

// 1. App.java
writeJava('App.java', `package com.nonsensechat.app;

import android.app.Application;
import androidx.appcompat.app.AppCompatDelegate;
import com.google.firebase.FirebaseApp;
import com.google.firebase.database.FirebaseDatabase;
import com.nonsensechat.app.data.FirebaseManager;

public class App extends Application {
    private static App instance;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;

        // Force Dark Theme
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);

        // Initialize Firebase
        FirebaseApp.initializeApp(this);
        try {
            FirebaseDatabase.getInstance().setPersistenceEnabled(true);
        } catch (Exception ignored) {}

        FirebaseManager.getInstance().init(this);
    }

    public static App getInstance() {
        return instance;
    }
}
`);

// 2. Models
writeJava('model/User.java', `package com.nonsensechat.app.model;

import com.google.firebase.database.IgnoreExtraProperties;
import java.io.Serializable;

@IgnoreExtraProperties
public class User implements Serializable {
    public String uid;
    public String nick;
    public String displayName;
    public String email;
    public String avatar;
    public String bio;
    public boolean online;
    public long lastSeen;
    public long typingAt;
    public String customStatus;

    public User() {}

    public User(String uid, String nick, String email) {
        this.uid = uid;
        this.nick = nick;
        this.displayName = nick;
        this.email = email;
        this.online = true;
        this.lastSeen = System.currentTimeMillis();
    }

    public String getDisplayNameOrNick() {
        if (displayName != null && !displayName.trim().isEmpty()) return displayName;
        if (nick != null && !nick.trim().isEmpty()) return nick;
        if (email != null && !email.trim().isEmpty()) return email.split("@")[0];
        return "Пользователь";
    }

    public String getInitials() {
        String name = getDisplayNameOrNick();
        if (name.isEmpty()) return "?";
        String[] parts = name.trim().split("\\\\s+");
        if (parts.length >= 2 && !parts[0].isEmpty() && !parts[1].isEmpty()) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        }
        return name.substring(0, Math.min(2, name.length())).toUpperCase();
    }

    public boolean isTypingNow() {
        return (System.currentTimeMillis() - typingAt) < 4500;
    }
}
`);

writeJava('model/Chat.java', `package com.nonsensechat.app.model;

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
`);

writeJava('model/Message.java', `package com.nonsensechat.app.model;

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
`);

writeJava('model/Poll.java', `package com.nonsensechat.app.model;

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
`);

writeJava('model/PollOption.java', `package com.nonsensechat.app.model;

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
`);

// 3. Data / FirebaseManager
writeJava('data/FirebaseManager.java', `package com.nonsensechat.app.data;

import android.content.Context;
import androidx.annotation.NonNull;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ServerValue;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.PollOption;
import com.nonsensechat.app.model.User;
import java.util.HashMap;
import java.util.Map;

public class FirebaseManager {
    private static FirebaseManager instance;
    private FirebaseAuth auth;
    private FirebaseDatabase database;

    private FirebaseManager() {}

    public static synchronized FirebaseManager getInstance() {
        if (instance == null) {
            instance = new FirebaseManager();
        }
        return instance;
    }

    public void init(Context context) {
        auth = FirebaseAuth.getInstance();
        database = FirebaseDatabase.getInstance("https://nonsensechattm-e5d18-default-rtdb.firebaseio.com");
    }

    public FirebaseAuth getAuth() {
        if (auth == null) auth = FirebaseAuth.getInstance();
        return auth;
    }

    public FirebaseUser getCurrentUser() {
        return getAuth().getCurrentUser();
    }

    public String getCurrentUid() {
        FirebaseUser user = getCurrentUser();
        return user != null ? user.getUid() : null;
    }

    public DatabaseReference getDb() {
        if (database == null) {
            database = FirebaseDatabase.getInstance("https://nonsensechattm-e5d18-default-rtdb.firebaseio.com");
        }
        return database.getReference();
    }

    public DatabaseReference getUsersRef() {
        return getDb().child("users");
    }

    public DatabaseReference getUserRef(String uid) {
        return getUsersRef().child(uid);
    }

    public DatabaseReference getChatsRef() {
        return getDb().child("chats");
    }

    public DatabaseReference getChatRef(String chatId) {
        return getChatsRef().child(chatId);
    }

    public DatabaseReference getMessagesRef(String chatId) {
        return getChatRef(chatId).child("messages");
    }

    // Presence management
    public void setupPresence() {
        String uid = getCurrentUid();
        if (uid == null) return;

        DatabaseReference userRef = getUserRef(uid);
        DatabaseReference connectedRef = getDb().child(".info/connected");

        connectedRef.addValueEventListener(new com.google.firebase.database.ValueEventListener() {
            @Override
            public void onDataChange(@NonNull com.google.firebase.database.DataSnapshot snapshot) {
                boolean connected = Boolean.TRUE.equals(snapshot.getValue(Boolean.class));
                if (connected) {
                    Map<String, Object> onlineMap = new HashMap<>();
                    onlineMap.put("online", true);
                    onlineMap.put("lastSeen", ServerValue.TIMESTAMP);
                    userRef.updateChildren(onlineMap);

                    Map<String, Object> offlineMap = new HashMap<>();
                    offlineMap.put("online", false);
                    offlineMap.put("lastSeen", ServerValue.TIMESTAMP);
                    userRef.onDisconnect().updateChildren(offlineMap);
                }
            }

            @Override
            public void onCancelled(@NonNull com.google.firebase.database.DatabaseError error) {}
        });
    }

    public void setTyping(String chatId, boolean typing) {
        String uid = getCurrentUid();
        if (uid == null || chatId == null) return;
        long ts = typing ? System.currentTimeMillis() : 0;
        getUserRef(uid).child("typingAt").setValue(ts);
        getChatRef(chatId).child("typing").child(uid).setValue(typing ? ServerValue.TIMESTAMP : null);
    }

    public void sendMessage(String chatId, Message message, DatabaseReference.CompletionListener listener) {
        DatabaseReference msgRef = getMessagesRef(chatId).push();
        message.id = msgRef.getKey();
        message.at = ServerValue.TIMESTAMP;
        msgRef.setValue(message, (error, ref) -> {
            if (error == null) {
                Map<String, Object> chatUpdate = new HashMap<>();
                chatUpdate.put("lastMessage", message.text != null ? message.text : ("[" + message.type + "]"));
                chatUpdate.put("lastAt", ServerValue.TIMESTAMP);
                getChatRef(chatId).updateChildren(chatUpdate);
            }
            if (listener != null) listener.onComplete(error, ref);
        });
    }

    public void votePoll(String chatId, String messageId, int optionIndex, boolean multiple) {
        String uid = getCurrentUid();
        if (uid == null || chatId == null || messageId == null) return;

        DatabaseReference pollRef = getMessagesRef(chatId).child(messageId).child("poll");
        pollRef.runTransaction(new com.google.firebase.database.Transaction.Handler() {
            @NonNull
            @Override
            public com.google.firebase.database.Transaction.Result doTransaction(@NonNull com.google.firebase.database.MutableData currentData) {
                Poll poll = currentData.getValue(Poll.class);
                if (poll == null || poll.options == null || optionIndex < 0 || optionIndex >= poll.options.size()) {
                    return com.google.firebase.database.Transaction.success(currentData);
                }

                PollOption targetOpt = poll.options.get(optionIndex);
                if (targetOpt.voters == null) targetOpt.voters = new HashMap<>();

                boolean wasVoted = Boolean.TRUE.equals(targetOpt.voters.get(uid));
                if (wasVoted) {
                    targetOpt.voters.remove(uid);
                    targetOpt.votes = Math.max(0, targetOpt.votes - 1);
                    poll.totalVotes = Math.max(0, poll.totalVotes - 1);
                } else {
                    if (!multiple) {
                        for (PollOption opt : poll.options) {
                            if (opt.voters != null && Boolean.TRUE.equals(opt.voters.remove(uid))) {
                                opt.votes = Math.max(0, opt.votes - 1);
                                poll.totalVotes = Math.max(0, poll.totalVotes - 1);
                            }
                        }
                    }
                    targetOpt.voters.put(uid, true);
                    targetOpt.votes++;
                    poll.totalVotes++;
                }

                currentData.setValue(poll);
                return com.google.firebase.database.Transaction.success(currentData);
            }

            @Override
            public void onComplete(com.google.firebase.database.DatabaseError error, boolean committed, com.google.firebase.database.DataSnapshot currentData) {}
        });
    }
}
`);

// 4. Custom Views: TelegramSpoilerView
writeJava('ui/custom/TelegramSpoilerView.java', `package com.nonsensechat.app.ui.custom;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.widget.FrameLayout;
import java.util.Random;

public class TelegramSpoilerView extends FrameLayout {
    private boolean isRevealed = false;
    private final Paint particlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint overlayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Random random = new Random();
    private float[][] particles;
    private ValueAnimator shimmerAnimator;
    private float shimmerOffset = 0f;

    public TelegramSpoilerView(Context context) {
        this(context, null);
    }

    public TelegramSpoilerView(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public TelegramSpoilerView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        setWillNotDraw(false);
        overlayPaint.setColor(Color.parseColor("#E60D1626"));
        particlePaint.setColor(Color.parseColor("#9900FF88"));

        // Sparkle / dust particle shimmer
        shimmerAnimator = ValueAnimator.ofFloat(0f, 1f);
        shimmerAnimator.setDuration(1200);
        shimmerAnimator.setRepeatCount(ValueAnimator.INFINITE);
        shimmerAnimator.addUpdateListener(anim -> {
            shimmerOffset = (float) anim.getAnimatedValue();
            if (!isRevealed) invalidate();
        });
        shimmerAnimator.start();

        setOnClickListener(v -> reveal());
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        if (w > 0 && h > 0) {
            int count = Math.min(250, (w * h) / 300);
            particles = new float[count][4]; // x, y, radius, alpha
            for (int i = 0; i < count; i++) {
                particles[i][0] = random.nextFloat() * w;
                particles[i][1] = random.nextFloat() * h;
                particles[i][2] = 1.5f + random.nextFloat() * 2.5f;
                particles[i][3] = 100 + random.nextInt(155);
            }
        }
    }

    @Override
    protected void dispatchDraw(Canvas canvas) {
        super.dispatchDraw(canvas);
        if (!isRevealed && particles != null) {
            int w = getWidth();
            int h = getHeight();

            // Dark frosted overlay
            canvas.drawRect(0, 0, w, h, overlayPaint);

            // Shimmering particle dust (Telegram style)
            for (float[] p : particles) {
                float y = (p[1] + shimmerOffset * 40f) % h;
                float x = (p[0] + (float) Math.sin(shimmerOffset * 6.28 + p[1]) * 6f) % w;
                particlePaint.setAlpha((int) p[3]);
                canvas.drawCircle(x, y, p[2], particlePaint);
            }
        }
    }

    public void setRevealed(boolean revealed) {
        this.isRevealed = revealed;
        invalidate();
    }

    public boolean isRevealed() {
        return isRevealed;
    }

    public void reveal() {
        if (isRevealed) return;
        isRevealed = true;
        try {
            Vibrator vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                vibrator.vibrate(VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE));
            }
        } catch (Exception ignored) {}

        animate().alpha(1f).setDuration(250).withEndAction(this::invalidate).start();
        invalidate();
    }
}
`);

// 5. Custom Views: AvatarView
writeJava('ui/custom/AvatarView.java', `package com.nonsensechat.app.ui.custom;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.util.AttributeSet;
import androidx.appcompat.widget.AppCompatImageView;
import com.bumptech.glide.Glide;
import com.nonsensechat.app.R;

public class AvatarView extends AppCompatImageView {
    private boolean isOnline = false;
    private String initials = "";
    private final Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint onlinePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint onlineStrokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Rect textBounds = new Rect();

    private static final int[] PALETTE = {
        Color.parseColor("#6366F1"), // Indigo
        Color.parseColor("#06B6D4"), // Cyan
        Color.parseColor("#10B981"), // Emerald
        Color.parseColor("#8B5CF6"), // Purple
        Color.parseColor("#EC4899"), // Pink
        Color.parseColor("#F59E0B")  // Amber
    };

    public AvatarView(Context context) {
        this(context, null);
    }

    public AvatarView(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public AvatarView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        textPaint.setColor(Color.WHITE);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setFakeBoldText(true);

        onlinePaint.setColor(Color.parseColor("#22C55E"));
        onlineStrokePaint.setColor(Color.parseColor("#080C14"));
        onlineStrokePaint.setStyle(Paint.Style.STROKE);
    }

    public void setUser(String name, String avatarUrl, boolean online) {
        this.isOnline = online;
        if (name != null && !name.trim().isEmpty()) {
            this.initials = name.substring(0, Math.min(2, name.length())).toUpperCase();
            int colorIndex = Math.abs(name.hashCode()) % PALETTE.length;
            bgPaint.setColor(PALETTE[colorIndex]);
        } else {
            this.initials = "?";
            bgPaint.setColor(PALETTE[0]);
        }

        if (avatarUrl != null && !avatarUrl.trim().isEmpty()) {
            Glide.with(getContext())
                .load(avatarUrl)
                .circleCrop()
                .into(this);
        } else {
            setImageDrawable(null);
            invalidate();
        }
    }

    public void setOnline(boolean online) {
        this.isOnline = online;
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        int w = getWidth();
        int h = getHeight();
        float radius = Math.min(w, h) / 2f;

        if (getDrawable() == null) {
            // Draw colorful circle with initials
            canvas.drawCircle(w / 2f, h / 2f, radius, bgPaint);
            textPaint.setTextSize(radius * 0.85f);
            textPaint.getTextBounds(initials, 0, initials.length(), textBounds);
            float y = (h / 2f) + (textBounds.height() / 2f);
            canvas.drawText(initials, w / 2f, y, textPaint);
        } else {
            super.onDraw(canvas);
        }

        // Draw online green dot badge
        if (isOnline) {
            float dotRadius = radius * 0.28f;
            float cx = w - dotRadius - 1f;
            float cy = h - dotRadius - 1f;
            onlineStrokePaint.setStrokeWidth(dotRadius * 0.4f);
            canvas.drawCircle(cx, cy, dotRadius, onlinePaint);
            canvas.drawCircle(cx, cy, dotRadius, onlineStrokePaint);
        }
    }
}
`);

// 6. UI: SplashActivity
writeJava('ui/SplashActivity.java', `package com.nonsensechat.app.ui;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.appcompat.app.AppCompatActivity;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.ui.auth.AuthActivity;
import com.nonsensechat.app.ui.main.MainActivity;

@SuppressLint("CustomSplashScreen")
public class SplashActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (FirebaseManager.getInstance().getCurrentUser() != null) {
                FirebaseManager.getInstance().setupPresence();
                startActivity(new Intent(SplashActivity.this, MainActivity.class));
            } else {
                startActivity(new Intent(SplashActivity.this, AuthActivity.class));
            }
            finish();
        }, 1200);
    }
}
`);

// 7. UI: AuthActivity
writeJava('ui/auth/AuthActivity.java', `package com.nonsensechat.app.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.main.MainActivity;

public class AuthActivity extends AppCompatActivity {
    private boolean isRegisterMode = false;
    private EditText etNickname, etEmail, etPassword;
    private Button btnSubmit;
    private TextView authTitle, authSubtitle, tvToggleMode, btnGuestLogin;
    private ProgressBar authProgress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_auth);

        etNickname = findViewById(R.id.etNickname);
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        btnSubmit = findViewById(R.id.btnSubmit);
        authTitle = findViewById(R.id.authTitle);
        authSubtitle = findViewById(R.id.authSubtitle);
        tvToggleMode = findViewById(R.id.tvToggleMode);
        btnGuestLogin = findViewById(R.id.btnGuestLogin);
        authProgress = findViewById(R.id.authProgress);

        tvToggleMode.setOnClickListener(v -> toggleMode());
        btnSubmit.setOnClickListener(v -> submit());
        btnGuestLogin.setOnClickListener(v -> guestLogin());
    }

    private void toggleMode() {
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            authTitle.setText(R.string.register_title);
            authSubtitle.setText(R.string.register_subtitle);
            etNickname.setVisibility(View.VISIBLE);
            btnSubmit.setText(R.string.action_register);
            tvToggleMode.setText(R.string.have_account);
        } else {
            authTitle.setText(R.string.login_title);
            authSubtitle.setText(R.string.login_subtitle);
            etNickname.setVisibility(View.GONE);
            btnSubmit.setText(R.string.action_login);
            tvToggleMode.setText(R.string.dont_have_account);
        }
    }

    private void submit() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();
        String nickname = etNickname.getText().toString().trim();

        if (email.isEmpty() || !email.contains("@")) {
            Toast.makeText(this, R.string.invalid_email, Toast.LENGTH_SHORT).show();
            return;
        }
        if (password.length() < 6) {
            Toast.makeText(this, R.string.short_password, Toast.LENGTH_SHORT).show();
            return;
        }

        setLoading(true);
        FirebaseAuth auth = FirebaseManager.getInstance().getAuth();

        if (isRegisterMode) {
            if (nickname.isEmpty()) nickname = email.split("@")[0];
            final String finalNick = nickname;
            auth.createUserWithEmailAndPassword(email, password)
                .addOnSuccessListener(authResult -> {
                    String uid = authResult.getUser().getUid();
                    User newUser = new User(uid, finalNick, email);
                    FirebaseManager.getInstance().getUserRef(uid).setValue(newUser)
                        .addOnCompleteListener(t -> onSuccess());
                })
                .addOnFailureListener(e -> {
                    setLoading(false);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
        } else {
            auth.signInWithEmailAndPassword(email, password)
                .addOnSuccessListener(authResult -> onSuccess())
                .addOnFailureListener(e -> {
                    setLoading(false);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
        }
    }

    private void guestLogin() {
        setLoading(true);
        FirebaseManager.getInstance().getAuth().signInAnonymously()
            .addOnSuccessListener(authResult -> {
                String uid = authResult.getUser().getUid();
                String guestNick = "Гость_" + uid.substring(0, 4);
                User guest = new User(uid, guestNick, guestNick + "@nonsense.local");
                FirebaseManager.getInstance().getUserRef(uid).setValue(guest)
                    .addOnCompleteListener(t -> onSuccess());
            })
            .addOnFailureListener(e -> {
                setLoading(false);
                Toast.makeText(this, e.getMessage(), Toast.LENGTH_SHORT).show();
            });
    }

    private void onSuccess() {
        FirebaseManager.getInstance().setupPresence();
        startActivity(new Intent(this, MainActivity.class));
        finish();
    }

    private void setLoading(boolean loading) {
        authProgress.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnSubmit.setEnabled(!loading);
    }
}
`);

// 8. UI: MainActivity
writeJava('ui/main/MainActivity.java', `package com.nonsensechat.app.ui.main;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.ValueEventListener;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.auth.AuthActivity;
import com.nonsensechat.app.ui.chat.ChatActivity;
import com.nonsensechat.app.ui.custom.AvatarView;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private RecyclerView rvChats;
    private ChatListAdapter adapter;
    private SwipeRefreshLayout swipeRefresh;
    private View emptyStateView, searchContainer;
    private EditText etSearchChats;
    private AvatarView btnProfileAvatar;
    private final List<Chat> allChats = new ArrayList<>();
    private String currentTab = "all";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        rvChats = findViewById(R.id.rvChats);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        emptyStateView = findViewById(R.id.emptyStateView);
        searchContainer = findViewById(R.id.searchContainer);
        etSearchChats = findViewById(R.id.etSearchChats);
        btnProfileAvatar = findViewById(R.id.btnProfileAvatar);

        rvChats.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ChatListAdapter(chat -> {
            Intent intent = new Intent(MainActivity.this, ChatActivity.class);
            intent.putExtra("chat", chat);
            startActivity(intent);
        });
        rvChats.setAdapter(adapter);

        setupTabs();
        setupSearch();
        loadCurrentUser();
        loadChats();

        findViewById(R.id.btnSearchToggle).setOnClickListener(v -> {
            boolean visible = searchContainer.getVisibility() == View.VISIBLE;
            searchContainer.setVisibility(visible ? View.GONE : View.VISIBLE);
        });

        findViewById(R.id.btnNewChat).setOnClickListener(v -> showNewChatDialog());
        findViewById(R.id.fabNewChat).setOnClickListener(v -> showNewChatDialog());
        btnProfileAvatar.setOnClickListener(v -> showProfileDialog());

        swipeRefresh.setOnRefreshListener(this::loadChats);
    }

    private void setupTabs() {
        TextView tabAll = findViewById(R.id.tabAll);
        TextView tabDirect = findViewById(R.id.tabDirect);
        TextView tabGroups = findViewById(R.id.tabGroups);
        TextView tabChannels = findViewById(R.id.tabChannels);

        View.OnClickListener listener = v -> {
            int id = v.getId();
            if (id == R.id.tabAll) currentTab = "all";
            else if (id == R.id.tabDirect) currentTab = "direct";
            else if (id == R.id.tabGroups) currentTab = "group";
            else if (id == R.id.tabChannels) currentTab = "channel";
            filterChats();
        };

        tabAll.setOnClickListener(listener);
        tabDirect.setOnClickListener(listener);
        tabGroups.setOnClickListener(listener);
        tabChannels.setOnClickListener(listener);
    }

    private void setupSearch() {
        etSearchChats.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterChats();
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void loadCurrentUser() {
        String uid = FirebaseManager.getInstance().getCurrentUid();
        if (uid == null) return;
        FirebaseManager.getInstance().getUserRef(uid).addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                User user = snapshot.getValue(User.class);
                if (user != null) {
                    btnProfileAvatar.setUser(user.getDisplayNameOrNick(), user.avatar, true);
                }
            }
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void loadChats() {
        FirebaseManager.getInstance().getChatsRef().addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                allChats.clear();
                String myUid = FirebaseManager.getInstance().getCurrentUid();
                for (DataSnapshot ds : snapshot.getChildren()) {
                    Chat c = ds.getValue(Chat.class);
                    if (c != null) {
                        c.id = ds.getKey();
                        List<String> members = c.getMemberList();
                        if (members.isEmpty() || members.contains(myUid)) {
                            allChats.add(c);
                        }
                    }
                }
                swipeRefresh.setRefreshing(false);
                filterChats();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                swipeRefresh.setRefreshing(false);
            }
        });
    }

    private void filterChats() {
        String query = etSearchChats.getText().toString().trim().toLowerCase();
        List<Chat> filtered = new ArrayList<>();
        String myUid = FirebaseManager.getInstance().getCurrentUid();

        for (Chat c : allChats) {
            boolean tabMatch = "all".equals(currentTab) || currentTab.equalsIgnoreCase(c.type);
            boolean queryMatch = query.isEmpty() || c.getEffectiveTitle(myUid).toLowerCase().contains(query);
            if (tabMatch && queryMatch) filtered.add(c);
        }

        adapter.submitList(filtered);
        emptyStateView.setVisibility(filtered.isEmpty() ? View.VISIBLE : View.GONE);
    }

    private void showNewChatDialog() {
        final EditText input = new EditText(this);
        input.setHint("Никнейм или название беседы");
        new AlertDialog.Builder(this)
            .setTitle(R.string.new_chat)
            .setView(input)
            .setPositiveButton("Создать", (dialog, which) -> {
                String title = input.getText().toString().trim();
                if (!title.isEmpty()) createChat(title);
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void createChat(String title) {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        Chat chat = new Chat();
        chat.title = title;
        chat.type = "group";
        chat.creatorUid = myUid;
        List<String> members = new ArrayList<>();
        members.add(myUid);
        chat.members = members;

        String chatId = FirebaseManager.getInstance().getChatsRef().push().getKey();
        if (chatId != null) {
            chat.id = chatId;
            FirebaseManager.getInstance().getChatRef(chatId).setValue(chat)
                .addOnSuccessListener(aVoid -> {
                    Intent intent = new Intent(MainActivity.this, ChatActivity.class);
                    intent.putExtra("chat", chat);
                    startActivity(intent);
                });
        }
    }

    private void showProfileDialog() {
        new AlertDialog.Builder(this)
            .setTitle(R.string.settings)
            .setMessage("Вы вошли как: " + FirebaseManager.getInstance().getCurrentUid())
            .setPositiveButton(R.string.logout, (dialog, which) -> {
                FirebaseManager.getInstance().getAuth().signOut();
                startActivity(new Intent(MainActivity.this, AuthActivity.class));
                finish();
            })
            .setNegativeButton("Закрыть", null)
            .show();
    }
}
`);

// 9. UI: ChatListAdapter
writeJava('ui/main/ChatListAdapter.java', `package com.nonsensechat.app.ui.main;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.ui.custom.AvatarView;
import java.util.ArrayList;
import java.util.List;

public class ChatListAdapter extends RecyclerView.Adapter<ChatListAdapter.ChatViewHolder> {
    public interface OnChatClickListener {
        void onChatClick(Chat chat);
    }

    private final List<Chat> list = new ArrayList<>();
    private final OnChatClickListener listener;

    public ChatListAdapter(OnChatClickListener listener) {
        this.listener = listener;
    }

    public void submitList(List<Chat> chats) {
        list.clear();
        if (chats != null) list.addAll(chats);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ChatViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_chat, parent, false);
        return new ChatViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ChatViewHolder holder, int position) {
        Chat chat = list.get(position);
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        holder.tvChatTitle.setText(chat.getEffectiveTitle(myUid));
        holder.tvLastMessage.setText(chat.lastMessage != null ? chat.lastMessage : "Нет сообщений");
        holder.chatAvatar.setUser(chat.getEffectiveTitle(myUid), chat.avatar, false);
        holder.itemView.setOnClickListener(v -> listener.onChatClick(chat));
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class ChatViewHolder extends RecyclerView.ViewHolder {
        AvatarView chatAvatar;
        TextView tvChatTitle, tvLastMessage, tvChatTime, tvUnreadBadge;

        public ChatViewHolder(@NonNull View itemView) {
            super(itemView);
            chatAvatar = itemView.findViewById(R.id.chatAvatar);
            tvChatTitle = itemView.findViewById(R.id.tvChatTitle);
            tvLastMessage = itemView.findViewById(R.id.tvLastMessage);
            tvChatTime = itemView.findViewById(R.id.tvChatTime);
            tvUnreadBadge = itemView.findViewById(R.id.tvUnreadBadge);
        }
    }
}
`);

// 10. UI: ChatActivity
writeJava('ui/chat/ChatActivity.java', `package com.nonsensechat.app.ui.chat;

import android.app.AlertDialog;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.firebase.database.ChildEventListener;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.ValueEventListener;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.PollOption;
import com.nonsensechat.app.ui.custom.AvatarView;
import java.util.ArrayList;
import java.util.List;

public class ChatActivity extends AppCompatActivity {
    private Chat chat;
    private RecyclerView rvMessages;
    private MessageAdapter adapter;
    private EditText etMessage;
    private ImageView btnSendOrVoice;
    private TextView tvHeaderTitle, tvHeaderSubtitle;
    private AvatarView headerAvatar;
    private final List<Message> messages = new ArrayList<>();
    private boolean isTextMode = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        chat = (Chat) getIntent().getSerializableExtra("chat");
        if (chat == null) {
            finish();
            return;
        }

        initViews();
        setupListeners();
        loadMessages();
        listenTyping();
    }

    private void initViews() {
        rvMessages = findViewById(R.id.rvMessages);
        etMessage = findViewById(R.id.etMessage);
        btnSendOrVoice = findViewById(R.id.btnSendOrVoice);
        tvHeaderTitle = findViewById(R.id.tvHeaderTitle);
        tvHeaderSubtitle = findViewById(R.id.tvHeaderSubtitle);
        headerAvatar = findViewById(R.id.headerAvatar);

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        tvHeaderTitle.setText(chat.getEffectiveTitle(myUid));
        headerAvatar.setUser(chat.getEffectiveTitle(myUid), chat.avatar, false);

        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        layoutManager.setStackFromEnd(true);
        rvMessages.setLayoutManager(layoutManager);

        adapter = new MessageAdapter(this, (message, optionIndex) -> {
            FirebaseManager.getInstance().votePoll(chat.id, message.id, optionIndex, message.poll != null && message.poll.multiple);
        });
        rvMessages.setAdapter(adapter);

        findViewById(R.id.btnChatBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnAttach).setOnClickListener(v -> showAttachMenu());
    }

    private void setupListeners() {
        etMessage.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                boolean hasText = s != null && s.toString().trim().length() > 0;
                if (hasText != isTextMode) {
                    isTextMode = hasText;
                    btnSendOrVoice.setImageResource(isTextMode ? R.drawable.ic_send : R.drawable.ic_mic);
                }
                FirebaseManager.getInstance().setTyping(chat.id, hasText);
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnSendOrVoice.setOnClickListener(v -> {
            if (isTextMode) {
                sendMessage();
            } else {
                Toast.makeText(this, "Удерживайте микрофон для записи голосового", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void sendMessage() {
        String text = etMessage.getText().toString().trim();
        if (text.isEmpty()) return;

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        Message msg = new Message();
        msg.uid = myUid;
        msg.text = text;
        msg.type = "text";

        etMessage.setText("");
        FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
    }

    private void loadMessages() {
        FirebaseManager.getInstance().getMessagesRef(chat.id).addChildEventListener(new ChildEventListener() {
            @Override
            public void onChildAdded(@NonNull DataSnapshot snapshot, String previousChildName) {
                Message m = snapshot.getValue(Message.class);
                if (m != null) {
                    m.id = snapshot.getKey();
                    messages.add(m);
                    adapter.submitList(messages);
                    rvMessages.scrollToPosition(messages.size() - 1);
                }
            }

            @Override
            public void onChildChanged(@NonNull DataSnapshot snapshot, String previousChildName) {
                Message updated = snapshot.getValue(Message.class);
                if (updated != null) {
                    updated.id = snapshot.getKey();
                    for (int i = 0; i < messages.size(); i++) {
                        if (messages.get(i).id.equals(updated.id)) {
                            messages.set(i, updated);
                            adapter.notifyItemChanged(i);
                            break;
                        }
                    }
                }
            }

            @Override
            public void onChildRemoved(@NonNull DataSnapshot snapshot) {}
            @Override
            public void onChildMoved(@NonNull DataSnapshot snapshot, String previousChildName) {}
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void listenTyping() {
        FirebaseManager.getInstance().getChatRef(chat.id).child("typing").addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                String myUid = FirebaseManager.getInstance().getCurrentUid();
                boolean someoneTyping = false;
                for (DataSnapshot ds : snapshot.getChildren()) {
                    if (!ds.getKey().equals(myUid)) {
                        someoneTyping = true;
                        break;
                    }
                }
                tvHeaderSubtitle.setText(someoneTyping ? getString(R.string.typing_default) : getString(R.string.online_now));
                tvHeaderSubtitle.setTextColor(getColor(someoneTyping ? R.color.accent_green : R.color.text_tertiary));
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void showAttachMenu() {
        String[] options = {"Создать опрос", "Отправить фото (спойлер)"};
        new AlertDialog.Builder(this)
            .setItems(options, (dialog, which) -> {
                if (which == 0) createPollDialog();
                else if (which == 1) sendDemoImageSpoiler();
            })
            .show();
    }

    private void createPollDialog() {
        final EditText inputQuestion = new EditText(this);
        inputQuestion.setHint("Вопрос опроса");
        new AlertDialog.Builder(this)
            .setTitle(R.string.create_poll_title)
            .setView(inputQuestion)
            .setPositiveButton("Создать", (dialog, which) -> {
                String q = inputQuestion.getText().toString().trim();
                if (!q.isEmpty()) {
                    List<PollOption> opts = new ArrayList<>();
                    opts.add(new PollOption("0", "Да"));
                    opts.add(new PollOption("1", "Нет"));
                    opts.add(new PollOption("2", "Возможно"));
                    Poll poll = new Poll(q, opts, false, true);

                    Message msg = new Message();
                    msg.uid = FirebaseManager.getInstance().getCurrentUid();
                    msg.type = "poll";
                    msg.poll = poll;
                    FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
                }
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void sendDemoImageSpoiler() {
        Message msg = new Message();
        msg.uid = FirebaseManager.getInstance().getCurrentUid();
        msg.type = "image";
        msg.fileUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
        msg.spoiler = true;
        FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
    }
}
`);

// 11. UI: MessageAdapter
writeJava('ui/chat/MessageAdapter.java', `package com.nonsensechat.app.ui.chat;

import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.PollOption;
import com.nonsensechat.app.ui.custom.TelegramSpoilerView;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MessageAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    public interface OnPollVoteListener {
        void onVote(Message message, int optionIndex);
    }

    private static final int TYPE_TEXT_ME = 1;
    private static final int TYPE_TEXT_OTHER = 2;
    private static final int TYPE_IMAGE_ME = 3;
    private static final int TYPE_POLL = 4;

    private final Context context;
    private final OnPollVoteListener voteListener;
    private final List<Message> list = new ArrayList<>();
    private final SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());

    public MessageAdapter(Context context, OnPollVoteListener voteListener) {
        this.context = context;
        this.voteListener = voteListener;
    }

    public void submitList(List<Message> messages) {
        list.clear();
        if (messages != null) list.addAll(messages);
        notifyDataSetChanged();
    }

    @Override
    public int getItemViewType(int position) {
        Message m = list.get(position);
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        boolean isMe = m.isOutgoing(myUid);

        if ("poll".equalsIgnoreCase(m.type)) return TYPE_POLL;
        if ("image".equalsIgnoreCase(m.type)) return TYPE_IMAGE_ME;
        return isMe ? TYPE_TEXT_ME : TYPE_TEXT_OTHER;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        if (viewType == TYPE_POLL) {
            return new PollViewHolder(inflater.inflate(R.layout.item_message_poll, parent, false));
        } else if (viewType == TYPE_IMAGE_ME) {
            return new ImageViewHolder(inflater.inflate(R.layout.item_message_image_me, parent, false));
        } else if (viewType == TYPE_TEXT_ME) {
            return new TextMeViewHolder(inflater.inflate(R.layout.item_message_text_me, parent, false));
        } else {
            return new TextOtherViewHolder(inflater.inflate(R.layout.item_message_text_other, parent, false));
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        Message m = list.get(position);
        String timeStr = timeFormat.format(new Date(m.getTimestampMillis()));

        if (holder instanceof TextMeViewHolder) {
            TextMeViewHolder vh = (TextMeViewHolder) holder;
            vh.tvMessageText.setText(m.text);
            vh.tvMessageTime.setText(timeStr);
        } else if (holder instanceof TextOtherViewHolder) {
            TextOtherViewHolder vh = (TextOtherViewHolder) holder;
            vh.tvMessageText.setText(m.text);
            vh.tvMessageTime.setText(timeStr);
        } else if (holder instanceof ImageViewHolder) {
            ImageViewHolder vh = (ImageViewHolder) holder;
            vh.tvMediaTime.setText(timeStr);
            Glide.with(context).load(m.fileUrl).into(vh.ivMessageMedia);
            vh.spoilerView.setRevealed(!m.spoiler);
        } else if (holder instanceof PollViewHolder) {
            PollViewHolder vh = (PollViewHolder) holder;
            Poll poll = m.poll;
            if (poll != null) {
                vh.tvPollQuestion.setText(poll.question);
                vh.tvTotalVotes.setText(String.format(Locale.getDefault(), "%d голосов", poll.totalVotes));
                vh.optionsContainer.removeAllViews();
                String myUid = FirebaseManager.getInstance().getCurrentUid();

                for (int i = 0; i < poll.options.size(); i++) {
                    final int optIdx = i;
                    PollOption opt = poll.options.get(i);
                    boolean voted = opt.hasVoted(myUid);

                    TextView optView = new TextView(context);
                    int pct = opt.getPercentage(poll.totalVotes);
                    optView.setText(String.format(Locale.getDefault(), "%s (%d%%)", opt.text, pct));
                    optView.setTextColor(voted ? Color.parseColor("#00FF88") : Color.WHITE);
                    optView.setBackgroundResource(voted ? R.drawable.bg_poll_option_selected : R.drawable.bg_poll_option);
                    optView.setPadding(24, 16, 24, 16);
                    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                    lp.setMargins(0, 8, 0, 0);
                    optView.setLayoutParams(lp);

                    optView.setOnClickListener(v -> voteListener.onVote(m, optIdx));
                    vh.optionsContainer.addView(optView);
                }
            }
        }
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class TextMeViewHolder extends RecyclerView.ViewHolder {
        TextView tvMessageText, tvMessageTime;
        public TextMeViewHolder(@NonNull View itemView) {
            super(itemView);
            tvMessageText = itemView.findViewById(R.id.tvMessageText);
            tvMessageTime = itemView.findViewById(R.id.tvMessageTime);
        }
    }

    static class TextOtherViewHolder extends RecyclerView.ViewHolder {
        TextView tvMessageText, tvMessageTime;
        public TextOtherViewHolder(@NonNull View itemView) {
            super(itemView);
            tvMessageText = itemView.findViewById(R.id.tvMessageText);
            tvMessageTime = itemView.findViewById(R.id.tvMessageTime);
        }
    }

    static class ImageViewHolder extends RecyclerView.ViewHolder {
        ImageView ivMessageMedia;
        TextView tvMediaTime;
        TelegramSpoilerView spoilerView;
        public ImageViewHolder(@NonNull View itemView) {
            super(itemView);
            ivMessageMedia = itemView.findViewById(R.id.ivMessageMedia);
            tvMediaTime = itemView.findViewById(R.id.tvMediaTime);
            spoilerView = itemView.findViewById(R.id.spoilerView);
        }
    }

    static class PollViewHolder extends RecyclerView.ViewHolder {
        TextView tvPollQuestion, tvTotalVotes;
        LinearLayout optionsContainer;
        public PollViewHolder(@NonNull View itemView) {
            super(itemView);
            tvPollQuestion = itemView.findViewById(R.id.tvPollQuestion);
            tvTotalVotes = itemView.findViewById(R.id.tvTotalVotes);
            optionsContainer = itemView.findViewById(R.id.pollOptionsContainer);
        }
    }
}
`);

console.log('All Java classes generated successfully!');
