import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChats, useMessages } from '@/hooks/useChats';
import { TitleBar } from '@/components/TitleBar';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { AuthModal } from '@/components/AuthModal';
import { NewChatModal } from '@/components/NewChatModal';
import { SettingsModal } from '@/components/SettingsModal';
import { ProfileModal } from '@/components/ProfileModal';
import { CreatePollModal } from '@/components/CreatePollModal';
import { ForwardModal } from '@/components/ForwardModal';
import {
  TelegramNotificationContainer,
  type TelegramToastItem,
} from '@/components/TelegramNotification';
import { sendDesktopNotification, requestNotificationPermission } from '@/lib/notifications';
import { soundFX } from '@/lib/sounds';
import { rtdb } from '@/lib/firebase';
import { ref, get, set, serverTimestamp } from 'firebase/database';
import type { User, Message, PollData } from '@/types';

export const App: React.FC = () => {
  const { user: currentUser, loading: authLoading, error: authError, login, register, logout } = useAuth();
  const { chats, users, loading: chatsLoading, createDirectChat, createGroup, markRead } = useChats(currentUser?.uid);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const { messages, loading: messagesLoading, sendMessage } = useMessages(activeChatId);

  // App settings state
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('nc_theme') || 'dark');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('nc_sound') !== 'false');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => localStorage.getItem('nc_notif') !== 'false');

  // Telegram Custom Notification settings
  const [tgNotifEnabled, setTgNotifEnabled] = useState<boolean>(() => localStorage.getItem('nc_tg_notif') !== 'false');
  const [tgNotifSound, setTgNotifSound] = useState<boolean>(() => localStorage.getItem('nc_tg_sound') !== 'false');
  const [tgNotifPos, setTgNotifPos] = useState<'bottom-right' | 'top-right'>(() => (localStorage.getItem('nc_tg_pos') as 'bottom-right' | 'top-right') || 'bottom-right');
  const [tgNotifPreview, setTgNotifPreview] = useState<boolean>(() => localStorage.getItem('nc_tg_preview') !== 'false');

  // In-app Telegram-style toast notifications state
  const [tgNotifications, setTgNotifications] = useState<TelegramToastItem[]>([]);

  // Modals state
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  // Track previous message count for desktop notifications
  const lastMessageCountRef = useRef<number>(0);
  const knownChatsMapRef = useRef<Record<string, number>>({});
  const initialChatsLoadedRef = useRef<boolean>(false);

  // Apply theme class to document body
  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('nc_theme', theme);
  }, [theme]);

  // Sync sound settings
  useEffect(() => {
    soundFX.enabled = soundEnabled;
    localStorage.setItem('nc_sound', String(soundEnabled));
  }, [soundEnabled]);

  // Sync notification permissions
  useEffect(() => {
    localStorage.setItem('nc_notif', String(notificationsEnabled));
    if (notificationsEnabled) {
      requestNotificationPermission();
    }
  }, [notificationsEnabled]);

  // Sync Telegram notification settings
  useEffect(() => {
    localStorage.setItem('nc_tg_notif', String(tgNotifEnabled));
  }, [tgNotifEnabled]);

  useEffect(() => {
    localStorage.setItem('nc_tg_sound', String(tgNotifSound));
  }, [tgNotifSound]);

  useEffect(() => {
    localStorage.setItem('nc_tg_pos', tgNotifPos);
  }, [tgNotifPos]);

  useEffect(() => {
    localStorage.setItem('nc_tg_preview', String(tgNotifPreview));
  }, [tgNotifPreview]);

  // Ensure Favorites chat exists for user
  useEffect(() => {
    if (!currentUser?.uid) return;
    const favId = `fav_${currentUser.uid}`;
    const checkFav = async () => {
      try {
        const favRef = ref(rtdb, `chats/${favId}`);
        const snap = await get(favRef);
        if (!snap.exists()) {
          await set(favRef, {
            type: 'fav',
            name: 'Избранное',
            members: [currentUser.uid],
            lastMsg: 'Ваши сохранённые сообщения',
            lastMsgAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid,
          });
        }
      } catch (_) {}
    };
    checkFav();
  }, [currentUser?.uid]);

  // Total unread messages across all chats
  const totalUnreadCount = React.useMemo(() => {
    return chats.reduce((sum, c) => {
      const u = c.unread;
      return sum + (typeof u === 'number' && u > 0 ? u : 0);
    }, 0);
  }, [chats]);

  // Unread count IPC — update taskbar badge when total unread changes
  useEffect(() => {
    if (!currentUser?.uid) return;
    const w = window as unknown as {
      electronAPI?: { setUnreadCount?: (count: number) => void };
    };
    w.electronAPI?.setUnreadCount?.(totalUnreadCount);
  }, [totalUnreadCount, currentUser?.uid]);

  // Helper to trigger custom Telegram desktop notification on Windows Desktop
  const triggerDesktopTelegramNotification = useCallback(
    (item: {
      chatId: string;
      senderName: string;
      senderAvatar?: string;
      chatTitle?: string;
      text: string;
    }) => {
      if (!tgNotifEnabled) return;
      const w = window as unknown as {
        electronAPI?: {
          showDesktopNotification?: (data: unknown) => void;
        };
      };

      if (w.electronAPI?.showDesktopNotification) {
        w.electronAPI.showDesktopNotification({
          chatId: item.chatId,
          senderName: item.senderName,
          senderAvatar: item.senderAvatar,
          chatTitle: item.chatTitle,
          text: item.text,
          playSound: tgNotifSound && soundEnabled,
        });
      } else {
        // Browser fallback
        if (tgNotifSound && soundEnabled) {
          soundFX.playReceived();
        }
        if (notificationsEnabled) {
          sendDesktopNotification(item.senderName, item.text, item.chatId, item.senderAvatar);
        }
      }

      // Also add an in-app toast notification
      const toastItem: TelegramToastItem = {
        id: `tg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        chatId: item.chatId,
        senderName: item.senderName,
        senderAvatar: item.senderAvatar,
        chatTitle: item.chatTitle,
        text: item.text,
        ts: Date.now(),
      };
      setTgNotifications((prev) => [...prev.slice(-9), toastItem]);
    },
    [tgNotifEnabled, tgNotifSound, soundEnabled, notificationsEnabled]
  );

  // Listen for desktop notification interactions (click to open chat, quick inline reply)
  useEffect(() => {
    const w = window as unknown as {
      electronAPI?: {
        onOpenChat?: (cb: (chatId: string) => void) => void;
        onQuickReply?: (cb: (data: { chatId: string; text: string }) => void) => void;
      };
    };

    if (w.electronAPI?.onOpenChat) {
      w.electronAPI.onOpenChat((chatId: string) => {
        handleSelectChat(chatId);
      });
    }

    if (w.electronAPI?.onQuickReply) {
      w.electronAPI.onQuickReply(async (data: { chatId: string; text: string }) => {
        if (!currentUser?.uid || !data?.chatId || !data?.text) return;
        await sendMessage(data.chatId, currentUser.uid, data.text);
        if (soundEnabled) {
          soundFX.playSent();
        }
      });
    }
  }, [currentUser?.uid, sendMessage, soundEnabled]);

  const handleTestTgNotification = () => {
    triggerDesktopTelegramNotification({
      chatId: activeChatId || 'test_chat',
      senderName: 'Павел Дуров',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      chatTitle: 'Беспонтовый Чат',
      text: 'Кастомные уведомления Telegram на рабочем столе Windows работают отлично! 🚀',
    });
  };

  // Real-time notification trigger across ALL chats
  useEffect(() => {
    if (!chats || chats.length === 0) return;

    // First load: snapshot existing timestamps without firing old notifications
    if (!initialChatsLoadedRef.current) {
      chats.forEach((c) => {
        knownChatsMapRef.current[c.id] = c.lastTs || 0;
      });
      initialChatsLoadedRef.current = true;
      return;
    }

    chats.forEach((c) => {
      const prevTs = knownChatsMapRef.current[c.id];
      const currentTs = c.lastTs || 0;

      if (prevTs !== undefined && currentTs > prevTs) {
        const senderUid = c.lastMessage?.uid;
        if (senderUid && senderUid !== currentUser?.uid) {
          const isCurrentActiveAndFocused = c.id === activeChatId && document.hasFocus();

          if (!isCurrentActiveAndFocused) {
            const sender = users[senderUid];
            const senderName = sender?.displayName || sender?.nick || 'Новое сообщение';
            const senderAvatar = sender?.avatar;
            const chatTitle = c.type === 'group' || c.type === 'channel' ? (c.name || 'Группа') : undefined;
            const rawText = c.lastMessage?.text || 'Новое сообщение';
            const text = tgNotifPreview ? rawText : 'Новое сообщение';

            // Show Telegram custom desktop notification
            if (tgNotifEnabled) {
              triggerDesktopTelegramNotification({
                chatId: c.id,
                senderName,
                senderAvatar,
                chatTitle,
                text,
              });
            } else if (notificationsEnabled) {
              sendDesktopNotification(senderName, rawText, c.id, senderAvatar);
            }
          }
        }
      }
      knownChatsMapRef.current[c.id] = currentTs;
    });
  }, [chats, currentUser?.uid, activeChatId, users, tgNotifEnabled, tgNotifPreview, notificationsEnabled, triggerDesktopTelegramNotification]);

  // Real-time sound/notification when in active chat
  useEffect(() => {
    if (!messages.length) {
      lastMessageCountRef.current = 0;
      return;
    }

    if (messages.length > lastMessageCountRef.current && lastMessageCountRef.current !== 0) {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg.uid !== currentUser?.uid) {
        if (soundEnabled && !tgNotifEnabled) {
          soundFX.playReceived();
        }
        // If app window is hidden or blurred, also ensure desktop notification is triggered
        if (!document.hasFocus() || document.hidden) {
          const sender = users[latestMsg.uid];
          const senderName = sender?.displayName || sender?.nick || 'Новое сообщение';
          if (tgNotifEnabled) {
            triggerDesktopTelegramNotification({
              chatId: activeChatId!,
              senderName,
              senderAvatar: sender?.avatar,
              chatTitle: activeChat?.type === 'group' ? activeChat.name : undefined,
              text: tgNotifPreview ? (latestMsg.text || 'Новое сообщение') : 'Новое сообщение',
            });
          } else if (notificationsEnabled) {
            sendDesktopNotification(senderName, latestMsg.text, activeChatId || undefined, sender?.avatar);
          }
        }
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, currentUser?.uid, soundEnabled, tgNotifEnabled, tgNotifPreview, notificationsEnabled, activeChatId, activeChat, users, triggerDesktopTelegramNotification]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Focus sidebar search input
        const searchInput = document.querySelector<HTMLInputElement>('.search-bar input');
        searchInput?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowNewChat(true);
      }
      if (e.key === 'Escape') {
        setShowNewChat(false);
        setShowSettings(false);
        setShowCreatePoll(false);
        setForwardMessage(null);
        setProfileUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    if (currentUser?.uid) {
      markRead(chatId, currentUser.uid);
    }
  };

  const handleSendMessage = async (
    text: string,
    replyTo?: string,
    replyPreview?: string,
    poll?: PollData,
    audioUrl?: string,
    audioDuration?: number,
    forwardFrom?: string,
    attachment?: {
      type: 'photo' | 'file' | 'audio' | 'video';
      url: string;
      fileName?: string;
      fileSize?: number;
      caption?: string;
      isSpoiler?: boolean;
    }
  ) => {
    if (!activeChatId || !currentUser?.uid) return;
    await sendMessage(
      activeChatId,
      currentUser.uid,
      text,
      replyTo,
      replyPreview,
      poll,
      audioUrl,
      audioDuration,
      forwardFrom,
      attachment
    );
  };

  const handleForwardMessage = async (targetChatId: string, msg: Message) => {
    if (!currentUser?.uid) return;
    setForwardMessage(null);
    const authorName = users[msg.uid]?.displayName || users[msg.uid]?.nick || 'Пользователь';
    let attachment: {
      type: 'photo' | 'file' | 'audio' | 'video';
      url: string;
      fileName?: string;
      fileSize?: number;
      caption?: string;
      isSpoiler?: boolean;
    } | undefined = undefined;

    const resolvedPhotoUrl = msg.photoUrl || (msg.attachment?.type === 'photo' ? msg.attachment.url : '') || (msg.fileUrl && /\.(jpg|jpeg|png|gif|webp|bmp|heic)(\?|$)/i.test(msg.fileUrl) ? msg.fileUrl : '');
    if (resolvedPhotoUrl) {
      attachment = {
        type: 'photo',
        url: resolvedPhotoUrl,
        caption: msg.caption || msg.text || undefined,
        isSpoiler: msg.isSpoiler,
      };
    } else if (msg.type === 'video' || (msg.fileUrl && /\.(mp4|webm|mov|mkv)(\?|$)/i.test(msg.fileUrl))) {
      attachment = {
        type: 'video',
        url: msg.fileUrl || '',
        fileName: msg.fileName || 'video.mp4',
        fileSize: msg.fileSize,
        caption: msg.caption,
      };
    } else if (msg.type === 'audio' || (msg.fileUrl && /\.(mp3|wav|ogg|m4a|flac)(\?|$)/i.test(msg.fileUrl))) {
      attachment = {
        type: 'audio',
        url: msg.fileUrl || '',
        fileName: msg.fileName || 'audio.mp3',
        fileSize: msg.fileSize,
      };
    } else if (msg.fileUrl) {
      attachment = {
        type: 'file',
        url: msg.fileUrl,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
      };
    } else if (msg.type === 'sticker' && msg.stickerUrl) {
      attachment = {
        type: 'photo',
        url: msg.stickerUrl,
        fileName: 'sticker.webp',
      };
    }

    await sendMessage(
      targetChatId,
      currentUser.uid,
      msg.text,
      undefined,
      undefined,
      msg.poll,
      msg.audioUrl,
      msg.audioDuration,
      authorName,
      attachment
    );
    handleSelectChat(targetChatId);
  };

  if (authLoading) {
    return (
      <div className="full-center" style={{ height: '100vh', background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: '42px', height: '42px' }} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TitleBar
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          notificationsEnabled={notificationsEnabled}
          onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
        />
        <AuthModal onLogin={login} onRegister={register} error={authError} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Frameless Native Desktop Title Bar */}
      <TitleBar
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
        title={activeChat ? (activeChat.name || (activeChat.type === 'fav' ? 'Избранное' : 'Беспонтовый Чат')) : 'Беспонтовый Чат'}
        unreadCount={totalUnreadCount}
      />

      {/* Main Workspace */}
      <div className="app" style={{ flex: 1, minHeight: 0 }}>
        <Sidebar
          currentUser={currentUser}
          chats={chats}
          users={users}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenSettings={() => setShowSettings(true)}
        />

        <ChatArea
          chat={activeChat}
          currentUser={currentUser}
          users={users}
          messages={messages}
          loadingMessages={messagesLoading}
          onSendMessage={handleSendMessage}
          onOpenProfile={(u) => setProfileUser(u)}
          onOpenCreatePoll={() => setShowCreatePoll(true)}
          onOpenForward={(msg) => setForwardMessage(msg)}
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Modals */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreateDirect={async (nick) => {
            if (!currentUser) return null;
            return await createDirectChat(currentUser.uid, nick);
          }}
          onCreateGroup={async (name, members, avatar) => {
            if (!currentUser) return null;
            return await createGroup(currentUser.uid, name, members, avatar);
          }}
          onChatCreated={(chatId) => {
            handleSelectChat(chatId);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentUser={currentUser}
          currentTheme={theme}
          onChangeTheme={setTheme}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          notificationsEnabled={notificationsEnabled}
          onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
          tgNotifEnabled={tgNotifEnabled}
          onToggleTgNotif={() => setTgNotifEnabled(!tgNotifEnabled)}
          tgNotifSound={tgNotifSound}
          onToggleTgSound={() => setTgNotifSound(!tgNotifSound)}
          tgNotifPos={tgNotifPos}
          onChangeTgPos={setTgNotifPos}
          tgNotifPreview={tgNotifPreview}
          onToggleTgPreview={() => setTgNotifPreview(!tgNotifPreview)}
          onTestTgNotification={handleTestTgNotification}
          onClose={() => setShowSettings(false)}
          onLogout={logout}
        />
      )}

      {profileUser && (
        <ProfileModal
          user={profileUser}
          onClose={() => setProfileUser(null)}
          onStartChat={async (targetUser) => {
            if (!currentUser) return;
            const chatId = await createDirectChat(currentUser.uid, targetUser.nick);
            if (chatId) handleSelectChat(chatId);
          }}
        />
      )}

      {showCreatePoll && (
        <CreatePollModal
          onClose={() => setShowCreatePoll(false)}
          onSubmit={(poll) => {
            handleSendMessage(`📊 ${poll.question}`, undefined, undefined, poll);
          }}
        />
      )}

      {forwardMessage && (
        <ForwardModal
          message={forwardMessage}
          chats={chats}
          users={users}
          currentUser={currentUser}
          onClose={() => setForwardMessage(null)}
          onForward={handleForwardMessage}
        />
      )}

      {/* In-app Telegram-style toast notifications */}
      <TelegramNotificationContainer
        notifications={tgNotifications}
        position={tgNotifPos}
        onDismiss={(id) => setTgNotifications((prev) => prev.filter((n) => n.id !== id))}
        onOpenChat={(chatId) => {
          handleSelectChat(chatId);
        }}
        onQuickReply={async (chatId, text) => {
          if (!currentUser?.uid || !text.trim()) return;
          await sendMessage(chatId, currentUser.uid, text.trim());
          if (soundEnabled) soundFX.playSent();
        }}
      />
    </div>
  );
};
