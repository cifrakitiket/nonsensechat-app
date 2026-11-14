using System;
using System.Collections.Generic;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using Forms = System.Windows.Forms;

namespace NonsenseChat.Native {
    public class MainWindow : Window {
        private BackendService _backend;
        private Chat _activeChat;
        private string _activeFilter = "all"; // all, direct, group, channel

        // Left Sidebar controls
        private TextBox _searchBox;
        private StackPanel _chatListPanel;
        private TextBlock _userNameText;
        private TextBlock _userNickText;
        private Border _userAvatarContainer;
        private TextBlock _connStatusBadge;

        // Right Chat controls
        private Border _chatHeader;
        private TextBlock _chatHeaderTitle;
        private TextBlock _chatHeaderSubtitle;
        private Border _chatHeaderAvatar;
        private ScrollViewer _messagesScrollViewer;
        private StackPanel _messagesPanel;
        private TextBox _messageInput;
        private Button _sendBtn;
        private Button _spoilerBtn;
        private bool _isNextMessageSpoiler = false;
        private EmojiStickerPopup _emojiPopup;

        // System Tray
        private Forms.NotifyIcon _trayIcon;

        public MainWindow() {
            _backend = BackendService.Instance;

            // Enforce real authentication
            if (_backend.CurrentUser == null) {
                var auth = new AuthWindow();
                auth.ShowDialog();
                if (!auth.IsSuccess || _backend.CurrentUser == null) {
                    Application.Current.Shutdown();
                    return;
                }
            }

            Title = "Nonsense Chat";
            Width = 1060;
            Height = 720;
            MinWidth = 800;
            MinHeight = 560;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;

            // Load app icon
            try {
                string iconPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "public", "favicon.ico");
                if (!File.Exists(iconPath)) iconPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "favicon.ico");
                if (File.Exists(iconPath)) {
                    this.Icon = BitmapFrame.Create(new Uri(iconPath));
                }
            } catch { }

            SetupSystemTray();
            BuildUI();

            // Subscribe to Backend events
            _backend.OnMessageReceived += (msg) => {
                Dispatcher.Invoke((Action)(() => {
                    if (_activeChat != null && (_activeChat.id == _backend.ActiveChatId)) {
                        RenderMessages(_activeChat);
                    }
                    RefreshChatList();
                    ShowTrayNotification(msg.GetEffectiveAuthor(), msg.text);
                }));
            };

            _backend.OnChatsReloaded += () => {
                Dispatcher.Invoke((Action)(() => {
                    RefreshChatList();
                    if (_activeChat == null) {
                        var chats = _backend.GetChats();
                        if (chats.Count > 0) SelectChat(chats[0]);
                    }
                }));
            };

            _backend.OnChatUpdated += (chat) => {
                Dispatcher.Invoke((Action)(() => {
                    RefreshChatList();
                }));
            };

            _backend.OnStatusChanged += (status) => {
                Dispatcher.Invoke((Action)(() => {
                    if (_connStatusBadge != null) _connStatusBadge.Text = "● " + status;
                }));
            };

