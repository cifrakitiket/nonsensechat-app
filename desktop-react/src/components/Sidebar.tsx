import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Settings,
  MessageSquare,
  Bookmark,
  PhoneCall,
  Volume2,
  Calculator,
  Pin,
  CheckCheck,
  Bell,
  BellOff,
  Trash2,
  Folder,
  Archive,
  Users,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { calcEval } from '@/lib/calc';
import { rtdb } from '@/lib/firebase';
import { ref, update, get } from 'firebase/database';
import type { Chat, User } from '@/types';
import { isFemaleUser } from '@/lib/badges';

interface SidebarProps {
  currentUser: User | null;
  chats: Chat[];
  users: Record<string, User>;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenNewChat: () => void;
  onOpenSettings: () => void;
}

// Animated tab indicator style injected once
const SIDEBAR_STYLES = `
  .chat-item {
    transition: all 0.15s ease;
  }
  .chat-item.active {
    /* existing highlight - just ensure transition is set */
  }
  @keyframes unreadPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(91,143,185,0.5); }
    50% { transform: scale(1.12); box-shadow: 0 0 0 4px rgba(91,143,185,0); }
  }
  .unread-badge-pulse {
    animation: unreadPulse 2s ease-in-out infinite;
  }
  .sidebar-tab-bar {
    position: relative;
  }
  .sidebar-tab-bar::after {
    content: '';
    position: absolute;
    bottom: -1px;
    height: 2px;
    background: var(--acc);
    border-radius: 2px;
    transition: left 0.2s cubic-bezier(0.4,0,0.2,1), width 0.2s cubic-bezier(0.4,0,0.2,1);
    pointer-events: none;
  }
`;

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  chats,
  users,
  activeChatId,
  onSelectChat,
  onOpenNewChat,
  onOpenSettings,
}) => {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'dm' | 'group' | 'fav'>('all');
  const [searchCalcResult, setSearchCalcResult] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Chat Context Menu State
  const [chatContextMenu, setChatContextMenu] = useState<{
    x: number;
    y: number;
    chat: Chat;
  } | null>(null);

  const [sidebarEmptyContextMenu, setSidebarEmptyContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Inject sidebar styles once
  useEffect(() => {
    const styleId = 'sidebar-extra-styles';
    if (!document.getElementById(styleId)) {
      const el = document.createElement('style');
      el.id = styleId;
      el.textContent = SIDEBAR_STYLES;
      document.head.appendChild(el);
    }
  }, []);

  // Calculator in search
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed && /[\d+\-*/%^]/.test(trimmed)) {
      setSearchCalcResult(calcEval(trimmed));
    } else {
      setSearchCalcResult(null);
    }
  }, [search]);

  // Keyboard shortcuts: Ctrl+K → focus search, Ctrl+N → new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onOpenNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenNewChat]);

  const getMenuPosition = (x: number, y: number, menuWidth = 200, menuHeight = 240) => {
    let left = x;
    let top = y;
    if (x + menuWidth > window.innerWidth - 12) {
      left = Math.max(12, x - menuWidth);
    }
    if (y + menuHeight > window.innerHeight - 12) {
      top = Math.max(12, y - menuHeight);
    }
    return { top: `${top}px`, left: `${left}px` };
  };

  // Close context menu on global click or pointerdown
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.context-menu')) {
        setChatContextMenu(null);
        setSidebarEmptyContextMenu(null);
      }
    };
    window.addEventListener('pointerdown', handleGlobalClick);
    return () => window.removeEventListener('pointerdown', handleGlobalClick);
  }, []);

  // Format message timestamp
  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Format last seen time
  const formatLastSeen = (lastSeen?: number): string => {
    if (!lastSeen) return 'не в сети';
    const diff = Date.now() - lastSeen;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч. назад`;
    const date = new Date(lastSeen);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Get display details for a chat
  const getChatDetails = (chat: Chat) => {
    if (chat.type === 'fav' || chat.id.startsWith('fav_')) {
      return {
        name: 'Избранное',
        avatar: undefined,
        online: false,
        isFav: true,
      };
    }
    if (chat.type === 'dm') {
      const otherUid = chat.members.find((m) => m !== currentUser?.uid);
      const otherUser = otherUid ? users[otherUid] : undefined;
      return {
        name: otherUser?.displayName || otherUser?.nick || 'Собеседник',
        avatar: otherUser?.avatar,
        online: otherUser?.online,
        isFav: false,
        otherUser,
        otherUid,
      };
    }
    return {
      name: chat.name || 'Групповой чат',
      avatar: chat.avatar,
      online: false,
      isFav: false,
      otherUser: undefined,
      otherUid: undefined,
    };
  };

  const favChatId = currentUser ? `fav_${currentUser.uid}` : null;
  const favChat = chats.find((c) => c.id === favChatId);

  // Filtered chats list
  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      if (tab === 'fav') return c.type === 'fav' || c.id === favChatId;
      if (tab === 'dm') return c.type === 'dm';
      if (tab === 'group') return c.type === 'group';

      if (!search.trim()) return true;

      const details = getChatDetails(c);
      const query = search.toLowerCase();
      const matchName = details.name.toLowerCase().includes(query);
      const matchMsg = c.lastMessage?.text.toLowerCase().includes(query);
      return matchName || matchMsg;
    });
  }, [chats, search, tab, users, currentUser, favChatId]);

  // Tab underline animation: compute left/width from tab index
  const tabOrder: Array<'all' | 'dm' | 'group' | 'fav'> = ['all', 'dm', 'group', 'fav'];
  const tabIndex = tabOrder.indexOf(tab);
  // Each tab is flex:1, so offset = index/4 * 100% and width = 25%
  const underlineLeft = `${(tabIndex / 4) * 100}%`;
  const underlineWidth = '25%';

  // Context menu actions
  const handleTogglePinChat = async (targetChat: Chat) => {
    if (!currentUser) return;
    const isPinned = targetChat.pinned;
    try {
      await update(ref(rtdb, `chats/${targetChat.id}`), {
        pinned: !isPinned,
      });
    } catch (_) {}
    setChatContextMenu(null);
  };

  const handleMarkChatRead = async (targetChat: Chat) => {
    if (!currentUser) return;
    try {
      await update(ref(rtdb, `chats/${targetChat.id}/unread`), { [currentUser.uid]: 0 });
    } catch (_) {}
    setChatContextMenu(null);
  };

  const handleLeaveOrDeleteChat = async (targetChat: Chat) => {
    if (!currentUser) return;
    const isFav = targetChat.type === 'fav' || targetChat.id.startsWith('fav_');
    if (isFav) {
      setChatContextMenu(null);
      return;
    }

    try {
      const newMembers = targetChat.members.filter((m) => m !== currentUser.uid);
      if (newMembers.length === 0) {
        await update(ref(rtdb, `chats/${targetChat.id}`), { _deleted: true });
      } else {
        await update(ref(rtdb, `chats/${targetChat.id}`), { members: newMembers });
      }
    } catch (_) {}
    setChatContextMenu(null);
  };

  // User status display
  const isCurrentUserOnline = currentUser?.online !== false;

  return (
    <aside
      className="sidebar"
      onContextMenu={(e) => {
        if (!(e.target as HTMLElement).closest('.chat-item')) {
          e.preventDefault();
          setChatContextMenu(null);
          setSidebarEmptyContextMenu({ x: e.clientX, y: e.clientY });
        }
      }}
    >
      {/* Header with real logo */}
      <div className="sidebar-header">
        <img
          src="./logo.png"
          alt="Nonsense Chat"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            objectFit: 'contain',
            boxShadow: '0 2px 8px rgba(91,143,185,0.4)',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = './chatlogo.png';
          }}
        />
        <div className="sidebar-logo">Беспонтовый Чат</div>
        <button
          className="icon-btn sm"
          onClick={onOpenNewChat}
          title="Новый чат (Ctrl+N)"
          style={{ color: 'var(--acc)' }}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Search Input with Calculator */}
      <div style={{ position: 'relative', margin: '0 12px 10px' }}>
        <div className="search-bar" style={{ margin: 0 }}>
          <Search size={16} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Поиск по чатам или калькулятор..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text2)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Calculator bubble in search */}
        {searchCalcResult !== null && (
          <div
            onClick={() => setSearch(String(searchCalcResult))}
            title="Нажмите, чтобы подставить результат"
            style={{
              position: 'absolute',
              top: '100%',
              left: '4px',
              marginTop: '4px',
              background: 'var(--card)',
              border: '1px solid var(--acc)',
              borderRadius: '12px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--acc3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 20,
            }}
          >
            <Calculator size={13} />
            <span>= {searchCalcResult}</span>
          </div>
        )}
      </div>

      {/* Tabs with animated underline */}
      <div
        className="sidebar-tab-bar"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '0 12px 6px',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
        }}
      >
        {/* Animated underline indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: `calc(12px + ${underlineLeft})`,
            width: `calc((100% - 24px - 12px) * 0.25)`,
            height: '2px',
            background: 'var(--acc)',
            borderRadius: '2px',
            transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
            pointerEvents: 'none',
          }}
        />
        <button
          onClick={() => setTab('all')}
          style={{
            flex: 1,
            padding: '5px 4px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: tab === 'all' ? 'rgba(91,143,185,0.2)' : 'transparent',
            color: tab === 'all' ? 'var(--acc)' : 'var(--text2)',
            transition: 'all 0.15s',
          }}
        >
          Все
        </button>
        <button
          onClick={() => setTab('dm')}
          style={{
            flex: 1,
            padding: '5px 4px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: tab === 'dm' ? 'rgba(91,143,185,0.2)' : 'transparent',
            color: tab === 'dm' ? 'var(--acc)' : 'var(--text2)',
            transition: 'all 0.15s',
          }}
        >
          Личные
        </button>
        <button
          onClick={() => setTab('group')}
          style={{
            flex: 1,
            padding: '5px 4px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: tab === 'group' ? 'rgba(91,143,185,0.2)' : 'transparent',
            color: tab === 'group' ? 'var(--acc)' : 'var(--text2)',
            transition: 'all 0.15s',
          }}
        >
          Группы
        </button>
        <button
          onClick={() => setTab('fav')}
          style={{
            flex: 1,
            padding: '5px 4px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: tab === 'fav' ? 'rgba(91,143,185,0.2)' : 'transparent',
            color: tab === 'fav' ? 'var(--acc)' : 'var(--text2)',
            transition: 'all 0.15s',
          }}
        >
          Избранное
        </button>
      </div>

      {/* Chat List */}
      <div
        className="chat-list"
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest('.chat-item')) return;
          e.preventDefault();
          setChatContextMenu(null);
          setSidebarEmptyContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {/* Pinned Telegram-like Favorites Chat */}
        {tab === 'all' && favChatId && (
          <div
            className={`chat-item ${activeChatId === favChatId ? 'active' : ''}`}
            onClick={() => onSelectChat(favChatId)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSidebarEmptyContextMenu(null);
              if (favChat) {
                setChatContextMenu({ x: e.clientX, y: e.clientY, chat: favChat });
              }
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #5b8fb9, #4a7aa8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bookmark size={22} color="#fff" />
            </div>
            <div className="chat-info">
              <div className="chat-name-row">
                <span className="chat-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Избранное</span>
                </span>
                <span className="chat-time">
                  {formatTime(favChat?.lastMessage?.ts || favChat?.lastTs)}
                </span>
              </div>
              <div className="chat-preview-row">
                <span className="chat-preview">
                  {favChat?.lastMessage?.text || 'Ваши сохранённые сообщения'}
                </span>
              </div>
            </div>
          </div>
        )}

        {filteredChats.length === 0 ? (
          <div
            style={{
              padding: '30px 16px',
              textAlign: 'center',
              color: 'var(--text2)',
              fontSize: '13px',
            }}
          >
            {search ? 'Ничего не найдено' : 'Чатов пока нет'}
            <div style={{ marginTop: '10px' }}>
              <button
                className="btn primary"
                onClick={onOpenNewChat}
                style={{ fontSize: '12px', padding: '8px 14px' }}
              >
                Создать диалог
              </button>
            </div>
          </div>
        ) : (
          filteredChats.map((chat) => {
            if (chat.id === favChatId && tab === 'all') return null;
            const { name, avatar, online, isFav, otherUser, otherUid } = getChatDetails(chat);
            const isActive = chat.id === activeChatId;
            const unread = currentUser ? chat.unread : 0;

            return (
              <div
                key={chat.id}
                className={`chat-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectChat(chat.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSidebarEmptyContextMenu(null);
                  setChatContextMenu({ x: e.clientX, y: e.clientY, chat });
                }}
              >
                {isFav ? (
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #5b8fb9, #4a7aa8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bookmark size={22} color="#fff" />
                  </div>
                ) : (
                  <Avatar name={name} avatarUrl={avatar} online={online} size="md" />
                )}

                <div className="chat-info">
                  <div className="chat-name-row">
                    <span className="chat-name">
                      {name}
                      {otherUid && isFemaleUser(otherUser, otherUid) && (
                        <span className="female-badge" title="Девушка" />
                      )}
                    </span>
                    <span className="chat-time">
                      {formatTime(chat.lastMessage?.ts || chat.lastTs)}
                    </span>
                  </div>

                  <div className="chat-preview-row">
                    <span className="chat-preview">
                      {chat.lastMessage?.text || 'Нет сообщений'}
                    </span>
                    {unread && unread > 0 ? (
                      <span className={`unread-badge unread-badge-pulse`}>{unread}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Context Menu */}
      {chatContextMenu && (
        <div
          className="context-menu"
          style={{
            ...getMenuPosition(chatContextMenu.x, chatContextMenu.y, 200, 240),
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-item"
            onClick={() => {
              onSelectChat(chatContextMenu.chat.id);
              setChatContextMenu(null);
            }}
          >
            <MessageSquare size={16} />
            <span>Открыть диалог</span>
          </div>

          <div
            className="context-item"
            onClick={() => handleTogglePinChat(chatContextMenu.chat)}
          >
            <Pin size={16} />
            <span>{chatContextMenu.chat.pinned ? 'Открепить чат' : 'Закрепить чат'}</span>
          </div>

          <div
            className="context-item"
            onClick={() => handleMarkChatRead(chatContextMenu.chat)}
          >
            <CheckCheck size={16} />
            <span>Пометить прочитанным</span>
          </div>

          <div
            className="context-item"
            onClick={() => {
              setChatContextMenu(null);
            }}
          >
            <BellOff size={16} />
            <span>Отключить звук</span>
          </div>

          <div
            className="context-item"
            onClick={() => {
              setChatContextMenu(null);
            }}
          >
            <Archive size={16} />
            <span>Архивировать</span>
          </div>

          <div
            className="context-item red"
            onClick={() => handleLeaveOrDeleteChat(chatContextMenu.chat)}
          >
            <Trash2 size={16} />
            <span>{chatContextMenu.chat.type === 'group' ? 'Покинуть группу' : 'Удалить диалог'}</span>
          </div>
        </div>
      )}

      {/* Current user bottom bar */}
      {currentUser && (
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--border)',
            background: 'var(--card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Avatar
              name={currentUser.displayName || currentUser.nick}
              avatarUrl={currentUser.avatar}
              online={true}
              size="sm"
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span>{currentUser.displayName || currentUser.nick}</span>
                {isFemaleUser(currentUser, currentUser.uid) && (
                  <span className="female-badge" title="Девушка" />
                )}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: isCurrentUserOnline ? 'var(--online)' : 'var(--text2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isCurrentUserOnline ? (
                  <>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--online)',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span>в сети</span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--text2)',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span>{formatLastSeen(currentUser.lastSeen)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            className="icon-btn sm"
            onClick={onOpenSettings}
            title="Настройки"
          >
            <Settings size={18} />
          </button>
        </div>
      )}

      {/* Sidebar Empty Area Context Menu */}
      {sidebarEmptyContextMenu && (
        <div
          className="context-menu"
          style={{
            ...getMenuPosition(sidebarEmptyContextMenu.x, sidebarEmptyContextMenu.y, 200, 200),
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-item"
            onClick={() => {
              setSidebarEmptyContextMenu(null);
              onOpenNewChat();
            }}
          >
            <Plus size={16} />
            <span>Новый диалог (Ctrl+N)</span>
          </div>

          <div
            className="context-item"
            onClick={() => {
              setSidebarEmptyContextMenu(null);
              onOpenNewChat();
            }}
          >
            <Users size={16} />
            <span>Создать группу</span>
          </div>

          <div
            className="context-item"
            onClick={() => {
              setSidebarEmptyContextMenu(null);
              onOpenSettings();
            }}
          >
            <Settings size={16} />
            <span>Настройки</span>
          </div>
        </div>
      )}
    </aside>
  );
};
