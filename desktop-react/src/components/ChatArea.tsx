import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  Plus,
  Smile,
  Paperclip,
  Mic,
  MoreVertical,
  Reply,
  Check,
  CheckCheck,
  Phone,
  Video,
  Search,
  X,
  Copy,
  Pin,
  Forward,
  BarChart2,
  Square,
  Calculator,
  ArrowDown,
  FileText,
  Download,
  Eye,
  Trash2,
  Edit2,
  Clipboard,
  Hand,
  Info,
  Users,
  Scissors,
  VolumeX,
  Settings,
  Image,
  Bold,
  Italic,
  Code,
  EyeOff,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { PinnedBar, PinnedMessage } from './PinnedBar';
import { PollCard, PollData } from './PollCard';
import { VoiceMessage } from './VoiceMessage';
import { SpoilerText } from './SpoilerText';
import { FileUploadModal } from './FileUploadModal';
import { ImageViewerModal } from './ImageViewerModal';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { soundFX } from '@/lib/sounds';
import { calcEval } from '@/lib/calc';
import { rtdb } from '@/lib/firebase';
import { ref, update } from 'firebase/database';
import type { Chat, Message, User } from '@/types';
import { isFemaleUser } from '@/lib/badges';

interface ChatAreaProps {
  chat: Chat | null;
  currentUser: User | null;
  users: Record<string, User>;
  messages: Message[];
  loadingMessages: boolean;
  onSendMessage: (
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
  ) => Promise<void>;
  onOpenProfile: (user: User) => void;
  onOpenCreatePoll: () => void;
  onOpenForward: (msg: Message) => void;
  onOpenNewChat?: () => void;
  onOpenSettings?: () => void;
}

