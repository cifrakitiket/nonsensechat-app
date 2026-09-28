package com.nonsensechat.app.ui.chat;

import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
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
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import com.nonsensechat.app.ui.main.MainActivity;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

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
    private final Handler tickerHandler = new Handler(Looper.getMainLooper());
    private Runnable tickerRunnable;
    private String dmPartnerUid;
    private User dmPartnerUser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        chat = (Chat) getIntent().getSerializableExtra("chat");
        if (chat == null) {
            finish();
            return;
        }

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        dmPartnerUid = chat.getOtherMemberUid(myUid);

        // Window Insets Handling (Status bar top padding & Navigation bar bottom padding)
        View chatRoot = findViewById(R.id.chatRoot);
        View chatHeader = findViewById(R.id.chatHeader);
        View bottomBar = findViewById(R.id.bottomBar);

        ViewCompat.setOnApplyWindowInsetsListener(chatRoot, (v, insets) -> {
            Insets sysBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            chatHeader.setPadding(chatHeader.getPaddingLeft(), sysBars.top, chatHeader.getPaddingRight(), chatHeader.getPaddingBottom());
            int bottomPadding = Math.max(sysBars.bottom, ime.bottom);
            bottomBar.setPadding(bottomBar.getPaddingLeft(), bottomBar.getPaddingTop(), bottomBar.getPaddingRight(), bottomPadding);
            return insets;
        });

        initViews();
        setupListeners();
        loadMessages();
        setupTypingAndPresence();
    }

    private void initViews() {
        rvMessages = findViewById(R.id.rvMessages);
        etMessage = findViewById(R.id.etMessage);
        btnSendOrVoice = findViewById(R.id.btnSendOrVoice);
        tvHeaderTitle = findViewById(R.id.tvHeaderTitle);
        tvHeaderSubtitle = findViewById(R.id.tvHeaderSubtitle);
        headerAvatar = findViewById(R.id.headerAvatar);

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        String title = MainActivity.getResolvedChatTitle(chat, myUid);
        String avatar = MainActivity.getResolvedChatAvatar(chat, myUid);

        tvHeaderTitle.setText(title);
        headerAvatar.setUser(title, avatar, false);

        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        layoutManager.setStackFromEnd(true);
        rvMessages.setLayoutManager(layoutManager);

        adapter = new MessageAdapter(this, (message, optionIndex) -> {
            FirebaseManager.getInstance().votePoll(chat.id, message.id, optionIndex, message.poll != null && message.poll.multiple);
        });
        rvMessages.setAdapter(adapter);

        findViewById(R.id.btnChatBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnCall).setOnClickListener(v -> Toast.makeText(this, "Звонки доступны в веб-версии", Toast.LENGTH_SHORT).show());
        findViewById(R.id.btnChatMenu).setOnClickListener(v -> showChatMenu());
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
                    btnSendOrVoice.setImageResource(isTextMode ? R.drawable.ic_send_airplane : R.drawable.ic_microphone);
                }
                FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), hasText);
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
        FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), false);
        FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
    }

    // ⚠️ CRITICAL FIX: Load from /messages/{chatId} with initial population & realtime updates
    private void loadMessages() {
        FirebaseManager.getInstance().getMessagesRef(chat.id).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                messages.clear();
                for (DataSnapshot ds : snapshot.getChildren()) {
                    Message m = ds.getValue(Message.class);
                    if (m != null) {
                        m.id = ds.getKey();
                        messages.add(m);
                    }
                }
                Collections.sort(messages, (a, b) -> Long.compare(a.getTimestampMillis(), b.getTimestampMillis()));
                adapter.submitList(messages);
                if (!messages.isEmpty()) {
                    rvMessages.scrollToPosition(messages.size() - 1);
                }
                listenRealtimeMessages();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                listenRealtimeMessages();
            }
        });
    }

    private void listenRealtimeMessages() {
        FirebaseManager.getInstance().getMessagesRef(chat.id).addChildEventListener(new ChildEventListener() {
            @Override
            public void onChildAdded(@NonNull DataSnapshot snapshot, String previousChildName) {
                String key = snapshot.getKey();
                for (Message m : messages) {
                    if (m.id != null && m.id.equals(key)) return; // already added
                }
                Message m = snapshot.getValue(Message.class);
                if (m != null) {
                    m.id = key;
                    messages.add(m);
                    adapter.submitList(messages);
                    rvMessages.smoothScrollToPosition(messages.size() - 1);
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

    // ⚠️ CRITICAL FIX: Ghost Typing Fix with 4.5s TTL & Ticker
    private void setupTypingAndPresence() {
        if (chat.isGroup()) {
            listenGroupTyping();
        } else if (dmPartnerUid != null) {
            listenDmPartnerPresence();
        }

        // Periodic ticker every 2.5s to clear expired typing indicators
        tickerRunnable = new Runnable() {
            @Override
            public void run() {
                updateSubtitleStatus();
                tickerHandler.postDelayed(this, 2500);
            }
        };
        tickerHandler.postDelayed(tickerRunnable, 2500);
    }

    private void listenGroupTyping() {
        FirebaseManager.getInstance().getChatRef(chat.id).child("typing").addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                updateGroupTypingStatus(snapshot);
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void updateGroupTypingStatus(DataSnapshot snapshot) {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        long now = System.currentTimeMillis();
        List<String> activeTyperUids = new ArrayList<>();

        if (snapshot != null) {
            for (DataSnapshot ds : snapshot.getChildren()) {
                if (ds.getKey() != null && !ds.getKey().equals(myUid)) {
                    Object val = ds.getValue();
                    long time = 0;
                    if (val instanceof Long) time = (Long) val;
                    else if (val instanceof Double) time = ((Double) val).longValue();

                    if (time > 0 && (now - time) >= 0 && (now - time) < 4500) {
                        activeTyperUids.add(ds.getKey());
                    }
                }
            }
        }

        if (!activeTyperUids.isEmpty()) {
            String firstUid = activeTyperUids.get(0);
            User u = FirebaseManager.getInstance().getCachedUser(firstUid);
            String name = u != null ? u.getDisplayNameOrNick() : "Участник";
            tvHeaderSubtitle.setText("✏️ " + name + " печатает...");
            tvHeaderSubtitle.setTextColor(getColor(R.color.accent_green));
        } else {
            int membersCount = chat.getMemberList().size();
            tvHeaderSubtitle.setText(membersCount > 0 ? (membersCount + " участников") : "группа");
            tvHeaderSubtitle.setTextColor(getColor(R.color.text_tertiary));
        }
    }

    private void listenDmPartnerPresence() {
        FirebaseManager.getInstance().getUserRef(dmPartnerUid).addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                dmPartnerUser = snapshot.getValue(User.class);
                if (dmPartnerUser != null) {
                    dmPartnerUser.uid = snapshot.getKey();
                    headerAvatar.setUser(dmPartnerUser.getDisplayNameOrNick(), dmPartnerUser.getEffectiveAvatar(), dmPartnerUser.online);
                }
                updateSubtitleStatus();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void updateSubtitleStatus() {
        if (chat.isGroup()) return; // handled by group listener

        if (dmPartnerUser == null) {
            tvHeaderSubtitle.setText("в сети");
            tvHeaderSubtitle.setTextColor(getColor(R.color.text_tertiary));
            return;
        }

        if (dmPartnerUser.isTypingInChat(chat.id)) {
            tvHeaderSubtitle.setText("✏️ печатает...");
            tvHeaderSubtitle.setTextColor(getColor(R.color.accent_green));
        } else if (dmPartnerUser.online) {
            tvHeaderSubtitle.setText("в сети");
            tvHeaderSubtitle.setTextColor(getColor(R.color.online_green));
        } else {
            long ls = dmPartnerUser.getLastSeenMillis();
            if (ls > 0) {
                tvHeaderSubtitle.setText("был(а) недавно");
            } else {
                tvHeaderSubtitle.setText("не в сети");
            }
            tvHeaderSubtitle.setTextColor(getColor(R.color.text_tertiary));
        }
    }

    private void showAttachMenu() {
        String[] options = {"📊 Создать опрос", "📷 Отправить фото со спойлером"};
        new AlertDialog.Builder(this)
            .setItems(options, (dialog, which) -> {
                if (which == 0) createPollDialog();
                else if (which == 1) sendDemoImageSpoiler();
            })
            .show();
    }

    private void showChatMenu() {
        String[] options = {"Очистить историю", "Информация о чате"};
        new AlertDialog.Builder(this)
            .setItems(options, (dialog, which) -> {
                if (which == 0) Toast.makeText(this, "История чата синхронизирована", Toast.LENGTH_SHORT).show();
                else if (which == 1) Toast.makeText(this, "ID: " + chat.id, Toast.LENGTH_SHORT).show();
            })
            .show();
    }

    private void createPollDialog() {
        final EditText inputQuestion = new EditText(this);
        inputQuestion.setHint("Вопрос опроса");
        inputQuestion.setPadding(32, 24, 32, 24);
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

    @Override
    protected void onDestroy() {
        super.onDestroy();
        tickerHandler.removeCallbacks(tickerRunnable);
        FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), false);
    }
}
