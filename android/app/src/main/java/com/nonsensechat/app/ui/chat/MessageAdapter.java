package com.nonsensechat.app.ui.chat;

import android.content.Context;
import android.graphics.Color;
import android.text.method.LinkMovementMethod;
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
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.Message;
import com.nonsensechat.app.model.Poll;
import com.nonsensechat.app.model.PollOption;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import com.nonsensechat.app.ui.custom.TelegramSpoilerView;
import com.nonsensechat.app.utils.MessageFormatter;
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
    private final Chat chat;
    private final OnPollVoteListener voteListener;
    private final List<Message> list = new ArrayList<>();
    private final SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());

    public MessageAdapter(Context context, Chat chat, OnPollVoteListener voteListener) {
        this.context = context;
        this.chat = chat;
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
            vh.tvMessageText.setMovementMethod(LinkMovementMethod.getInstance());
            vh.tvMessageText.setText(MessageFormatter.formatMessage(context, m.text, vh.tvMessageText));
            vh.tvMessageTime.setText(timeStr);
        } else if (holder instanceof TextOtherViewHolder) {
            TextOtherViewHolder vh = (TextOtherViewHolder) holder;
            vh.tvMessageText.setMovementMethod(LinkMovementMethod.getInstance());
            vh.tvMessageText.setText(MessageFormatter.formatMessage(context, m.text, vh.tvMessageText));
            vh.tvMessageTime.setText(timeStr);

            // In Direct Chats (1-on-1 DM): HIDE sender avatar next to bubbles completely!
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
        } else if (holder instanceof ImageViewHolder) {
            ImageViewHolder vh = (ImageViewHolder) holder;
            vh.tvMediaTime.setText(timeStr);
            String url = m.getMediaUrl();
            if (url != null) {
                Glide.with(context).load(url).into(vh.ivMessageMedia);
            }
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
        AvatarView senderAvatar;
        TextView tvSenderName, tvMessageText, tvMessageTime;
        public TextOtherViewHolder(@NonNull View itemView) {
            super(itemView);
            senderAvatar = itemView.findViewById(R.id.senderAvatar);
            tvSenderName = itemView.findViewById(R.id.tvSenderName);
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