const QUICK_REACTS = ['👍', '❤️', '🔥', '🤙', '😂', '🎉'];

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  currentUser,
  users,
  messages,
  loadingMessages,
  onSendMessage,
  onOpenProfile,
  onOpenCreatePoll,
  onOpenForward,
  onOpenNewChat,
  onOpenSettings,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [currentPinIdx, setCurrentPinIdx] = useState(0);
  const [calcResult, setCalcResult] = useState<number | null>(null);

  // === NEW: Editing message state ===
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // === NEW: Drag & Drop state ===
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragFile, setDragFile] = useState<File | null>(null);
  const dragCounterRef = useRef(0);

  // === NEW: Hover reactions state (msgId → visible) ===
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  // === NEW: Track new message IDs for animation ===
  const prevMsgIdsRef = useRef<Set<string>>(new Set());
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set());

  // Close attach menu on outside click
  useEffect(() => {
    if (!showAttachMenu) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tg-attach-menu') && !target.closest('.attach-btn')) {
        setShowAttachMenu(false);
      }
    };
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, [showAttachMenu]);

  // Modals & Media viewing state
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [dropFiles, setDropFiles] = useState<FileList | null>(null);
  const [viewImage, setViewImage] = useState<{ url: string; caption?: string } | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  // Scroll to bottom state
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  // === NEW: Unread count for scroll-to-bottom badge ===
  const [unreadCount, setUnreadCount] = useState(0);

  // @ Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Context menu states
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);

  const [emptyContextMenu, setEmptyContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [emptyStateContextMenu, setEmptyStateContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [headerContextMenu, setHeaderContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [inputContextMenu, setInputContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // === NEW: Track new messages for animation ===
  useEffect(() => {
    const incoming = messages.filter((m) => !prevMsgIdsRef.current.has(m.id));
    if (incoming.length > 0) {
      const newIds = new Set(incoming.map((m) => m.id));
      setNewMsgIds(newIds);
      // Count unread if scrolled up
      if (showScrollBottom) {
        setUnreadCount((c) => c + incoming.filter((m) => m.uid !== currentUser?.uid).length);
      }
      setTimeout(() => {
        setNewMsgIds(new Set());
      }, 600);
    }
    prevMsgIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat changes
  useEffect(() => {
    inputRef.current?.focus();
    setReplyMessage(null);
    setEditingMessage(null);
    setCurrentPinIdx(0);
    setRevealedSpoilers(new Set());
    setShowEmojiPicker(false);
    setUnreadCount(0);
  }, [chat?.id]);

  const closeAllContextMenus = () => {
    setContextMenu(null);
    setEmptyContextMenu(null);
    setEmptyStateContextMenu(null);
    setHeaderContextMenu(null);
    setInputContextMenu(null);
  };

  const getMenuPosition = (x: number, y: number, menuWidth = 210, menuHeight = 260) => {
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

  // Close context menus on pointerdown outside
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.context-menu')) {
        closeAllContextMenus();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // === NEW: Keyboard shortcuts (Escape / Ctrl+Enter) ===
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close everything
        setShowEmojiPicker(false);
        setShowAttachMenu(false);
        setContextMenu(null);
        setMentionQuery(null);
        setEditingMessage(null);
        setReplyMessage(null);
        closeAllContextMenus();
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        // only send if input is focused
        if (document.activeElement === inputRef.current) {
          handleSend();
        }
      }
    };
    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [inputText, replyMessage, editingMessage]);

  const wrapInputText = (before: string, after: string) => {
    if (!inputRef.current) return;
    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    if (start === end) {
      setInputText((prev) => `${before}${prev}${after}`);
    } else {
      const selected = inputText.slice(start, end);
      const next = inputText.slice(0, start) + before + selected + after + inputText.slice(end);
      setInputText(next);
    }
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  // Real-time calculator detection in input
  useEffect(() => {
    const trimmed = inputText.trim();
    if (trimmed && /[\d+\-*/%^]/.test(trimmed)) {
      const res = calcEval(trimmed);
      setCalcResult(res);
    } else {
      setCalcResult(null);
    }
  }, [inputText]);

  // Handle scroll detection for scroll-to-bottom button
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isUp);
    if (!isUp) setUnreadCount(0);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
  };

  // Mention candidates from current chat
  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null || !chat) return [];
    const members = chat.members || [];
    const q = mentionQuery.toLowerCase();

    return members
      .map((uid) => users[uid])
      .filter((u): u is User => !!u)
      .filter((u) => u.nick.toLowerCase().includes(q) || (u.displayName && u.displayName.toLowerCase().includes(q)))
      .slice(0, 5);
  }, [mentionQuery, chat, users]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const match = /(?:^|\s)@([a-zA-Z0-9_]*)$/.exec(textBefore);

    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (nick: string) => {
    if (!inputRef.current) return;
    const cursorPos = inputRef.current.selectionStart;
    const textBefore = inputText.slice(0, cursorPos);
    const textAfter = inputText.slice(cursorPos);
    const newTextBefore = textBefore.replace(/(?:^|\s)@([a-zA-Z0-9_]*)$/, (match) => {
      const prefix = match.startsWith(' ') ? ' ' : '';
      return `${prefix}@${nick} `;
    });
    setInputText(newTextBefore + textAfter);
    setMentionQuery(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleMentionClick = (nick: string) => {
    const target = Object.values(users).find(
      (u) => u.nick.toLowerCase() === nick.toLowerCase()
    );
    if (target) {
      onOpenProfile(target);
    }
  };

  const handlePasteClipboard = async () => {
    setEmptyContextMenu(null);
    setEmptyStateContextMenu(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText((prev) => prev + text);
        inputRef.current?.focus();
      }
    } catch (_) {}
  };

  // === NEW: Drag & Drop handlers ===
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setDropFiles(files);
      setShowFileUpload(true);
    }
  };

  // Empty state when no chat is selected (shows branding logo and full context menu)
  if (!chat) {
    return (
      <div
        className="empty-state"
        onContextMenu={(e) => {
          e.preventDefault();
          closeAllContextMenus();
          setEmptyStateContextMenu({ x: e.clientX, y: e.clientY });
        }}
        onClick={() => closeAllContextMenus()}
      >
        <img
          src="./logo.png"
          alt="Nonsense Chat"
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '24px',
            objectFit: 'contain',
            boxShadow: '0 8px 32px rgba(91, 143, 185, 0.45)',
            marginBottom: '16px',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = './chatlogo.png';
          }}
        />
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
          Беспонтовый Чат
        </h2>
        <p style={{ maxWidth: '340px', color: 'var(--text2)', fontSize: '13.5px', lineHeight: 1.6 }}>
          Выберите диалог в списке слева или начните новый разговор нажатием Ctrl+N
        </p>

        {emptyStateContextMenu && (
          <div
            className="context-menu"
            style={{
              ...getMenuPosition(emptyStateContextMenu.x, emptyStateContextMenu.y, 200, 200),
              zIndex: 2000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="context-item"
              onClick={() => {
                setEmptyStateContextMenu(null);
                onOpenNewChat?.();
              }}
            >
              <Plus size={16} />
              <span>Создать новый чат</span>
            </div>

            <div
              className="context-item"
              onClick={() => {
                setEmptyStateContextMenu(null);
                onOpenNewChat?.();
              }}
            >
              <Users size={16} />
              <span>Создать группу</span>
            </div>

            <div
              className="context-item"
              onClick={() => {
                setEmptyStateContextMenu(null);
                handlePasteClipboard();
              }}
            >
              <Clipboard size={16} />
              <span>Вставить из буфера</span>
            </div>

            <div
              className="context-item"
              onClick={() => {
                setEmptyStateContextMenu(null);
                onOpenSettings?.();
              }}
            >
              <Settings size={16} />
              <span>Открыть настройки</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Get other user in DM
  const isFav = chat.type === 'fav' || chat.id.startsWith('fav_');
  const otherUid = chat.type === 'dm' ? chat.members.find((m) => m !== currentUser?.uid) : null;
  const otherUser = otherUid ? users[otherUid] : null;

  const chatTitle = isFav
    ? 'Избранное'
    : chat.type === 'dm'
    ? otherUser?.displayName || otherUser?.nick || 'Собеседник'
    : chat.name || 'Групповой чат';

  const chatStatus = isFav
    ? 'Сохранённые сообщения'
    : chat.type === 'dm'
    ? otherUser?.online
      ? 'в сети'
      : 'был(а) недавно'
    : `${chat.members.length} участников`;

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const text = inputText;
    const replyId = replyMessage?.id;
    const replyPreview = replyMessage
      ? `${users[replyMessage.uid]?.displayName || users[replyMessage.uid]?.nick || 'Пользователь'}: ${replyMessage.text.slice(0, 50)}`
      : undefined;

    setInputText('');
    setReplyMessage(null);
    setEditingMessage(null);
    setShowEmojiPicker(false);
    setCalcResult(null);
    setMentionQuery(null);

    soundFX.playSent();

    try {
      await onSendMessage(text, replyId, replyPreview);
    } catch (e) {
      console.error('Failed to send:', e);
    }
  };

  const handleSendAttachment = async (data: {
    type: 'photo' | 'file' | 'audio' | 'video';
    url: string;
    fileName: string;
    fileSize: number;
    caption: string;
    isSpoiler: boolean;
  }) => {
    const replyId = replyMessage?.id;
    const replyPreview = replyMessage
      ? `${users[replyMessage.uid]?.displayName || users[replyMessage.uid]?.nick || 'Пользователь'}: ${replyMessage.text.slice(0, 50)}`
      : undefined;

    setReplyMessage(null);
    soundFX.playSent();

    const isStickerAttachment = data.fileName === 'sticker.webp' || (data.url && data.url.includes('sticker'));
    const defaultText = isStickerAttachment ? '' : (data.type === 'photo' ? '📷 Фото' : `📎 ${data.fileName}`);

    try {
      await onSendMessage(
        data.caption || defaultText,
        replyId,
        replyPreview,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          type: data.type,
          url: data.url,
          fileName: data.fileName,
          fileSize: data.fileSize,
          caption: data.caption,
          isSpoiler: data.isSpoiler,
        }
      );
    } catch (e) {
      console.error('Failed to upload file:', e);
    }
  };

  const handleSendHello = async () => {
    setEmptyContextMenu(null);
    soundFX.playSent();
    await onSendMessage('Привет! 👋');
  };

  const handleDeleteMessage = async (msg: Message) => {
    setContextMenu(null);
    if (!chat) return;
    try {
      await update(ref(rtdb, `messages/${chat.id}/${msg.id}`), { _deleted: true });
    } catch (_) {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Reactions toggle
  const handleToggleReaction = async (msg: Message, emoji: string) => {
    if (!currentUser || !chat) return;
    soundFX.playTap();

    const reactions = (msg.reactions as unknown as Record<string, string>) || {};
    const updated = { ...reactions };

    if (updated[currentUser.uid] === emoji) {
      delete updated[currentUser.uid];
    } else {
      updated[currentUser.uid] = emoji;
    }

    try {
      await update(ref(rtdb, `messages/${chat.id}/${msg.id}`), {
        reactions: updated,
      });
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  // Pinned messages logic
  const pinnedList = chat.pinnedMsgs || [];

  const handlePinMessage = async (msg: Message) => {
    if (!chat) return;
    const authorName = users[msg.uid]?.displayName || users[msg.uid]?.nick || 'Пользователь';
    const newPin: PinnedMessage = {
      id: msg.id,
      text: msg.text.slice(0, 80),
      author: authorName,
    };

    const exists = pinnedList.some((p) => p.id === msg.id);
    const updatedPins = exists ? pinnedList : [...pinnedList, newPin];

    try {
      await update(ref(rtdb, `chats/${chat.id}`), { pinnedMsgs: updatedPins });
    } catch (_) {}
  };

  const handleUnpin = async (index: number) => {
    if (!chat) return;
    const updatedPins = pinnedList.filter((_, i) => i !== index);
    try {
      await update(ref(rtdb, `chats/${chat.id}`), { pinnedMsgs: updatedPins });
      setCurrentPinIdx(0);
    } catch (_) {}
  };

  const handleGoToMessage = (msgId: string) => {
    const el = document.querySelector(`[data-msgid="${msgId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlighted');
      setTimeout(() => el.classList.remove('highlighted'), 1200);
    }
  };

  // Poll voting
  const handleVotePoll = async (msg: Message, optIdx: number) => {
    if (!currentUser || !chat || !msg.poll) return;
    soundFX.playTap();

    const votes = { ...(msg.poll.votes || {}) };
    if (votes[currentUser.uid] === optIdx) {
      delete votes[currentUser.uid];
    } else {
      votes[currentUser.uid] = optIdx;
    }

    try {
      await update(ref(rtdb, `messages/${chat.id}/${msg.id}/poll`), { votes });
    } catch (_) {}
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result as string;
          soundFX.playSent();
          await onSendMessage('Голосовое сообщение', undefined, undefined, undefined, base64Data, recordingSeconds);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      const timer = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      recordingTimerRef.current = timer;
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
    }
  };

  const stopRecording = (send: boolean) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      if (send) {
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      }
      setIsRecording(false);
    }
  };

  const formatMessageTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <main
      className="chat-area"
      style={{ position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* === NEW: Drag & Drop overlay === */}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 500,
            background: 'rgba(91, 143, 185, 0.18)',
            border: '2px dashed var(--acc)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease-out',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div style={{ fontSize: '48px' }}>📁</div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--acc)',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            Перетащите файлы сюда
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div
        className="chat-header"
        onContextMenu={(e) => {
          e.preventDefault();
          setHeaderContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, cursor: isFav ? 'default' : 'pointer' }}
          onClick={() => {
            if (otherUser && !isFav) onOpenProfile(otherUser);
          }}
        >
          <Avatar
            name={chatTitle}
            avatarUrl={isFav ? undefined : chat.type === 'dm' ? otherUser?.avatar : chat.avatar}
            online={isFav ? false : chat.type === 'dm' ? otherUser?.online : false}
            size="md"
          />
          <div className="chat-header-info">
            <div className="chat-header-name">
              <span>{chatTitle}</span>
              {chat.type === 'dm' && isFemaleUser(otherUser, otherUid || undefined) && (
                <span className="female-badge" title="Девушка" />
              )}
            </div>
            <div className={`chat-header-status ${otherUser?.online ? 'online' : ''}`}>
              {chatStatus}
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="icon-btn"
            title="Создать опрос"
            onClick={onOpenCreatePoll}
          >
            <BarChart2 size={18} />
          </button>
          <button
            className="icon-btn"
            title="Голосовой звонок"
            onClick={() => soundFX.playTap()}
          >
            <Phone size={18} />
          </button>
          <button
            className="icon-btn"
            title="Видеозвонок"
            onClick={() => soundFX.playTap()}
          >
            <Video size={18} />
          </button>
          <button
            className="icon-btn"
            title="Информация"
            onClick={() => {
              if (otherUser && !isFav) onOpenProfile(otherUser);
            }}
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Pinned Messages Bar */}
      <PinnedBar
        pinnedMsgs={pinnedList}
        currentIndex={currentPinIdx}
        onSelectIndex={setCurrentPinIdx}
        onGoToMessage={handleGoToMessage}
        onUnpin={handleUnpin}
      />

      {/* Messages List Container */}
      <div
        className="messages-container"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest('.msg-bubble, .avatar, .avatar-space')) return;
          e.preventDefault();
          closeAllContextMenus();
          setEmptyContextMenu({ x: e.clientX, y: e.clientY });
        }}
        style={{ position: 'relative' }}
      >
        {loadingMessages ? (
          <div className="full-center" style={{ padding: '40px' }}>
            <div className="spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              color: 'var(--text2)',
              fontSize: '13px',
              padding: '30px 20px',
              userSelect: 'none',
            }}
          >
            <div style={{ fontSize: '38px', marginBottom: '8px' }}>💬</div>
            <h4 style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
              Сообщений пока нет
            </h4>
            <p style={{ marginBottom: '14px' }}>Напишите первым или отправьте быстрое приветствие!</p>
            <button
              className="btn primary"
              onClick={handleSendHello}
              style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '20px' }}
            >
              👋 Поздороваться
            </button>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOut = msg.uid === currentUser?.uid;
            const sender = users[msg.uid];
            const senderName = sender?.displayName || sender?.nick || 'Участник';
            const prevMsg = messages[index - 1];
            const isGrouped = prevMsg && prevMsg.uid === msg.uid && msg.ts - prevMsg.ts < 300000;
            const isSoloImg = typeof msg.text === 'string' && /^<img\s+[^>]*src=["']([^"']+)["'][^>]*>$/i.test(msg.text.trim());
            const soloImgSrc = isSoloImg ? msg.text.trim().match(/src=["']([^"']+)["']/i)?.[1] : null;
            const isSticker = msg.type === 'sticker' || isSoloImg || (msg.photoUrl && msg.photoUrl.includes('twemoji'));
            const stickerUrl = msg.photoUrl || msg.fileUrl || soloImgSrc;

            // Reaction grouping
            const reactions = (msg.reactions as unknown as Record<string, string>) || {};
            const reactCounts: Record<string, number> = {};
            const myReactions = new Set<string>();
            Object.entries(reactions).forEach(([uId, emoji]) => {
              reactCounts[emoji] = (reactCounts[emoji] || 0) + 1;
              if (uId === currentUser?.uid) myReactions.add(emoji);
            });

            // === NEW: animation class ===
            const isNewMsg = newMsgIds.has(msg.id);
            const animClass = isNewMsg ? (isOut ? 'msg-anim-in msg-anim-right' : 'msg-anim-in msg-anim-left') : '';

            // === NEW: editing highlight ===
            const isEditing = editingMessage?.id === msg.id;

            // === NEW: hover quick reactions ===
            const isHovered = hoveredMsgId === msg.id;

            return (
              <div
                key={msg.id}
                data-msgid={msg.id}
                className={`message-row ${isOut ? 'out' : 'in'} ${isGrouped ? 'grouped' : ''}`}
                onContextMenu={(e) => {
                  if ((e.target as HTMLElement).closest('.msg-bubble, .avatar, .avatar-space')) return;
                  e.preventDefault();
                  e.stopPropagation();
                  closeAllContextMenus();
                  setEmptyContextMenu({ x: e.clientX, y: e.clientY });
                }}
              >
                {!isOut && !isGrouped && (
                  <Avatar
                    name={senderName}
                    avatarUrl={sender?.avatar}
                    size="sm"
                    className="avatar-space"
                    onClick={() => sender && onOpenProfile(sender)}
                  />
                )}
                {!isOut && isGrouped && <div className="avatar-space" />}

                {/* === NEW: message-wrapper for hover reactions === */}
                <div
                  className={`message-wrapper ${animClass}`}
                  style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', maxWidth: '100%' }}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  {/* === NEW: Hover quick reactions panel === */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        [isOut ? 'left' : 'right']: 'calc(100% + 6px)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        gap: '2px',
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '20px',
                        padding: '4px 6px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        zIndex: 20,
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {QUICK_REACTS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg, emoji)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '16px',
                            cursor: 'pointer',
                            padding: '2px 3px',
                            borderRadius: '4px',
                            lineHeight: 1,
                            transition: 'transform 0.1s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.3)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`msg-bubble ${isOut ? 'out' : 'in'} ${isGrouped ? 'grouped' : ''} ${isEditing ? 'msg-editing-highlight' : ''}`}
                    style={isSticker ? { background: 'transparent', boxShadow: 'none', padding: 0 } : undefined}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeAllContextMenus();
                      setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                    }}
                  >
                    {!isOut && !isGrouped && chat.type === 'group' && (
                      <div
                        className="msg-sender"
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => sender && onOpenProfile(sender)}
                      >
                        <span>{senderName}</span>
                        {isFemaleUser(sender, msg.uid) && (
                          <span className="female-badge" title="Девушка" />
                        )}
                      </div>
                    )}

                    {/* Forward label */}
                    {msg.forwardFrom && (
                      <div style={{ fontSize: '11px', color: 'var(--acc3)', marginBottom: '3px', fontStyle: 'italic' }}>
                        ↪️ Переслано от @{msg.forwardFrom}
                      </div>
                    )}

                    {/* Reply quote */}
                    {msg.replyTo && (
                      <div className="reply-quote" onClick={() => handleGoToMessage(msg.replyTo!)}>
                        <div className="reply-text">{msg.replyPreview || 'Ответ на сообщение'}</div>
                      </div>
                    )}

                    {/* Message content based on type */}
                    {isSticker && stickerUrl ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={stickerUrl}
                          alt="Sticker"
                          style={{
                            width: '130px',
                            height: '130px',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      </div>
                    ) : msg.photoUrl || msg.type === 'photo' ? (
                      <div>
                        <div
                          style={{
                            position: 'relative',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            marginTop: '2px',
                          }}
                          onClick={() => {
                            if (msg.isSpoiler && !revealedSpoilers.has(msg.id)) {
                              setRevealedSpoilers((prev) => new Set(prev).add(msg.id));
                            } else {
                              setViewImage({ url: msg.photoUrl || '', caption: msg.caption });
                            }
                          }}
                        >
                          <img
                            src={msg.photoUrl || msg.fileUrl || msg.attachment?.url}
                            alt="Photo"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '280px',
                              display: 'block',
                              borderRadius: '10px',
                              filter: msg.isSpoiler && !revealedSpoilers.has(msg.id) ? 'blur(16px)' : 'none',
                              transition: 'filter 0.25s',
                            }}
                          />
                          {msg.isSpoiler && !revealedSpoilers.has(msg.id) && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0, 0, 0, 0.35)',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 600,
                                gap: '6px',
                              }}
                            >
                              <Eye size={16} />
                              <span>Спойлер</span>
                            </div>
                          )}
                        </div>
                        {msg.caption && (
                          <div style={{ marginTop: '6px' }}>
                            <SpoilerText text={msg.caption} onMentionClick={handleMentionClick} />
                          </div>
                        )}
                      </div>
                    ) : (msg.type === 'video' || (msg.fileUrl && /\.(mp4|webm|mov|mkv)(\?|$)/i.test(msg.fileUrl))) ? (
                      <div>
                        <video
                          src={msg.fileUrl}
                          controls
                          playsInline
                          preload="metadata"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '320px',
                            borderRadius: '10px',
                            display: 'block',
                            background: '#000',
                          }}
                        />
                        {msg.caption && (
                          <div style={{ marginTop: '6px' }}>
                            <SpoilerText text={msg.caption} onMentionClick={handleMentionClick} />
                          </div>
                        )}
                      </div>
                    ) : (msg.type === 'audio' || (msg.fileUrl && /\.(mp3|wav|ogg|m4a|flac)(\?|$)/i.test(msg.fileUrl))) ? (
                      <div style={{ minWidth: '240px', padding: '4px 0' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🎵 {msg.fileName || 'Аудиозапись'}
                        </div>
                        <audio src={msg.fileUrl} controls style={{ width: '100%', height: '36px' }} />
                      </div>
                    ) : msg.fileUrl || msg.type === 'file' ? (
                      <a
                        href={msg.fileUrl}
                        download={msg.fileName || 'file'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        <div style={{ color: 'var(--acc)' }}>
                          <FileText size={24} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {msg.fileName || 'Документ'}
                          </div>
                          {msg.fileSize && (
                            <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                              {formatFileSize(msg.fileSize)}
                            </div>
                          )}
                        </div>
                        <Download size={16} color="var(--text2)" />
                      </a>
                    ) : msg.poll ? (
                      <PollCard
                        poll={msg.poll}
                        currentUid={currentUser?.uid || ''}
                        onVote={(optIdx) => handleVotePoll(msg, optIdx)}
                      />
                    ) : msg.audioUrl ? (
                      <VoiceMessage audioUrl={msg.audioUrl} duration={msg.audioDuration} />
                    ) : (
                      <div className="msg-text">
                        <SpoilerText text={msg.text} onMentionClick={handleMentionClick} />
                      </div>
                    )}

                    {/* Footer with time and read checks */}
                    <div className="msg-footer">
                      <span className="msg-time">{formatMessageTime(msg.ts)}</span>
                      {isOut && (
                        <span className="msg-status read">
                          <CheckCheck size={14} />
                        </span>
                      )}
                    </div>

                    {/* Reactions chips bar */}
                    {Object.keys(reactCounts).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {Object.entries(reactCounts).map(([emoji, count]) => {
                          const isMine = myReactions.has(emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg, emoji)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: isMine ? 'rgba(91,143,185,0.3)' : 'rgba(0, 0, 0, 0.25)',
                                border: isMine ? '1px solid var(--acc)' : '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '2px 6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: 'var(--text)',
                              }}
                            >
                              <span>{emoji}</span>
                              {count > 1 && <span style={{ fontSize: '10px', color: 'var(--text2)' }}>{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {/* === IMPROVED: Scroll-to-bottom floating button with animation + unread badge === */}
        <button
          onClick={scrollToBottom}
          title="Прокрутить вниз"
          style={{
            position: 'sticky',
            bottom: '16px',
            float: 'right',
            marginRight: '16px',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'var(--card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
            cursor: 'pointer',
            zIndex: 15,
            transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s, background-color 0.15s',
            transform: showScrollBottom ? 'scale(1)' : 'scale(0)',
            opacity: showScrollBottom ? 1 : 0,
            pointerEvents: showScrollBottom ? 'auto' : 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--card2)';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--card)';
            e.currentTarget.style.transform = showScrollBottom ? 'scale(1)' : 'scale(0)';
          }}
        >
          <ArrowDown size={18} />
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--acc)',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 700,
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                lineHeight: 1,
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Message Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            ...getMenuPosition(contextMenu.x, contextMenu.y, 220, 300),
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Reaction Bar */}
          <div style={{ display: 'flex', gap: '6px', padding: '4px 6px 8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
            {QUICK_REACTS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  handleToggleReaction(contextMenu.message, emoji);
                  setContextMenu(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '4px',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div
            className="context-item"
            onClick={() => {
              setReplyMessage(contextMenu.message);
              setContextMenu(null);
              inputRef.current?.focus();
            }}
          >
            <Reply size={16} />
            <span>Ответить</span>
          </div>

          <div
            className="context-item"
            onClick={() => {
              onOpenForward(contextMenu.message);
              setContextMenu(null);
            }}
          >
            <Forward size={16} />
            <span>Переслать</span>
          </div>

          <div
            className="context-item"
            onClick={() => {
              handlePinMessage(contextMenu.message);
              setContextMenu(null);
            }}
          >
            <Pin size={16} />
            <span>Закрепить</span>
          </div>

          {contextMenu.message.text && !/^<img/i.test(contextMenu.message.text.trim()) && (
            <div
              className="context-item"
              onClick={() => {
                handleCopy(contextMenu.message.text);
                setContextMenu(null);
              }}
            >
              <Copy size={16} />
              <span>Копировать</span>
            </div>
          )}

          {/* Photo / Attachment actions */}
          {(contextMenu.message.attachment?.type === 'photo' || contextMenu.message.photoUrl) && (
            <>
              <div
                className="context-item"
                onClick={() => {
                  const url = contextMenu.message.attachment?.url || contextMenu.message.photoUrl!;
                  const caption = contextMenu.message.attachment?.caption;
                  setContextMenu(null);
                  setViewImage({ url, caption });
                }}
              >
                <Eye size={16} />
                <span>Открыть фото</span>
              </div>
              <div
                className="context-item"
                onClick={() => {
                  const url = contextMenu.message.attachment?.url || contextMenu.message.photoUrl!;
                  handleCopy(url);
                  setContextMenu(null);
                }}
              >
                <Image size={16} />
                <span>Копировать ссылку на фото</span>
              </div>
            </>
          )}

          {/* Sticker actions */}
          {(contextMenu.message.type === 'sticker' ||
            (contextMenu.message.photoUrl && contextMenu.message.photoUrl.includes('twemoji')) ||
            (contextMenu.message.text && /^<img/i.test(contextMenu.message.text.trim()))) && (
            <div
              className="context-item"
              onClick={() => {
                const url =
                  contextMenu.message.attachment?.url ||
                  contextMenu.message.photoUrl ||
                  contextMenu.message.text?.match(/src=["']([^"']+)["']/i)?.[1] ||
                  contextMenu.message.text;
                handleCopy(url);
                setContextMenu(null);
              }}
            >
              <Smile size={16} />
              <span>Копировать стикер</span>
            </div>
          )}

          {contextMenu.message.uid === currentUser?.uid && (
            <div
              className="context-item"
              onClick={() => {
                setInputText(contextMenu.message.text);
                setEditingMessage(contextMenu.message);
                setContextMenu(null);
                inputRef.current?.focus();
              }}
            >
              <Edit2 size={16} />
              <span>Редактировать</span>
            </div>
          )}

          {(contextMenu.message.uid === currentUser?.uid || chat.admins?.includes(currentUser?.uid || '')) && (
            <div
              className="context-item red"
              onClick={() => handleDeleteMessage(contextMenu.message)}
            >
              <Trash2 size={16} />
              <span>Удалить</span>
            </div>
          )}
        </div>
      )}

      {/* Empty Area / No Messages Context Menu */}
      {emptyContextMenu && (
        <div
          className="context-menu"
          style={{
            ...getMenuPosition(emptyContextMenu.x, emptyContextMenu.y, 210, 240),
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-item" onClick={handlePasteClipboard}>
            <Clipboard size={16} />
            <span>Вставить из буфера</span>
          </div>

          <div className="context-item" onClick={handleSendHello}>
            <Hand size={16} />
            <span>Сказать "Привет! 👋"</span>
          </div>

          <div
            className="context-item"
            onClick={() => {
              setEmptyContextMenu(null);
              setShowFileUpload(true);
            }}
          >
            <Paperclip size={16} />
            <span>Прикрепить файл</span>
          </div>

          <div
            className="context-item"
            onClick={() => {
              setEmptyContextMenu(null);
              onOpenCreatePoll();
            }}
          >
            <BarChart2 size={16} />
            <span>Создать опрос</span>
          </div>

          <div
            className="context-item"
            onClick={() => {
              setEmptyContextMenu(null);
              if (otherUser) onOpenProfile(otherUser);
            }}
          >
            <Info size={16} />
            <span>Информация о чате</span>
          </div>
        </div>
      )}

      {/* Header Context Menu */}
      {headerContextMenu && (
        <div
          className="context-menu"
          style={{
            ...getMenuPosition(headerContextMenu.x, headerContextMenu.y, 220, 220),
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {otherUser && !isFav && (
            <div
              className="context-item"
              onClick={() => {
                setHeaderContextMenu(null);
                onOpenProfile(otherUser);
              }}
            >
              <Info size={16} />
              <span>Информация о {chat.type === 'dm' ? 'пользователе' : 'чате'}</span>
            </div>
          )}
          <div
            className="context-item"
            onClick={() => {
              setHeaderContextMenu(null);
              onOpenCreatePoll();
            }}
          >
            <BarChart2 size={16} />
            <span>Создать опрос</span>
          </div>
          <div
            className="context-item"
            onClick={() => {
              setHeaderContextMenu(null);
              setShowFileUpload(true);
            }}
          >
            <Paperclip size={16} />
            <span>Отправить файл / фото</span>
          </div>
          <div
            className="context-item"
            onClick={() => {
              setHeaderContextMenu(null);
              onOpenSettings?.();
            }}
          >
            <Settings size={16} />
            <span>Настройки приложения</span>
          </div>
        </div>
      )}

      {/* Input Context Menu */}
      {inputContextMenu && (
        <div
          className="context-menu"
          style={{
            ...getMenuPosition(inputContextMenu.x, inputContextMenu.y, 210, 280),
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-item"
            onClick={() => {
              setInputContextMenu(null);
              handlePasteClipboard();
            }}
          >
            <Clipboard size={16} />
            <span>Вставить</span>
          </div>
          {inputText && (
            <>
              <div
                className="context-item"
                onClick={() => {
                  setInputContextMenu(null);
                  handleCopy(inputText);
                }}
              >
                <Copy size={16} />
                <span>Копировать всё</span>
              </div>
              <div
                className="context-item"
                onClick={() => {
                  setInputContextMenu(null);
                  setInputText('');
                  inputRef.current?.focus();
                }}
              >
                <Trash2 size={16} />
                <span>Очистить поле</span>
              </div>
            </>
          )}
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          <div
            className="context-item"
            onClick={() => {
              setInputContextMenu(null);
              wrapInputText('**', '**');
            }}
          >
            <Bold size={16} />
            <span>Жирный текст</span>
          </div>
          <div
            className="context-item"
            onClick={() => {
              setInputContextMenu(null);
              wrapInputText('*', '*');
            }}
          >
            <Italic size={16} />
            <span>Курсивный текст</span>
          </div>
          <div
            className="context-item"
            onClick={() => {
              setInputContextMenu(null);
              wrapInputText('`', '`');
            }}
          >
            <Code size={16} />
            <span>Моноширинный код</span>
          </div>
          <div
            className="context-item"
            onClick={() => {
              setInputContextMenu(null);
              wrapInputText('||', '||');
            }}
          >
            <EyeOff size={16} />
            <span>Скрыть спойлером</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="message-input-area" style={{ position: 'relative' }}>
        {/* Floating Calculator Bubble */}
        {calcResult !== null && (
          <div
            onClick={() => {
              setInputText(String(calcResult));
              setCalcResult(null);
              inputRef.current?.focus();
            }}
            title="Нажмите, чтобы подставить результат"
            style={{
              position: 'absolute',
              top: '-36px',
              left: '20px',
              background: 'var(--card)',
              border: '1px solid var(--acc)',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--acc3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.15s ease-out',
              zIndex: 10,
            }}
          >
            <Calculator size={13} />
            <span>= {calcResult}</span>
          </div>
        )}

        {/* Mention Suggestions Popup */}
        {mentionCandidates.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '20px',
              marginBottom: '8px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              width: '240px',
              overflow: 'hidden',
              zIndex: 30,
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
              Участники
            </div>
            {mentionCandidates.map((u) => (
              <div
                key={u.uid}
                onClick={() => insertMention(u.nick)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Avatar name={u.displayName || u.nick} avatarUrl={u.avatar} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.displayName || u.nick}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--acc)' }}>
                    @{u.nick}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* === NEW: Editing message badge === */}
        {editingMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'rgba(91,143,185,0.12)',
              borderTop: '1px solid var(--acc)',
              borderRadius: '8px 8px 0 0',
              marginBottom: '0',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <Edit2 size={14} color="var(--acc)" />
            <span style={{ fontSize: '12px', color: 'var(--acc)', fontWeight: 600, flex: 1 }}>
              Редактирование
            </span>
            <span
              style={{ fontSize: '11px', color: 'var(--text2)', flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {editingMessage.text.slice(0, 60)}
            </span>
            <button
              className="icon-btn sm"
              onClick={() => {
                setEditingMessage(null);
                setInputText('');
                inputRef.current?.focus();
              }}
              title="Отменить редактирование"
              style={{ flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Reply Preview Bar */}
        {replyMessage && (
          <div className="reply-bar">
            <Reply size={16} color="var(--acc)" />
            <div className="reply-bar-content">
              <div className="reply-name">
                Ответ для {users[replyMessage.uid]?.displayName || users[replyMessage.uid]?.nick || 'Пользователя'}
              </div>
              <div className="reply-text">{replyMessage.text}</div>
            </div>
            <button
              className="icon-btn sm"
              onClick={() => setReplyMessage(null)}
              title="Отменить ответ"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Telegram-style Emoji, Stickers & GIF Picker Popover */}
        {showEmojiPicker && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: '12px',
              marginBottom: '10px',
              zIndex: 120,
            }}
          >
            <EmojiStickerPicker
              onSelectEmoji={(emoji) => {
                setInputText((prev) => prev + emoji);
                inputRef.current?.focus();
              }}
              onSelectSticker={(stickerUrl) => {
                handleSendAttachment({
                  type: 'photo',
                  url: stickerUrl,
                  fileName: 'sticker.webp',
                  fileSize: 0,
                  caption: '',
                  isSpoiler: false,
                });
                setShowEmojiPicker(false);
              }}
              onSelectGif={(gifUrl) => {
                handleSendAttachment({
                  type: 'photo',
                  url: gifUrl,
                  fileName: 'animation.gif',
                  fileSize: 0,
                  caption: '',
                  isSpoiler: false,
                });
                setShowEmojiPicker(false);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        {/* Input Bar or Voice Recording Mode */}
        {isRecording ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(229,57,53,0.12)',
              border: '1px solid rgba(229,57,53,0.3)',
              borderRadius: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--red)',
                  animation: 'pulse 1s infinite',
                }}
              />
              <span style={{ fontWeight: 600, fontSize: '13px' }}>
                Запись: {Math.floor(recordingSeconds / 60)}:{recordingSeconds % 60 < 10 ? '0' : ''}{recordingSeconds % 60}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn secondary"
                onClick={() => stopRecording(false)}
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                Отмена
              </button>
              <button
                className="btn primary"
                onClick={() => stopRecording(true)}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                Отправить
              </button>
            </div>
          </div>
        ) : (
          <div className="input-row">
            {/* 1. Left: Paperclip Button with Telegram Attach Popover Menu */}
            <div style={{ position: 'relative' }}>
              <button
                className={`icon-btn attach-btn ${showAttachMenu ? 'active' : ''}`}
                onClick={() => {
                  setShowAttachMenu(!showAttachMenu);
                  setShowEmojiPicker(false);
                }}
                title="Прикрепить"
              >
                <Paperclip size={20} color={showAttachMenu ? 'var(--acc)' : undefined} />
              </button>

              {/* Attach Popover Menu */}
              {showAttachMenu && (
                <div
                  className="tg-attach-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="tg-attach-item"
                    onClick={() => {
                      setShowFileUpload(true);
                      setShowAttachMenu(false);
                    }}
                  >
                    <Image size={18} style={{ color: 'var(--acc)' }} />
                    <span>Фото или видео</span>
                  </button>
                  <button
                    className="tg-attach-item"
                    onClick={() => {
                      setShowFileUpload(true);
                      setShowAttachMenu(false);
                    }}
                  >
                    <FileText size={18} style={{ color: '#68b5e8' }} />
                    <span>Файл или документ</span>
                  </button>
                  <button
                    className="tg-attach-item"
                    onClick={() => {
                      onOpenCreatePoll();
                      setShowAttachMenu(false);
                    }}
                  >
                    <BarChart2 size={18} style={{ color: '#f39c12' }} />
                    <span>Опрос</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Middle: Message Input with Smile button embedded inside right edge */}
            <div className="tg-input-box">
              <textarea
                ref={inputRef}
                className="message-input"
                rows={1}
                placeholder="Сообщение..."
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setInputContextMenu({ x: e.clientX, y: e.clientY });
                }}
              />

              <button
                className="tg-input-btn"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowAttachMenu(false);
                }}
                title="Эмодзи и стикеры"
              >
                <Smile size={21} color={showEmojiPicker ? 'var(--acc)' : undefined} />
              </button>
            </div>

            {/* 3. Right: Send Button (if text entered) or Mic Button (if empty) */}
            {inputText.trim() ? (
              <button
                className="icon-btn primary"
                onClick={handleSend}
                title="Отправить (Enter)"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                className="icon-btn"
                onClick={startRecording}
                title="Записать голосовое сообщение"
              >
                <Mic size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUploadModal
          onClose={() => { setShowFileUpload(false); setDropFiles(null); }}
          onUpload={handleSendAttachment}
          initialFiles={dropFiles || undefined}
        />
      )}

      {/* Fullscreen Image Viewer Modal */}
      {viewImage && (
        <ImageViewerModal
          imageUrl={viewImage.url}
          caption={viewImage.caption}
          onClose={() => setViewImage(null)}
        />
      )}
    </main>
  );
};
