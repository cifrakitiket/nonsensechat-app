package com.nonsensechat.app.ui.chat;

import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Base64;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.firebase.database.ChildEventListener;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.ValueEventListener;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import com.nonsensechat.app.ui.main.MainActivity;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class ChatActivity extends AppCompatActivity {
    private Chat chat;
    private RecyclerView rvMessages;
    private MessageAdapter adapter;
    private EditText etMessage, etChatSearch;
    private ImageView btnSendOrVoice, btnAttach, btnChatSearch, btnEmojiPicker;
    private TextView tvHeaderTitle, tvHeaderSubtitle;
    private AvatarView headerAvatar;
    private View pinnedBar, replyEditBar, chatSearchContainer, audioRecordOverlay;
    private TextView tvPinnedPreview, tvReplyEditTitle, tvReplyEditSubtitle, tvRecordDuration;

    private final List<Message> allMessages = new ArrayList<>();
    private boolean isTextMode = false;
    private String dmPartnerUid;
    private User dmPartnerUser;

    // Replying / Editing state
    private Message replyingToMessage = null;
    private Message editingMessage = null;

    // Audio recording state
    private MediaRecorder mediaRecorder;
    private File audioRecordFile;
    private long recordStartTime = 0;
    private final Handler recordTimerHandler = new Handler(Looper.getMainLooper());
    private Runnable recordTimerRunnable;

    // Ticker for typing & online presence
    private final Handler tickerHandler = new Handler(Looper.getMainLooper());
    private Runnable tickerRunnable;

    // Image & File pickers
    private ActivityResultLauncher<String> imagePickerLauncher;
    private ActivityResultLauncher<String> filePickerLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_chat);

        chat = (Chat) getIntent().getSerializableExtra("chat");
        if (chat == null) {
            finish();
            return;
        }

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        dmPartnerUid = chat.getOtherMemberUid(myUid);

        setupPickers();

        // Window Insets
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
        listenPinnedMessages();
    }

    private void setupPickers() {
        imagePickerLauncher = registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> {
            if (uri != null) showSendPhotoDialog(uri);
        });

        filePickerLauncher = registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> {
            if (uri != null) sendFile(uri);
        });
    }

    private void initViews() {
        rvMessages = findViewById(R.id.rvMessages);
        etMessage = findViewById(R.id.etMessage);
        btnSendOrVoice = findViewById(R.id.btnSendOrVoice);
        btnAttach = findViewById(R.id.btnAttach);
        btnChatSearch = findViewById(R.id.btnChatSearch);
        btnEmojiPicker = findViewById(R.id.btnEmojiPicker);
        tvHeaderTitle = findViewById(R.id.tvHeaderTitle);
        tvHeaderSubtitle = findViewById(R.id.tvHeaderSubtitle);
        headerAvatar = findViewById(R.id.headerAvatar);

        pinnedBar = findViewById(R.id.pinnedBar);
        tvPinnedPreview = findViewById(R.id.tvPinnedPreview);
        replyEditBar = findViewById(R.id.replyEditBar);
        tvReplyEditTitle = findViewById(R.id.tvReplyEditTitle);
        tvReplyEditSubtitle = findViewById(R.id.tvReplyEditSubtitle);
        chatSearchContainer = findViewById(R.id.chatSearchContainer);
        etChatSearch = findViewById(R.id.etChatSearch);
        audioRecordOverlay = findViewById(R.id.audioRecordOverlay);
        tvRecordDuration = findViewById(R.id.tvRecordDuration);

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        String title = MainActivity.getResolvedChatTitle(chat, myUid);
        String avatar = MainActivity.getResolvedChatAvatar(chat, myUid);

        tvHeaderTitle.setText(title);
        if (chat.isFav()) {
            headerAvatar.setFavMode();
            tvHeaderSubtitle.setText("сохранённые сообщения");
        } else {
            headerAvatar.setUser(title, avatar, false);
        }

        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        layoutManager.setStackFromEnd(true);
        rvMessages.setLayoutManager(layoutManager);

        adapter = new MessageAdapter(this, chat, new MessageAdapter.OnMessageActionListener() {
            @Override
            public void onMessageClick(Message message, View view) {
                showMessageContextMenu(message);
            }

            @Override
            public void onMessageLongClick(Message message, View view) {
                showMessageContextMenu(message);
            }

            @Override
            public void onPollVote(Message message, int optionIndex) {
                FirebaseManager.getInstance().votePoll(chat.id, message.id, optionIndex, message.poll != null && message.poll.multiple);
            }

            @Override
            public void onReplySnippetClick(String replyMessageId) {
                scrollToMessageId(replyMessageId);
            }

            @Override
            public void onReactionClick(Message message, String emoji) {
                FirebaseManager.getInstance().toggleReaction(chat.id, message.id, emoji);
            }
        });
        rvMessages.setAdapter(adapter);

        findViewById(R.id.btnChatBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnCall).setOnClickListener(v -> showCallDialog());
        findViewById(R.id.btnChatMenu).setOnClickListener(v -> showChatMenu());
        btnAttach.setOnClickListener(v -> showAttachMenu());
        if (btnEmojiPicker != null) {
            btnEmojiPicker.setOnClickListener(v -> showEmojiPicker());
        }

        btnChatSearch.setOnClickListener(v -> {
            boolean visible = chatSearchContainer.getVisibility() == View.VISIBLE;
            chatSearchContainer.setVisibility(visible ? View.GONE : View.VISIBLE);
            if (!visible) etChatSearch.requestFocus();
            else filterInChatMessages("");
        });

        findViewById(R.id.btnCloseChatSearch).setOnClickListener(v -> {
            chatSearchContainer.setVisibility(View.GONE);
            etChatSearch.setText("");
            filterInChatMessages("");
        });

        findViewById(R.id.btnCloseReplyEdit).setOnClickListener(v -> cancelReplyOrEdit());

        findViewById(R.id.btnUnpinCurrent).setOnClickListener(v -> {
            FirebaseManager.getInstance().unpinMessage(chat.id, null);
            pinnedBar.setVisibility(View.GONE);
        });

        findViewById(R.id.pinnedContent).setOnClickListener(v -> {
            if (!allMessages.isEmpty()) {
                rvMessages.smoothScrollToPosition(0);
            }
        });

        findViewById(R.id.btnCancelRecord).setOnClickListener(v -> cancelAudioRecording());
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
                    btnSendOrVoice.setImageResource(isTextMode 
                        ? (editingMessage != null ? R.drawable.ic_check : R.drawable.ic_send_airplane) 
                        : R.drawable.ic_microphone);
                }
                FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), hasText);
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        etChatSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterInChatMessages(s != null ? s.toString() : "");
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnSendOrVoice.setOnClickListener(v -> {
            if (audioRecordFile != null) {
                finishAndSendAudioRecording();
            } else if (isTextMode) {
                sendMessage();
            } else {
                startAudioRecording();
            }
        });
    }

    private void sendMessage() {
        String text = etMessage.getText().toString().trim();
        if (text.isEmpty()) return;

        if (editingMessage != null) {
            FirebaseManager.getInstance().editMessage(chat.id, editingMessage.id, text);
            cancelReplyOrEdit();
            return;
        }

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        Message msg = new Message();
        msg.uid = myUid;
        msg.text = text;
        msg.type = "text";

        if (replyingToMessage != null) {
            Map<String, Object> replyMap = new HashMap<>();
            replyMap.put("id", replyingToMessage.id);
            replyMap.put("author", replyingToMessage.getSenderDisplayName());
            replyMap.put("text", replyingToMessage.text != null ? replyingToMessage.text : "");
            msg.replyTo = replyMap;
        }

        cancelReplyOrEdit();
        FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), false);
        FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
    }

    private void cancelReplyOrEdit() {
        replyingToMessage = null;
        editingMessage = null;
        replyEditBar.setVisibility(View.GONE);
        etMessage.setText("");
        btnSendOrVoice.setImageResource(R.drawable.ic_microphone);
    }

    private void scrollToMessageId(String messageId) {
        if (messageId == null || messageId.isEmpty()) return;
        List<Message> items = adapter.getItems();
        for (int i = 0; i < items.size(); i++) {
            if (messageId.equals(items.get(i).id)) {
                rvMessages.smoothScrollToPosition(i);
                break;
            }
        }
    }

    private void filterInChatMessages(String query) {
        if (query.trim().isEmpty()) {
            adapter.submitList(allMessages);
            if (!allMessages.isEmpty()) rvMessages.scrollToPosition(allMessages.size() - 1);
            return;
        }
        String q = query.toLowerCase().trim();
        List<Message> filtered = new ArrayList<>();
        for (Message m : allMessages) {
            if (m.text != null && m.text.toLowerCase().contains(q)) {
                filtered.add(m);
            }
        }
        adapter.submitList(filtered);
    }

    // Liquid Glass Message Context Menu
    private void showMessageContextMenu(Message m) {
        if (m == null) return;
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_message_menu, null);

        LinearLayout reactionsRow = view.findViewById(R.id.reactionsQuickRow);
        String[] quickEmojis = {"👍", "❤️", "🔥", "😂", "😮", "😢", "💩", "👏", "🎉", "💯"};

        for (String emoji : quickEmojis) {
            TextView chip = new TextView(this);
            chip.setText(emoji);
            chip.setTextSize(22);
            chip.setPadding(20, 10, 20, 10);
            chip.setBackgroundResource(R.drawable.bg_reaction_chip);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 12, 0);
            chip.setLayoutParams(lp);

            chip.setOnClickListener(v -> {
                FirebaseManager.getInstance().toggleReaction(chat.id, m.id, emoji);
                dialog.dismiss();
            });
            reactionsRow.addView(chip);
        }

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        boolean isMine = m.isOutgoing(myUid);

        View actionReply = view.findViewById(R.id.menuActionReply);
        View actionCopy = view.findViewById(R.id.menuActionCopy);
        View actionEdit = view.findViewById(R.id.menuActionEdit);
        View actionPin = view.findViewById(R.id.menuActionPin);
        View actionForward = view.findViewById(R.id.menuActionForward);
        View actionDelete = view.findViewById(R.id.menuActionDelete);

        if (isMine) {
            actionEdit.setVisibility(View.VISIBLE);
            actionDelete.setVisibility(View.VISIBLE);
        }

        actionReply.setOnClickListener(v -> {
            dialog.dismiss();
            startReply(m);
        });

        actionCopy.setOnClickListener(v -> {
            dialog.dismiss();
            copyToClipboard(m.text != null ? m.text : "");
        });

        actionEdit.setOnClickListener(v -> {
            dialog.dismiss();
            startEdit(m);
        });

        actionPin.setOnClickListener(v -> {
            dialog.dismiss();
            FirebaseManager.getInstance().pinMessage(chat.id, m.id, m.text, m.getSenderDisplayName());
            Toast.makeText(this, "Сообщение закреплено", Toast.LENGTH_SHORT).show();
        });

        actionForward.setOnClickListener(v -> {
            dialog.dismiss();
            Toast.makeText(this, "Пересылка сообщения", Toast.LENGTH_SHORT).show();
        });

        actionDelete.setOnClickListener(v -> {
            dialog.dismiss();
            FirebaseManager.getInstance().deleteMessage(chat.id, m.id);
            Toast.makeText(this, "Сообщение удалено", Toast.LENGTH_SHORT).show();
        });

        dialog.setContentView(view);
        dialog.show();
    }

    private void showEmojiPicker() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundResource(R.drawable.bg_card_dark);
        root.setPadding(24, 20, 24, 24);

        TextView title = new TextView(this);
        title.setText("Эмодзи");
        title.setTextColor(Color.WHITE);
        title.setTextSize(16);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title);

        String[] emojis = {
            "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
            "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
            "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
            "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
            "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉",
            "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
            "🔥", "✨", "🎉", "🎊", "💯", "💩", "🚀", "⚡", "⭐", "🌟"
        };

        // Grid of emojis
        LinearLayout row = null;
        for (int i = 0; i < emojis.length; i++) {
            if (i % 8 == 0) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setGravity(android.view.Gravity.CENTER);
                LinearLayout.LayoutParams rlp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                rlp.setMargins(0, 10, 0, 0);
                row.setLayoutParams(rlp);
                root.addView(row);
            }
            final String em = emojis[i];
            TextView tv = new TextView(this);
            tv.setText(em);
            tv.setTextSize(24);
            tv.setPadding(8, 8, 8, 8);
            tv.setBackgroundResource(R.drawable.bg_tab_inactive);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
            lp.setMargins(4, 0, 4, 0);
            tv.setLayoutParams(lp);
            tv.setGravity(android.view.Gravity.CENTER);
            tv.setOnClickListener(v -> {
                etMessage.append(em);
                dialog.dismiss();
            });
            row.addView(tv);
        }

        dialog.setContentView(root);
        dialog.show();
    }

    private void startReply(Message m) {
        replyingToMessage = m;
        editingMessage = null;
        replyEditBar.setVisibility(View.VISIBLE);
        tvReplyEditTitle.setText("Ответ @" + m.getSenderDisplayName());
        tvReplyEditSubtitle.setText(m.text != null ? m.text : "Медиа");
        etMessage.requestFocus();
    }

    private void startEdit(Message m) {
        editingMessage = m;
        replyingToMessage = null;
        replyEditBar.setVisibility(View.VISIBLE);
        tvReplyEditTitle.setText("Редактирование");
        tvReplyEditSubtitle.setText(m.text != null ? m.text : "");
        etMessage.setText(m.text != null ? m.text : "");
        etMessage.setSelection(etMessage.getText().length());
        etMessage.requestFocus();
        btnSendOrVoice.setImageResource(R.drawable.ic_check);
    }

    private void copyToClipboard(String text) {
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) {
            cm.setPrimaryClip(ClipData.newPlainText("nonsensechat", text));
            Toast.makeText(this, "Скопировано", Toast.LENGTH_SHORT).show();
        }
    }

    // Liquid Glass Attach Menu
    private void showAttachMenu() {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_attach_menu, null);

        view.findViewById(R.id.btnAttachPhoto).setOnClickListener(v -> {
            dialog.dismiss();
            imagePickerLauncher.launch("image/*");
        });

        view.findViewById(R.id.btnAttachPoll).setOnClickListener(v -> {
            dialog.dismiss();
            showCreatePollDialog();
        });

        view.findViewById(R.id.btnAttachFile).setOnClickListener(v -> {
            dialog.dismiss();
            filePickerLauncher.launch("*/*");
        });

        dialog.setContentView(view);
        dialog.show();
    }

    private void showSendPhotoDialog(Uri uri) {
        final EditText etCaption = new EditText(this);
        etCaption.setHint("Подпись к фото...");
        etCaption.setBackgroundResource(R.drawable.bg_input_field);
        etCaption.setPadding(32, 24, 32, 24);
        etCaption.setTextColor(Color.WHITE);
        etCaption.setHintTextColor(Color.parseColor("#7E91A6"));

        final CheckBox cbSpoiler = new CheckBox(this);
        cbSpoiler.setText("Скрыть под спойлер");
        cbSpoiler.setTextColor(Color.WHITE);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 24, 40, 16);
        layout.addView(etCaption);
        layout.addView(cbSpoiler);

        new AlertDialog.Builder(this)
            .setTitle("Отправить фото")
            .setView(layout)
            .setPositiveButton("Отправить", (dialog, which) -> {
                sendImage(uri, etCaption.getText().toString().trim(), cbSpoiler.isChecked());
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void sendImage(Uri uri, String caption, boolean isSpoiler) {
        try {
            InputStream is = getContentResolver().openInputStream(uri);
            Bitmap bitmap = BitmapFactory.decodeStream(is);
            if (is != null) is.close();

            // Compress to max 1200px
            int maxDim = 1200;
            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            if (width > maxDim || height > maxDim) {
                float ratio = (float) width / (float) height;
                if (width > height) {
                    width = maxDim;
                    height = Math.round(maxDim / ratio);
                } else {
                    height = maxDim;
                    width = Math.round(maxDim * ratio);
                }
                bitmap = Bitmap.createScaledBitmap(bitmap, width, height, true);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 75, baos);
            byte[] bytes = baos.toByteArray();
            String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);

            Message msg = new Message();
            msg.uid = FirebaseManager.getInstance().getCurrentUid();
            msg.type = "photo";
            msg.fileData = base64;
            msg.caption = caption;
            msg.isSpoiler = isSpoiler;
            FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
        } catch (Exception e) {
            Toast.makeText(this, "Ошибка обработки фото: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void sendFile(Uri uri) {
        try {
            String path = uri.getLastPathSegment();
            String name = path != null ? path : "document";

            Message msg = new Message();
            msg.uid = FirebaseManager.getInstance().getCurrentUid();
            msg.type = "file";
            msg.fileName = name;
            msg.fileUrl = uri.toString();
            FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
        } catch (Exception e) {
            Toast.makeText(this, "Ошибка: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    // Audio recording implementation
    private void startAudioRecording() {
        try {
            audioRecordFile = File.createTempFile("voice_", ".m4a", getCacheDir());
            mediaRecorder = new MediaRecorder();
            mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            mediaRecorder.setOutputFile(audioRecordFile.getAbsolutePath());
            mediaRecorder.prepare();
            mediaRecorder.start();

            recordStartTime = System.currentTimeMillis();
            audioRecordOverlay.setVisibility(View.VISIBLE);
            btnSendOrVoice.setImageResource(R.drawable.ic_send_airplane);

            recordTimerRunnable = new Runnable() {
                @Override
                public void run() {
                    long elapsedSec = (System.currentTimeMillis() - recordStartTime) / 1000;
                    tvRecordDuration.setText(String.format(Locale.getDefault(), "%02d:%02d", elapsedSec / 60, elapsedSec % 60));
                    recordTimerHandler.postDelayed(this, 500);
                }
            };
            recordTimerHandler.post(recordTimerRunnable);
        } catch (Exception e) {
            Toast.makeText(this, "Не удалось записать: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            cancelAudioRecording();
        }
    }

    private void finishAndSendAudioRecording() {
        if (mediaRecorder == null || audioRecordFile == null) return;
        try {
            mediaRecorder.stop();
            mediaRecorder.release();
            mediaRecorder = null;
            recordTimerHandler.removeCallbacks(recordTimerRunnable);
            audioRecordOverlay.setVisibility(View.GONE);
            btnSendOrVoice.setImageResource(R.drawable.ic_microphone);

            long durationSec = Math.max(1, (System.currentTimeMillis() - recordStartTime) / 1000);

            byte[] fileBytes = new byte[(int) audioRecordFile.length()];
            FileInputStream fis = new FileInputStream(audioRecordFile);
            fis.read(fileBytes);
            fis.close();
            String base64 = Base64.encodeToString(fileBytes, Base64.NO_WRAP);

            Message msg = new Message();
            msg.uid = FirebaseManager.getInstance().getCurrentUid();
            msg.type = "audio";
            msg.fileData = "data:audio/mp4;base64," + base64;
            msg.fileUrl = audioRecordFile.getAbsolutePath();
            msg.duration = durationSec;

            FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
            audioRecordFile = null;
        } catch (Exception e) {
            cancelAudioRecording();
        }
    }

    private void cancelAudioRecording() {
        if (mediaRecorder != null) {
            try {
                mediaRecorder.stop();
                mediaRecorder.release();
            } catch (Exception ignored) {}
            mediaRecorder = null;
        }
        if (audioRecordFile != null && audioRecordFile.exists()) {
            audioRecordFile.delete();
            audioRecordFile = null;
        }
        recordTimerHandler.removeCallbacks(recordTimerRunnable);
        audioRecordOverlay.setVisibility(View.GONE);
        btnSendOrVoice.setImageResource(R.drawable.ic_microphone);
    }

    // Poll Dialog
    private void showCreatePollDialog() {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_create_poll, null);
        EditText etQuestion = view.findViewById(R.id.etPollQuestion);
        LinearLayout optionsContainer = view.findViewById(R.id.pollOptionsInputsContainer);
        TextView btnAddOption = view.findViewById(R.id.btnAddPollOption);
        CheckBox cbAnonymous = view.findViewById(R.id.cbPollAnonymous);
        CheckBox cbMultiple = view.findViewById(R.id.cbPollMultiple);

        List<EditText> optInputs = new ArrayList<>();
        Runnable addOptionInput = () -> {
            EditText opt = new EditText(this);
            opt.setHint("Вариант " + (optInputs.size() + 1));
            opt.setBackgroundResource(R.drawable.bg_input_field);
            opt.setPadding(32, 24, 32, 24);
            opt.setTextColor(Color.WHITE);
            opt.setHintTextColor(Color.parseColor("#7E91A6"));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 8, 0, 0);
            opt.setLayoutParams(lp);
            optionsContainer.addView(opt);
            optInputs.add(opt);
        };

        addOptionInput.run();
        addOptionInput.run();

        btnAddOption.setOnClickListener(v -> addOptionInput.run());

        new AlertDialog.Builder(this)
            .setView(view)
            .setPositiveButton("Создать", (dialog, which) -> {
                String q = etQuestion.getText().toString().trim();
                if (q.isEmpty()) {
                    Toast.makeText(this, "Введите вопрос", Toast.LENGTH_SHORT).show();
                    return;
                }
                List<String> validOpts = new ArrayList<>();
                for (EditText inp : optInputs) {
                    String optText = inp.getText().toString().trim();
                    if (!optText.isEmpty()) validOpts.add(optText);
                }
                if (validOpts.size() < 2) {
                    Toast.makeText(this, "Добавьте хотя бы 2 варианта", Toast.LENGTH_SHORT).show();
                    return;
                }

                Poll poll = new Poll(q, validOpts, cbMultiple.isChecked(), cbAnonymous.isChecked());
                Message msg = new Message();
                msg.uid = FirebaseManager.getInstance().getCurrentUid();
                msg.type = "poll";
                msg.poll = poll;
                FirebaseManager.getInstance().sendMessage(chat.id, msg, null);
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void listenPinnedMessages() {
        FirebaseManager.getInstance().getChatRef(chat.id).child("pinnedMsgs").addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                try {
                    if (snapshot.hasChildren()) {
                        DataSnapshot lastChild = null;
                        for (DataSnapshot ds : snapshot.getChildren()) {
                            lastChild = ds;
                        }
                        if (lastChild != null) {
                            String text = lastChild.child("text").getValue(String.class);
                            pinnedBar.setVisibility(View.VISIBLE);
                            tvPinnedPreview.setText(text != null ? text : "Закреплено");
                            return;
                        }
                    }
                    pinnedBar.setVisibility(View.GONE);
                } catch (Exception ignored) {}
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void loadMessages() {
        FirebaseManager.getInstance().getMessagesRef(chat.id).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                try {
                    allMessages.clear();
                    for (DataSnapshot ds : snapshot.getChildren()) {
                        Message m = Message.fromSnapshot(ds);
                        if (m != null && !m._deleted) {
                            allMessages.add(m);
                        }
                    }
                    Collections.sort(allMessages, (a, b) -> Long.compare(a.getTimestampMillis(), b.getTimestampMillis()));
                    adapter.submitList(allMessages);
                    if (!allMessages.isEmpty()) {
                        rvMessages.scrollToPosition(allMessages.size() - 1);
                    }
                } catch (Exception ignored) {}
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
                try {
                    String key = snapshot.getKey();
                    for (Message m : allMessages) {
                        if (m.id != null && m.id.equals(key)) return;
                    }
                    Message m = Message.fromSnapshot(snapshot);
                    if (m != null && !m._deleted) {
                        allMessages.add(m);
                        adapter.submitList(allMessages);
                        rvMessages.smoothScrollToPosition(allMessages.size() - 1);
                    }
                } catch (Exception ignored) {}
            }

            @Override
            public void onChildChanged(@NonNull DataSnapshot snapshot, String previousChildName) {
                try {
                    Message updated = Message.fromSnapshot(snapshot);
                    if (updated != null) {
                        for (int i = 0; i < allMessages.size(); i++) {
                            if (allMessages.get(i).id.equals(updated.id)) {
                                if (updated._deleted) {
                                    allMessages.remove(i);
                                } else {
                                    allMessages.set(i, updated);
                                }
                                adapter.submitList(allMessages);
                                break;
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            @Override
            public void onChildRemoved(@NonNull DataSnapshot snapshot) {
                try {
                    String key = snapshot.getKey();
                    for (int i = 0; i < allMessages.size(); i++) {
                        if (allMessages.get(i).id.equals(key)) {
                            allMessages.remove(i);
                            adapter.submitList(allMessages);
                            break;
                        }
                    }
                } catch (Exception ignored) {}
            }

            @Override
            public void onChildMoved(@NonNull DataSnapshot snapshot, String previousChildName) {}
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void setupTypingAndPresence() {
        if (chat.isGroup()) {
            listenGroupTyping();
        } else if (dmPartnerUid != null) {
            listenDmPartnerPresence();
        }

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
                try {
                    updateGroupTypingStatus(snapshot);
                } catch (Exception ignored) {}
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
                try {
                    dmPartnerUser = User.fromSnapshot(snapshot);
                    if (dmPartnerUser != null) {
                        headerAvatar.setUser(dmPartnerUser.getDisplayNameOrNick(), dmPartnerUser.getEffectiveAvatar(), dmPartnerUser.online);
                    }
                    updateSubtitleStatus();
                } catch (Exception ignored) {}
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void updateSubtitleStatus() {
        if (chat.isGroup() || chat.isFav()) return;

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

    private void showCallDialog() {
        new AlertDialog.Builder(this)
            .setTitle("📞 Беспонтовый Звонок")
            .setMessage("Аудио- и видеозвонки синхронизируются через WebRTC сервер.\nСобеседник доступен для звонка.")
            .setPositiveButton("Понятно", null)
            .show();
    }

    private void showChatMenu() {
        String[] options = {"Профиль / Инфо", "Поиск сообщений", "Закрепленные сообщения", "Очистить историю"};
        new AlertDialog.Builder(this)
            .setItems(options, (dialog, which) -> {
                if (which == 0) {
                    if (dmPartnerUser != null) {
                        showUserProfileDialog(dmPartnerUser);
                    } else {
                        Toast.makeText(this, "Чат: " + chat.name + " (" + chat.getMemberList().size() + " уч.)", Toast.LENGTH_SHORT).show();
                    }
                } else if (which == 1) {
                    chatSearchContainer.setVisibility(View.VISIBLE);
                    etChatSearch.requestFocus();
                } else if (which == 2) {
                    Toast.makeText(this, "Закрепленные сообщения активны в шапке", Toast.LENGTH_SHORT).show();
                } else if (which == 3) {
                    Toast.makeText(this, "История чата синхронизирована с облаком", Toast.LENGTH_SHORT).show();
                }
            })
            .show();
    }

    private void showUserProfileDialog(User user) {
        new AlertDialog.Builder(this)
            .setTitle(user.getDisplayNameOrNick())
            .setMessage("Ник: @" + (user.nick != null ? user.nick : "") + "\nБио: " + (user.bio != null ? user.bio : "Не указано") + "\nСтатус: " + (user.online ? "В сети" : "Не в сети"))
            .setPositiveButton("Закрыть", null)
            .show();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        try {
            adapter.stopAudioPlayback();
            cancelAudioRecording();
            tickerHandler.removeCallbacks(tickerRunnable);
            FirebaseManager.getInstance().setTyping(chat.id, chat.isGroup(), false);
        } catch (Exception ignored) {}
    }
}
