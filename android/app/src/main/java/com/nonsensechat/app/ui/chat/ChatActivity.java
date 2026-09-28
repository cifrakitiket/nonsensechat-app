package com.nonsensechat.app.ui.chat;

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
