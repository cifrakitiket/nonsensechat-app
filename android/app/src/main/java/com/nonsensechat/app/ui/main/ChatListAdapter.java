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
