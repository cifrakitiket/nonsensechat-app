import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Image,
  Modal,
  ScrollView,
  Linking,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import {
  rtdb,
  triggerHaptic,
  startNativeVoiceRecording,
  stopNativeVoiceRecording,
  cancelNativeVoiceRecording,
  playVoiceMessage,
  stopVoiceMessage,
  setVoicePlaybackSpeed,
  seekVoicePlayback,
  getVoicePlaybackStatus,
} from '../services/firebase';
import { useApp, UserProfile } from '../context/AppContext';
import {
  TelegramAttachSheet,
  EncodedFileResult,
  EncodedPhotoResult,
} from '../components/TelegramAttachSheet';
import { EmojiStickerDrawer } from '../components/EmojiStickerDrawer';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { FormattedMessageText } from '../components/FormattedMessageText';
import { SwipeableMessageRow } from '../components/SwipeableMessageRow';
import { ChatWallpaperOverlay } from '../components/ChatWallpaperOverlay';
import { SharedMediaModal } from '../components/SharedMediaModal';
import { ChannelCommentsModal } from '../components/ChannelCommentsModal';
import { VideoNoteRecorderModal } from '../components/VideoNoteRecorderModal';
import { GroupTopicsAdminModal } from '../components/GroupTopicsAdminModal';
import { ChatDateJumpModal } from '../components/GlobalSearchModal';
import { RADII } from '../theme/liquidGlass';

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '👍', '😮', '🥟'];
const QUICK_EMOJIS = ['😀', '😂', '🥰', '😎', '🤔', '😭', '😡', '🔥', '❤️', '🥟', '🎉', '💯', '👍', '🙏', '✨', '🚀'];

