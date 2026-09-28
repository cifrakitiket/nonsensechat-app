package com.nonsensechat.app.ui.main;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.nonsensechat.app.R;
import com.nonsensechat.app.data.FirebaseManager;
import com.nonsensechat.app.model.Chat;
import com.nonsensechat.app.model.User;
import com.nonsensechat.app.ui.custom.AvatarView;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class ChatListAdapter extends RecyclerView.Adapter<ChatListAdapter.ChatViewHolder> {
    public interface OnChatClickListener {
        void onChatClick(Chat chat);
    }

    private final List<Chat> list = new ArrayList<>();
    private final OnChatClickListener listener;
    private final SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
    private final SimpleDateFormat dayFormat = new SimpleDateFormat("dd MMM", Locale.getDefault());

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
        
        String title = MainActivity.getResolvedChatTitle(chat, myUid);
        String avatar = MainActivity.getResolvedChatAvatar(chat, myUid);
        boolean isOnline = false;

        if ("dm".equalsIgnoreCase(chat.type)) {
            String otherUid = chat.getOtherMemberUid(myUid);
            User partner = FirebaseManager.getInstance().getCachedUser(otherUid);
            if (partner != null) isOnline = partner.online;
        }

        holder.tvChatTitle.setText(title);
        
        String lastMsg = chat.getLastMessageText();
        if (chat.lastMsgUid != null && chat.lastMsgUid.equals(myUid)) {
            holder.tvLastMessage.setText("Вы: " + lastMsg);
        } else {
            holder.tvLastMessage.setText(lastMsg);
        }

        long time = chat.getLastMessageTimestamp();
        if (time > 0) {
            holder.tvChatTime.setText(formatTime(time));
        } else {
            holder.tvChatTime.setText("");
        }

        holder.chatAvatar.setUser(title, avatar, isOnline);
        holder.itemView.setOnClickListener(v -> listener.onChatClick(chat));
    }

    private String formatTime(long millis) {
        long diff = System.currentTimeMillis() - millis;
        if (diff < 24 * 3600 * 1000) {
            return timeFormat.format(new Date(millis));
        }
        return dayFormat.format(new Date(millis));
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
