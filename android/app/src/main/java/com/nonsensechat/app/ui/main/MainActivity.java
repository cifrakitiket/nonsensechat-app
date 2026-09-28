package com.nonsensechat.app.ui.main;

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