function decodeMsgText(raw?: string) {
  if (!raw) return '';
  return String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function toMs(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof ts === 'object') {
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    if (typeof ts.__ts__ === 'string') {
      const parsed = Date.parse(ts.__ts__);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }
  return 0;
}

function formatDateBadge(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((today - target) / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatDuration(sec = 0) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

function formatBytes(bytes = 0) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatLastSeen(ts?: number) {
  if (!ts) return 'был(а) недавно';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'был(а) только что';
  if (diffSec < 3600) return `был(а) ${Math.floor(diffSec / 60)} мин. назад`;
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `был(а) сегодня в ${time}`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (d.toDateString() === yesterday.toDateString()) return `был(а) вчера в ${time}`;
  return `был(а) ${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} в ${time}`;
}

export default function ChatRoomScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { chatId, name: paramName, jumpToMsgId } = route.params || {};
  const {
    me,
    chats,
    usersMap,
    appTheme,
    showToast,
    giftPirozhki,
    setActiveChatId,
    drafts,
    setDraft,
    chatWallpaper,
    chatFontSize,
    startCall,
  } = useApp();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; text: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; text: string } | null>(null);

  // Interactive UI sheets & modals
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [actionMsg, setActionMsg] = useState<any | null>(null);
  const [forwardMsg, setForwardMsg] = useState<any | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [lightboxMsg, setLightboxMsg] = useState<any | null>(null);
  const [destructLeft, setDestructLeft] = useState<number>(0);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Telegram Ultra states
  const [partnerTypingMode, setPartnerTypingMode] = useState<'typing' | 'recording' | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIdx, setSearchMatchIdx] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSharedMedia, setShowSharedMedia] = useState(false);
  const [commentsMsg, setCommentsMsg] = useState<any | null>(null);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [showScheduledList, setShowScheduledList] = useState(false);
  const [scheduledMsgs, setScheduledMsgs] = useState<any[]>([]);

  // Wave 2 Telegram Complete states
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [activePinIdx, setActivePinIdx] = useState(0);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [savedTagFilter, setSavedTagFilter] = useState<string>('all');
  const [activeTopicId, setActiveTopicId] = useState<string>('all');
  const [voiceLocked, setVoiceLocked] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<{ dataUrl: string; duration: number } | null>(null);
  const [showVideoNoteModal, setShowVideoNoteModal] = useState(false);
  const [showGroupAdminModal, setShowGroupAdminModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [reactionsDetailMsg, setReactionsDetailMsg] = useState<any | null>(null);
  const [hideFwdAuthor, setHideFwdAuthor] = useState(false);
  const [stripFwdCaption, setStripFwdCaption] = useState(false);
  const [slowCooldownLeft, setSlowCooldownLeft] = useState(0);
  const jumpedInitialRef = useRef(false);

  // Voice recording & playback state
  const [isRecording, setIsRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState<1 | 1.5 | 2>(1);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const recTimerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const chat = chats.find((c) => c.id === chatId);
  const isSaved = chat?.type === 'saved' || String(chatId || '').startsWith('fav_');
  const partnerUid =
    !isSaved && chat?.type === 'dm' && me
      ? (chat.members || []).find((m) => m !== me.uid)
      : undefined;
  const partner = partnerUid ? usersMap[partnerUid] : undefined;
  const displayName = isSaved ? 'Избранное' : partner?.nick || chat?.name || paramName || 'Чат';

  useEffect(() => {
    if (!chatId) return;
    setActiveChatId(chatId);
    if (drafts[chatId] && !text) {
      setText(drafts[chatId]);
    }
    const msgsRef = ref(rtdb, `messages/${chatId}`);
    const unsub = onValue(msgsRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.keys(val)
        .filter((k) => val[k] && typeof val[k] === 'object')
        .map((k) => ({
          id: k,
          ...val[k],
          _atMs: toMs(val[k]?.at || val[k]?.timestamp || val[k]?.createdAt),
        }))
        .sort((a, b) => (a._atMs - b._atMs) || a.id.localeCompare(b.id));
      setMessages(list);
    });

    const typingRef = ref(rtdb, `typing/${chatId}`);
    const unsubTyping = onValue(typingRef, (snap) => {
      const val = snap.val() || {};
      const now = Date.now();
      let found: 'typing' | 'recording' | null = null;
      Object.keys(val).forEach((u) => {
        if (u === me?.uid) return;
        const entry = val[u];
        if (entry && now - (entry.at || 0) < 6000) {
          found = entry.mode === 'recording' ? 'recording' : 'typing';
        }
      });
      setPartnerTypingMode(found);
    });

    const schedRef = ref(rtdb, `scheduled_messages/${chatId}`);
    const unsubSched = onValue(schedRef, (snap) => {
      const val = snap.val() || {};
      const arr = Object.keys(val)
        .map((k) => ({ id: k, ...val[k] }))
        .filter((s) => s.uid === me?.uid)
        .sort((a, b) => (a.sendAt || 0) - (b.sendAt || 0));
      setScheduledMsgs(arr);
    });

    return () => {
      setActiveChatId(null);
      unsub();
      unsubTyping();
      unsubSched();
      stopVoiceMessage();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (me?.uid) {
        remove(ref(rtdb, `typing/${chatId}/${me.uid}`)).catch(() => {});
      }
    };
  }, [chatId]);

  // Auto-dispatch due scheduled messages while chat is open
  useEffect(() => {
    if (!chatId || !me || scheduledMsgs.length === 0) return;
    const iv = setInterval(() => {
      const now = Date.now();
      scheduledMsgs.forEach(async (s) => {
        if ((s.sendAt || 0) <= now) {
          await remove(ref(rtdb, `scheduled_messages/${chatId}/${s.id}`)).catch(() => {});
          const payload = { ...s };
          delete payload.id;
          delete payload.sendAt;
          payload.at = now;
          await pushChatMessage(payload, payload.text || 'Отложенное сообщение');
        }
      });
    }, 2000);
    return () => clearInterval(iv);
  }, [scheduledMsgs, chatId, me?.uid]);

  // Record channel post views automatically
  useEffect(() => {
    if (chat?.type !== 'channel' || !me?.uid || !chatId || messages.length === 0) return;
    messages.slice(-15).forEach((m) => {
      if (m.id && (!m.views || !m.views[me.uid])) {
        update(ref(rtdb, `messages/${chatId}/${m.id}/views`), { [me.uid]: true }).catch(() => {});
      }
    });
  }, [chat?.type, messages.length, chatId, me?.uid]);

  // Real Read Receipts + Auto-Delete expired messages
  useEffect(() => {
    if (!chatId || !me?.uid || messages.length === 0) return;
    update(ref(rtdb, `chats/${chatId}/lastReadAt`), { [me.uid]: Date.now() }).catch(() => {});

    const ttl = Number(chat?.autoDeleteMs) || 0;
    if (ttl > 0) {
      const now = Date.now();
      messages.forEach((m) => {
        if (m.uid === me.uid && m._atMs > 0 && now - m._atMs > ttl) {
          remove(ref(rtdb, `messages/${chatId}/${m.id}`)).catch(() => {});
        }
      });
    }
  }, [chatId, me?.uid, messages.length, chat?.autoDeleteMs]);

  // Slow-mode cooldown ticker
  useEffect(() => {
    if (slowCooldownLeft <= 0) return;
    const iv = setInterval(() => {
      setSlowCooldownLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [slowCooldownLeft]);

  // Poll voice playback progress while playing
  useEffect(() => {
    if (!playingMsgId) {
      setVoiceProgress(0);
      return;
    }
    const iv = setInterval(async () => {
      const st = await getVoicePlaybackStatus();
      if (st.isPlaying && st.durationMs > 0) {
        setVoiceProgress(Math.min(1, st.positionMs / st.durationMs));
      } else if (!st.isPlaying && st.positionMs === 0) {
        setPlayingMsgId(null);
        setVoiceProgress(0);
      }
    }, 180);
    return () => clearInterval(iv);
  }, [playingMsgId]);

  // Self-destruct countdown inside Lightbox
  useEffect(() => {
    if (!lightboxMsg || !lightboxMsg.selfDestructSec) return;
    setDestructLeft(lightboxMsg.selfDestructSec);
    const iv = setInterval(() => {
      setDestructLeft((prev) => {
        if (prev <= 1) {
          clearInterval(iv);
          const targetId = lightboxMsg.id;
          setLightboxUri(null);
          setLightboxMsg(null);
          update(ref(rtdb, `messages/${chatId}/${targetId}`), {
            destroyed: true,
            photoUrl: null,
            imageUrl: null,
          }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [lightboxMsg?.id]);

  const emitTypingStatus = (mode: 'typing' | 'recording' | null) => {
    if (!chatId || !me?.uid) return;
    if (!mode) {
      remove(ref(rtdb, `typing/${chatId}/${me.uid}`)).catch(() => {});
      return;
    }
    set(ref(rtdb, `typing/${chatId}/${me.uid}`), { mode, at: Date.now() }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (mode === 'typing') {
      typingTimeoutRef.current = setTimeout(() => {
        remove(ref(rtdb, `typing/${chatId}/${me.uid}`)).catch(() => {});
      }, 4500);
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (chatId) setDraft(chatId, val);
    if (val.trim()) emitTypingStatus('typing');
    else emitTypingStatus(null);
  };

  const invertedFeed = useMemo(() => {
    const visibleMsgs = messages.filter((m) => {
      if (me?.uid && m.hiddenFor && m.hiddenFor[me.uid]) return false;
      if (chat?.topicsEnabled && activeTopicId !== 'all' && m.topicId !== activeTopicId) return false;
      if (isSaved && savedTagFilter !== 'all') {
        if (savedTagFilter === '#медиа') {
          return !!(m.photoUrl || m.fileUrl || m.audioUrl || m.coverUrl);
        }
        return String(m.text || '').toLowerCase().includes(savedTagFilter);
      }
      return true;
    });
    const items: any[] = [];
    for (let i = visibleMsgs.length - 1; i >= 0; i--) {
      const m = visibleMsgs[i];
      items.push(m);
      const prev = i > 0 ? visibleMsgs[i - 1] : null;
      const curDay = m._atMs ? new Date(m._atMs).toDateString() : '';
      const prevDay = prev?._atMs ? new Date(prev._atMs).toDateString() : '';
      if (curDay && curDay !== prevDay) {
        items.push({
          id: `__date_${m.id}`,
          type: '__date__',
          label: formatDateBadge(m._atMs),
        });
      }
    }
    return items;
  }, [messages, me?.uid, chat?.topicsEnabled, activeTopicId, isSaved, savedTagFilter]);

  const maxOtherReadAt = useMemo(() => {
    if (isSaved) return Number.MAX_SAFE_INTEGER;
    const map = chat?.lastReadAt && typeof chat.lastReadAt === 'object' ? chat.lastReadAt : {};
    let maxTs = 0;
    Object.keys(map).forEach((u) => {
      if (u !== me?.uid) {
        const v = Number(map[u]) || 0;
        if (v > maxTs) maxTs = v;
      }
    });
    return maxTs;
  }, [chat?.lastReadAt, me?.uid, isSaved]);

  const pinnedList = useMemo(() => {
    if (Array.isArray(chat?.pinnedMsgs) && chat.pinnedMsgs.length > 0) return chat.pinnedMsgs;
    if (chat?.pinnedMsg) return [chat.pinnedMsg];
    return [];
  }, [chat?.pinnedMsgs, chat?.pinnedMsg]);

  const scrollToMessageId = (targetId: string) => {
    if (!targetId) return;
    const idx = invertedFeed.findIndex((it) => it.id === targetId);
    if (idx < 0) {
      showToast('Сообщение', 'Сообщение находится вне текущего фильтра', 'info');
      return;
    }
    triggerHaptic(8);
    try {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    } catch (_) {}
    setHighlightedMsgId(targetId);
    setTimeout(() => {
      setHighlightedMsgId((cur) => (cur === targetId ? null : cur));
    }, 1800);
  };

  useEffect(() => {
    if (jumpToMsgId && !jumpedInitialRef.current && invertedFeed.length > 0) {
      jumpedInitialRef.current = true;
      setTimeout(() => scrollToMessageId(jumpToMsgId), 320);
    }
  }, [jumpToMsgId, invertedFeed.length]);

  const canSendNow = (): boolean => {
    if (!me) return false;
    if (
      partnerUid &&
      ((me.blockedUids || []).includes(partnerUid) ||
        (partner?.blockedUids || []).includes(me.uid))
    ) {
      showToast('Чёрный список 🚫', 'Отправка сообщений заблокирована', 'error');
      return false;
    }
    const bannedArr: string[] = Array.isArray(chat?.bannedUids)
      ? chat.bannedUids
      : chat?.bannedUids && typeof chat.bannedUids === 'object'
      ? Object.values(chat.bannedUids)
      : [];
    if (bannedArr.includes(me.uid)) {
      showToast('Вы заблокированы 🚫', 'Вы не можете писать в этом чате', 'error');
      return false;
    }
    const adminsArr: string[] = Array.isArray(chat?.admins)
      ? chat.admins
      : chat?.admins && typeof chat.admins === 'object'
      ? Object.values(chat.admins)
      : [];
    const isAdm = chat?.owner === me.uid || adminsArr.includes(me.uid);
    const slowSec = Number(chat?.slowModeSec) || 0;
    if (!isAdm && slowSec > 0 && slowCooldownLeft > 0) {
      showToast('Медленный режим 🐢', `Подождите ${slowCooldownLeft} сек. перед следующим сообщением`, 'info');
      return false;
    }
    if (!isAdm && slowSec > 0) {
      setSlowCooldownLeft(slowSec);
    }
    return true;
  };

  const buildBasePayload = () => {
    const base: any = {
      uid: me!.uid,
      author: chat?.type === 'channel' ? displayName : me!.nick,
      at: Date.now(),
    };
    if (chat?.topicsEnabled && activeTopicId !== 'all') {
      base.topicId = activeTopicId;
    }
    if (me?.prefix) {
      base.prefix = me.prefix;
      base.prefixStyle = me.prefixStyle || 'gold';
      if (me.prefixSound) {
        base.prefixSound = me.prefixSound;
        base.prefixSoundName = me.prefixSoundName || '';
      }
    }
    if (replyTo) {
      base.replyTo = replyTo;
      setReplyTo(null);
    }
    return base;
  };

  const searchMatchIndices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const indices: number[] = [];
    invertedFeed.forEach((item, idx) => {
      if (item.type !== '__date__' && decodeMsgText(item.text).toLowerCase().includes(q)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [invertedFeed, searchQuery]);

  const jumpToSearchMatch = (nextIdx: number) => {
    if (searchMatchIndices.length === 0) return;
    const wrapped = (nextIdx + searchMatchIndices.length) % searchMatchIndices.length;
    setSearchMatchIdx(wrapped);
    const feedIdx = searchMatchIndices[wrapped];
    try {
      flatListRef.current?.scrollToIndex({ index: feedIdx, animated: true, viewPosition: 0.5 });
    } catch (_) {}
  };

  const mentionSuggestions = useMemo(() => {
    const m = text.match(/@([a-zA-Zа-яА-ЯёЁ0-9_]*)$/);
    if (!m) return [];
    const q = m[1].toLowerCase();
    return Object.values(usersMap)
      .filter((u) => u.uid !== me?.uid && (!q || u.nick.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [text, usersMap, me?.uid]);

  const pushChatMessage = async (payload: any, previewText: string, silent = false) => {
    const newRef = push(ref(rtdb, `messages/${chatId}`));
    await set(newRef, payload);
    await update(ref(rtdb, `chats/${chatId}`), {
      lastMsg: previewText,
      lastMsgAt: Date.now(),
      lastMsgUid: me?.uid || '',
      lastMsgSilent: silent,
    });
  };

  const sendTextOrSaveEdit = async (silent = false) => {
    const clean = text.trim();
    if (!clean || !me || !chatId) return;
    triggerHaptic(10);
    emitTypingStatus(null);
    setDraft(chatId, '');

    if (editingMsg) {
      setText('');
      const targetId = editingMsg.id;
      setEditingMsg(null);
      await update(ref(rtdb, `messages/${chatId}/${targetId}`), {
        text: clean,
        edited: true,
        editedAt: Date.now(),
      });
      return;
    }

    if (!canSendNow()) return;

    const isMiniGame = ['🎲', '🎯', '🏀', '⚽', '🎰'].includes(clean);
    const payload: any = {
      ...buildBasePayload(),
      text: clean,
      type: isMiniGame ? 'game' : 'text',
    };
    if (isMiniGame) {
      payload.gameEmoji = clean;
      payload.gameValue =
        clean === '🎰' ? Math.floor(Math.random() * 64) + 1 : Math.floor(Math.random() * 6) + 1;
    }
    if (silent) payload.silent = true;
    setText('');
    setShowEmojiDrawer(false);
    await pushChatMessage(
      payload,
      isMiniGame ? `${clean} Мини-игра` : silent ? `🔇 ${clean}` : clean,
      silent
    );
  };

  const handleScheduleMessage = async (delayMs: number) => {
    const clean = text.trim();
    if (!clean || !me || !chatId) return;
    setShowSendOptions(false);
    setText('');
    setDraft(chatId, '');
    emitTypingStatus(null);
    const sendAt = Date.now() + delayMs;
    const schedRef = push(ref(rtdb, `scheduled_messages/${chatId}`));
    await set(schedRef, {
      ...buildBasePayload(),
      text: clean,
      type: 'text',
      sendAt,
    });
    const min = Math.max(1, Math.round(delayMs / 60000));
    showToast('Отложено ⏰', `Сообщение отправится через ${min} мин.`, 'success');
  };

  const handleSendPhotos = async (photos: EncodedPhotoResult[], caption: string, selfDestructSec = 0) => {
    if (!me || photos.length === 0) return;
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const cap = i === photos.length - 1 ? caption : '';
      const payload: any = {
        ...buildBasePayload(),
        type: 'photo',
        photoUrl: p.dataUrl,
        fileName: p.fileName || 'photo.jpg',
        fileSize: p.fileSize || 0,
        caption: cap,
        text: cap,
      };
      if (selfDestructSec > 0) {
        payload.selfDestructSec = selfDestructSec;
      }
      await pushChatMessage(
        payload,
        selfDestructSec > 0 ? `🔥 Сгорающее фото (${selfDestructSec}с)` : cap ? `📷 ${cap}` : '📷 Фото'
      );
    }
    triggerHaptic(15);
  };

  const handleSendFile = async (res: EncodedFileResult) => {
    if (!res?.dataUrl || !me) return;
    const payload = {
      ...buildBasePayload(),
      type: 'file',
      fileUrl: res.dataUrl,
      fileName: res.fileName || 'document',
      fileSize: res.fileSize || 0,
      mimeType: res.mimeType || 'application/octet-stream',
      text: '',
    };
    await pushChatMessage(payload, `📎 ${res.fileName || 'Файл'}`);
    triggerHaptic(15);
  };

  const handleCreatePoll = async (
    question: string,
    opts: string[],
    settings?: { anonymous?: boolean; multiple?: boolean; isQuiz?: boolean; correctIdx?: number }
  ) => {
    if (!canSendNow()) return;
    const payload: any = {
      ...buildBasePayload(),
      type: 'poll',
      text: `📊 Опрос: ${question}`,
      pollQuestion: question,
      pollOptions: opts.map((label, idx) => ({ id: String(idx), text: label, votes: {} })),
      pollAnonymous: settings?.anonymous !== false,
      pollMultiple: !!settings?.multiple,
      pollQuiz: !!settings?.isQuiz,
      pollCorrectIdx: settings?.correctIdx ?? 0,
    };
    await pushChatMessage(payload, `${settings?.isQuiz ? '🎯 Викторина' : '📊 Опрос'}: ${question}`);
    triggerHaptic(15);
  };

  const handleCreateChecklist = async (title: string, items: string[]) => {
    if (!canSendNow()) return;
    const payload = {
      ...buildBasePayload(),
      type: 'checklist',
      checklistTitle: title,
      checklistItems: items.map((t, idx) => ({ id: String(idx), text: t, doneBy: {} })),
      text: `✅ Чек-лист: ${title}`,
    };
    await pushChatMessage(payload, `✅ Чек-лист: ${title}`);
    triggerHaptic(15);
  };

  const toggleChecklistItem = async (msg: any, itemIdx: number) => {
    if (!me || !chatId) return;
    triggerHaptic(10);
    const items = Array.isArray(msg.checklistItems) ? [...msg.checklistItems] : [];
    const target = items[itemIdx];
    if (!target) return;
    const doneBy = { ...(target.doneBy || {}) };
    if (doneBy[me.uid]) delete doneBy[me.uid];
    else doneBy[me.uid] = me.nick;
    items[itemIdx] = { ...target, doneBy };
    await update(ref(rtdb, `messages/${chatId}/${msg.id}`), { checklistItems: items });
  };

  const handleSendLocation = async (title: string, lat: number, lng: number) => {
    if (!canSendNow()) return;
    const payload = {
      ...buildBasePayload(),
      type: 'location',
      locTitle: title,
      lat,
      lng,
      text: `📍 ${title}`,
    };
    await pushChatMessage(payload, `📍 ${title}`);
    triggerHaptic(15);
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!me || !gifUrl || !canSendNow()) return;
    const payload = {
      ...buildBasePayload(),
      type: 'gif',
      photoUrl: gifUrl,
      text: '',
    };
    setShowEmojiDrawer(false);
    await pushChatMessage(payload, '🎬 GIF');
    triggerHaptic(12);
  };

  const handleSendVideoNote = async (coverDataUrl: string, audioDataUrl: string, durationSec: number) => {
    if (!me || !audioDataUrl || !canSendNow()) return;
    const payload = {
      ...buildBasePayload(),
      type: 'video_note',
      coverUrl: coverDataUrl || me.avatar || '',
      audioUrl: audioDataUrl,
      voiceUrl: audioDataUrl,
      duration: durationSec || 3,
      text: '',
    };
    await pushChatMessage(payload, `⭕ Видеосообщение (${formatDuration(durationSec || 3)})`);
    triggerHaptic(18);
  };

  const handleSendPirozhki = async (amount: number, note: string) => {
    if (!partnerUid) {
      showToast('Подарок', 'Пирожки можно дарить только в личном чате', 'info');
      return;
    }
    try {
      await giftPirozhki(partnerUid, amount, note);
      const payload = {
        ...buildBasePayload(),
        type: 'pirozhki_gift',
        amount,
        note: note ? note.trim() : '',
        text: `🥧 Подарено ${amount} пирожков!${note ? `\n💬 ${note}` : ''}`,
      };
      await pushChatMessage(payload, `🥧 Подарок: ${amount} пирожков`);
      showToast('Отправлено ✓', `Вы подарили 🥧 ${amount}`, 'success');
    } catch (e: any) {
      showToast('Ошибка', e?.message || 'Не удалось подарить пирожки', 'error');
    }
  };

  const handleSendContact = async (user: UserProfile) => {
    const payload = {
      ...buildBasePayload(),
      type: 'text',
      text: `👤 Контакт: ${user.nick}${user.phone ? `\n📞 ${user.phone}` : ''}${user.bio ? `\nℹ️ ${user.bio}` : ''}`,
    };
    await pushChatMessage(payload, `👤 Контакт: ${user.nick}`);
    triggerHaptic(12);
  };

  const handleSendSticker = async (stickerUrl: string, emoji?: string) => {
    if (!me || !stickerUrl) return;
    const payload = {
      ...buildBasePayload(),
      type: 'sticker',
      stickerUrl,
      text: emoji || '✨ Стикер',
    };
    setShowEmojiDrawer(false);
    await pushChatMessage(payload, emoji ? `${emoji} Стикер` : '✨ Стикер');
    triggerHaptic(12);
  };

  const togglePollVote = async (msg: any, optIdx: number) => {
    if (!me || !chatId) return;
    triggerHaptic(10);
    const options = Array.isArray(msg.pollOptions) ? msg.pollOptions.map((o: any) => ({ ...o, votes: { ...(o.votes || {}) } })) : [];
    const targetOpt = options[optIdx];
    if (!targetOpt) return;

    if (msg.pollQuiz) {
      const alreadyVoted = options.some((o: any) => o.votes && o.votes[me.uid]);
      if (alreadyVoted) {
        showToast('Викторина 🎯', 'В режиме викторины ответ даётся один раз', 'info');
        return;
      }
      targetOpt.votes[me.uid] = true;
      await update(ref(rtdb, `messages/${chatId}/${msg.id}`), { pollOptions: options });
      if (optIdx === (msg.pollCorrectIdx ?? 0)) {
        triggerHaptic(25);
        showToast('🎉 Правильно!', 'Отличный ответ в викторине!', 'success');
      } else {
        showToast('❌ Неверно', 'Правильный вариант отмечен зелёным', 'info');
      }
      return;
    }

    const hadVote = !!targetOpt.votes[me.uid];
    if (!msg.pollMultiple) {
      options.forEach((o: any) => {
        if (o.votes) delete o.votes[me.uid];
      });
    }
    if (hadVote) {
      delete targetOpt.votes[me.uid];
    } else {
      targetOpt.votes[me.uid] = true;
    }
    await update(ref(rtdb, `messages/${chatId}/${msg.id}`), {
      pollOptions: options,
    });
  };

  const startVoiceRec = async () => {
    if (!canSendNow()) return;
    try {
      await startNativeVoiceRecording(120000);
      setIsRecording(true);
      setVoiceLocked(false);
      setVoiceDraft(null);
      setRecSec(0);
      emitTypingStatus('recording');
      triggerHaptic(20);
      recTimerRef.current = setInterval(() => {
        setRecSec((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      showToast('Микрофон', e?.message || 'Разрешите доступ к микрофону в настройках', 'error');
    }
  };

  const stopVoiceToDraft = async () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setIsRecording(false);
    setVoiceLocked(false);
    emitTypingStatus(null);
    try {
      const res = await stopNativeVoiceRecording();
      if (res?.dataUrl) {
        setVoiceDraft({ dataUrl: res.dataUrl, duration: res.duration || recSec || 1 });
        triggerHaptic(12);
      }
    } catch (e: any) {
      showToast('Ошибка записи', e?.message || 'Не удалось сохранить черновик ГС', 'error');
    }
  };

  const sendVoiceDraft = async () => {
    if (!voiceDraft || !me) return;
    const d = voiceDraft;
    setVoiceDraft(null);
    stopVoiceMessage();
    setPlayingMsgId(null);
    const payload = {
      ...buildBasePayload(),
      type: 'voice',
      audioUrl: d.dataUrl,
      voiceUrl: d.dataUrl,
      duration: d.duration,
      text: '',
    };
    await pushChatMessage(payload, `🎤 Голосовое (${formatDuration(d.duration)})`);
    triggerHaptic(15);
  };

  const finishVoiceRec = async () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setIsRecording(false);
    emitTypingStatus(null);
    try {
      const res = await stopNativeVoiceRecording();
      if (!res?.dataUrl || !me) return;
      const payload = {
        ...buildBasePayload(),
        type: 'voice',
        audioUrl: res.dataUrl,
        voiceUrl: res.dataUrl,
        duration: res.duration || recSec || 1,
        text: '',
      };
      await pushChatMessage(payload, `🎤 Голосовое (${formatDuration(res.duration)})`);
      triggerHaptic(15);
    } catch (e: any) {
      showToast('Ошибка записи', e?.message || 'Не удалось сохранить голосовое', 'error');
    }
  };

  const cancelVoiceRec = () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setIsRecording(false);
    setRecSec(0);
    emitTypingStatus(null);
    cancelNativeVoiceRecording();
    triggerHaptic(10);
  };

  const toggleReaction = async (msg: any, emoji: string) => {
    if (!me || !chatId) return;
    triggerHaptic(10);
    const reactions = { ...(msg.reactions || {}) };
    const usersForEmoji = { ...(reactions[emoji] || {}) };
    if (usersForEmoji[me.uid]) {
      delete usersForEmoji[me.uid];
    } else {
      usersForEmoji[me.uid] = true;
    }
    if (Object.keys(usersForEmoji).length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = usersForEmoji;
    }
    await update(ref(rtdb, `messages/${chatId}/${msg.id}`), { reactions });
  };

  const toggleSelectMsg = (id: string) => {
    triggerHaptic(8);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBatchCopy = () => {
    const picked = messages.filter((m) => selectedIds.includes(m.id));
    const joined = picked.map((m) => decodeMsgText(m.text)).filter(Boolean).join('\n');
    setSelectionMode(false);
    setSelectedIds([]);
    if (joined) {
      Share.share({ message: joined }).catch(() => {});
    } else {
      showToast('Копирование', 'Нет текста в выбранных сообщениях', 'info');
    }
  };

  const handleBatchDelete = async () => {
    if (!me || !chatId) return;
    const own = messages.filter((m) => selectedIds.includes(m.id) && m.uid === me.uid);
    for (const m of own) {
      await remove(ref(rtdb, `messages/${chatId}/${m.id}`)).catch(() => {});
    }
    setSelectionMode(false);
    setSelectedIds([]);
    triggerHaptic(15);
    showToast('Удалено', `Удалено сообщений: ${own.length}`, 'info');
  };

  const handleForwardToChat = async (targetChatId: string) => {
    if (!forwardMsg || !me) return;
    const listToFwd = Array.isArray(forwardMsg) ? forwardMsg : [forwardMsg];
    const shouldHideAuthor = hideFwdAuthor;
    const shouldStripCap = stripFwdCaption;
    setForwardMsg(null);
    setSelectionMode(false);
    setSelectedIds([]);
    for (const orig of listToFwd) {
      const hasMedia = !!(orig.photoUrl || orig.fileUrl || orig.audioUrl || orig.coverUrl);
      const fwdText = shouldStripCap && hasMedia ? '' : orig.text || '';
      const fwdPayload: any = {
        uid: me.uid,
        author: me.nick,
        at: Date.now(),
        type: orig.type || 'text',
        text: fwdText,
      };
      if (!shouldHideAuthor) {
        fwdPayload.forwardedFrom = orig.author || 'Пользователь';
      }
      if (orig.photoUrl) fwdPayload.photoUrl = orig.photoUrl;
      if (orig.coverUrl) fwdPayload.coverUrl = orig.coverUrl;
      if (orig.audioUrl) fwdPayload.audioUrl = orig.audioUrl;
      if (orig.voiceUrl) fwdPayload.voiceUrl = orig.voiceUrl;
      if (orig.fileUrl) fwdPayload.fileUrl = orig.fileUrl;
      if (orig.fileName) fwdPayload.fileName = orig.fileName;
      if (orig.duration) fwdPayload.duration = orig.duration;

      const newRef = push(ref(rtdb, `messages/${targetChatId}`));
      await set(newRef, fwdPayload);
      await update(ref(rtdb, `chats/${targetChatId}`), {
        lastMsg: shouldHideAuthor
          ? decodeMsgText(fwdText) || 'Медиа-сообщение'
          : `↪ ${decodeMsgText(fwdText) || 'Пересланное сообщение'}`,
        lastMsgAt: Date.now(),
        lastMsgUid: me.uid,
      });
    }
    triggerHaptic(20);
    showToast('Переслано ✓', `Отправлено сообщений: ${listToFwd.length}`, 'success');
  };

  const handleExportChat = () => {
    const lines = messages.slice(-120).map((m) => {
      const dt = m._atMs ? new Date(m._atMs).toLocaleString('ru-RU') : '';
      return `[${dt}] ${m.author || 'Участник'}: ${decodeMsgText(m.text) || `[${m.type || 'медиа'}]`}`;
    });
    const transcript = `Экспорт чата «${displayName}» (NonsenseChat)\n\n${lines.join('\n')}`;
    Share.share({ title: `Экспорт: ${displayName}`, message: transcript }).catch(() => {});
  };

  const applyMarkdownFormat = (wrapLeft: string, wrapRight = wrapLeft) => {
    triggerHaptic(8);
    if (!text.trim()) {
      handleTextChange(`${wrapLeft}текст${wrapRight}`);
    } else {
      handleTextChange(`${wrapLeft}${text}${wrapRight}`);
    }
  };

  const renderMessage = ({ item }: any) => {
    if (item.type === '__date__') {
      return (
        <View style={[styles.sysWrap, { backgroundColor: appTheme.glass, borderColor: appTheme.border }]}>
          <Text style={[styles.sysText, { color: appTheme.textSub }]}>{item.label}</Text>
        </View>
      );
    }

    if (item.type === 'system') {
      return (
        <View style={[styles.sysWrap, { backgroundColor: appTheme.glass, borderColor: appTheme.border }]}>
          <Text style={[styles.sysText, { color: appTheme.textSub }]}>{decodeMsgText(item.text)}</Text>
        </View>
      );
    }

    if (item.type === 'call_log') {
      const dur = Number(item.durationSec) || 0;
      const isVid = !!item.isVideo;
      return (
        <View style={styles.giftPillRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (partnerUid) {
                startCall({
                  uid: partnerUid,
                  nick: displayName,
                  avatar: partner?.avatar,
                  isVideo: isVid,
                  chatId,
                });
              }
            }}
            style={[
              styles.giftPillOval,
              {
                borderColor: dur > 0 ? 'rgba(34,197,94,0.45)' : 'rgba(248,113,113,0.45)',
                backgroundColor: dur > 0 ? 'rgba(34,197,94,0.14)' : 'rgba(248,113,113,0.14)',
              },
            ]}
          >
            <Text style={{ fontSize: 22, marginRight: 10 }}>{isVid ? '📹' : '📞'}</Text>
            <View>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>
                {isVid ? 'Видеозвонок' : 'Аудиозвонок'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11.5 }}>
                {dur > 0 ? `Длительность: ${formatDuration(dur)} · Перезвонить` : 'Отменён / без ответа · Перезвонить'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    const isPirozhkiGift =
      item.type === 'pirozhki_gift' ||
      item.type === 'gift' ||
      (typeof item.text === 'string' &&
        (item.text.startsWith('🥧 Подарено') ||
          (item.text.includes('Подарено') && item.text.includes('пирожк'))));

    if (isPirozhkiGift) {
      const isMine = item.uid === me?.uid;
      const sender = item.uid ? usersMap[item.uid] : undefined;
      const authorName = sender?.nick || item.author || 'Пользователь';
      const timeStr = item._atMs
        ? new Date(item._atMs).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        : '';
      const match = typeof item.text === 'string' ? item.text.match(/(\d+)\s*пирожк/i) : null;
      const giftAmt = item.amount || (match ? match[1] : '');
      const noteMatch = typeof item.text === 'string' ? item.text.split('💬')[1] : '';
      const giftNote = item.note || (noteMatch ? noteMatch.trim() : '');

      return (
        <View style={styles.giftPillRow}>
          <View
            style={[
              styles.giftPillOval,
              {
                borderColor: 'rgba(245, 158, 11, 0.45)',
                backgroundColor: 'rgba(245, 158, 11, 0.16)',
              },
            ]}
          >
            <View style={styles.giftPillIconWrap}>
              <Image
                source={require('../../android/app/src/main/assets/public/pirozhok.png')}
                style={styles.giftPillIcon}
              />
            </View>
            <View style={styles.giftPillBody}>
              <Text style={styles.giftPillTitle}>
                {isMine
                  ? `Вы подарили ${giftAmt ? `${giftAmt} пирожков` : 'пирожки'}!`
                  : `${authorName} дарит вам ${giftAmt ? `${giftAmt} пирожков` : 'пирожки'}!`}
              </Text>
              {giftNote ? (
                <Text style={styles.giftPillNote} numberOfLines={2}>
                  «{giftNote}»
                </Text>
              ) : null}
              <Text style={styles.giftPillTime}>{timeStr}</Text>
            </View>
          </View>
        </View>
      );
    }

    const isSticker = item.type === 'sticker' || !!item.stickerUrl;
    if (isSticker && item.stickerUrl) {
      const isMineS = item.uid === me?.uid;
      return (
        <ScalePressable
          scaleTo={0.96}
          onLongPress={() => setActionMsg(item)}
          style={[styles.msgRow, isMineS ? styles.msgRowOut : styles.msgRowIn]}
        >
          <Image source={{ uri: item.stickerUrl }} style={{ width: 156, height: 156 }} resizeMode="contain" />
        </ScalePressable>
      );
    }

    if (item.type === 'video_note') {
      const isMineVN = item.uid === me?.uid;
      const vnAudio = item.audioUrl || item.voiceUrl;
      const vnCover = item.coverUrl || (item.uid ? usersMap[item.uid]?.avatar : '');
      const vnPlaying = playingMsgId === item.id;
      return (
        <View style={[styles.msgRow, isMineVN ? styles.msgRowOut : styles.msgRowIn]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onLongPress={() => setActionMsg(item)}
            onPress={() => {
              if (!vnAudio) return;
              if (vnPlaying) {
                stopVoiceMessage();
                setPlayingMsgId(null);
              } else {
                setPlayingMsgId(item.id);
                playVoiceMessage(vnAudio, voiceSpeed, 0);
              }
            }}
            style={[
              styles.videoNoteCircle,
              {
                borderColor: vnPlaying ? '#22c55e' : appTheme.accent,
                borderWidth: vnPlaying ? 3.5 : 2.5,
              },
            ]}
          >
            {vnCover ? (
              <Image source={{ uri: vnCover }} style={styles.videoNoteImg} resizeMode="cover" />
            ) : (
              <View style={[styles.videoNoteImg, { backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 38 }}>🎥</Text>
              </View>
            )}
            <View style={styles.videoNoteBadge}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                {vnPlaying ? '■ ' : '▶ '}⭕ {formatDuration(item.duration || 3)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (item.type === 'game') {
      const isMineG = item.uid === me?.uid;
      const gEm = item.gameEmoji || decodeMsgText(item.text) || '🎲';
      const gVal = Number(item.gameValue) || 1;
      let outcome = `Выпало: ${gVal} из 6`;
      if (gEm === '🎯') outcome = gVal === 6 ? '🎯 В ЯБЛОЧКО! (6/6)' : `Бросок: ${gVal} из 6`;
      else if (gEm === '🏀') outcome = gVal >= 4 ? '🔥 ТРЁХОЧКОВЫЙ! Попадание!' : 'Мяч на дужке (мимо)';
      else if (gEm === '⚽') outcome = gVal >= 4 ? '⚽ ГОООЛ В ДЕВЯТКУ!' : 'Штанга / вратарь отбил';
      else if (gEm === '🎰') outcome = gVal === 64 ? '🎰 ДЖЕКПОТ 777! 🎉' : gVal % 11 === 0 ? '🍒 Отличная линия!' : `Комбинация #${gVal}`;
      return (
        <View style={[styles.msgRow, isMineG ? styles.msgRowOut : styles.msgRowIn]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={() => setActionMsg(item)}
            style={[
              styles.gameCard,
              { backgroundColor: isMineG ? appTheme.bubbleOut : appTheme.bubbleIn, borderColor: appTheme.border },
            ]}
          >
            <Text style={{ fontSize: 54 }}>{gEm}</Text>
            <View style={[styles.gameOutcomePill, { backgroundColor: appTheme.accentSoft }]}>
              <Text style={{ color: appTheme.accent, fontWeight: '900', fontSize: 12 }}>{outcome}</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    const isMine = item.uid === me?.uid;
    const sender = item.uid ? usersMap[item.uid] : undefined;
    const authorName = sender?.nick || item.author || 'Пользователь';
    const prefix = sender?.prefix || item.prefix;
    const prefixStyle = sender?.prefixStyle || item.prefixStyle || 'gold';
    const prefixSound = sender?.prefixSound || item.prefixSound;
    const photoUri = item.photoUrl || item.imageUrl || item.url;
    const audioUri = item.audioUrl || item.voiceUrl;
    const isGif = item.type === 'gif';
    const isVoice = item.type === 'voice' || item.type === 'audio' || !!audioUri;
    const isFile = item.type === 'file' || (item.fileUrl && !photoUri && !audioUri);
    const isPoll = item.type === 'poll' && Array.isArray(item.pollOptions);
    const isChecklist = item.type === 'checklist' && Array.isArray(item.checklistItems);
    const isLocation = item.type === 'location' && typeof item.lat === 'number';
    const cleanTxt = decodeMsgText(item.text);
    const isJumboEmoji =
      item.type === 'text' &&
      !photoUri &&
      cleanTxt.length > 0 &&
      cleanTxt.length <= 8 &&
      /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F|\u200D)+$/u.test(cleanTxt);
    const admTitle =
      (chat?.adminTitles && item.uid ? chat.adminTitles[item.uid] : '') ||
      ((chat?.type === 'group' || chat?.type === 'channel') && chat?.owner === item.uid ? 'Владелец' : '');
    const isHighlighted = highlightedMsgId === item.id;
    const isReadByPeer = isSaved || maxOtherReadAt >= (item._atMs || 0);
    const isPlaying = playingMsgId === item.id;
    const timeStr = item._atMs
      ? new Date(item._atMs).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : '';

    const reactionEntries = item.reactions ? Object.entries(item.reactions) : [];
    const isSelected = selectedIds.includes(item.id);
    const isChannelPost = chat?.type === 'channel';
    const viewsCount = item.views ? Object.keys(item.views).length : 0;
    const commentsCount = item.comments ? Object.keys(item.comments).length : 0;

    return (
      <SwipeableMessageRow
        accent={appTheme.accent}
        selectionMode={selectionMode}
        onSwipeReply={() =>
          setReplyTo({
            id: item.id,
            author: authorName,
            text: decodeMsgText(item.text) || 'Медиа',
          })
        }
        onDoubleTapReact={() => toggleReaction(item, '❤️')}
        onLongPress={() => setActionMsg(item)}
        onPressInSelection={() => toggleSelectMsg(item.id)}
      >
        <View
          style={[
            styles.msgRow,
            isMine ? styles.msgRowOut : styles.msgRowIn,
            isSelected && styles.msgRowSelected,
            isHighlighted && { backgroundColor: appTheme.accentSoft, borderRadius: 16, paddingVertical: 3 },
          ]}
        >
          {selectionMode && (
            <TouchableOpacity onPress={() => toggleSelectMsg(item.id)} style={styles.selectCheckWrap}>
              <View
                style={[
                  styles.selectCheck,
                  isSelected
                    ? { backgroundColor: appTheme.accent, borderColor: appTheme.accent }
                    : { borderColor: 'rgba(255,255,255,0.45)' },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color="#000" />}
              </View>
            </TouchableOpacity>
          )}
          <View
            style={[
              styles.bubble,
              isMine
                ? {
                    backgroundColor: appTheme.bubbleOut,
                    borderColor: appTheme.specular,
                    borderBottomRightRadius: 8,
                  }
                : {
                    backgroundColor: appTheme.bubbleIn,
                    borderColor: appTheme.border,
                    borderBottomLeftRadius: 8,
                  },
            ]}
          >
            {item.forwardedFrom ? (
              <Text style={[styles.fwdLabel, { color: appTheme.accent }]}>
                ↪ Переслано от {item.forwardedFrom}
              </Text>
            ) : null}

            {(!isMine || prefix || admTitle) && (
              <View style={styles.bubbleAuthorRow}>
                {!isMine && (
                  <TouchableOpacity
                    onPress={() => item.uid && navigation.navigate('UserProfile', { uid: item.uid })}
                  >
                    <Text style={[styles.bubbleAuthor, { color: appTheme.accent }]}>{authorName}</Text>
                  </TouchableOpacity>
                )}
                {prefix ? (
                  <PrefixBadge prefix={prefix} prefixStyle={prefixStyle} prefixSound={prefixSound} />
                ) : null}
                {admTitle ? (
                  <View style={styles.adminTitleBadge}>
                    <Text style={{ color: '#cbd5e1', fontSize: 10, fontWeight: '700' }}>{admTitle}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {item.replyTo ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => item.replyTo?.id && scrollToMessageId(item.replyTo.id)}
                style={[styles.replyBox, { borderLeftColor: appTheme.accent }]}
              >
                <Text style={[styles.replyAuthor, { color: appTheme.accent }]}>{item.replyTo.author}</Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {decodeMsgText(item.replyTo.text)}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Photo Preview -> Self-destruct or Lightbox */}
            {item.destroyed ? (
              <View style={styles.destroyedBox}>
                <Text style={{ color: '#fb923c', fontSize: 12.5, fontWeight: '700' }}>
                  🔥 Сгорающее фото исчезло
                </Text>
              </View>
            ) : photoUri ? (
              item.selfDestructSec > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.selfDestructTile}
                  onPress={() => {
                    setLightboxMsg(item);
                    setLightboxUri(photoUri);
                  }}
                >
                  <Ionicons name="flame" size={28} color="#fb923c" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, marginTop: 4 }}>
                    Сгорающее фото ({item.selfDestructSec}с)
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
                    Нажмите, чтобы посмотреть
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={{ position: 'relative' }}
                  onPress={() => {
                    setLightboxMsg(null);
                    setLightboxUri(photoUri);
                  }}
                >
                  <Image source={{ uri: photoUri }} style={styles.msgImage} resizeMode="cover" />
                  {isGif && (
                    <View style={styles.gifCornerBadge}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>GIF</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            ) : null}

            {/* Voice Capsule with 1x/1.5x/2x Speed & Waveform Scrubber */}
            {isVoice && audioUri ? (
              <View style={styles.voicePill}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    if (isPlaying) {
                      stopVoiceMessage();
                      setPlayingMsgId(null);
                    } else {
                      setPlayingMsgId(item.id);
                      playVoiceMessage(audioUri, voiceSpeed, 0);
                    }
                  }}
                >
                  <View style={[styles.voicePlayCircle, { backgroundColor: appTheme.accent }]}>
                    <Text style={{ color: '#000', fontSize: 13, fontWeight: '900' }}>
                      {isPlaying ? '■' : '▶'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.waveBars}>
                  {[10, 18, 14, 22, 16, 20, 12, 19, 13, 15, 9].map((h, idx, arr) => {
                    const barRatio = idx / arr.length;
                    const filled = isPlaying && voiceProgress >= barRatio;
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        style={{ paddingVertical: 4, paddingHorizontal: 1 }}
                        onPress={() => {
                          if (isPlaying) {
                            seekVoicePlayback(barRatio);
                            setVoiceProgress(barRatio);
                          } else {
                            setPlayingMsgId(item.id);
                            playVoiceMessage(audioUri, voiceSpeed, barRatio);
                          }
                        }}
                      >
                        <View
                          style={[
                            styles.waveBar,
                            {
                              height: h,
                              backgroundColor: filled
                                ? appTheme.accent
                                : isPlaying
                                ? 'rgba(255,255,255,0.65)'
                                : 'rgba(255,255,255,0.4)',
                            },
                          ]}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.voiceDur}>{formatDuration(item.duration || 2)}</Text>
                <TouchableOpacity
                  style={styles.speedPill}
                  onPress={() => {
                    const next: 1 | 1.5 | 2 = voiceSpeed === 1 ? 1.5 : voiceSpeed === 1.5 ? 2 : 1;
                    setVoiceSpeed(next);
                    if (isPlaying) setVoicePlaybackSpeed(next);
                    triggerHaptic(8);
                  }}
                >
                  <Text style={{ color: appTheme.accent, fontSize: 10.5, fontWeight: '900' }}>
                    {voiceSpeed}x
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* File Card */}
            {isFile && item.fileUrl ? (
              <TouchableOpacity
                style={styles.fileCard}
                onPress={() => {
                  if (String(item.fileUrl).startsWith('http')) Linking.openURL(item.fileUrl).catch(() => {});
                  else showToast('Файл', `${item.fileName || 'Файл'} (${formatBytes(item.fileSize)})`, 'info');
                }}
              >
                <View style={[styles.fileIconCircle, { backgroundColor: appTheme.accentSoft }]}>
                  <Text style={{ fontSize: 18 }}>📄</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.fileName || 'Документ'}
                  </Text>
                  <Text style={styles.fileSize}>{formatBytes(item.fileSize) || 'Файл'}</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Interactive Poll 2.0 (Quiz, Anonymous, Multi-choice) */}
            {isPoll ? (
              <View style={styles.pollBox}>
                <Text style={styles.pollQ}>
                  {item.pollQuiz ? '🎯 ' : '📊 '}
                  {item.pollQuestion}
                </Text>
                <Text style={{ color: appTheme.textSub, fontSize: 11, marginBottom: 4 }}>
                  {item.pollQuiz ? 'Викторина' : 'Опрос'} ·{' '}
                  {item.pollAnonymous === false ? 'Публичный' : 'Анонимный'}
                  {item.pollMultiple ? ' · Мультивыбор' : ''}
                </Text>
                {(() => {
                  const totalVotes = item.pollOptions.reduce(
                    (acc: number, o: any) => acc + Object.keys(o.votes || {}).length,
                    0
                  );
                  const meVotedAny = item.pollOptions.some(
                    (o: any) => !!(me && o.votes && o.votes[me.uid])
                  );
                  return item.pollOptions.map((opt: any, idx: number) => {
                    const cnt = Object.keys(opt.votes || {}).length;
                    const pct = totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0;
                    const voted = !!(me && opt.votes && opt.votes[me.uid]);
                    const isQuizRight = !!item.pollQuiz && meVotedAny && idx === (item.pollCorrectIdx ?? 0);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.pollOpt,
                          voted && { borderColor: appTheme.accent, backgroundColor: appTheme.accentSoft },
                          isQuizRight && { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.22)' },
                        ]}
                        onPress={() => togglePollVote(item, idx)}
                      >
                        <Text style={styles.pollOptText}>
                          {isQuizRight ? '🎉 ' : voted ? '✓ ' : ''}
                          {opt.text}
                        </Text>
                        <Text style={[styles.pollPct, { color: isQuizRight ? '#4ade80' : appTheme.accent }]}>
                          {pct}% ({cnt})
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
            ) : null}

            {/* Interactive Checklist Card */}
            {isChecklist ? (
              <View style={styles.pollBox}>
                {(() => {
                  const doneCnt = item.checklistItems.filter(
                    (ci: any) => ci.doneBy && Object.keys(ci.doneBy).length > 0
                  ).length;
                  return (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.pollQ}>✅ {item.checklistTitle || 'Чек-лист'}</Text>
                        <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 12 }}>
                          {doneCnt}/{item.checklistItems.length}
                        </Text>
                      </View>
                      {item.checklistItems.map((ci: any, idx: number) => {
                        const done = !!(ci.doneBy && Object.keys(ci.doneBy).length > 0);
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.pollOpt,
                              done && { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.16)' },
                            ]}
                            onPress={() => toggleChecklistItem(item, idx)}
                          >
                            <Text
                              style={[
                                styles.pollOptText,
                                done && { textDecorationLine: 'line-through', opacity: 0.8 },
                              ]}
                            >
                              {done ? '☑️ ' : '⬜ '}
                              {ci.text}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  );
                })()}
              </View>
            ) : null}

            {/* Geolocation Card */}
            {isLocation ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.locationCard}
                onPress={() =>
                  Linking.openURL(`https://maps.google.com/?q=${item.lat},${item.lng}`).catch(() => {})
                }
              >
                <View style={[styles.fileIconCircle, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
                  <Text style={{ fontSize: 19 }}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.locTitle || 'Геолокация'}
                  </Text>
                  <Text style={styles.fileSize}>
                    {Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)} · Открыть карту ↗
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Formatted Text or Jumbo Single Emoji */}
            {!isPoll && !isChecklist && !isLocation && cleanTxt ? (
              isJumboEmoji ? (
                <Text style={{ fontSize: 44, lineHeight: 52, paddingVertical: 2 }}>{cleanTxt}</Text>
              ) : (
                <FormattedMessageText
                  text={cleanTxt}
                  color={appTheme.text}
                  accent={appTheme.accent}
                  fontSize={chatFontSize}
                  highlightQuery={searchOpen ? searchQuery : ''}
                  usersMap={usersMap}
                  onMentionPress={(uid) => navigation.navigate('UserProfile', { uid })}
                  onHashtagPress={(tag) => {
                    setSearchOpen(true);
                    setSearchQuery(tag);
                  }}
                />
              )
            ) : null}

            {/* Reactions Chips */}
            {reactionEntries.length > 0 && (
              <View style={styles.reactionsRow}>
                {reactionEntries.map(([emoji, usersObj]: any) => {
                  const count = Object.keys(usersObj || {}).length;
                  const mine = !!(me && usersObj && usersObj[me.uid]);
                  if (!count) return null;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.reactionChip,
                        mine && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent },
                      ]}
                      onPress={() => toggleReaction(item, emoji)}
                      onLongPress={() => setReactionsDetailMsg(item)}
                    >
                      <Text style={styles.reactionTxt}>
                        {emoji} {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.bubbleFooter}>
              {isChannelPost && (
                <Text style={{ color: appTheme.textSub, fontSize: 10.5, marginRight: 6 }}>
                  👁️ {viewsCount}
                </Text>
              )}
              {item.silent && (
                <Ionicons name="notifications-off-outline" size={11} color="rgba(255,255,255,0.45)" style={{ marginRight: 3 }} />
              )}
              <Text style={[styles.msgTime, { color: isMine ? 'rgba(255,255,255,0.7)' : appTheme.textSub }]}>
                {item.edited ? 'изм. · ' : ''}
                {timeStr}
              </Text>
              {isMine && (
                <Ionicons
                  name={isReadByPeer ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={isReadByPeer ? appTheme.accent : 'rgba(255,255,255,0.55)'}
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>

            {isChannelPost && (
              <TouchableOpacity
                style={[styles.commentsFooterBtn, { borderTopColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => setCommentsMsg(item)}
              >
                <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '700' }}>
                  💬 Комментарии {commentsCount > 0 ? `(${commentsCount})` : ''}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={appTheme.accent} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SwipeableMessageRow>
    );
  };

  return (
    <LiquidBackground>
      <ChatWallpaperOverlay wallpaper={chatWallpaper} accent={appTheme.accent} />
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Floating Liquid Glass Header (or Multi-Select Toolbar) */}
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 }}>
          {selectionMode ? (
            <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => {
                  setSelectionMode(false);
                  setSelectedIds([]);
                }}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.chatTitle, { color: appTheme.text, flex: 1, marginLeft: 8 }]}>
                Выбрано: {selectedIds.length}
              </Text>
              <TouchableOpacity style={styles.circleBtn} onPress={handleBatchCopy}>
                <Ionicons name="copy-outline" size={18} color={appTheme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => {
                  const picked = messages.filter((m) => selectedIds.includes(m.id));
                  if (picked.length > 0) setForwardMsg(picked);
                }}
              >
                <Ionicons name="arrow-redo-outline" size={19} color={appTheme.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.circleBtn} onPress={handleBatchDelete}>
                <Ionicons name="trash-outline" size={18} color="#f87171" />
              </TouchableOpacity>
            </GlassCard>
          ) : (
            <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
              <ScalePressable style={styles.circleBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backBtnText}>←</Text>
              </ScalePressable>

              <TouchableOpacity
                style={styles.headerProfileTouch}
                activeOpacity={0.75}
                onPress={() => partnerUid && navigation.navigate('UserProfile', { uid: partnerUid })}
              >
                <FramedAvatar
                  uri={partner?.avatar}
                  name={displayName}
                  frameId={partner?.steamFrame || 'none'}
                  size={38}
                  online={!!partner?.online}
                />
                <View style={styles.headerMeta}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.chatTitle, { color: appTheme.text }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {partner?.prefix ? (
                      <PrefixBadge
                        prefix={partner.prefix}
                        prefixStyle={partner.prefixStyle}
                        prefixSound={partner.prefixSound}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.chatSub,
                      {
                        color: partnerTypingMode
                          ? appTheme.accent
                          : partner?.online
                          ? '#4ade80'
                          : appTheme.textSub,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {partnerTypingMode === 'recording'
                      ? 'записывает голосовое...'
                      : partnerTypingMode === 'typing'
                      ? 'печатает...'
                      : isSaved
                      ? 'Облачное хранилище'
                      : partner?.online
                      ? 'в сети'
                      : partner
                      ? formatLastSeen(partner.lastSeen)
                      : 'нажмите для профиля'}
                  </Text>
                </View>
              </TouchableOpacity>

              {partnerUid ? (
                <ScalePressable
                  style={styles.circleBtn}
                  onPress={() =>
                    startCall({
                      uid: partnerUid,
                      nick: displayName,
                      avatar: partner?.avatar,
                      isVideo: false,
                      chatId,
                    })
                  }
                >
                  <Ionicons name="call-outline" size={18} color="#4ade80" />
                </ScalePressable>
              ) : null}

              <ScalePressable
                style={styles.circleBtn}
                onPress={() => {
                  setSearchOpen((v) => !v);
                  setSearchQuery('');
                  setSearchMatchIdx(0);
                }}
              >
                <Ionicons name={searchOpen ? 'close' : 'search'} size={18} color={appTheme.text} />
              </ScalePressable>

              <ScalePressable style={styles.circleBtn} onPress={() => setShowSharedMedia(true)}>
                <Ionicons name="images-outline" size={18} color={appTheme.accent} />
              </ScalePressable>

              <ScalePressable style={styles.circleBtn} onPress={() => setShowChatMenu(true)}>
                <Ionicons name="ellipsis-vertical" size={17} color={appTheme.text} />
              </ScalePressable>
            </GlassCard>
          )}
        </View>

        {/* In-Chat Search Bar */}
        {searchOpen && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
            <GlassCard radius={18} strong style={styles.searchBarCard}>
              <Ionicons name="search" size={16} color={appTheme.textSub} />
              <TextInput
                style={[styles.searchBarInput, { color: appTheme.text }]}
                placeholder="Поиск по сообщениям..."
                placeholderTextColor={appTheme.textSub}
                value={searchQuery}
                onChangeText={(q) => {
                  setSearchQuery(q);
                  setSearchMatchIdx(0);
                }}
                autoFocus
              />
              {searchMatchIndices.length > 0 && (
                <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '700' }}>
                  {searchMatchIdx + 1}/{searchMatchIndices.length}
                </Text>
              )}
              <TouchableOpacity onPress={() => jumpToSearchMatch(searchMatchIdx + 1)} style={{ padding: 4 }}>
                <Ionicons name="chevron-up" size={18} color={appTheme.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => jumpToSearchMatch(searchMatchIdx - 1)} style={{ padding: 4 }}>
                <Ionicons name="chevron-down" size={18} color={appTheme.text} />
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}

        {/* Multi-Pinned Messages Bar (1/N) */}
        {pinnedList.length > 0 ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const cur = pinnedList[activePinIdx % pinnedList.length];
                if (cur?.id) scrollToMessageId(cur.id);
                setActivePinIdx((prev) => (prev + 1) % pinnedList.length);
              }}
            >
              <GlassCard radius={18} style={styles.pinnedCard}>
                <Text style={[styles.pinnedLabel, { color: appTheme.accent }]}>
                  📌 Закреп {pinnedList.length > 1 ? `${(activePinIdx % pinnedList.length) + 1}/${pinnedList.length}` : ''}:
                </Text>
                <Text style={[styles.pinnedText, { color: appTheme.text }]} numberOfLines={1}>
                  {decodeMsgText(pinnedList[activePinIdx % pinnedList.length]?.text) || 'Медиа-сообщение'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const cur = pinnedList[activePinIdx % pinnedList.length];
                    const nextPins = pinnedList.filter((p: any) => p.id !== cur?.id);
                    update(ref(rtdb, `chats/${chatId}`), {
                      pinnedMsgs: nextPins,
                      pinnedMsg: nextPins[0] || null,
                    });
                  }}
                >
                  <Text style={{ color: appTheme.textSub, paddingHorizontal: 6 }}>✕</Text>
                </TouchableOpacity>
              </GlassCard>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Smart Saved Messages Tag Filter Bar */}
        {isSaved && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {['all', '#важное', '#идеи', '#ссылки', '#медиа'].map((tag) => {
                const act = savedTagFilter === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => setSavedTagFilter(tag)}
                    style={[
                      styles.mentionChip,
                      {
                        backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                        borderColor: act ? appTheme.accent : appTheme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: act ? appTheme.accent : appTheme.textSub, fontSize: 12, fontWeight: '800' }}>
                      {tag === 'all' ? '🔖 Все заметки' : tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Group Topics Forum Strip */}
        {chat?.topicsEnabled && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <TouchableOpacity
                onPress={() => setActiveTopicId('all')}
                style={[
                  styles.mentionChip,
                  {
                    backgroundColor: activeTopicId === 'all' ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                    borderColor: activeTopicId === 'all' ? appTheme.accent : appTheme.border,
                  },
                ]}
              >
                <Text style={{ color: activeTopicId === 'all' ? appTheme.accent : appTheme.textSub, fontSize: 12, fontWeight: '800' }}>
                  # Все темы
                </Text>
              </TouchableOpacity>
              {Object.entries(chat.topics || {}).map(([tid, tObj]: any) => {
                const act = activeTopicId === tid;
                return (
                  <TouchableOpacity
                    key={tid}
                    onPress={() => setActiveTopicId(tid)}
                    style={[
                      styles.mentionChip,
                      {
                        backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                        borderColor: act ? appTheme.accent : appTheme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: act ? appTheme.accent : appTheme.textSub, fontSize: 12, fontWeight: '800' }}>
                      {tObj?.icon || '💬'} {tObj?.title || 'Тема'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setShowGroupAdminModal(true)}
                style={[styles.mentionChip, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: appTheme.border }]}
              >
                <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '800' }}>⚙️ Темы</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Messages Feed (Inverted: newest at bottom, loads all messages) */}
        <FlatList
          ref={flatListRef}
          data={invertedFeed}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          initialNumToRender={20}
          maxToRenderPerBatch={15}
          windowSize={11}
          contentContainerStyle={styles.feedContent}
          onScroll={(e) => setShowScrollBottom(e.nativeEvent.contentOffset.y > 140)}
          scrollEventThrottle={32}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
            }, 250);
          }}
        />

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottom && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.scrollBottomFab, { backgroundColor: appTheme.glassStrong, borderColor: appTheme.specular }]}
            onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
          >
            <Ionicons name="chevron-down" size={22} color={appTheme.accent} />
          </TouchableOpacity>
        )}

        {/* Reply / Edit Banner */}
        {(replyTo || editingMsg) && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
            <GlassCard radius={20} strong style={styles.replyBanner}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.replyBannerTitle, { color: appTheme.accent }]}>
                  {editingMsg ? '✏️ Редактирование' : `Ответ для ${replyTo?.author}`}
                </Text>
                <Text style={[styles.replyBannerSub, { color: appTheme.textSub }]} numberOfLines={1}>
                  {editingMsg ? editingMsg.text : replyTo?.text}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setReplyTo(null);
                  setEditingMsg(null);
                  if (editingMsg) setText('');
                }}
              >
                <Text style={{ color: appTheme.textSub, fontSize: 18, paddingHorizontal: 8 }}>✕</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}

        {/* Full Emoji, Sticker & GIF Drawer */}
        {showEmojiDrawer && (
          <EmojiStickerDrawer
            onSelectEmoji={(em) => setText((prev) => prev + em)}
            onBackspace={() =>
              setText((prev) => {
                const chars = Array.from(prev);
                chars.pop();
                return chars.join('');
              })
            }
            onSelectSticker={handleSendSticker}
            onSelectGif={handleSendGif}
          />
        )}

        {/* Markdown Text Formatting Bar */}
        {showFormatBar && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
            <GlassCard radius={18} strong style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { label: 'B Жирный', fn: () => applyMarkdownFormat('**') },
                  { label: 'I Курсив', fn: () => applyMarkdownFormat('*') },
                  { label: 'S Зачёрк.', fn: () => applyMarkdownFormat('~~') },
                  { label: '||Спойлер||', fn: () => applyMarkdownFormat('||') },
                  { label: '`Код`', fn: () => applyMarkdownFormat('`') },
                  { label: '❝ Цитата', fn: () => applyMarkdownFormat('> ', '') },
                ].map((b) => (
                  <TouchableOpacity
                    key={b.label}
                    style={[styles.mentionChip, { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent }]}
                    onPress={b.fn}
                  >
                    <Text style={{ color: appTheme.text, fontSize: 12, fontWeight: '800' }}>{b.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </GlassCard>
          </View>
        )}

        {/* Voice Draft Preview Bar */}
        {voiceDraft && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
            <GlassCard radius={20} strong style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  if (playingMsgId === '__draft__') {
                    stopVoiceMessage();
                    setPlayingMsgId(null);
                  } else {
                    setPlayingMsgId('__draft__');
                    playVoiceMessage(voiceDraft.dataUrl, 1, 0);
                  }
                }}
                style={[styles.voicePlayCircle, { backgroundColor: appTheme.accent }]}
              >
                <Text style={{ color: '#000', fontWeight: '900' }}>
                  {playingMsgId === '__draft__' ? '■' : '▶'}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: appTheme.text, flex: 1, fontWeight: '700', fontSize: 13 }}>
                🎤 Черновик ГС ({formatDuration(voiceDraft.duration)})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  stopVoiceMessage();
                  setPlayingMsgId(null);
                  setVoiceDraft(null);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendCircle, { backgroundColor: appTheme.accent }]}
                onPress={sendVoiceDraft}
              >
                <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>➤</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}

        {/* @Mention Autocomplete Bar */}
        {mentionSuggestions.length > 0 && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
            <GlassCard radius={18} strong style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {mentionSuggestions.map((u) => (
                  <TouchableOpacity
                    key={u.uid}
                    style={[styles.mentionChip, { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent }]}
                    onPress={() => {
                      const next = text.replace(/@([a-zA-Zа-яА-ЯёЁ0-9_]*)$/, `@${u.nick} `);
                      handleTextChange(next);
                    }}
                  >
                    <Text style={{ color: appTheme.text, fontWeight: '700', fontSize: 12.5 }}>@{u.nick}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </GlassCard>
          </View>
        )}

        {/* Floating Liquid Glass Pill Composer */}
        <View style={styles.composerWrap}>
          {isRecording ? (
            <GlassCard radius={RADII.PILL} strong style={styles.recPill}>
              <TouchableOpacity style={styles.recCancelBtn} onPress={cancelVoiceRec}>
                <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
                <View style={styles.recDot} />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  {voiceLocked ? '🔒 ' : ''}Запись {formatDuration(recSec)}
                </Text>
              </View>
              {!voiceLocked && (
                <TouchableOpacity
                  style={[styles.composerIconBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => {
                    triggerHaptic(12);
                    setVoiceLocked(true);
                  }}
                >
                  <Text style={{ fontSize: 15 }}>🔒</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.composerIconBtn, { backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 }]}
                onPress={stopVoiceToDraft}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>⏸</Text>
              </TouchableOpacity>
              <ScalePressable style={[styles.sendCircle, { backgroundColor: '#ef4444' }]} onPress={finishVoiceRec}>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>➤</Text>
              </ScalePressable>
            </GlassCard>
          ) : (
            <GlassCard radius={RADII.PILL} strong style={styles.composerPill}>
              <ScalePressable style={styles.composerIconBtn} onPress={() => setShowAttachSheet(true)}>
                <Text style={{ color: appTheme.accent, fontSize: 21, fontWeight: '700' }}>＋</Text>
              </ScalePressable>

              <TextInput
                style={[styles.input, { color: appTheme.text }]}
                placeholder={
                  slowCooldownLeft > 0
                    ? `🐢 Слоумод (${slowCooldownLeft}с)...`
                    : 'Сообщение...'
                }
                placeholderTextColor={appTheme.textSub}
                multiline
                value={text}
                onChangeText={handleTextChange}
              />

              <ScalePressable
                style={styles.composerIconBtn}
                onPress={() => setShowFormatBar((v) => !v)}
              >
                <Text style={{ color: showFormatBar ? appTheme.accent : appTheme.textSub, fontSize: 13, fontWeight: '900' }}>
                  Aa
                </Text>
              </ScalePressable>

              {scheduledMsgs.length > 0 && (
                <ScalePressable
                  style={styles.composerIconBtn}
                  onPress={() => setShowScheduledList(true)}
                >
                  <Ionicons name="time-outline" size={20} color={appTheme.accent} />
                </ScalePressable>
              )}

              <ScalePressable
                style={styles.composerIconBtn}
                onPress={() => setShowEmojiDrawer((prev) => !prev)}
              >
                <Text style={{ fontSize: 19 }}>😊</Text>
              </ScalePressable>

              {text.trim() ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.sendCircle, { backgroundColor: appTheme.accent }]}
                  onPress={() => sendTextOrSaveEdit(false)}
                  onLongPress={() => {
                    triggerHaptic(15);
                    setShowSendOptions(true);
                  }}
                >
                  <Text style={{ color: '#000', fontSize: 16, fontWeight: '900' }}>➤</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ScalePressable
                    style={[styles.sendCircle, { backgroundColor: 'rgba(59,130,246,0.2)' }]}
                    onPress={() => setShowVideoNoteModal(true)}
                  >
                    <Text style={{ fontSize: 16 }}>⭕</Text>
                  </ScalePressable>
                  <ScalePressable
                    style={[styles.sendCircle, { backgroundColor: appTheme.accentSoft }]}
                    onPress={startVoiceRec}
                  >
                    <Text style={{ fontSize: 18 }}>🎤</Text>
                  </ScalePressable>
                </View>
              )}
            </GlassCard>
          )}
        </View>

        {/* Telegram-Style In-App Attachment Sheet */}
        <TelegramAttachSheet
          visible={showAttachSheet}
          mode="chat"
          onClose={() => setShowAttachSheet(false)}
          onSendPhotos={handleSendPhotos}
          onSendFile={handleSendFile}
          onSendPoll={handleCreatePoll}
          onSendChecklist={handleCreateChecklist}
          onSendLocation={handleSendLocation}
          onSendPirozhki={handleSendPirozhki}
          onSendContact={handleSendContact}
          canGiftPirozhki={!!partnerUid}
        />

        {/* Message Action & Reactions Sheet */}
        <Modal visible={!!actionMsg} transparent animationType="fade" onRequestClose={() => setActionMsg(null)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActionMsg(null)}>
            <GlassCard radius={28} strong style={styles.sheetCard}>
              <View style={styles.quickReactRow}>
                {QUICK_REACTIONS.map((em) => (
                  <TouchableOpacity
                    key={em}
                    style={styles.quickReactBtn}
                    onPress={() => {
                      const m = actionMsg;
                      setActionMsg(null);
                      if (m) toggleReaction(m, em);
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  const m = actionMsg;
                  setActionMsg(null);
                  if (m) {
                    setReplyTo({
                      id: m.id,
                      author: m.author || 'Пользователь',
                      text: decodeMsgText(m.text) || 'Медиа',
                    });
                  }
                }}
              >
                <Text style={styles.sheetRowText}>↩️ Ответить</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  const m = actionMsg;
                  setActionMsg(null);
                  setForwardMsg(m);
                }}
              >
                <Text style={styles.sheetRowText}>↪️ Переслать</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  const m = actionMsg;
                  setActionMsg(null);
                  if (m) {
                    setSelectionMode(true);
                    setSelectedIds([m.id]);
                  }
                }}
              >
                <Text style={styles.sheetRowText}>☑️ Выбрать несколько</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  const m = actionMsg;
                  setActionMsg(null);
                  if (m) setReactionsDetailMsg(m);
                }}
              >
                <Text style={styles.sheetRowText}>👁️ Кто прочитал и реакции</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={async () => {
                  const m = actionMsg;
                  setActionMsg(null);
                  const txt = decodeMsgText(m?.text);
                  if (txt) {
                    Share.share({ message: txt }).catch(() => {});
                  } else {
                    showToast('Сообщение', 'Нет текста для отправки', 'info');
                  }
                }}
              >
                <Text style={styles.sheetRowText}>📋 Поделиться / Скопировать</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={async () => {
                  const m = actionMsg;
                  setActionMsg(null);
                  if (m) {
                    const entry = { id: m.id, text: decodeMsgText(m.text) || 'Медиа', author: m.author || '' };
                    const nextPins = [entry, ...pinnedList.filter((p: any) => p.id !== m.id)].slice(0, 5);
                    await update(ref(rtdb, `chats/${chatId}`), {
                      pinnedMsgs: nextPins,
                      pinnedMsg: nextPins[0],
                    });
                    showToast('Закреплено 📌', `Закреплено сообщений: ${nextPins.length}`, 'success');
                  }
                }}
              >
                <Text style={styles.sheetRowText}>📌 Закрепить (мульти-закреп)</Text>
              </TouchableOpacity>

              {actionMsg?.uid === me?.uid && actionMsg?.type === 'text' && (
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={() => {
                    const m = actionMsg;
                    setActionMsg(null);
                    setEditingMsg({ id: m.id, text: decodeMsgText(m.text) });
                    setText(decodeMsgText(m.text));
                  }}
                >
                  <Text style={styles.sheetRowText}>✏️ Редактировать</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  const m = actionMsg;
                  setActionMsg(null);
                  if (m && me?.uid) {
                    update(ref(rtdb, `messages/${chatId}/${m.id}/hiddenFor`), {
                      [me.uid]: true,
                    });
                    showToast('Скрыто 🙈', 'Удалено только у вас', 'info');
                  }
                }}
              >
                <Text style={[styles.sheetRowText, { color: '#fb923c' }]}>🙈 Удалить только у меня</Text>
              </TouchableOpacity>

              {(actionMsg?.uid === me?.uid || chat?.type === 'dm' || chat?.owner === me?.uid) && (
                <TouchableOpacity
                  style={[styles.sheetRow, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    const m = actionMsg;
                    setActionMsg(null);
                    if (m) {
                      remove(ref(rtdb, `messages/${chatId}/${m.id}`));
                      showToast('Удалено 🗑️', 'Удалено у всех собеседников', 'info');
                    }
                  }}
                >
                  <Text style={[styles.sheetRowText, { color: '#ef4444' }]}>
                    🗑️ {chat?.type === 'dm' ? 'Удалить у обоих' : 'Удалить у всех'}
                  </Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          </TouchableOpacity>
        </Modal>

        {/* Forward Chat Picker (Smart Forward) */}
        <Modal visible={!!forwardMsg} transparent animationType="fade" onRequestClose={() => setForwardMsg(null)}>
          <View style={styles.modalBackdrop}>
            <GlassCard radius={28} strong style={styles.sheetCard}>
              <Text style={[styles.sheetTitle, { color: appTheme.text }]}>Умная пересылка</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => setHideFwdAuthor((v) => !v)}
                  style={[
                    styles.mentionChip,
                    {
                      flex: 1,
                      alignItems: 'center',
                      backgroundColor: hideFwdAuthor ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                      borderColor: hideFwdAuthor ? appTheme.accent : appTheme.border,
                    },
                  ]}
                >
                  <Text style={{ color: hideFwdAuthor ? appTheme.accent : appTheme.textSub, fontSize: 12, fontWeight: '800' }}>
                    {hideFwdAuthor ? '✓ Скрыть автора' : '🙈 Скрыть автора'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStripFwdCaption((v) => !v)}
                  style={[
                    styles.mentionChip,
                    {
                      flex: 1,
                      alignItems: 'center',
                      backgroundColor: stripFwdCaption ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                      borderColor: stripFwdCaption ? appTheme.accent : appTheme.border,
                    },
                  ]}
                >
                  <Text style={{ color: stripFwdCaption ? appTheme.accent : appTheme.textSub, fontSize: 12, fontWeight: '800' }}>
                    {stripFwdCaption ? '✓ Без подписи' : '📝 Без подписи'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 260 }}>
                {chats.map((c) => {
                  const otherId = c.type === 'dm' && me ? c.members.find((x) => x !== me.uid) : undefined;
                  const title =
                    c.type === 'saved'
                      ? 'Избранное'
                      : otherId
                      ? usersMap[otherId]?.nick || c.name || 'Диалог'
                      : c.name || 'Чат';
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.sheetRow}
                      onPress={() => handleForwardToChat(c.id)}
                    >
                      <Text style={styles.sheetRowText}>💬 {title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setForwardMsg(null)}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Отмена</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>

        {/* Fullscreen Lightbox Image Viewer (with Self-Destruct Countdown) */}
        <Modal
          visible={!!lightboxUri}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (lightboxMsg?.selfDestructSec) {
              update(ref(rtdb, `messages/${chatId}/${lightboxMsg.id}`), {
                destroyed: true,
                photoUrl: null,
                imageUrl: null,
              }).catch(() => {});
            }
            setLightboxMsg(null);
            setLightboxUri(null);
          }}
        >
          <View style={styles.lightboxBackdrop}>
            <TouchableOpacity
              style={styles.lightboxClose}
              onPress={() => {
                if (lightboxMsg?.selfDestructSec) {
                  update(ref(rtdb, `messages/${chatId}/${lightboxMsg.id}`), {
                    destroyed: true,
                    photoUrl: null,
                    imageUrl: null,
                  }).catch(() => {});
                }
                setLightboxMsg(null);
                setLightboxUri(null);
              }}
            >
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
            {lightboxMsg?.selfDestructSec ? (
              <View style={styles.destructBadge}>
                <Text style={{ color: '#fb923c', fontWeight: '900', fontSize: 15 }}>
                  🔥 Исчезнет через {destructLeft}с
                </Text>
              </View>
            ) : null}
            {lightboxUri && (
              <Image source={{ uri: lightboxUri }} style={styles.lightboxImg} resizeMode="contain" />
            )}
          </View>
        </Modal>

        {/* Long-Press Send Options (Silent / Scheduled) */}
        <Modal visible={showSendOptions} transparent animationType="fade" onRequestClose={() => setShowSendOptions(false)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSendOptions(false)}>
            <GlassCard radius={26} strong style={styles.sheetCard}>
              <Text style={[styles.sheetTitle, { color: appTheme.text }]}>Особая отправка</Text>
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  setShowSendOptions(false);
                  sendTextOrSaveEdit(true);
                }}
              >
                <Text style={styles.sheetRowText}>🔇 Отправить без звука</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => handleScheduleMessage(60 * 1000)}>
                <Text style={styles.sheetRowText}>⏰ Отложить на 1 минуту</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => handleScheduleMessage(5 * 60 * 1000)}>
                <Text style={styles.sheetRowText}>⏰ Отложить на 5 минут</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => handleScheduleMessage(30 * 60 * 1000)}>
                <Text style={styles.sheetRowText}>⏰ Отложить на 30 минут</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => handleScheduleMessage(60 * 60 * 1000)}>
                <Text style={styles.sheetRowText}>⏰ Отложить на 1 час</Text>
              </TouchableOpacity>
            </GlassCard>
          </TouchableOpacity>
        </Modal>

        {/* Scheduled Messages Queue Modal */}
        <Modal visible={showScheduledList} transparent animationType="fade" onRequestClose={() => setShowScheduledList(false)}>
          <View style={styles.modalBackdrop}>
            <GlassCard radius={26} strong style={styles.sheetCard}>
              <Text style={[styles.sheetTitle, { color: appTheme.text }]}>
                ⏰ Отложенные ({scheduledMsgs.length})
              </Text>
              <ScrollView style={{ maxHeight: 260 }}>
                {scheduledMsgs.map((s) => (
                  <View key={s.id} style={[styles.sheetRow, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 14 }} numberOfLines={2}>{s.text}</Text>
                      <Text style={{ color: appTheme.accent, fontSize: 11, marginTop: 2 }}>
                        {new Date(s.sendAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        await remove(ref(rtdb, `scheduled_messages/${chatId}/${s.id}`));
                        const payload = { ...s };
                        delete payload.id;
                        delete payload.sendAt;
                        payload.at = Date.now();
                        await pushChatMessage(payload, payload.text);
                      }}
                    >
                      <Ionicons name="send" size={18} color={appTheme.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(ref(rtdb, `scheduled_messages/${chatId}/${s.id}`))}>
                      <Ionicons name="trash-outline" size={18} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowScheduledList(false)}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Закрыть</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>

        {/* Shared Media Modal */}
        <SharedMediaModal
          visible={showSharedMedia}
          onClose={() => setShowSharedMedia(false)}
          messages={messages}
          chatName={displayName}
          onOpenPhoto={(uri) => {
            setLightboxMsg(null);
            setLightboxUri(uri);
          }}
          onPlayVoice={(m) => {
            const audioUri = m.audioUrl || m.voiceUrl;
            if (audioUri) {
              setPlayingMsgId(m.id);
              playVoiceMessage(audioUri, voiceSpeed, 0);
            }
          }}
        />

        {/* Channel Comments Modal */}
        <ChannelCommentsModal
          visible={!!commentsMsg}
          onClose={() => setCommentsMsg(null)}
          chatId={chatId}
          message={commentsMsg}
        />

        {/* Video Note ("Кружочек") Recorder */}
        <VideoNoteRecorderModal
          visible={showVideoNoteModal}
          onClose={() => setShowVideoNoteModal(false)}
          onSendVideoNote={handleSendVideoNote}
        />

        {/* Calendar Date Jump Modal */}
        <ChatDateJumpModal
          visible={showDateModal}
          onClose={() => setShowDateModal(false)}
          messages={messages}
          onJumpToMsgId={scrollToMessageId}
        />

        {/* Group 2.0 Topics & Admin Modal */}
        {chat && (
          <GroupTopicsAdminModal
            visible={showGroupAdminModal}
            onClose={() => setShowGroupAdminModal(false)}
            chat={chat}
          />
        )}

        {/* Chat Extras Menu (Calls, Auto-Delete Timer, Date Jump, Group Admin, Export, Pirozhki) */}
        <Modal visible={showChatMenu} transparent animationType="fade" onRequestClose={() => setShowChatMenu(false)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowChatMenu(false)}>
            <GlassCard radius={28} strong style={styles.sheetCard}>
              <Text style={[styles.sheetTitle, { color: appTheme.text }]}>{displayName}</Text>

              {partnerUid && (
                <>
                  <TouchableOpacity
                    style={styles.sheetRow}
                    onPress={() => {
                      setShowChatMenu(false);
                      startCall({ uid: partnerUid, nick: displayName, avatar: partner?.avatar, isVideo: true, chatId });
                    }}
                  >
                    <Text style={styles.sheetRowText}>📹 Видеозвонок 1-на-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sheetRow}
                    onPress={() => {
                      setShowChatMenu(false);
                      navigation.navigate('PirozhkiStore', { initialTab: 'gift', targetUid: partnerUid });
                    }}
                  >
                    <Text style={styles.sheetRowText}>🥟 Подарить пирожки</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  setShowChatMenu(false);
                  setShowDateModal(true);
                }}
              >
                <Text style={styles.sheetRowText}>📅 Перейти к дате (Календарь)</Text>
              </TouchableOpacity>

              {(chat?.type === 'group' || chat?.type === 'channel') && (
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={() => {
                    setShowChatMenu(false);
                    setShowGroupAdminModal(true);
                  }}
                >
                  <Text style={styles.sheetRowText}>👑 Темы, Админы и Медленный режим</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.sheetRow, { flexDirection: 'column', gap: 8 }]}>
                <Text style={styles.sheetRowText}>⏱️ Автоудаление новых сообщений</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: 'Выкл', ms: 0 },
                    { label: '24 часа', ms: 24 * 3600 * 1000 },
                    { label: '7 дней', ms: 7 * 24 * 3600 * 1000 },
                  ].map((opt) => {
                    const act = (Number(chat?.autoDeleteMs) || 0) === opt.ms;
                    return (
                      <TouchableOpacity
                        key={opt.label}
                        style={[
                          styles.mentionChip,
                          {
                            flex: 1,
                            alignItems: 'center',
                            backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                            borderColor: act ? appTheme.accent : appTheme.border,
                          },
                        ]}
                        onPress={() => {
                          update(ref(rtdb, `chats/${chatId}`), { autoDeleteMs: opt.ms });
                          showToast('Автоудаление ⏱️', `Режим: ${opt.label}`, 'success');
                        }}
                      >
                        <Text style={{ color: act ? appTheme.accent : appTheme.textSub, fontSize: 12, fontWeight: '800' }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.sheetRow, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setShowChatMenu(false);
                  handleExportChat();
                }}
              >
                <Text style={styles.sheetRowText}>📤 Экспортировать историю чата</Text>
              </TouchableOpacity>
            </GlassCard>
          </TouchableOpacity>
        </Modal>

        {/* Read Receipts & Reactions Detail Modal */}
        <Modal
          visible={!!reactionsDetailMsg}
          transparent
          animationType="fade"
          onRequestClose={() => setReactionsDetailMsg(null)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setReactionsDetailMsg(null)}
          >
            <GlassCard radius={28} strong style={styles.sheetCard}>
              <Text style={[styles.sheetTitle, { color: appTheme.text }]}>
                ✓✓ Прочтения и реакции
              </Text>
              <ScrollView style={{ maxHeight: 280 }}>
                <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '800', marginBottom: 6 }}>
                  ПРОЧИТАЛИ СООБЩЕНИЕ:
                </Text>
                {Object.entries(chat?.lastReadAt || {})
                  .filter(([u, ts]) => u !== reactionsDetailMsg?.uid && Number(ts) >= (reactionsDetailMsg?._atMs || 0))
                  .map(([u, ts]) => (
                    <View key={u} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>
                        ✓✓ {usersMap[u]?.nick || u.slice(0, 8)}
                      </Text>
                      <Text style={{ color: appTheme.textSub, fontSize: 12 }}>
                        {new Date(Number(ts)).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ))}

                <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 6 }}>
                  РЕАКЦИИ:
                </Text>
                {Object.entries(reactionsDetailMsg?.reactions || {}).flatMap(([em, uMap]: any) =>
                  Object.keys(uMap || {}).map((u) => (
                    <View key={`${em}_${u}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>
                        {usersMap[u]?.nick || (u === me?.uid ? me?.nick : u.slice(0, 8))}
                      </Text>
                      <Text style={{ fontSize: 18 }}>{em}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </GlassCard>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 20, color: '#fff', fontWeight: '800' },
  headerProfileTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBarCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  searchBarInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
  mentionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  msgRowSelected: { backgroundColor: 'rgba(96, 165, 250, 0.12)', borderRadius: 14, paddingVertical: 2 },
  selectCheckWrap: { justifyContent: 'center', paddingHorizontal: 8 },
  selectCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  destroyedBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    marginBottom: 4,
  },
  selfDestructTile: {
    width: 210,
    height: 150,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  destructBadge: {
    position: 'absolute',
    top: 46,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: '#f97316',
    zIndex: 20,
  },
  speedPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 4,
  },
  commentsFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  headerMeta: { flex: 1 },
  chatTitle: { fontSize: 15.5, fontWeight: '800', flexShrink: 1 },
  chatSub: { fontSize: 11.5, marginTop: 1 },
  giftBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  pinnedLabel: { fontSize: 11.5, fontWeight: '800' },
  pinnedText: { flex: 1, fontSize: 12.5 },
  feedContent: { padding: 12, paddingBottom: 16, gap: 6 },
  sysWrap: {
    alignSelf: 'center',
    marginVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  sysText: { fontSize: 12, fontWeight: '600' },
  giftPillRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  giftPillOval: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  giftPillIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  giftPillIcon: {
    width: 22,
    height: 22,
  },
  giftPillBody: {
    flexShrink: 1,
  },
  giftPillTitle: {
    color: '#fbbf24',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
  giftPillNote: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  giftPillTime: {
    color: 'rgba(245, 158, 11, 0.7)',
    fontSize: 10,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  msgRow: { width: '100%', flexDirection: 'row', marginVertical: 2 },
  msgRowOut: { justifyContent: 'flex-end' },
  msgRowIn: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '83%',
    borderRadius: RADII.BUBBLE,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fwdLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bubbleAuthorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  bubbleAuthor: { fontSize: 12.5, fontWeight: '800' },
  replyBox: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 8,
    paddingVertical: 4,
  },
  replyAuthor: { fontSize: 11, fontWeight: '800' },
  replyText: { fontSize: 12, color: '#cbd5e1' },
  msgImage: { width: 225, height: 185, borderRadius: 18, marginBottom: 4 },
  voicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    minWidth: 185,
  },
  voicePlayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBars: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  waveBar: { width: 3, borderRadius: 99 },
  voiceDur: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 16,
    padding: 8,
    minWidth: 190,
  },
  fileIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fileName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  fileSize: { color: '#94a3b8', fontSize: 11 },
  pollBox: { minWidth: 215, gap: 6 },
  pollQ: { color: '#fff', fontSize: 14.5, fontWeight: '800', marginBottom: 4 },
  pollOpt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.26)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pollOptText: { color: '#f1f5f9', fontSize: 13, fontWeight: '600', flex: 1, marginRight: 6 },
  pollPct: { fontSize: 12, fontWeight: '800' },
  msgText: { fontSize: 15, lineHeight: 20 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  reactionChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reactionTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: 4,
    gap: 2,
  },
  msgTime: { fontSize: 10.5, color: 'rgba(255,255,255,0.48)' },
  scrollBottomFab: {
    position: 'absolute',
    bottom: 84,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 99,
  },
  replyBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  replyBannerTitle: { fontSize: 12, fontWeight: '800' },
  replyBannerSub: { fontSize: 12 },
  emojiDrawer: { paddingVertical: 8, paddingHorizontal: 10 },
  emojiItem: { paddingHorizontal: 8, paddingVertical: 4 },
  composerWrap: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  composerPill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderColor: 'rgba(239,68,68,0.55)',
  },
  recCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  composerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 15,
  },
  sendCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  sheetCard: { padding: 18 },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  attachGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  attachItem: { alignItems: 'center', gap: 8 },
  attachCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  attachLbl: { color: '#e2e8f0', fontSize: 12.5, fontWeight: '700' },
  quickReactRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  quickReactBtn: { padding: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  sheetRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  sheetRowText: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  cancelModalBtn: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  pollInput: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#fff',
    marginBottom: 8,
    fontSize: 14,
  },
  createPollBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImg: { width: '100%', height: '82%' },
  videoNoteCircle: {
    width: 184,
    height: 184,
    borderRadius: 92,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    backgroundColor: '#0f172a',
  },
  videoNoteImg: { width: '100%', height: '100%' },
  videoNoteBadge: {
    position: 'absolute',
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  gameCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    marginVertical: 3,
  },
  gameOutcomePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  adminTitleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  gifCornerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    borderRadius: 16,
    padding: 9,
    minWidth: 200,
    marginBottom: 2,
  },
});
