package com.nonsensechat.app.ui.chat;

import android.content.Context;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.text.method.LinkMovementMethod;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import com.nonsensechat.app.ui.custom.TelegramSpoilerView;
import com.nonsensechat.app.utils.MessageFormatter;
import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class MessageAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    public interface OnMessageActionListener {
        void onMessageClick(Message message, View view);
        void onMessageLongClick(Message message, View view);
        void onPollVote(Message message, int optionIndex);
        void onReplySnippetClick(String replyMessageId);
        void onReactionClick(Message message, String emoji);
    }

    private static final int TYPE_TEXT_ME = 1;
    private static final int TYPE_TEXT_OTHER = 2;
    private static final int TYPE_IMAGE_ME = 3;
    private static final int TYPE_AUDIO = 4;
    private static final int TYPE_POLL = 5;

    private final Context context;
    private final Chat chat;
    private final OnMessageActionListener actionListener;
    private final List<Message> list = new ArrayList<>();
    private final SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());

    // Audio player state
    private MediaPlayer mediaPlayer;
    private String currentlyPlayingMsgId = null;

    public MessageAdapter(Context context, Chat chat, OnMessageActionListener actionListener) {
        this.context = context;
        this.chat = chat;
        this.actionListener = actionListener;
    }

    public void submitList(List<Message> messages) {
        list.clear();
        if (messages != null) {
            for (Message m : messages) {
                if (!m._deleted) {
                    list.add(m);
                }
            }
        }
        notifyDataSetChanged();
    }

    public List<Message> getItems() {
        return list;
    }

    public void stopAudioPlayback() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
        currentlyPlayingMsgId = null;
        notifyDataSetChanged();
    }

    @Override
    public int getItemViewType(int position) {
        Message m = list.get(position);
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        boolean isMe = m.isOutgoing(myUid);

        if ("poll".equalsIgnoreCase(m.type)) return TYPE_POLL;
        if ("audio".equalsIgnoreCase(m.type)) return TYPE_AUDIO;
        if ("photo".equalsIgnoreCase(m.type) || "image".equalsIgnoreCase(m.type)) return TYPE_IMAGE_ME;
        return isMe ? TYPE_TEXT_ME : TYPE_TEXT_OTHER;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        if (viewType == TYPE_POLL) {
            return new PollViewHolder(inflater.inflate(R.layout.item_message_poll, parent, false));
        } else if (viewType == TYPE_AUDIO) {
            return new AudioViewHolder(inflater.inflate(R.layout.item_message_audio, parent, false));
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
        String myUid = FirebaseManager.getInstance().getCurrentUid();

        holder.itemView.setOnClickListener(v -> {
            if (actionListener != null) actionListener.onMessageClick(m, v);
        });
        holder.itemView.setOnLongClickListener(v -> {
            if (actionListener != null) actionListener.onMessageLongClick(m, v);
            return true;
        });

        if (holder instanceof TextMeViewHolder) {
            bindTextMe((TextMeViewHolder) holder, m, timeStr, myUid);
        } else if (holder instanceof TextOtherViewHolder) {
            bindTextOther((TextOtherViewHolder) holder, m, timeStr, myUid);
        } else if (holder instanceof ImageViewHolder) {
            bindImageMe((ImageViewHolder) holder, m, timeStr, myUid);
        } else if (holder instanceof AudioViewHolder) {
            bindAudio((AudioViewHolder) holder, m, timeStr, myUid);
        } else if (holder instanceof PollViewHolder) {
            bindPoll((PollViewHolder) holder, m, myUid);
        }
    }

    private void bindTextMe(TextMeViewHolder vh, Message m, String timeStr, String myUid) {
        vh.tvMessageText.setMovementMethod(LinkMovementMethod.getInstance());
        vh.tvMessageText.setText(MessageFormatter.formatMessage(context, m.text, vh.tvMessageText));
        vh.tvMessageTime.setText(timeStr);
        vh.tvEdited.setVisibility(m.edited ? View.VISIBLE : View.GONE);

        // Forward
        if (m.forwardFrom != null && !m.forwardFrom.isEmpty()) {
            vh.tvForwardFrom.setVisibility(View.VISIBLE);
            vh.tvForwardFrom.setText("↪️ Переслано от @" + m.forwardFrom);
        } else {
            vh.tvForwardFrom.setVisibility(View.GONE);
        }

        // Reply
        String replyAuthor = m.getReplyAuthor();
        String replyText = m.getReplyText();
        if (!replyAuthor.isEmpty() || !replyText.isEmpty()) {
            vh.replyContainer.setVisibility(View.VISIBLE);
            vh.tvReplyAuthor.setText("↩ @" + replyAuthor);
            vh.tvReplyText.setText(replyText);
            vh.replyContainer.setOnClickListener(v -> {
                if (actionListener != null) actionListener.onReplySnippetClick(m.getReplyId());
            });
        } else {
            vh.replyContainer.setVisibility(View.GONE);
        }

        // Delivery / Read status
        boolean isRead = m.readAt != null && !m.readAt.isEmpty();
        vh.ivDeliveryStatus.setImageResource(isRead ? R.drawable.ic_double_check : R.drawable.ic_check);
        vh.ivDeliveryStatus.setColorFilter(isRead ? Color.parseColor("#00FF88") : Color.parseColor("#7E91A6"));

        // Reactions
        bindReactions(vh.reactionsContainer, m, myUid);
    }

    private void bindTextOther(TextOtherViewHolder vh, Message m, String timeStr, String myUid) {
        vh.tvMessageText.setMovementMethod(LinkMovementMethod.getInstance());
        vh.tvMessageText.setText(MessageFormatter.formatMessage(context, m.text, vh.tvMessageText));
        vh.tvMessageTime.setText(timeStr);
        vh.tvEdited.setVisibility(m.edited ? View.VISIBLE : View.GONE);

        // In Direct DM: hide sender avatar completely! No black circles!
        if (chat != null && chat.isGroup()) {
            vh.senderAvatar.setVisibility(View.VISIBLE);
            User sender = FirebaseManager.getInstance().getCachedUser(m.uid);
            String senderName = sender != null ? sender.getDisplayNameOrNick() : m.getSenderDisplayName();
            String senderAvatar = sender != null ? sender.getEffectiveAvatar() : null;
            vh.senderAvatar.setUser(senderName, senderAvatar, false);

            vh.tvSenderName.setVisibility(View.VISIBLE);
            vh.tvSenderName.setText(senderName);
        } else {
            vh.senderAvatar.setVisibility(View.GONE);
            vh.tvSenderName.setVisibility(View.GONE);
        }

        // Forward
        if (m.forwardFrom != null && !m.forwardFrom.isEmpty()) {
            vh.tvForwardFrom.setVisibility(View.VISIBLE);
            vh.tvForwardFrom.setText("↪️ Переслано от @" + m.forwardFrom);
        } else {
            vh.tvForwardFrom.setVisibility(View.GONE);
        }

        // Reply
        String replyAuthor = m.getReplyAuthor();
        String replyText = m.getReplyText();
        if (!replyAuthor.isEmpty() || !replyText.isEmpty()) {
            vh.replyContainer.setVisibility(View.VISIBLE);
            vh.tvReplyAuthor.setText("↩ @" + replyAuthor);
            vh.tvReplyText.setText(replyText);
            vh.replyContainer.setOnClickListener(v -> {
                if (actionListener != null) actionListener.onReplySnippetClick(m.getReplyId());
            });
        } else {
            vh.replyContainer.setVisibility(View.GONE);
        }

        // Reactions
        bindReactions(vh.reactionsContainer, m, myUid);
    }

    private void bindImageMe(ImageViewHolder vh, Message m, String timeStr, String myUid) {
        vh.tvMediaTime.setText(timeStr);
        String url = m.getEffectiveMediaUrl();
        if (url != null && !url.trim().isEmpty()) {
            try {
                if (context instanceof android.app.Activity && ((android.app.Activity) context).isDestroyed()) {
                    return;
                }
                Glide.with(context).load(url).centerCrop().into(vh.ivMessageMedia);
            } catch (Exception ignored) {}
        }

        if (m.caption != null && !m.caption.trim().isEmpty()) {
            vh.tvMediaCaption.setVisibility(View.VISIBLE);
            vh.tvMediaCaption.setText(m.caption);
        } else {
            vh.tvMediaCaption.setVisibility(View.GONE);
        }

        vh.spoilerView.setRevealed(!m.isSpoilerMedia());

        bindReactions(vh.reactionsContainer, m, myUid);
    }

    private void bindAudio(AudioViewHolder vh, Message m, String timeStr, String myUid) {
        vh.tvAudioTime.setText(timeStr);
        boolean isPlaying = m.id != null && m.id.equals(currentlyPlayingMsgId);
        vh.btnAudioPlayPause.setImageResource(isPlaying ? R.drawable.ic_pause : R.drawable.ic_play);

        long dur = m.duration > 0 ? m.duration : 0;
        vh.tvAudioDuration.setText(String.format(Locale.getDefault(), "%02d:%02d", dur / 60, dur % 60));

        vh.btnAudioPlayPause.setOnClickListener(v -> {
            if (isPlaying) {
                stopAudioPlayback();
            } else {
                playAudioMessage(m);
            }
        });

        bindReactions(vh.reactionsContainer, m, myUid);
    }

    private void playAudioMessage(Message m) {
        stopAudioPlayback();
        String url = m.getEffectiveMediaUrl();
        if (url == null || url.isEmpty()) return;

        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build());

            if (url.startsWith("data:")) {
                int comma = url.indexOf(',');
                String b64 = comma != -1 ? url.substring(comma + 1) : url;
                byte[] decoded = android.util.Base64.decode(b64, android.util.Base64.DEFAULT);
                File tempAudio = File.createTempFile("play_", ".m4a", context.getCacheDir());
                java.io.FileOutputStream fos = new java.io.FileOutputStream(tempAudio);
                fos.write(decoded);
                fos.close();
                mediaPlayer.setDataSource(tempAudio.getAbsolutePath());
            } else if (url.startsWith("http://") || url.startsWith("https://")) {
                mediaPlayer.setDataSource(context, Uri.parse(url));
            } else {
                mediaPlayer.setDataSource(url);
            }

            mediaPlayer.setOnPreparedListener(mp -> {
                try {
                    mp.start();
                    currentlyPlayingMsgId = m.id;
                    notifyDataSetChanged();
                } catch (Exception ignored) {}
            });

            mediaPlayer.setOnCompletionListener(mp -> stopAudioPlayback());
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopAudioPlayback();
                return true;
            });
            mediaPlayer.prepareAsync();
        } catch (Exception e) {
            stopAudioPlayback();
        }
    }

    private void bindPoll(PollViewHolder vh, Message m, String myUid) {
        Poll poll = m.poll;
        if (poll == null) return;

        vh.tvPollQuestion.setText(poll.question);
        vh.tvTotalVotes.setText(String.format(Locale.getDefault(), "%d голосов", poll.getTotalVotes()));
        vh.optionsContainer.removeAllViews();

        List<String> options = poll.getOptionTexts();
        boolean hasVoted = poll.hasUserVoted(myUid);
        vh.tvPollStatus.setText(hasVoted ? "Вы проголосовали" : "Нажмите для выбора");
        vh.tvPollStatus.setTextColor(Color.parseColor(hasVoted ? "#00FF88" : "#00D2FF"));

        for (int i = 0; i < options.size(); i++) {
            final int optIdx = i;
            String text = options.get(i);
            boolean isMyChoice = poll.hasUserVotedForOption(myUid, optIdx);
            int pct = poll.getOptionPercentage(optIdx);

            LinearLayout optRow = new LinearLayout(context);
            optRow.setOrientation(LinearLayout.VERTICAL);
            optRow.setBackgroundResource(isMyChoice ? R.drawable.bg_poll_option_selected : R.drawable.bg_poll_option);
            optRow.setPadding(24, 16, 24, 16);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 8, 0, 0);
            optRow.setLayoutParams(lp);

            LinearLayout topLayout = new LinearLayout(context);
            topLayout.setOrientation(LinearLayout.HORIZONTAL);

            TextView tvOptText = new TextView(context);
            tvOptText.setText(text);
            tvOptText.setTextColor(isMyChoice ? Color.parseColor("#00FF88") : Color.WHITE);
            tvOptText.setTextSize(14);
            LinearLayout.LayoutParams textLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            tvOptText.setLayoutParams(textLp);

            TextView tvOptPct = new TextView(context);
            tvOptPct.setText(pct + "%");
            tvOptPct.setTextColor(isMyChoice ? Color.parseColor("#00FF88") : Color.parseColor("#7E91A6"));
            tvOptPct.setTextSize(13);

            topLayout.addView(tvOptText);
            topLayout.addView(tvOptPct);
            optRow.addView(topLayout);

            // Progress bar
            ProgressBar pb = new ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal);
            pb.setMax(100);
            pb.setProgress(pct);
            pb.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.parseColor(isMyChoice ? "#00FF88" : "#00D2FF")));
            LinearLayout.LayoutParams pbLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 8);
            pbLp.setMargins(0, 10, 0, 0);
            pb.setLayoutParams(pbLp);
            optRow.addView(pb);

            optRow.setOnClickListener(v -> {
                if (actionListener != null) actionListener.onPollVote(m, optIdx);
            });

            vh.optionsContainer.addView(optRow);
        }
    }

    private void bindReactions(LinearLayout container, Message m, String myUid) {
        if (container == null) return;
        container.removeAllViews();

        if (m.reactions == null || m.reactions.isEmpty()) {
            container.setVisibility(View.GONE);
            return;
        }

        // Aggregate reactions: emoji -> count
        Map<String, Integer> counts = new HashMap<>();
        Map<String, Boolean> myReactions = new HashMap<>();

        for (Map.Entry<String, Object> entry : m.reactions.entrySet()) {
            String uid = entry.getKey();
            Object val = entry.getValue();
            if (val != null) {
                String emoji = val.toString();
                counts.put(emoji, counts.getOrDefault(emoji, 0) + 1);
                if (uid.equals(myUid)) {
                    myReactions.put(emoji, true);
                }
            }
        }

        if (counts.isEmpty()) {
            container.setVisibility(View.GONE);
            return;
        }

        container.setVisibility(View.VISIBLE);
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            String emoji = entry.getKey();
            int count = entry.getValue();
            boolean isMine = Boolean.TRUE.equals(myReactions.get(emoji));

            TextView chip = new TextView(context);
            chip.setText(count > 1 ? (emoji + " " + count) : emoji);
            chip.setTextSize(12);
            chip.setTextColor(Color.WHITE);
            chip.setBackgroundResource(isMine ? R.drawable.bg_reaction_chip_selected : R.drawable.bg_reaction_chip);

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 8, 0);
            chip.setLayoutParams(lp);

            chip.setOnClickListener(v -> {
                if (actionListener != null) actionListener.onReactionClick(m, emoji);
            });

            container.addView(chip);
        }
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class TextMeViewHolder extends RecyclerView.ViewHolder {
        TextView tvMessageText, tvMessageTime, tvEdited, tvForwardFrom, tvReplyAuthor, tvReplyText;
        ImageView ivDeliveryStatus;
        LinearLayout replyContainer, reactionsContainer;

        public TextMeViewHolder(@NonNull View itemView) {
            super(itemView);
            tvMessageText = itemView.findViewById(R.id.tvMessageText);
            tvMessageTime = itemView.findViewById(R.id.tvMessageTime);
            tvEdited = itemView.findViewById(R.id.tvEdited);
            tvForwardFrom = itemView.findViewById(R.id.tvForwardFrom);
            tvReplyAuthor = itemView.findViewById(R.id.tvReplyAuthor);
            tvReplyText = itemView.findViewById(R.id.tvReplyText);
            ivDeliveryStatus = itemView.findViewById(R.id.ivDeliveryStatus);
            replyContainer = itemView.findViewById(R.id.replyContainer);
            reactionsContainer = itemView.findViewById(R.id.reactionsContainer);
        }
    }

    static class TextOtherViewHolder extends RecyclerView.ViewHolder {
        AvatarView senderAvatar;
        TextView tvSenderName, tvMessageText, tvMessageTime, tvEdited, tvForwardFrom, tvReplyAuthor, tvReplyText;
        LinearLayout replyContainer, reactionsContainer;

        public TextOtherViewHolder(@NonNull View itemView) {
            super(itemView);
            senderAvatar = itemView.findViewById(R.id.senderAvatar);
            tvSenderName = itemView.findViewById(R.id.tvSenderName);
            tvMessageText = itemView.findViewById(R.id.tvMessageText);
            tvMessageTime = itemView.findViewById(R.id.tvMessageTime);
            tvEdited = itemView.findViewById(R.id.tvEdited);
            tvForwardFrom = itemView.findViewById(R.id.tvForwardFrom);
            tvReplyAuthor = itemView.findViewById(R.id.tvReplyAuthor);
            tvReplyText = itemView.findViewById(R.id.tvReplyText);
            replyContainer = itemView.findViewById(R.id.replyContainer);
            reactionsContainer = itemView.findViewById(R.id.reactionsContainer);
        }
    }

    static class ImageViewHolder extends RecyclerView.ViewHolder {
        ImageView ivMessageMedia;
        TextView tvMediaTime, tvMediaCaption;
        TelegramSpoilerView spoilerView;
        LinearLayout reactionsContainer;

        public ImageViewHolder(@NonNull View itemView) {
            super(itemView);
            ivMessageMedia = itemView.findViewById(R.id.ivMessageMedia);
            tvMediaTime = itemView.findViewById(R.id.tvMediaTime);
            tvMediaCaption = itemView.findViewById(R.id.tvMediaCaption);
            spoilerView = itemView.findViewById(R.id.spoilerView);
            reactionsContainer = itemView.findViewById(R.id.reactionsContainer);
        }
    }

    static class AudioViewHolder extends RecyclerView.ViewHolder {
        ImageView btnAudioPlayPause;
        TextView tvAudioTitle, tvAudioDuration, tvAudioTime;
        ProgressBar audioProgressBar;
        LinearLayout reactionsContainer;

        public AudioViewHolder(@NonNull View itemView) {
            super(itemView);
            btnAudioPlayPause = itemView.findViewById(R.id.btnAudioPlayPause);
            tvAudioTitle = itemView.findViewById(R.id.tvAudioTitle);
            tvAudioDuration = itemView.findViewById(R.id.tvAudioDuration);
            tvAudioTime = itemView.findViewById(R.id.tvAudioTime);
            audioProgressBar = itemView.findViewById(R.id.audioProgressBar);
            reactionsContainer = itemView.findViewById(R.id.reactionsContainer);
        }
    }

    static class PollViewHolder extends RecyclerView.ViewHolder {
        TextView tvPollQuestion, tvTotalVotes, tvPollStatus;
        LinearLayout optionsContainer;

        public PollViewHolder(@NonNull View itemView) {
            super(itemView);
            tvPollQuestion = itemView.findViewById(R.id.tvPollQuestion);
            tvTotalVotes = itemView.findViewById(R.id.tvTotalVotes);
            tvPollStatus = itemView.findViewById(R.id.tvPollStatus);
            optionsContainer = itemView.findViewById(R.id.pollOptionsContainer);
        }
    }
}