            // Initial load of chats
            var initialChats = _backend.GetChats();
            if (initialChats.Count > 0) {
                SelectChat(initialChats[0]);
            }
        }

        private void SetupSystemTray() {
            try {
                _trayIcon = new Forms.NotifyIcon {
                    Text = "Nonsense Chat Native",
                    Visible = true
                };

                string iconPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "public", "favicon.ico");
                if (!File.Exists(iconPath)) iconPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "favicon.ico");
                if (File.Exists(iconPath)) {
                    _trayIcon.Icon = new System.Drawing.Icon(iconPath);
                } else {
                    _trayIcon.Icon = System.Drawing.SystemIcons.Application;
                }

                _trayIcon.DoubleClick += (s, e) => {
                    Show();
                    WindowState = WindowState.Normal;
                    Activate();
                };

                var contextMenu = new Forms.ContextMenu();
                contextMenu.MenuItems.Add("Открыть Nonsense Chat", (s, e) => {
                    Show();
                    WindowState = WindowState.Normal;
                    Activate();
                });
                contextMenu.MenuItems.Add("Сменить аккаунт", (s, e) => {
                    _backend.SignOut();
                    var auth = new AuthWindow();
                    auth.ShowDialog();
                    if (_backend.CurrentUser != null) {
                        UpdateUserProfileBar();
                        RefreshChatList();
                    } else {
                        Application.Current.Shutdown();
                    }
                });
                contextMenu.MenuItems.Add("-");
                contextMenu.MenuItems.Add("Выход", (s, e) => {
                    _trayIcon.Visible = false;
                    _trayIcon.Dispose();
                    Forms.Application.Exit();
                    Environment.Exit(0);
                });
                _trayIcon.ContextMenu = contextMenu;
            } catch { }
        }

        private void ShowTrayNotification(string sender, string text) {
            try {
                if (WindowState == WindowState.Minimized || !IsActive) {
                    _trayIcon.ShowBalloonTip(3000, sender ?? "Nonsense Chat", text ?? "Новое сообщение", Forms.ToolTipIcon.Info);
                }
            } catch { }
        }

        private void BuildUI() {
            var rootBorder = new Border {
                CornerRadius = new CornerRadius(14),
                Background = Theme.BgRoot,
                BorderBrush = Theme.BorderActive,
                BorderThickness = new Thickness(1),
                ClipToBounds = true
            };

            var mainGrid = new Grid();
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(42) }); // Custom Title Bar
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            // 1. Custom Title Bar
            var titleBar = BuildTitleBar();
            Grid.SetRow(titleBar, 0);
            mainGrid.Children.Add(titleBar);

            // 2. Content Body (Sidebar + Chat Area)
            var contentGrid = new Grid();
            contentGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(320), MinWidth = 260, MaxWidth = 450 });
            contentGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1) }); // Divider
            contentGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            // Left Sidebar
            var sidebar = BuildSidebar();
            Grid.SetColumn(sidebar, 0);
            contentGrid.Children.Add(sidebar);

            // Divider
            var divider = new Border { Background = Theme.BorderSubtle };
            Grid.SetColumn(divider, 1);
            contentGrid.Children.Add(divider);

            // Right Chat Area
            var chatArea = BuildChatArea();
            Grid.SetColumn(chatArea, 2);
            contentGrid.Children.Add(chatArea);

            Grid.SetRow(contentGrid, 1);
            mainGrid.Children.Add(contentGrid);

            rootBorder.Child = mainGrid;
            this.Content = rootBorder;
        }

        private Border BuildTitleBar() {
            var bar = new Border {
                Background = Theme.BgSidebar,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(0, 0, 0, 1)
            };

            var grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            // Left App Logo & Title
            var leftStack = new StackPanel {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(14, 0, 0, 0)
            };

            var logoText = new TextBlock {
                Text = "⚡",
                FontSize = 16,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 6, 0)
            };
            var titleText = new TextBlock {
                Text = "Nonsense Chat",
                FontSize = 13,
                FontWeight = FontWeights.Bold,
                Foreground = Theme.TextPrimary,
                VerticalAlignment = VerticalAlignment.Center
            };

            string status = (_backend.CurrentUser != null) ? "● " + _backend.CurrentUser.email : "● Онлайн";
            _connStatusBadge = new TextBlock {
                Text = status,
                FontSize = 11,
                Foreground = Theme.AccentGreen,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(12, 0, 0, 0)
            };

            leftStack.Children.Add(logoText);
            leftStack.Children.Add(titleText);
            leftStack.Children.Add(_connStatusBadge);
            Grid.SetColumn(leftStack, 0);
            grid.Children.Add(leftStack);

            // Drag area
            var dragArea = new Border { Background = Brushes.Transparent };
            dragArea.MouseLeftButtonDown += (s, e) => {
                if (e.ClickCount == 2) {
                    ToggleMaximize();
                } else {
                    DragMove();
                }
            };
            Grid.SetColumn(dragArea, 1);
            grid.Children.Add(dragArea);

            // Window Controls (Minimize, Maximize, Close)
            var controlsStack = new StackPanel {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 8, 0)
            };

            var minBtn = CreateTitleButton("—", () => { WindowState = WindowState.Minimized; });
            var maxBtn = CreateTitleButton("□", ToggleMaximize);
            var closeBtn = CreateTitleButton("✕", () => {
                Hide();
                if (_trayIcon != null) {
                    _trayIcon.ShowBalloonTip(2000, "Nonsense Chat", "Приложение свернуто в системный трей", Forms.ToolTipIcon.Info);
                }
            }, true);

            controlsStack.Children.Add(minBtn);
            controlsStack.Children.Add(maxBtn);
            controlsStack.Children.Add(closeBtn);
            Grid.SetColumn(controlsStack, 2);
            grid.Children.Add(controlsStack);

            bar.Child = grid;
            return bar;
        }

        private void ToggleMaximize() {
            WindowState = (WindowState == WindowState.Maximized) ? WindowState.Normal : WindowState.Maximized;
        }

        private Border CreateTitleButton(string text, Action onClick, bool isClose = false) {
            var border = new Border {
                Width = 36,
                Height = 32,
                CornerRadius = new CornerRadius(6),
                Background = Brushes.Transparent,
                Cursor = Cursors.Hand,
                Margin = new Thickness(2, 0, 2, 0)
            };

            var tb = new TextBlock {
                Text = text,
                FontSize = 12,
                Foreground = Theme.TextSecondary,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            border.Child = tb;

            border.MouseEnter += (s, e) => {
                border.Background = isClose ? Theme.HexBrush("#EF4444") : Theme.BgCardHover;
                tb.Foreground = Brushes.White;
            };
            border.MouseLeave += (s, e) => {
                border.Background = Brushes.Transparent;
                tb.Foreground = Theme.TextSecondary;
            };
            border.MouseLeftButtonDown += (s, e) => { onClick(); };
            return border;
        }

        private Grid BuildSidebar() {
            var grid = new Grid { Background = Theme.BgSidebar };
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Search + Add
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Filter Tabs
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Chat list
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Current user bar

            // 1. Search + Add Chat
            var topSearchGrid = new Grid { Margin = new Thickness(12, 12, 12, 8) };
            topSearchGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            topSearchGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            _searchBox = new TextBox {
                Height = 34,
                Background = Theme.BgInput,
                Foreground = Theme.TextPrimary,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(10, 4, 10, 4),
                FontSize = 13,
                VerticalContentAlignment = VerticalAlignment.Center
            };
            _searchBox.TextChanged += (s, e) => { RefreshChatList(); };
            Grid.SetColumn(_searchBox, 0);
            topSearchGrid.Children.Add(_searchBox);

            var addChatBtn = Theme.CreateStyledButton("+", Theme.AccentGreen, Brushes.Black, 34, 8);
            addChatBtn.Width = 34;
            addChatBtn.ToolTip = "Создать новый чат";
            addChatBtn.Margin = new Thickness(8, 0, 0, 0);
            addChatBtn.Click += (s, e) => { PromptCreateChat(); };
            Grid.SetColumn(addChatBtn, 1);
            topSearchGrid.Children.Add(addChatBtn);

            Grid.SetRow(topSearchGrid, 0);
            grid.Children.Add(topSearchGrid);

            // 2. Folder Tabs (Все, Личные, Группы, Каналы)
            var tabsStack = new StackPanel {
                Orientation = Orientation.Horizontal,
                Margin = new Thickness(12, 0, 12, 8)
            };

            tabsStack.Children.Add(CreateFilterTab("Все", "all", true));
            tabsStack.Children.Add(CreateFilterTab("Личные", "direct", false));
            tabsStack.Children.Add(CreateFilterTab("Группы", "group", false));
            tabsStack.Children.Add(CreateFilterTab("Каналы", "channel", false));

            Grid.SetRow(tabsStack, 1);
            grid.Children.Add(tabsStack);

            // 3. Chat List ScrollViewer
            var scroll = new ScrollViewer {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled
            };
            _chatListPanel = new StackPanel { Margin = new Thickness(6, 0, 6, 6) };
            scroll.Content = _chatListPanel;
            Grid.SetRow(scroll, 2);
            grid.Children.Add(scroll);

            // 4. Current User Bar at Bottom
            var userBar = BuildUserProfileBar();
            Grid.SetRow(userBar, 3);
            grid.Children.Add(userBar);

            RefreshChatList();
            return grid;
        }

        private Border CreateFilterTab(string label, string filterKey, bool isDefault) {
            var border = new Border {
                Padding = new Thickness(10, 4, 10, 4),
                CornerRadius = new CornerRadius(6),
                Background = isDefault ? Theme.BgCardHover : Brushes.Transparent,
                Cursor = Cursors.Hand,
                Margin = new Thickness(0, 0, 4, 0)
            };

            var text = new TextBlock {
                Text = label,
                FontSize = 12,
                FontWeight = isDefault ? FontWeights.Bold : FontWeights.Normal,
                Foreground = isDefault ? Theme.AccentCyan : Theme.TextSecondary
            };
            border.Child = text;

            border.MouseLeftButtonDown += (s, e) => {
                _activeFilter = filterKey;
                var parent = border.Parent as StackPanel;
                if (parent != null) {
                    foreach (Border b in parent.Children) {
                        b.Background = Brushes.Transparent;
                        var tb = b.Child as TextBlock;
                        if (tb != null) {
                            tb.FontWeight = FontWeights.Normal;
                            tb.Foreground = Theme.TextSecondary;
                        }
                    }
                }
                border.Background = Theme.BgCardHover;
                text.FontWeight = FontWeights.Bold;
                text.Foreground = Theme.AccentCyan;
                RefreshChatList();
            };

            return border;
        }

        private Border BuildUserProfileBar() {
            var border = new Border {
                Background = Theme.BgCard,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(0, 1, 0, 0),
                Padding = new Thickness(12, 10, 12, 10)
            };

            var grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            _userAvatarContainer = new Border();
            Grid.SetColumn(_userAvatarContainer, 0);
            grid.Children.Add(_userAvatarContainer);

            var infoStack = new StackPanel {
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(10, 0, 10, 0)
            };
            _userNameText = new TextBlock {
                Text = "",
                FontSize = 13,
                FontWeight = FontWeights.Bold,
                Foreground = Theme.TextPrimary
            };
            _userNickText = new TextBlock {
                Text = "",
                FontSize = 11,
                Foreground = Theme.AccentGreen
            };
            infoStack.Children.Add(_userNameText);
            infoStack.Children.Add(_userNickText);
            Grid.SetColumn(infoStack, 1);
            grid.Children.Add(infoStack);

            // Log out / Switch Account Button
            var logoutBtn = new Border {
                Width = 32,
                Height = 32,
                CornerRadius = new CornerRadius(8),
                Background = Theme.BgInput,
                Cursor = Cursors.Hand,
                ToolTip = "Сменить аккаунт / Выйти"
            };
            var stText = new TextBlock {
                Text = "⏻",
                FontSize = 14,
                Foreground = Theme.TextSecondary,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            logoutBtn.Child = stText;
            logoutBtn.MouseEnter += (s, e) => { stText.Foreground = Theme.HexBrush("#EF4444"); };
            logoutBtn.MouseLeave += (s, e) => { stText.Foreground = Theme.TextSecondary; };
            logoutBtn.MouseLeftButtonDown += (s, e) => {
                _backend.SignOut();
                var auth = new AuthWindow();
                auth.ShowDialog();
                if (_backend.CurrentUser != null) {
                    UpdateUserProfileBar();
                    RefreshChatList();
                } else {
                    Application.Current.Shutdown();
                }
            };
            Grid.SetColumn(logoutBtn, 2);
            grid.Children.Add(logoutBtn);

            border.Child = grid;
            UpdateUserProfileBar();
            return border;
        }

        private void UpdateUserProfileBar() {
            var user = _backend.CurrentUser;
            if (user != null) {
                _userNameText.Text = user.GetDisplayNameOrNick();
                _userNickText.Text = "● @" + (!string.IsNullOrEmpty(user.nick) ? user.nick : "user");
                _userAvatarContainer.Child = Theme.CreateAvatar(user.GetInitials(), 36, user.uid != null ? user.uid.GetHashCode() : 0, true);
            }
        }

        private void RefreshChatList() {
            if (_chatListPanel == null) return;
            _chatListPanel.Children.Clear();

            string query = _searchBox != null ? _searchBox.Text.Trim().ToLower() : "";
            var chats = _backend.GetChats();

            foreach (var chat in chats) {
                // Filter by folder
                if (_activeFilter != "all") {
                    if (_activeFilter == "direct" && chat.IsGroup()) continue;
                    if (_activeFilter == "group" && (!chat.IsGroup() || chat.type == "channel")) continue;
                    if (_activeFilter == "channel" && chat.type != "channel") continue;
                }

                // Filter by search query
                string title = chat.GetEffectiveTitle(_backend.CurrentUser != null ? _backend.CurrentUser.uid : "", _backend.UsersCache);
                if (!string.IsNullOrEmpty(query)) {
                    if (!title.ToLower().Contains(query) && !chat.GetLatestMessageText().ToLower().Contains(query)) {
                        continue;
                    }
                }

                bool isSelected = (_activeChat != null && _activeChat.id == chat.id);
                var item = CreateChatItem(chat, isSelected);
                _chatListPanel.Children.Add(item);
            }
        }

        private Border CreateChatItem(Chat chat, bool isSelected) {
            var item = new Border {
                CornerRadius = new CornerRadius(10),
                Background = isSelected ? Theme.BgCardHover : Brushes.Transparent,
                BorderBrush = isSelected ? Theme.BorderActive : Brushes.Transparent,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8),
                Margin = new Thickness(0, 2, 0, 2),
                Cursor = Cursors.Hand
            };

            var grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            // Avatar
            string currentUid = _backend.CurrentUser != null ? _backend.CurrentUser.uid : "";
            var avatar = Theme.CreateAvatar(chat.GetInitials(currentUid, _backend.UsersCache), 44, chat.id.GetHashCode(), !chat.IsGroup());
            avatar.Margin = new Thickness(0, 0, 10, 0);
            Grid.SetColumn(avatar, 0);
            grid.Children.Add(avatar);

            // Info Stack
            var info = new StackPanel { VerticalAlignment = VerticalAlignment.Center };

            var topRow = new Grid();
            topRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            topRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var titleTb = new TextBlock {
                Text = chat.GetEffectiveTitle(currentUid, _backend.UsersCache),
                FontWeight = FontWeights.Bold,
                FontSize = 13,
                Foreground = Theme.TextPrimary,
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            Grid.SetColumn(titleTb, 0);
            topRow.Children.Add(titleTb);

            var timeTb = new TextBlock {
                Text = chat.GetFormattedTime(),
                FontSize = 11,
                Foreground = Theme.TextMuted,
                Margin = new Thickness(6, 0, 0, 0)
            };
            Grid.SetColumn(timeTb, 1);
            topRow.Children.Add(timeTb);

            info.Children.Add(topRow);

            var bottomRow = new Grid { Margin = new Thickness(0, 3, 0, 0) };
            bottomRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            bottomRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var lastMsgTb = new TextBlock {
                Text = chat.GetLatestMessageText(),
                FontSize = 12,
                Foreground = Theme.TextSecondary,
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            Grid.SetColumn(lastMsgTb, 0);
            bottomRow.Children.Add(lastMsgTb);

            if (chat.unreadCount > 0) {
                var badge = new Border {
                    Background = Theme.AccentGreen,
                    CornerRadius = new CornerRadius(9),
                    Padding = new Thickness(6, 1, 6, 1),
                    Margin = new Thickness(6, 0, 0, 0)
                };
                badge.Child = new TextBlock {
                    Text = chat.unreadCount.ToString(),
                    FontSize = 10,
                    FontWeight = FontWeights.Bold,
                    Foreground = Brushes.Black
                };
                Grid.SetColumn(badge, 1);
                bottomRow.Children.Add(badge);
            }

            info.Children.Add(bottomRow);

            Grid.SetColumn(info, 1);
            grid.Children.Add(info);

            item.Child = grid;

            item.MouseEnter += (s, e) => {
                if (_activeChat == null || _activeChat.id != chat.id) item.Background = Theme.BgCard;
            };
            item.MouseLeave += (s, e) => {
                if (_activeChat == null || _activeChat.id != chat.id) item.Background = Brushes.Transparent;
            };
            item.MouseLeftButtonDown += (s, e) => {
                SelectChat(chat);
            };

            return item;
        }

        private async void SelectChat(Chat chat) {
            _activeChat = chat;
            _backend.ActiveChatId = chat.id;
            chat.unreadCount = 0;
            RefreshChatList();

            // Update Header
            string currentUid = _backend.CurrentUser != null ? _backend.CurrentUser.uid : "";
            _chatHeaderTitle.Text = chat.GetEffectiveTitle(currentUid, _backend.UsersCache);
            _chatHeaderSubtitle.Text = chat.IsGroup() ? "групповой чат" : "в сети";
            _chatHeaderAvatar.Child = Theme.CreateAvatar(chat.GetInitials(currentUid, _backend.UsersCache), 38, chat.id.GetHashCode(), !chat.IsGroup());

            // Render current cached messages, then fetch latest from Firebase
            RenderMessages(chat);
            await _backend.FetchChatMessagesAsync(chat.id);
            RenderMessages(chat);
        }

        private Grid BuildChatArea() {
            var grid = new Grid { Background = Theme.BgRoot };
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(56) }); // Chat Header
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Message History
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Composer Bar

            // 1. Header
            _chatHeader = new Border {
                Background = Theme.BgSidebar,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(0, 0, 0, 1),
                Padding = new Thickness(16, 8, 16, 8)
            };

            var hGrid = new Grid();
            hGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            hGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            hGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            _chatHeaderAvatar = new Border { Margin = new Thickness(0, 0, 12, 0) };
            Grid.SetColumn(_chatHeaderAvatar, 0);
            hGrid.Children.Add(_chatHeaderAvatar);

            var hInfo = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            _chatHeaderTitle = new TextBlock {
                Text = "Выберите чат",
                FontSize = 14,
                FontWeight = FontWeights.Bold,
                Foreground = Theme.TextPrimary
            };
            _chatHeaderSubtitle = new TextBlock {
                Text = "",
                FontSize = 11,
                Foreground = Theme.AccentGreen
            };
            hInfo.Children.Add(_chatHeaderTitle);
            hInfo.Children.Add(_chatHeaderSubtitle);
            Grid.SetColumn(hInfo, 1);
            hGrid.Children.Add(hInfo);

            // Right header actions (Poll creation, Refresh)
            var actionStack = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
            var pollBtn = Theme.CreateStyledButton("📊 Опрос", Theme.BgCard, Theme.AccentCyan, 30, 6);
            pollBtn.Margin = new Thickness(0, 0, 8, 0);
            pollBtn.Click += (s, e) => { PromptCreatePoll(); };
            actionStack.Children.Add(pollBtn);

            Grid.SetColumn(actionStack, 2);
            hGrid.Children.Add(actionStack);

            _chatHeader.Child = hGrid;
            Grid.SetRow(_chatHeader, 0);
            grid.Children.Add(_chatHeader);

            // 2. Messages History
            _messagesScrollViewer = new ScrollViewer {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                Padding = new Thickness(16)
            };
            _messagesPanel = new StackPanel();
            _messagesScrollViewer.Content = _messagesPanel;
            Grid.SetRow(_messagesScrollViewer, 1);
            grid.Children.Add(_messagesScrollViewer);

            // 3. Message Input Composer
            var composer = BuildComposer();
            Grid.SetRow(composer, 2);
            grid.Children.Add(composer);

            return grid;
        }

        private Border BuildComposer() {
            var border = new Border {
                Background = Theme.BgSidebar,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(0, 1, 0, 0),
                Padding = new Thickness(14, 10, 14, 12)
            };

            var grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // Attach
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // Spoiler
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }); // Input text
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // Emoji
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto }); // Send

            // Attachment button
            var attachBtn = Theme.CreateStyledButton("📎", Theme.BgCard, Theme.TextSecondary, 38, 8);
            attachBtn.Width = 38;
            attachBtn.FontSize = 16;
            attachBtn.Margin = new Thickness(0, 0, 6, 0);
            attachBtn.Click += (s, e) => { HandleAttachment(); };
            Grid.SetColumn(attachBtn, 0);
            grid.Children.Add(attachBtn);

            // Spoiler Toggle Button
            _spoilerBtn = Theme.CreateStyledButton("👁", Theme.BgCard, Theme.TextSecondary, 38, 8);
            _spoilerBtn.Width = 38;
            _spoilerBtn.FontSize = 14;
            _spoilerBtn.Margin = new Thickness(0, 0, 8, 0);
            _spoilerBtn.ToolTip = "Скрыть под Telegram-спойлер";
            _spoilerBtn.Click += (s, e) => {
                _isNextMessageSpoiler = !_isNextMessageSpoiler;
                _spoilerBtn.Background = _isNextMessageSpoiler ? Theme.AccentCyan : Theme.BgCard;
                _spoilerBtn.Foreground = _isNextMessageSpoiler ? Brushes.Black : Theme.TextSecondary;
            };
            Grid.SetColumn(_spoilerBtn, 1);
            grid.Children.Add(_spoilerBtn);

            // Text Input Box
            _messageInput = new TextBox {
                Height = 38,
                Background = Theme.BgInput,
                Foreground = Theme.TextPrimary,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(12, 6, 12, 6),
                FontSize = 13,
                VerticalContentAlignment = VerticalAlignment.Center,
                AcceptsReturn = false
            };
            _messageInput.KeyDown += (s, e) => {
                if (e.Key == Key.Enter && !Keyboard.IsKeyDown(Key.LeftShift)) {
                    SendCurrentMessage();
                    e.Handled = true;
                }
            };
            Grid.SetColumn(_messageInput, 2);
            grid.Children.Add(_messageInput);

            // Emoji Picker Button
            var emojiBtn = Theme.CreateStyledButton("😊", Theme.BgCard, Theme.TextSecondary, 38, 8);
            emojiBtn.Width = 38;
            emojiBtn.FontSize = 16;
            emojiBtn.Margin = new Thickness(8, 0, 8, 0);
            _emojiPopup = new EmojiStickerPopup {
                PlacementTarget = emojiBtn
            };
            _emojiPopup.OnEmojiSelected += (emoji) => {
                _messageInput.Text += emoji;
                _messageInput.CaretIndex = _messageInput.Text.Length;
                _messageInput.Focus();
            };
            emojiBtn.Click += (s, e) => {
                _emojiPopup.IsOpen = !_emojiPopup.IsOpen;
            };
            Grid.SetColumn(emojiBtn, 3);
            grid.Children.Add(emojiBtn);

            // Send Button
            _sendBtn = Theme.CreateStyledButton("➤", Theme.AccentGreen, Brushes.Black, 38, 8);
            _sendBtn.Width = 44;
            _sendBtn.FontSize = 16;
            _sendBtn.Click += (s, e) => { SendCurrentMessage(); };
            Grid.SetColumn(_sendBtn, 4);
            grid.Children.Add(_sendBtn);

            border.Child = grid;
            return border;
        }

        private async void SendCurrentMessage() {
            if (_activeChat == null) return;
            string text = _messageInput.Text.Trim();
            if (string.IsNullOrEmpty(text)) return;

            bool isSpoiler = _isNextMessageSpoiler || (text.StartsWith("||") && text.EndsWith("||"));
            if (text.StartsWith("||") && text.EndsWith("||") && text.Length > 4) {
                text = text.Substring(2, text.Length - 4);
                isSpoiler = true;
            }

            _messageInput.Text = "";

            if (_isNextMessageSpoiler) {
                _isNextMessageSpoiler = false;
                _spoilerBtn.Background = Theme.BgCard;
                _spoilerBtn.Foreground = Theme.TextSecondary;
            }

            await _backend.SendMessageAsync(_activeChat.id, text, isSpoiler);
            RenderMessages(_activeChat);
        }

        private async void HandleAttachment() {
            if (_activeChat == null) return;
            try {
                var dlg = new Microsoft.Win32.OpenFileDialog {
                    Title = "Выберите файл или фото для отправки",
                    Filter = "Все файлы|*.*|Изображения|*.jpg;*.jpeg;*.png;*.gif;*.webp|Аудио|*.mp3;*.wav"
                };
                if (dlg.ShowDialog() == true) {
                    string filePath = dlg.FileName;
                    string ext = System.IO.Path.GetExtension(filePath).ToLower();
                    string fileName = System.IO.Path.GetFileName(filePath);

                    string type = "file";
                    if (ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" || ext == ".gif") {
                        type = "image";
                    } else if (ext == ".mp3" || ext == ".wav") {
                        type = "audio";
                    }

                    await _backend.SendMessageAsync(_activeChat.id, fileName, _isNextMessageSpoiler, type, filePath);
                    RenderMessages(_activeChat);
                }
            } catch (Exception ex) {
                MessageBox.Show("Ошибка при открытии файла: " + ex.Message);
            }
        }

        private void RenderMessages(Chat chat) {
            _messagesPanel.Children.Clear();
            var msgs = _backend.GetMessages(chat.id);
            string currentUid = _backend.CurrentUser != null ? _backend.CurrentUser.uid : "";

            foreach (var msg in msgs) {
                bool isOutgoing = msg.IsOutgoing(currentUid);
                var bubble = CreateMessageBubble(msg, isOutgoing);
                _messagesPanel.Children.Add(bubble);
            }

            _messagesScrollViewer.ScrollToEnd();
        }

        private Border CreateMessageBubble(Message msg, bool isOutgoing) {
            var row = new Border {
                HorizontalAlignment = isOutgoing ? HorizontalAlignment.Right : HorizontalAlignment.Left,
                Margin = new Thickness(0, 3, 0, 3),
                MaxWidth = 520
            };

            var bubble = new Border {
                Background = isOutgoing ? Theme.OutgoingBubble : Theme.IncomingBubble,
                BorderBrush = isOutgoing ? Theme.OutgoingBorder : Theme.IncomingBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = isOutgoing ? new CornerRadius(16, 16, 4, 16) : new CornerRadius(16, 16, 16, 4),
                Padding = new Thickness(12, 8, 12, 8)
            };

            var stack = new StackPanel();

            // Sender name (for incoming messages in groups)
            if (!isOutgoing) {
                string authorName = msg.GetEffectiveAuthor();
                if (_backend.UsersCache.ContainsKey(msg.uid ?? "")) {
                    authorName = _backend.UsersCache[msg.uid].GetDisplayNameOrNick();
                }

                var senderTb = new TextBlock {
                    Text = authorName,
                    FontWeight = FontWeights.Bold,
                    FontSize = 11,
                    Foreground = Theme.AccentCyan,
                    Margin = new Thickness(0, 0, 0, 4)
                };
                stack.Children.Add(senderTb);
            }

            // Message Content
            if (msg.type == "poll" && msg.poll != null) {
                var pollView = new PollView(msg.poll, _backend.CurrentUser != null ? _backend.CurrentUser.uid : "", isOutgoing);
                pollView.OnVoteSelected += async (optIdx) => {
                    await _backend.VotePollAsync(_activeChat.id, msg.id, optIdx);
                    RenderMessages(_activeChat);
                };
                stack.Children.Add(pollView);
            } else if (msg.type == "audio") {
                var voiceView = new VoiceMessageView(msg.duration, isOutgoing);
                stack.Children.Add(voiceView);
            } else if (msg.type == "image" && !string.IsNullOrEmpty(msg.fileUrl)) {
                try {
                    var img = new Image {
                        MaxWidth = 360,
                        MaxHeight = 260,
                        Stretch = Stretch.Uniform,
                        Margin = new Thickness(0, 0, 0, 4)
                    };
                    if (File.Exists(msg.fileUrl)) {
                        img.Source = new BitmapImage(new Uri(msg.fileUrl));
                    } else if (msg.fileUrl.StartsWith("http")) {
                        img.Source = new BitmapImage(new Uri(msg.fileUrl));
                    }
                    if (msg.spoiler) {
                        stack.Children.Add(new TelegramSpoilerView(img));
                    } else {
                        stack.Children.Add(img);
                    }
                } catch {
                    stack.Children.Add(new TextBlock { Text = "📷 " + (msg.text ?? "Фотография"), Foreground = Theme.TextPrimary });
                }
            } else {
                // Standard Text Message
                var contentTb = new TextBlock {
                    Text = msg.text ?? "",
                    FontSize = 13,
                    Foreground = Theme.TextPrimary,
                    TextWrapping = TextWrapping.Wrap
                };

                if (msg.spoiler) {
                    stack.Children.Add(new TelegramSpoilerView(contentTb));
                } else {
                    stack.Children.Add(contentTb);
                }
            }

            // Metadata footer (Time + checkmarks)
            var metaStack = new StackPanel {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
                Margin = new Thickness(8, 2, 0, 0)
            };

            var timeTb = new TextBlock {
                Text = msg.GetFormattedTime(),
                FontSize = 10,
                Foreground = Theme.TextMuted,
                VerticalAlignment = VerticalAlignment.Center
            };
            metaStack.Children.Add(timeTb);

            if (isOutgoing) {
                var checkTb = new TextBlock {
                    Text = " ✓✓",
                    FontSize = 10,
                    FontWeight = FontWeights.Bold,
                    Foreground = Theme.AccentGreen,
                    VerticalAlignment = VerticalAlignment.Center
                };
                metaStack.Children.Add(checkTb);
            }

            stack.Children.Add(metaStack);

            // Reactions bar
            var reactStack = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 4, 0, 0) };
            if (msg.reactions != null && msg.reactions.Count > 0) {
                foreach (var r in msg.reactions) {
                    var badge = new Border {
                        Background = Theme.BgCard,
                        CornerRadius = new CornerRadius(10),
                        Padding = new Thickness(6, 2, 6, 2),
                        Margin = new Thickness(0, 0, 4, 0),
                        Cursor = Cursors.Hand
                    };
                    badge.Child = new TextBlock {
                        Text = r.Key + " " + r.Value.Count,
                        FontSize = 11,
                        Foreground = Theme.TextPrimary
                    };
                    string em = r.Key;
                    badge.MouseLeftButtonDown += async (s, e) => {
                        await _backend.AddReactionAsync(_activeChat.id, msg.id, em);
                        RenderMessages(_activeChat);
                    };
                    reactStack.Children.Add(badge);
                }
            }

            // Add reaction button (+)
            var addReactBtn = new TextBlock {
                Text = " +😊",
                FontSize = 11,
                Foreground = Theme.TextMuted,
                Cursor = Cursors.Hand,
                VerticalAlignment = VerticalAlignment.Center
            };
            addReactBtn.MouseLeftButtonDown += async (s, e) => {
                await _backend.AddReactionAsync(_activeChat.id, msg.id, "❤️");
                RenderMessages(_activeChat);
            };
            reactStack.Children.Add(addReactBtn);
            stack.Children.Add(reactStack);

            bubble.Child = stack;
            row.Child = bubble;
            return row;
        }

        private string ShowInputPrompt(string message, string title, string defaultVal = "") {
            var prompt = new Window {
                Title = title,
                Width = 360,
                Height = 180,
                WindowStartupLocation = WindowStartupLocation.CenterScreen,
                WindowStyle = WindowStyle.None,
                AllowsTransparency = true,
                Background = Brushes.Transparent,
                ResizeMode = ResizeMode.NoResize
            };

            var border = new Border {
                CornerRadius = new CornerRadius(12),
                Background = Theme.BgRoot,
                BorderBrush = Theme.BorderActive,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(18)
            };

            var stack = new StackPanel();
            var titleTb = new TextBlock {
                Text = title,
                FontWeight = FontWeights.Bold,
                FontSize = 14,
                Foreground = Theme.TextPrimary,
                Margin = new Thickness(0, 0, 0, 6)
            };
            var msgTb = new TextBlock {
                Text = message,
                FontSize = 12,
                Foreground = Theme.TextSecondary,
                Margin = new Thickness(0, 0, 0, 10)
            };
            var input = new TextBox {
                Text = defaultVal,
                Height = 34,
                Background = Theme.BgInput,
                Foreground = Theme.TextPrimary,
                BorderBrush = Theme.BorderSubtle,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8, 4, 8, 4),
                FontSize = 13,
                VerticalContentAlignment = VerticalAlignment.Center
            };

            var btnGrid = new Grid { Margin = new Thickness(0, 14, 0, 0) };
            btnGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            btnGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            string result = null;

            var cancelBtn = Theme.CreateStyledButton("Отмена", Theme.BgCard, Theme.TextSecondary, 32, 6);
            cancelBtn.Margin = new Thickness(0, 0, 4, 0);
            cancelBtn.Click += (s, e) => { prompt.Close(); };
            Grid.SetColumn(cancelBtn, 0);
            btnGrid.Children.Add(cancelBtn);

            var okBtn = Theme.CreateStyledButton("OK", Theme.AccentGreen, Brushes.Black, 32, 6);
            okBtn.Margin = new Thickness(4, 0, 0, 0);
            okBtn.Click += (s, e) => {
                result = input.Text;
                prompt.Close();
            };
            Grid.SetColumn(okBtn, 1);
            btnGrid.Children.Add(okBtn);

            input.KeyDown += (s, e) => {
                if (e.Key == Key.Enter) {
                    result = input.Text;
                    prompt.Close();
                } else if (e.Key == Key.Escape) {
                    prompt.Close();
                }
            };

            stack.Children.Add(titleTb);
            stack.Children.Add(msgTb);
            stack.Children.Add(input);
            stack.Children.Add(btnGrid);
            border.Child = stack;
            prompt.Content = border;

            border.MouseLeftButtonDown += (s, e) => {
                if (e.LeftButton == MouseButtonState.Pressed) prompt.DragMove();
            };

            prompt.Loaded += (s, e) => {
                input.Focus();
                input.SelectAll();
            };

            prompt.ShowDialog();
            return result;
        }

        private async void PromptCreateChat() {
            string title = ShowInputPrompt("Введите название нового чата:", "Создание чата в Firebase", "Новый чат");
            if (!string.IsNullOrEmpty(title) && title.Trim().Length > 0) {
                var chat = await _backend.CreateChatAsync(title.Trim(), "group");
                if (chat != null) SelectChat(chat);
            }
        }

        private async void PromptCreatePoll() {
            if (_activeChat == null) return;
            string q = ShowInputPrompt("Введите вопрос для опроса:", "Создание опроса", "Ваше мнение?");
            if (string.IsNullOrEmpty(q)) return;

            var poll = new Poll { question = q.Trim(), anonymous = true };
            poll.options.Add(new PollOption("opt1", "Да, отлично 👍"));
            poll.options.Add(new PollOption("opt2", "Нормально 🙂"));
            poll.options.Add(new PollOption("opt3", "Есть над чем поработать"));

            await _backend.SendMessageAsync(_activeChat.id, q.Trim(), false, "poll", null, poll);
            RenderMessages(_activeChat);
        }
    }
}
