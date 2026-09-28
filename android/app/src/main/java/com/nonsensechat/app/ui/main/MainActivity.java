package com.nonsensechat.app.ui.main;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.CheckBox;
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

        // Precise Window Insets
        ViewCompat.setOnApplyWindowInsetsListener(mainCoord, (v, insets) -> {
            Insets sysBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            appBar.setPadding(0, sysBars.top, 0, 0);

            CoordinatorLayout.LayoutParams fabLp = (CoordinatorLayout.LayoutParams) fabNewChat.getLayoutParams();
            fabLp.bottomMargin = sysBars.bottom + dpToPx(16);
            fabNewChat.setLayoutParams(fabLp);

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
            else etSearchChats.setText("");
        });

        findViewById(R.id.btnSettings).setOnClickListener(v -> showSettingsDialog());
        btnProfileAvatar.setOnClickListener(v -> showMyProfileDialog());
        fabNewChat.setOnClickListener(v -> showNewChatMenu());

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
            l.setBackgroundResource(R.drawable.bg_tab_inactive);
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
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        if (myUid == null) {
            redirectToAuth();
            return;
        }

        FirebaseManager.getInstance().getUserRef(myUid).addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                try {
                    User me = User.fromSnapshot(snapshot);
                    if (me != null) {
                        me.uid = myUid;
                        FirebaseManager.getInstance().putCachedUser(me);
                        btnProfileAvatar.setUser(me.getDisplayNameOrNick(), me.getEffectiveAvatar(), me.online);
                    }
                } catch (Exception ignored) {}
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
                try {
                    swipeRefresh.setRefreshing(false);
                    allChats.clear();
                    Set<String> uidsToFetch = new HashSet<>();

                    for (DataSnapshot ds : snapshot.getChildren()) {
                        Chat chat = Chat.fromSnapshot(ds);
                        if (chat != null) {
                            chat.id = ds.getKey();
                            if (chat.isMember(myUid)) {
                                allChats.add(chat);
                                String partnerUid = chat.getOtherMemberUid(myUid);
                                if (partnerUid != null) uidsToFetch.add(partnerUid);
                            }
                        }
                    }

                    // Make sure Saved Messages ("Избранное") is included
                    boolean hasFav = false;
                    for (Chat c : allChats) {
                        if (c.isFav()) { hasFav = true; break; }
                    }
                    if (!hasFav) {
                        Chat favChat = new Chat();
                        favChat.id = "fav_" + myUid;
                        favChat.type = "fav";
                        favChat.name = "Избранное";
                        favChat.lastMsg = "Ваши сохранённые сообщения";
                        favChat.members = Collections.singletonList(myUid);
                        allChats.add(favChat);
                    }

                    Collections.sort(allChats, (a, b) -> Long.compare(b.getLastActivityMillis(), a.getLastActivityMillis()));

                    FirebaseManager.getInstance().prefetchUsers(new ArrayList<>(uidsToFetch), () -> {
                        filterChats();
                    });
                } catch (Exception ignored) {}
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                swipeRefresh.setRefreshing(false);
            }
        });
    }

    private void filterChats() {
        String query = etSearchChats.getText().toString().trim().toLowerCase();
        String myUid = FirebaseManager.getInstance().getCurrentUid();
        List<Chat> filtered = new ArrayList<>();

        for (Chat chat : allChats) {
            boolean matchesTab = false;
            if ("all".equals(currentTab)) {
                matchesTab = true;
            } else if ("dm".equals(currentTab)) {
                matchesTab = chat.isDirect() || chat.isFav();
            } else if ("group".equals(currentTab)) {
                matchesTab = chat.isGroup() && !"channel".equalsIgnoreCase(chat.type);
            } else if ("channel".equals(currentTab)) {
                matchesTab = "channel".equalsIgnoreCase(chat.type);
            }

            if (!matchesTab) continue;

            String title = getResolvedChatTitle(chat, myUid).toLowerCase();
            String lastMsg = chat.lastMsg != null ? chat.lastMsg.toLowerCase() : "";

            if (query.isEmpty() || title.contains(query) || lastMsg.contains(query)) {
                filtered.add(chat);
            }
        }

        adapter.submitList(filtered);
        emptyStateView.setVisibility(filtered.isEmpty() ? View.VISIBLE : View.GONE);
    }

    public static String getResolvedChatTitle(Chat chat, String myUid) {
        if (chat == null) return "Чат";
        if (chat.isFav()) return "Избранное";
        if (chat.isDirect()) {
            String partnerUid = chat.getOtherMemberUid(myUid);
            User partner = FirebaseManager.getInstance().getCachedUser(partnerUid);
            if (partner != null) return partner.getDisplayNameOrNick();
            return (chat.name != null && !chat.name.isEmpty()) ? chat.name : "Диалог";
        }
        return (chat.name != null && !chat.name.isEmpty()) ? chat.name : "Группа";
    }

    public static String getResolvedChatAvatar(Chat chat, String myUid) {
        if (chat == null) return null;
        if (chat.isFav()) return null;
        if (chat.isDirect()) {
            String partnerUid = chat.getOtherMemberUid(myUid);
            User partner = FirebaseManager.getInstance().getCachedUser(partnerUid);
            if (partner != null) return partner.getEffectiveAvatar();
        }
        return chat.avatar;
    }

    private void showNewChatMenu() {
        String[] options = {"👥 Создать группу", "📢 Создать канал", "💬 Начать диалог / Найти пользователя"};
        new AlertDialog.Builder(this)
            .setTitle("Новое действие")
            .setItems(options, (dialog, which) -> {
                if (which == 0) showCreateGroupDialog(false);
                else if (which == 1) showCreateGroupDialog(true);
                else if (which == 2) showStartDirectChatDialog();
            })
            .show();
    }

    private void showCreateGroupDialog(boolean isChannel) {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_create_group, null);
        TextView tvTitle = view.findViewById(R.id.tvCreateGroupTitle);
        EditText etName = view.findViewById(R.id.etGroupName);
        EditText etAvatar = view.findViewById(R.id.etGroupAvatar);
        CheckBox cbChannel = view.findViewById(R.id.cbIsChannel);

        tvTitle.setText(isChannel ? "Новый канал" : "Новая группа");
        cbChannel.setChecked(isChannel);

        new AlertDialog.Builder(this)
            .setView(view)
            .setPositiveButton("Создать", (dialog, which) -> {
                String name = etName.getText().toString().trim();
                String avatar = etAvatar.getText().toString().trim();
                if (name.isEmpty()) {
                    Toast.makeText(this, "Введите название", Toast.LENGTH_SHORT).show();
                    return;
                }
                FirebaseManager.getInstance().createGroup(name, avatar, cbChannel.isChecked(), null, (error, ref) -> {
                    if (error == null) {
                        Toast.makeText(this, isChannel ? "Канал создан!" : "Группа создана!", Toast.LENGTH_SHORT).show();
                        loadChats();
                    } else {
                        Toast.makeText(this, "Ошибка создания: " + error.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void showStartDirectChatDialog() {
        final EditText inputNick = new EditText(this);
        inputNick.setHint("Никнейм собеседника...");
        inputNick.setBackgroundResource(R.drawable.bg_input_field);
        inputNick.setPadding(36, 28, 36, 28);
        inputNick.setTextColor(Color.WHITE);
        inputNick.setHintTextColor(Color.parseColor("#7E91A6"));

        new AlertDialog.Builder(this)
            .setTitle("Начать диалог")
            .setMessage("Введите точный никнейм пользователя:")
            .setView(inputNick)
            .setPositiveButton("Найти и открыть", (dialog, which) -> {
                String nick = inputNick.getText().toString().trim();
                if (nick.isEmpty()) return;

                FirebaseManager.getInstance().getUsersRef().addListenerForSingleValueEvent(new ValueEventListener() {
                    @Override
                    public void onDataChange(@NonNull DataSnapshot snapshot) {
                        try {
                            String foundUid = null;
                            User foundUser = null;
                            for (DataSnapshot ds : snapshot.getChildren()) {
                                User u = User.fromSnapshot(ds);
                                if (u != null && nick.equalsIgnoreCase(u.nick)) {
                                    foundUid = ds.getKey();
                                    foundUser = u;
                                    foundUser.uid = foundUid;
                                    break;
                                }
                            }

                            if (foundUid != null) {
                                final User u = foundUser;
                                FirebaseManager.getInstance().createDirectChat(foundUid, chat -> {
                                    if (chat != null) {
                                        Intent intent = new Intent(MainActivity.this, ChatActivity.class);
                                        intent.putExtra("chat", chat);
                                        startActivity(intent);
                                    }
                                });
                            } else {
                                Toast.makeText(MainActivity.this, "Пользователь @" + nick + " не найден", Toast.LENGTH_SHORT).show();
                            }
                        } catch (Exception ignored) {}
                    }

                    @Override
                    public void onCancelled(@NonNull DatabaseError error) {}
                });
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void showMyProfileDialog() {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_my_profile, null);
        AvatarView av = view.findViewById(R.id.profileAvatarView);
        TextView tvUid = view.findViewById(R.id.tvProfileUid);
        EditText etNick = view.findViewById(R.id.etProfileNick);
        EditText etBio = view.findViewById(R.id.etProfileBio);
        EditText etAvatar = view.findViewById(R.id.etProfileAvatarUrl);

        String myUid = FirebaseManager.getInstance().getCurrentUid();
        User me = FirebaseManager.getInstance().getCachedUser(myUid);

        if (me != null) {
            av.setUser(me.getDisplayNameOrNick(), me.getEffectiveAvatar(), true);
            tvUid.setText("UID: " + myUid);
            etNick.setText(me.nick != null ? me.nick : "");
            etBio.setText(me.bio != null ? me.bio : "");
            etAvatar.setText(me.avatar != null ? me.avatar : "");
        }

        new AlertDialog.Builder(this)
            .setView(view)
            .setPositiveButton("Сохранить", (dialog, which) -> {
                String newNick = etNick.getText().toString().trim();
                String newBio = etBio.getText().toString().trim();
                String newAvatar = etAvatar.getText().toString().trim();
                FirebaseManager.getInstance().updateUserProfile(newNick, newBio, newAvatar, (error, ref) -> {
                    if (error == null) {
                        Toast.makeText(this, "Профиль обновлен", Toast.LENGTH_SHORT).show();
                        loadCurrentUser();
                    }
                });
            })
            .setNegativeButton("Отмена", null)
            .show();
    }

    private void showSettingsDialog() {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_settings, null);
        view.findViewById(R.id.btnSettingProfile).setOnClickListener(v -> showMyProfileDialog());
        view.findViewById(R.id.btnLogout).setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                .setTitle("Выйти?")
                .setMessage("Вы уверены, что хотите выйти из аккаунта?")
                .setPositiveButton("Выйти", (d, w) -> {
                    FirebaseManager.getInstance().getAuth().signOut();
                    redirectToAuth();
                })
                .setNegativeButton("Отмена", null)
                .show();
        });

        new AlertDialog.Builder(this)
            .setView(view)
            .setPositiveButton("Готово", null)
            .show();
    }

    private void redirectToAuth() {
        Intent intent = new Intent(MainActivity.this, AuthActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density + 0.5f);
    }
}
