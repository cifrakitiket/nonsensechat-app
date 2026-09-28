package com.nonsensechat.app.ui.main;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
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
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends AppCompatActivity {
    private RecyclerView rvChats;
    private ChatListAdapter adapter;
    private SwipeRefreshLayout swipeRefresh;
    private View emptyStateView, searchContainer;
    private EditText etSearchChats;
    private AvatarView btnProfileAvatar;
    private FloatingActionButton fabNewChat;
    private final List<Chat> allChats = new ArrayList<>();
    private String currentTab = "all";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_main);

        View mainCoord = findViewById(R.id.mainCoordinator);
        View appBar = findViewById(R.id.appBarLayout);
        fabNewChat = findViewById(R.id.fabNewChat);
        rvChats = findViewById(R.id.rvChats);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        emptyStateView = findViewById(R.id.emptyStateView);
        searchContainer = findViewById(R.id.searchContainer);
        etSearchChats = findViewById(R.id.etSearchChats);
        btnProfileAvatar = findViewById(R.id.btnProfileAvatar);

        // Precise Window Insets: Top pad for status bar, FAB & list pad for navigation bar
        ViewCompat.setOnApplyWindowInsetsListener(mainCoord, (v, insets) -> {
            Insets sysBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            appBar.setPadding(0, sysBars.top, 0, 0);

            // Position FAB 16dp above system gesture bar
            CoordinatorLayout.LayoutParams fabLp = (CoordinatorLayout.LayoutParams) fabNewChat.getLayoutParams();
            fabLp.bottomMargin = sysBars.bottom + dpToPx(16);
            fabNewChat.setLayoutParams(fabLp);

            // Padding for last chat item
            rvChats.setPadding(0, 0, 0, sysBars.bottom + dpToPx(88));
            return insets;
        });

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
            if (!visible) etSearchChats.requestFocus();
        });

        findViewById(R.id.btnSettings).setOnClickListener(v -> showProfileDialog());
        findViewById(R.id.btnProfileAvatar).setOnClickListener(v -> showProfileDialog());
        fabNewChat.setOnClickListener(v -> showNewChatDialog());

        swipeRefresh.setOnRefreshListener(this::loadChats);
    }

    private void setupTabs() {
        LinearLayout tabAll = findViewById(R.id.tabAll);
        LinearLayout tabDirect = findViewById(R.id.tabDirect);
        LinearLayout tabGroups = findViewById(R.id.tabGroups);
        LinearLayout tabChannels = findViewById(R.id.tabChannels);

        View.OnClickListener listener = v -> {
            int id = v.getId();
            resetTabPills();
            if (id == R.id.tabAll) {
                currentTab = "all";
                highlightTab(tabAll, R.id.tvTabAll, R.id.ivTabAll);
            } else if (id == R.id.tabDirect) {
                currentTab = "dm";
                highlightTab(tabDirect, R.id.tvTabDirect, R.id.ivTabDirect);
            } else if (id == R.id.tabGroups) {
                currentTab = "group";
                highlightTab(tabGroups, R.id.tvTabGroups, R.id.ivTabGroups);
            } else if (id == R.id.tabChannels) {
                currentTab = "channel";
                highlightTab(tabChannels, R.id.tvTabChannels, R.id.ivTabChannels);
            }
            filterChats();
        };

        tabAll.setOnClickListener(listener);
        tabDirect.setOnClickListener(listener);
        tabGroups.setOnClickListener(listener);
        tabChannels.setOnClickListener(listener);
    }

    private void resetTabPills() {
        int[] layoutIds = {R.id.tabAll, R.id.tabDirect, R.id.tabGroups, R.id.tabChannels};
        int[] textIds = {R.id.tvTabAll, R.id.tvTabDirect, R.id.tvTabGroups, R.id.tvTabChannels};
        int[] iconIds = {R.id.ivTabAll, R.id.ivTabDirect, R.id.ivTabGroups, R.id.ivTabChannels};

        for (int i = 0; i < layoutIds.length; i++) {
            LinearLayout l = findViewById(layoutIds[i]);
            TextView t = findViewById(textIds[i]);
            ImageView iv = findViewById(iconIds[i]);
            l.setBackground(null);
            t.setTextColor(getColor(R.color.text_secondary));
            t.setTypeface(null, android.graphics.Typeface.NORMAL);
            iv.setColorFilter(getColor(R.color.text_secondary));
        }
    }

    private void highlightTab(LinearLayout layout, int textId, int iconId) {
        layout.setBackgroundResource(R.drawable.bg_primary_button);
        TextView t = layout.findViewById(textId);
        t.setTextColor(Color.parseColor("#080C14"));
        t.setTypeface(null, android.graphics.Typeface.BOLD);
        ImageView iv = layout.findViewById(iconId);
        iv.setColorFilter(Color.parseColor("#080C14"));
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
                    btnProfileAvatar.setUser(user.getDisplayNameOrNick(), user.getEffectiveAvatar(), true);
                }
            }
            @Override
            public void onCancelled(@NonNull DatabaseError error) {}
        });
    }

    private void loadChats() {
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        if (myUid == null) {
            swipeRefresh.setRefreshing(false);
            return;
        }

        FirebaseManager.getInstance().getChatsRef().addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                allChats.clear();
                Set<String> dmUidsToFetch = new HashSet<>();

                for (DataSnapshot ds : snapshot.getChildren()) {
                    Chat c = ds.getValue(Chat.class);
                    if (c != null) {
                        c.id = ds.getKey();
                        List<String> members = c.getMemberList();
                        if (members.isEmpty() || members.contains(myUid)) {
                            allChats.add(c);
                            if ("dm".equalsIgnoreCase(c.type)) {
                                String otherUid = c.getOtherMemberUid(myUid);
                                if (otherUid != null) dmUidsToFetch.add(otherUid);
                            }
                        }
                    }
                }

                // Sort chats by most recent activity
                Collections.sort(allChats, (a, b) -> Long.compare(b.getLastMessageTimestamp(), a.getLastMessageTimestamp()));

                // Prefetch DM partners profiles before display
                if (!dmUidsToFetch.isEmpty()) {
                    FirebaseManager.getInstance().prefetchUsers(new ArrayList<>(dmUidsToFetch), () -> {
                        runOnUiThread(() -> {
                            swipeRefresh.setRefreshing(false);
                            filterChats();
                        });
                    });
                } else {
                    swipeRefresh.setRefreshing(false);
                    filterChats();
                }
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
            boolean tabMatch = "all".equals(currentTab);
            if ("dm".equals(currentTab)) tabMatch = "dm".equalsIgnoreCase(c.type) || c.isFav();
            else if ("group".equals(currentTab)) tabMatch = "group".equalsIgnoreCase(c.type);
            else if ("channel".equals(currentTab)) tabMatch = "channel".equalsIgnoreCase(c.type);

            String chatTitle = getResolvedChatTitle(c, myUid).toLowerCase();
            boolean queryMatch = query.isEmpty() || chatTitle.contains(query);

            if (tabMatch && queryMatch) filtered.add(c);
        }

        adapter.submitList(filtered);
        emptyStateView.setVisibility(filtered.isEmpty() ? View.VISIBLE : View.GONE);
    }

    public static String getResolvedChatTitle(Chat chat, String myUid) {
        if (chat.isFav()) return "Избранное";
        if ("dm".equalsIgnoreCase(chat.type)) {
            String otherUid = chat.getOtherMemberUid(myUid);
            if (otherUid != null) {
                User partner = FirebaseManager.getInstance().getCachedUser(otherUid);
                if (partner != null) return partner.getDisplayNameOrNick();
            }
            if (chat.title != null && !chat.title.trim().isEmpty()) return chat.title;
            return "Личный диалог";
        }
        if (chat.title != null && !chat.title.trim().isEmpty()) return chat.title;
        if (chat.name != null && !chat.name.trim().isEmpty()) return chat.name;
        return "Групповой чат";
    }

    public static String getResolvedChatAvatar(Chat chat, String myUid) {
        if ("dm".equalsIgnoreCase(chat.type)) {
            String otherUid = chat.getOtherMemberUid(myUid);
            if (otherUid != null) {
                User partner = FirebaseManager.getInstance().getCachedUser(otherUid);
                if (partner != null) return partner.getEffectiveAvatar();
            }
        }
        return chat.avatar;
    }

    private void showNewChatDialog() {
        final EditText input = new EditText(this);
        input.setHint("Название группы или никнейм");
        input.setPadding(36, 28, 36, 28);
        new AlertDialog.Builder(this)
            .setTitle(R.string.new_chat)
            .setView(input)
            .setPositiveButton("Создать", (dialog, which) -> {
                String title = input.getText().toString().trim();
                if (!title.isEmpty()) createGroupChat(title);
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void createGroupChat(String title) {
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
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        User me = FirebaseManager.getInstance().getCachedUser(myUid);
        String name = me != null ? me.getDisplayNameOrNick() : myUid;

        new AlertDialog.Builder(this)
            .setTitle(R.string.settings)
            .setMessage("Профиль: " + name + "\nUID: " + myUid)
            .setIcon(R.drawable.ic_settings_gear)
            .setPositiveButton(R.string.logout, (dialog, which) -> {
                FirebaseManager.getInstance().getAuth().signOut();
                startActivity(new Intent(MainActivity.this, AuthActivity.class));
                finish();
            })
            .setNegativeButton("Закрыть", null)
            .show();
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }
}
