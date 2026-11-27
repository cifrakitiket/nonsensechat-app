import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, NativeModules, Platform } from 'react-native';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { ref, onValue, get, set, update, push, remove } from 'firebase/database';
import { AppUpdateInfo, auth, checkVkCloudUpdate, rtdb, triggerHaptic } from '../services/firebase';
import { CREATOR_UID } from '../constants/catalogs';
import { AppThemeKey, LIQUID_THEMES, LiquidTheme } from '../theme/liquidGlass';

export interface UserProfile {
  uid: string;
  nick: string;
  nickLower?: string;
  email?: string;
  avatar?: string;
  ava?: string;
  bio?: string;
  bday?: string;
  phone?: string;
  online?: boolean;
  lastSeen?: number;
  createdAt?: number;
  pirozhki?: number;
  prefix?: string;
  prefixStyle?: string;
  prefixSound?: string;
  prefixSoundName?: string;
  steamTheme?: string;
  steamFrame?: string;
  unlockedThemes?: string[];
  unlockedFrames?: string[];
  privacyLastSeen?: 'everybody' | 'contacts' | 'nobody';
  avatarHistory?: string[];
  blockedUids?: string[];
}

export interface FriendRequestItem {
  id: string;
  from: string;
  fromNick?: string;
  to: string;
  toNick?: string;
  at?: number;
}

export interface ChatItem {
  id: string;
  type: 'dm' | 'group' | 'channel' | 'saved' | string;
  name?: string;
  avatar?: string;
  members: string[];
  lastMsg?: string;
  lastMsgAt?: number;
  unread?: number;
  [key: string]: any;
}

function toArray<T>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'object') return Object.values(val).filter(Boolean) as T[];
  return [];
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

export function normalizeUser(uid: string, raw: any): UserProfile {
  const data = raw || {};
  const nick = data.nick || data.username || (data.email ? String(data.email).split('@')[0] : uid.slice(0, 8));
  const steamTheme = data.steamTheme || 'classic';
  const steamFrame = data.steamFrame || 'none';
  const unlockedThemes = toArray<string>(data.unlockedThemes);
  if (!unlockedThemes.includes('classic')) unlockedThemes.unshift('classic');
  if (steamTheme && !unlockedThemes.includes(steamTheme)) unlockedThemes.push(steamTheme);

  const unlockedFrames = toArray<string>(data.unlockedFrames);
  if (!unlockedFrames.includes('none')) unlockedFrames.unshift('none');
  if (steamFrame && !unlockedFrames.includes(steamFrame)) unlockedFrames.push(steamFrame);

  return {
    uid,
    nick,
    nickLower: data.nickLower || String(nick).toLowerCase(),
    email: data.email || '',
    avatar: data.avatar || data.ava || '',
    ava: data.avatar || data.ava || '',
    bio: data.bio || '',
    bday: data.bday || '',
    phone: data.phone || '',
    online: !!data.online,
    lastSeen: data.privacyLastSeen === 'nobody' ? 0 : toMs(data.lastSeen),
    createdAt: toMs(data.createdAt),
    pirozhki: Math.max(0, parseInt(String(data.pirozhki ?? 0), 10) || 0),
    prefix: data.prefix || '',
    prefixStyle: data.prefixStyle || 'gold',
    prefixSound: data.prefixSound || '',
    prefixSoundName: data.prefixSoundName || '',
    steamTheme,
    steamFrame,
    unlockedThemes,
    unlockedFrames,
    privacyLastSeen: data.privacyLastSeen || 'everybody',
    avatarHistory: toArray<string>(data.avatarHistory),
    blockedUids: toArray<string>(data.blockedUids),
  };
}

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogConfig {
  title: string;
  message?: string;
  buttons?: DialogButton[];
}

export interface ToastState {
  id: number;
  title: string;
  body?: string;
  type: 'info' | 'success' | 'error';
}

export interface CustomFolder {
  id: string;
  name: string;
  icon: string;
  chatIds: string[];
}

export interface StoryItem {
  id: string;
  uid: string;
  nick: string;
  avatar?: string;
  imageUrl: string;
  caption?: string;
  createdAt: number;
  views?: Record<string, boolean>;
}

export type ChatWallpaperKey = 'none' | 'stars' | 'bubbles' | 'mesh' | 'grid' | 'aurora';

interface AppContextValue {
  authUser: User | null;
  loadingAuth: boolean;
  me: UserProfile | null;
  chats: ChatItem[];
  incomingRequests: FriendRequestItem[];
  outgoingRequests: FriendRequestItem[];
  usersMap: Record<string, UserProfile>;
  appThemeKey: AppThemeKey;
  appTheme: LiquidTheme;
  setAppTheme: (key: AppThemeKey) => void;
  setActiveChatId: (chatId: string | null) => void;
  toastState: ToastState | null;
  dialogState: DialogConfig | null;
  showToast: (title: string, body?: string, type?: 'info' | 'success' | 'error') => void;
  showDialog: (cfg: DialogConfig) => void;
  dismissDialog: () => void;
  updateInfo: AppUpdateInfo | null;
  checkingUpdate: boolean;
  checkForUpdates: (silent?: boolean) => Promise<void>;
  dismissUpdate: () => void;
  loginWithNickOrEmail: (loginInput: string, password: string) => Promise<void>;
  registerAccount: (email: string, nick: string, password: string) => Promise<void>;
  resetPassword: (loginInput: string) => Promise<string>;
  logout: () => Promise<void>;
  openOrCreateDm: (targetUid: string) => Promise<ChatItem | null>;
  addFriendByNick: (nickOrUid: string) => Promise<ChatItem | null>;
  sendFriendRequest: (targetUid: string) => Promise<void>;
  acceptFriendRequest: (req: FriendRequestItem) => Promise<ChatItem | null>;
  declineFriendRequest: (reqId: string) => Promise<void>;
  createGroupOrChannel: (type: 'group' | 'channel', name: string, desc?: string) => Promise<ChatItem | null>;
  updateMyProfile: (patch: Partial<UserProfile>) => Promise<void>;
  grantSelfPirozhki: (amount: number) => Promise<void>;
  giftPirozhki: (targetUid: string, amount: number, note?: string) => Promise<void>;
  buyThemeOrFrame: (themeId: string, frameId: string, totalCost: number) => Promise<void>;
  equipThemeAndFrame: (themeId: string, frameId: string) => Promise<void>;
  buyPrefix: (prefixText: string, styleKey: string, cost: number, soundUrl?: string, soundName?: string) => Promise<void>;
  savePrefixSound: (soundUrl: string, soundName: string) => Promise<void>;
  notificationsEnabled: boolean;
  openNotificationSettings: () => Promise<void>;
  testNotification: () => Promise<void>;
  bgSyncEnabled: boolean;
  setBgSyncEnabled: (enabled: boolean) => Promise<void>;
  checkNotificationPermission: () => Promise<boolean>;
  // Telegram Ultra features
  pinnedChatIds: string[];
  mutedChatIds: string[];
  archivedChatIds: string[];
  markedUnreadIds: string[];
  drafts: Record<string, string>;
  customFolders: CustomFolder[];
  chatWallpaper: ChatWallpaperKey;
  chatFontSize: number;
  pinCode: string;
  stories: StoryItem[];
  togglePinChat: (chatId: string) => void;
  toggleMuteChat: (chatId: string) => void;
  toggleArchiveChat: (chatId: string) => void;
  toggleMarkUnread: (chatId: string) => void;
  setDraft: (chatId: string, text: string) => void;
  createCustomFolder: (name: string, icon: string, chatIds: string[]) => void;
  deleteCustomFolder: (id: string) => void;
  toggleChatInFolder: (folderId: string, chatId: string) => void;
  setChatWallpaper: (wp: ChatWallpaperKey) => void;
  setChatFontSize: (size: number) => void;
  setPinCode: (pin: string) => void;
  publishStory: (imageDataUrl: string, caption: string) => Promise<void>;
  markStoryViewed: (storyId: string) => Promise<void>;
  // Wave 2 Telegram Complete features
  personalNotes: Record<string, string>;
  setPersonalNote: (targetUid: string, note: string) => void;
  favoriteStickers: string[];
  recentStickers: string[];
  toggleFavoriteSticker: (url: string) => void;
  pushRecentSticker: (url: string) => void;
  markAllChatsRead: () => void;
  toggleBlockUser: (targetUid: string) => Promise<void>;
  setPrivacyLastSeen: (mode: 'everybody' | 'contacts' | 'nobody') => Promise<void>;
  activeCallPeer: { uid: string; nick: string; avatar?: string; isVideo: boolean; chatId?: string } | null;
  startCall: (peer: { uid: string; nick: string; avatar?: string; isVideo: boolean; chatId?: string }) => void;
  endActiveCallTrigger: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [appThemeKey, setAppThemeKeyState] = useState<AppThemeKey>('dark');
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [dialogState, setDialogState] = useState<DialogConfig | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [bgSyncEnabled, setBgSyncEnabledState] = useState(true);

  // Telegram Ultra persisted preferences & Stories
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  const [mutedChatIds, setMutedChatIds] = useState<string[]>([]);
  const [archivedChatIds, setArchivedChatIds] = useState<string[]>([]);
  const [markedUnreadIds, setMarkedUnreadIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [chatWallpaper, setChatWallpaperState] = useState<ChatWallpaperKey>('stars');
  const [chatFontSize, setChatFontSizeState] = useState<number>(15);
  const [pinCode, setPinCodeState] = useState<string>('');
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>({});
  const [favoriteStickers, setFavoriteStickers] = useState<string[]>([]);
  const [recentStickers, setRecentStickers] = useState<string[]>([]);
  const [activeCallPeer, setActiveCallPeer] = useState<{
    uid: string;
    nick: string;
    avatar?: string;
    isVideo: boolean;
    chatId?: string;
  } | null>(null);
  const mutedChatIdsRef = useRef<string[]>([]);

  useEffect(() => {
    mutedChatIdsRef.current = mutedChatIds;
  }, [mutedChatIds]);

  const tgPrefsLoadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await NativeModules.NativeStorageModule?.getItem?.('nc_tg_prefs_v1');
        if (raw) {
          const p = JSON.parse(raw);
          if (Array.isArray(p.pinnedChatIds)) setPinnedChatIds(p.pinnedChatIds);
          if (Array.isArray(p.mutedChatIds)) setMutedChatIds(p.mutedChatIds);
          if (Array.isArray(p.archivedChatIds)) setArchivedChatIds(p.archivedChatIds);
          if (Array.isArray(p.markedUnreadIds)) setMarkedUnreadIds(p.markedUnreadIds);
          if (p.drafts && typeof p.drafts === 'object') setDrafts(p.drafts);
          if (Array.isArray(p.customFolders)) setCustomFolders(p.customFolders);
          if (p.chatWallpaper) setChatWallpaperState(p.chatWallpaper);
          if (typeof p.chatFontSize === 'number') setChatFontSizeState(p.chatFontSize);
          if (typeof p.pinCode === 'string') setPinCodeState(p.pinCode);
          if (p.personalNotes && typeof p.personalNotes === 'object') setPersonalNotes(p.personalNotes);
          if (Array.isArray(p.favoriteStickers)) setFavoriteStickers(p.favoriteStickers);
          if (Array.isArray(p.recentStickers)) setRecentStickers(p.recentStickers);
        }
      } catch (_) {}
      tgPrefsLoadedRef.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!tgPrefsLoadedRef.current) return;
    try {
      const payload = JSON.stringify({
        pinnedChatIds,
        mutedChatIds,
        archivedChatIds,
        markedUnreadIds,
        drafts,
        customFolders,
        chatWallpaper,
        chatFontSize,
        pinCode,
        personalNotes,
        favoriteStickers,
        recentStickers,
      });
      NativeModules.NativeStorageModule?.setItem?.('nc_tg_prefs_v1', payload);
    } catch (_) {}
  }, [
    pinnedChatIds,
    mutedChatIds,
    archivedChatIds,
    markedUnreadIds,
    drafts,
    customFolders,
    chatWallpaper,
    chatFontSize,
    pinCode,
    personalNotes,
    favoriteStickers,
    recentStickers,
  ]);

  const toggleIdInList = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
    triggerHaptic(10);
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePinChat = (chatId: string) => toggleIdInList(setPinnedChatIds, chatId);
  const toggleMuteChat = (chatId: string) => toggleIdInList(setMutedChatIds, chatId);
  const toggleArchiveChat = (chatId: string) => toggleIdInList(setArchivedChatIds, chatId);
  const toggleMarkUnread = (chatId: string) => toggleIdInList(setMarkedUnreadIds, chatId);

  const setDraft = (chatId: string, text: string) => {
    setDrafts((prev) => {
      const clean = text;
      if (!clean.trim()) {
        if (!(chatId in prev)) return prev;
        const next = { ...prev };
        delete next[chatId];
        return next;
      }
      if (prev[chatId] === clean) return prev;
      return { ...prev, [chatId]: clean };
    });
  };

  const createCustomFolder = (name: string, icon: string, chatIds: string[]) => {
    const clean = name.trim();
    if (!clean) return;
    const folder: CustomFolder = {
      id: `fld_${Date.now()}`,
      name: clean,
      icon: icon || '📁',
      chatIds,
    };
    setCustomFolders((prev) => [...prev, folder]);
    triggerHaptic(12);
  };

  const deleteCustomFolder = (id: string) => {
    setCustomFolders((prev) => prev.filter((f) => f.id !== id));
    triggerHaptic(10);
  };

  const toggleChatInFolder = (folderId: string, chatId: string) => {
    setCustomFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        const exists = f.chatIds.includes(chatId);
        return { ...f, chatIds: exists ? f.chatIds.filter((c) => c !== chatId) : [...f.chatIds, chatId] };
      })
    );
    triggerHaptic(8);
  };

  const setChatWallpaper = (wp: ChatWallpaperKey) => {
    triggerHaptic(8);
    setChatWallpaperState(wp);
  };

  const setChatFontSize = (size: number) => {
    const clamped = Math.max(13, Math.min(20, Math.round(size)));
    setChatFontSizeState(clamped);
  };

  const setPinCode = (pin: string) => {
    triggerHaptic(12);
    setPinCodeState(pin);
  };

  const publishStory = async (imageDataUrl: string, caption: string) => {
    if (!me) return;
    const storyRef = push(ref(rtdb, 'stories'));
    await set(storyRef, {
      uid: me.uid,
      nick: me.nick,
      avatar: me.avatar || '',
      imageUrl: imageDataUrl,
      caption: caption.trim(),
      createdAt: Date.now(),
      views: { [me.uid]: true },
    });
    triggerHaptic(20);
  };

  const markStoryViewed = async (storyId: string) => {
    if (!me || !storyId) return;
    try {
      await update(ref(rtdb, `stories/${storyId}/views`), { [me.uid]: true });
    } catch (_) {}
  };

  const setPersonalNote = (targetUid: string, note: string) => {
    setPersonalNotes((prev) => {
      if (!note.trim()) {
        const next = { ...prev };
        delete next[targetUid];
        return next;
      }
      return { ...prev, [targetUid]: note };
    });
  };

  const toggleFavoriteSticker = (url: string) => {
    if (!url) return;
    triggerHaptic(10);
    setFavoriteStickers((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [url, ...prev]));
  };

  const pushRecentSticker = (url: string) => {
    if (!url) return;
    setRecentStickers((prev) => [url, ...prev.filter((u) => u !== url)].slice(0, 24));
  };

  const markAllChatsRead = () => {
    triggerHaptic(14);
    setUnreadMap({});
    setMarkedUnreadIds([]);
    setChats((prev) => prev.map((c) => (c.unread ? { ...c, unread: 0 } : c)));
    if (Platform.OS === 'android') {
      try {
        NativeModules.NotificationModule?.clearAllNotifications?.();
      } catch (_) {}
    }
  };

  const toggleBlockUser = async (targetUid: string) => {
    if (!me || !targetUid) return;
    const cur = me.blockedUids || [];
    const next = cur.includes(targetUid) ? cur.filter((u) => u !== targetUid) : [...cur, targetUid];
    await update(ref(rtdb, `users/${me.uid}`), { blockedUids: next });
    triggerHaptic(12);
  };

  const setPrivacyLastSeen = async (mode: 'everybody' | 'contacts' | 'nobody') => {
    if (!me) return;
    await update(ref(rtdb, `users/${me.uid}`), { privacyLastSeen: mode });
    triggerHaptic(8);
  };

  const startCall = (peer: { uid: string; nick: string; avatar?: string; isVideo: boolean; chatId?: string }) => {
    triggerHaptic(18);
    setActiveCallPeer(peer);
  };

  const endActiveCallTrigger = () => {
    setActiveCallPeer(null);
  };

  const checkNotificationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const enabled = await NativeModules.NotificationModule?.areNotificationsEnabled?.();
      const isOk = enabled !== false;
      setNotificationsEnabled(isOk);
      return isOk;
    } catch (_) {
      return true;
    }
  };

  const openNotificationSettings = async () => {
    if (Platform.OS === 'android') {
      try {
        await NativeModules.NotificationModule?.openNotificationSettings?.();
      } catch (_) {}
    }
  };

  const testNotification = async () => {
    if (Platform.OS === 'android') {
      try {
        await NativeModules.NotificationModule?.testNotification?.();
        showToast('Тест отправлен', 'Проверьте шторку уведомлений 🔔', 'success');
      } catch (e: any) {
        showToast('Ошибка теста', e?.message || 'Не удалось отправить уведомление', 'error');
      }
    } else {
      showToast('Тест уведомлений', 'Тестовое уведомление активно!', 'info');
    }
  };

  const setBgSyncEnabled = async (enabled: boolean) => {
    setBgSyncEnabledState(enabled);
    if (Platform.OS === 'android') {
      try {
        if (enabled && me?.uid) {
          await NativeModules.NotificationModule?.startBackgroundSync?.(me.uid);
          showToast('Фоновая служба', 'Служба уведомлений 24/7 активирована', 'success');
        } else {
          await NativeModules.NotificationModule?.stopBackgroundSync?.();
          showToast('Фоновая служба', 'Фоновая служба отключена', 'info');
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    checkNotificationPermission();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkNotificationPermission();
      }
    });
    return () => sub.remove();
  }, []);

  const checkForUpdates = async (silent = true) => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const info = await checkVkCloudUpdate();
      if (info) {
        setUpdateInfo(info);
      } else if (!silent) {
        showToast('Обновлений нет', 'У вас установлена последняя версия', 'success');
      }
    } catch (e: any) {
      if (!silent) {
        showToast('Проверка обновлений', e?.message || 'Не удалось связаться с VK Cloud', 'error');
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const dismissUpdate = () => setUpdateInfo(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const t = setTimeout(() => {
      checkForUpdates(true);
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  const activeChatIdRef = useRef<string | null>(null);
  const prevLastMsgAtRef = useRef<Record<string, number>>({});
  const prevLastMsgTextRef = useRef<Record<string, string>>({});
  const chatsInitializedRef = useRef<boolean>(false);
  const reqsInitializedRef = useRef<boolean>(false);
  const prevReqIdsRef = useRef<Set<string>>(new Set());
  const usersMapRef = useRef<Record<string, UserProfile>>({});

  useEffect(() => {
    usersMapRef.current = usersMap;
  }, [usersMap]);

  const setActiveChatId = (chatId: string | null) => {
    activeChatIdRef.current = chatId;
    if (chatId) {
      if (Platform.OS === 'android') {
        try {
          NativeModules.NotificationModule?.clearAllNotifications?.();
        } catch (_) {}
      }
      setMarkedUnreadIds((prev) => (prev.includes(chatId) ? prev.filter((id) => id !== chatId) : prev));
      setUnreadMap((prev) => {
        if (!prev[chatId]) return prev;
        const next = { ...prev, [chatId]: 0 };
        return next;
      });
      setChats((prev) =>
        prev.map((c) => (c.id === chatId && c.unread ? { ...c, unread: 0 } : c))
      );
    }
  };

  const showToast = (title: string, body?: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now() + Math.random();
    setToastState({ id, title, body, type });
    setTimeout(() => {
      setToastState((prev) => (prev && prev.id === id ? null : prev));
    }, 3200);
  };

  const showDialog = (cfg: DialogConfig) => {
    triggerHaptic(10);
    setDialogState({
      title: cfg.title,
      message: cfg.message,
      buttons: cfg.buttons && cfg.buttons.length > 0 ? cfg.buttons : [{ text: 'Понятно', style: 'default' }],
    });
  };

  const dismissDialog = () => setDialogState(null);

  useEffect(() => {
    NativeModules.NativeStorageModule?.getItem?.('bch_app_theme')
      .then((val: string | null) => {
        if (val && (val === 'dark' || val === 'midnight' || val === 'coffee-dark' || val === 'moss')) {
          setAppThemeKeyState(val);
        }
      })
      .catch(() => {});
  }, []);

  const setAppTheme = (key: AppThemeKey) => {
    setAppThemeKeyState(key);
    triggerHaptic(12);
    NativeModules.NativeStorageModule?.setItem?.('bch_app_theme', key).catch(() => {});
  };

  const appTheme = LIQUID_THEMES[appThemeKey] || LIQUID_THEMES.dark;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthUser(u);
      setLoadingAuth(false);
      if (u) {
        try {
          await update(ref(rtdb, `users/${u.uid}`), {
            online: true,
            lastSeen: Date.now(),
          });
          if (Platform.OS === 'android' && NativeModules.NotificationModule?.getFcmToken) {
            NativeModules.NotificationModule.getFcmToken()
              .then((tok: string) => {
                if (tok) {
                  set(ref(rtdb, `users/${u.uid}/fcmTokens/${tok.slice(0, 24)}`), {
                    token: tok,
                    platform: 'android-native',
                    updatedAt: Date.now(),
                  }).catch(() => {});
                }
              })
              .catch(() => {});
          }
        } catch (_) {}
      } else {
        setMe(null);
        setChats([]);
      }
    });
    return unsub;
  }, []);

  // Subscribe to current user profile & all users map & user chats
  useEffect(() => {
    if (!authUser) return;
    const uid = authUser.uid;

    const myRef = ref(rtdb, `users/${uid}`);
    const unsubMe = onValue(myRef, (snap) => {
      const val = snap.val();
      if (val) {
        setMe(normalizeUser(uid, val));
      } else {
        setMe(
          normalizeUser(uid, {
            uid,
            email: authUser.email || '',
            nick: (authUser.email || uid.slice(0, 8)).split('@')[0],
          })
        );
      }
      if (Platform.OS === 'android') {
        try {
          NativeModules.NotificationModule?.startBackgroundSync?.(uid);
        } catch (_) {}
      }
    });

    const usersRef = ref(rtdb, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
      const val = snap.val() || {};
      const next: Record<string, UserProfile> = {};
      Object.keys(val).forEach((k) => {
        if (val[k] && typeof val[k] === 'object') {
          next[k] = normalizeUser(k, val[k]);
        }
      });
      setUsersMap(next);
    });

    const chatsRef = ref(rtdb, 'chats');
    chatsInitializedRef.current = false;
    prevLastMsgAtRef.current = {};
    prevLastMsgTextRef.current = {};

    const unsubChats = onValue(chatsRef, (snap) => {
      const val = snap.val() || {};
      const list: ChatItem[] = [];
      const newUnreads: Record<string, number> = {};
      const isInitial = !chatsInitializedRef.current;

      Object.keys(val).forEach((cid) => {
        const raw = val[cid];
        if (!raw || typeof raw !== 'object') return;
        const members = toArray<string>(raw.members);
        if (members.includes(uid) || cid === `aihub_${uid}`) {
          const msgAt = toMs(raw.lastMsgAt || raw.createdAt);
          const prevAt = prevLastMsgAtRef.current[cid] || 0;
          const cleanBody = String(raw.lastMsg || 'Новое сообщение').replace(/<[^>]+>/g, '').trim();
          const prevText = prevLastMsgTextRef.current[cid] || '';
          const hasNewMsg = (msgAt > prevAt) || (cleanBody !== '' && cleanBody !== prevText);

          if (!isInitial && hasNewMsg && cid !== activeChatIdRef.current && raw.lastMsgUid !== uid) {
            newUnreads[cid] = (newUnreads[cid] || 0) + 1;
            const otherUid = raw.type === 'dm' ? members.find((m) => m !== uid) : undefined;
            const partner = otherUid ? usersMapRef.current[otherUid] : undefined;
            const title =
              partner?.nick ||
              (otherUid ? raw[`${otherUid}_nick`] : '') ||
              raw.name ||
              'Новое сообщение';

            const isMuted = mutedChatIdsRef.current.includes(cid);
            const isSilent = raw.lastMsgSilent === true;
            if (Platform.OS === 'android' && !isMuted && !isSilent) {
              try {
                NativeModules.NotificationModule?.showNotification?.(title, cleanBody, cid);
              } catch (_) {}
            }
            if (AppState.currentState === 'active' && !isMuted && !isSilent) {
              showToast(title, cleanBody, 'info');
            }
          }

          prevLastMsgAtRef.current[cid] = msgAt;
          prevLastMsgTextRef.current[cid] = cleanBody;
          list.push({
            ...raw,
            id: cid,
            type: raw.type || 'dm',
            members,
            lastMsgAt: msgAt,
          });
        }
      });

      chatsInitializedRef.current = true;
      if (Object.keys(newUnreads).length > 0) {
        setUnreadMap((prev) => {
          const merged = { ...prev };
          Object.keys(newUnreads).forEach((cid) => {
            merged[cid] = (merged[cid] || 0) + newUnreads[cid];
          });
          setChats(
            list
              .map((c) => ({ ...c, unread: merged[c.id] || 0 }))
              .sort((a, b) => (b.lastMsgAt || 0) - (a.lastMsgAt || 0))
          );
          return merged;
        });
      } else {
        setUnreadMap((prev) => {
          setChats(
            list
              .map((c) => ({ ...c, unread: prev[c.id] || 0 }))
              .sort((a, b) => (b.lastMsgAt || 0) - (a.lastMsgAt || 0))
          );
          return prev;
        });
      }
    });

    const reqsRef = ref(rtdb, 'friend_requests');
    reqsInitializedRef.current = false;
    prevReqIdsRef.current = new Set();
    const unsubReqs = onValue(reqsRef, (snap) => {
      const val = snap.val() || {};
      const incoming: FriendRequestItem[] = [];
      const outgoing: FriendRequestItem[] = [];
      const isInitial = !reqsInitializedRef.current;

      Object.keys(val).forEach((rid) => {
        const raw = val[rid];
        if (!raw || typeof raw !== 'object') return;
        const item: FriendRequestItem = {
          id: rid,
          from: raw.from || '',
          fromNick: raw.fromNick || '',
          to: raw.to || '',
          toNick: raw.toNick || '',
          at: toMs(raw.at || raw.createdAt),
        };
        if (item.to === uid) {
          incoming.push(item);
          if (!isInitial && !prevReqIdsRef.current.has(rid)) {
            const senderNick = usersMapRef.current[item.from]?.nick || item.fromNick || 'Пользователь';
            if (Platform.OS === 'android') {
              try {
                NativeModules.NotificationModule?.showNotification?.(
                  'Новая заявка в друзья',
                  `${senderNick} хочет добавить вас в друзья`,
                  ''
                );
              } catch (_) {}
            }
            if (AppState.currentState === 'active') {
              showToast('Заявка в друзья', `${senderNick} отправил(а) заявку`, 'info');
            }
          }
          prevReqIdsRef.current.add(rid);
        } else if (item.from === uid) {
          outgoing.push(item);
        }
      });

      reqsInitializedRef.current = true;
      incoming.sort((a, b) => (b.at || 0) - (a.at || 0));
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    });

    const storiesRef = ref(rtdb, 'stories');
    const unsubStories = onValue(storiesRef, (snap) => {
      const val = snap.val() || {};
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const active: StoryItem[] = Object.keys(val)
        .map((sid) => {
          const s = val[sid];
          if (!s || typeof s !== 'object') return null;
          return {
            id: sid,
            uid: s.uid || '',
            nick: s.nick || 'Пользователь',
            avatar: s.avatar || '',
            imageUrl: s.imageUrl || '',
            caption: s.caption || '',
            createdAt: toMs(s.createdAt),
            views: s.views || {},
          } as StoryItem;
        })
        .filter((s): s is StoryItem => !!s && !!s.imageUrl && s.createdAt > cutoff)
        .sort((a, b) => b.createdAt - a.createdAt);
      setStories(active);
    });

    return () => {
      unsubMe();
      unsubUsers();
      unsubChats();
      unsubReqs();
      unsubStories();
    };
  }, [authUser]);

  const loginWithNickOrEmail = async (loginInput: string, password: string) => {
    const clean = loginInput.trim();
    if (!clean) throw new Error('Введите логин или Email');
    let targetEmail = clean;

    if (!clean.includes('@')) {
      const nickLower = clean.replace(/^@+/, '').toLowerCase();
      const unSnap = await get(ref(rtdb, `usernames/${nickLower}`));
      const unVal = unSnap.val();
      if (unVal && unVal.email) {
        targetEmail = unVal.email;
      } else {
        // Fallback scan users
        const allUsersSnap = await get(ref(rtdb, 'users'));
        const allUsers = allUsersSnap.val() || {};
        let found = '';
        Object.keys(allUsers).forEach((k) => {
          const u = allUsers[k];
          if (u && String(u.nickLower || u.nick || '').toLowerCase() === nickLower && u.email) {
            found = u.email;
          }
        });
        if (!found) {
          throw new Error(`Пользователь @${nickLower} не найден`);
        }
        targetEmail = found;
      }
    }

    await signInWithEmailAndPassword(auth, targetEmail, password);
  };

  const resetPassword = async (loginInput: string): Promise<string> => {
    const clean = loginInput.trim();
    if (!clean) throw new Error('Введите логин (@username) или Email');
    let targetEmail = clean;

    if (!clean.includes('@')) {
      const nickLower = clean.replace(/^@+/, '').toLowerCase();
      const unSnap = await get(ref(rtdb, `usernames/${nickLower}`));
      const unVal = unSnap.val();
      if (unVal && unVal.email) {
        targetEmail = unVal.email;
      } else {
        const allUsersSnap = await get(ref(rtdb, 'users'));
        const allUsers = allUsersSnap.val() || {};
        let found = '';
        Object.keys(allUsers).forEach((k) => {
          const u = allUsers[k];
          if (u && String(u.nickLower || u.nick || '').toLowerCase() === nickLower && u.email) {
            found = u.email;
          }
        });
        if (!found) {
          throw new Error(`Пользователь @${nickLower} не найден`);
        }
        targetEmail = found;
      }
    }

    await sendPasswordResetEmail(auth, targetEmail);
    return targetEmail;
  };

  const registerAccount = async (email: string, nick: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanNick = nick.trim().replace(/^@+/, '');
    const nickLower = cleanNick.toLowerCase();
    if (!cleanEmail.includes('@')) throw new Error('Некорректный Email');
    if (cleanNick.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(cleanNick)) {
      throw new Error('Юзернейм должен содержать от 3 латинских символов, цифр или _');
    }
    if (password.length < 6) throw new Error('Пароль должен быть не менее 6 символов');

    const checkUn = await get(ref(rtdb, `usernames/${nickLower}`));
    if (checkUn.exists()) {
      throw new Error(`Юзернейм @${cleanNick} уже занят`);
    }

    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const uid = cred.user.uid;
    const now = Date.now();
    await set(ref(rtdb, `users/${uid}`), {
      uid,
      nick: cleanNick,
      nickLower,
      email: cleanEmail,
      avatar: '',
      bio: '',
      online: true,
      lastSeen: now,
      createdAt: now,
      pirozhki: 0,
      steamTheme: 'classic',
      steamFrame: 'none',
      unlockedThemes: ['classic'],
      unlockedFrames: ['none'],
    });
    await set(ref(rtdb, `usernames/${nickLower}`), {
      email: cleanEmail,
      uid,
      nick: cleanNick,
    });
  };

  const logout = async () => {
    if (Platform.OS === 'android') {
      try {
        await NativeModules.NotificationModule?.stopBackgroundSync?.();
      } catch (_) {}
    }
    if (authUser) {
      try {
        await update(ref(rtdb, `users/${authUser.uid}`), {
          online: false,
          lastSeen: Date.now(),
        });
      } catch (_) {}
    }
    await signOut(auth);
  };

  const openOrCreateDm = async (targetUid: string): Promise<ChatItem | null> => {
    if (!me || !targetUid || targetUid === me.uid) return null;
    const existing = chats.find(
      (c) => c.type === 'dm' && Array.isArray(c.members) && c.members.includes(targetUid)
    );
    if (existing) return existing;

    const target = usersMap[targetUid];
    const newRef = push(ref(rtdb, 'chats'));
    const cid = newRef.key!;
    const now = Date.now();
    const chatObj: any = {
      type: 'dm',
      members: [me.uid, targetUid],
      createdAt: now,
      lastMsg: 'Чат создан',
      lastMsgAt: now,
      [`${me.uid}_nick`]: me.nick,
      [`${me.uid}_ava`]: me.avatar || '',
      [`${targetUid}_nick`]: target?.nick || 'Пользователь',
      [`${targetUid}_ava`]: target?.avatar || '',
    };
    await set(newRef, chatObj);
    return { ...chatObj, id: cid };
  };

  const addFriendByNick = async (nickOrUid: string): Promise<ChatItem | null> => {
    if (!me) return null;
    const raw = nickOrUid.trim().replace(/^@+/, '');
    if (!raw) throw new Error('Введите юзернейм или UID');

    if (usersMap[raw]) {
      return await openOrCreateDm(raw);
    }
    const lower = raw.toLowerCase();
    const hit = Object.values(usersMap).find(
      (u) => u.uid !== me.uid && (u.nickLower === lower || u.nick.toLowerCase() === lower)
    );
    if (hit) {
      return await openOrCreateDm(hit.uid);
    }
    const unSnap = await get(ref(rtdb, `usernames/${lower}`));
    const un = unSnap.val();
    if (un && un.uid && un.uid !== me.uid) {
      return await openOrCreateDm(un.uid);
    }
    throw new Error(`Пользователь "${nickOrUid}" не найден`);
  };

  const sendFriendRequest = async (targetUid: string) => {
    if (!me || !targetUid || targetUid === me.uid) return;
    const already = outgoingRequests.some((r) => r.to === targetUid);
    if (already) return;
    const targetNick = usersMap[targetUid]?.nick || '';
    const newRef = push(ref(rtdb, 'friend_requests'));
    await set(newRef, {
      from: me.uid,
      fromNick: me.nick,
      to: targetUid,
      toNick: targetNick,
      at: Date.now(),
    });
    triggerHaptic(15);
  };

  const acceptFriendRequest = async (req: FriendRequestItem): Promise<ChatItem | null> => {
    const chat = await openOrCreateDm(req.from);
    await remove(ref(rtdb, `friend_requests/${req.id}`));
    triggerHaptic(20);
    return chat;
  };

  const declineFriendRequest = async (reqId: string) => {
    await remove(ref(rtdb, `friend_requests/${reqId}`));
    triggerHaptic(10);
  };

  const createGroupOrChannel = async (
    type: 'group' | 'channel',
    name: string,
    desc = ''
  ): Promise<ChatItem | null> => {
    if (!me || !name.trim()) return null;
    const newRef = push(ref(rtdb, 'chats'));
    const cid = newRef.key!;
    const now = Date.now();
    const chatObj: any = {
      type,
      name: name.trim(),
      desc: desc.trim(),
      avatar: '',
      owner: me.uid,
      admins: [me.uid],
      members: [me.uid],
      createdAt: now,
      lastMsg: type === 'channel' ? 'Канал создан' : 'Группа создана',
      lastMsgAt: now,
    };
    await set(newRef, chatObj);
    return { ...chatObj, id: cid };
  };

  const updateMyProfile = async (patch: Partial<UserProfile>) => {
    if (!me) return;
    const prevNickLower = me.nickLower || me.nick.toLowerCase();
    const nextPatch: any = { ...patch, updatedAt: Date.now() };
    if (patch.nick) {
      const cleanNick = patch.nick.trim().replace(/^@+/, '');
      const nextLower = cleanNick.toLowerCase();
      if (nextLower !== prevNickLower) {
        const unSnap = await get(ref(rtdb, `usernames/${nextLower}`));
        if (unSnap.exists() && unSnap.val()?.uid !== me.uid) {
          throw new Error(`Юзернейм @${cleanNick} уже занят`);
        }
        await set(ref(rtdb, `usernames/${nextLower}`), {
          email: me.email || authUser?.email || '',
          uid: me.uid,
          nick: cleanNick,
        });
      }
      nextPatch.nick = cleanNick;
      nextPatch.nickLower = nextLower;
    }
    if (patch.avatar && patch.avatar !== me.avatar) {
      const prevHist = me.avatarHistory || (me.avatar ? [me.avatar] : []);
      nextPatch.avatarHistory = [patch.avatar, ...prevHist.filter((u) => u !== patch.avatar)].slice(0, 10);
    }
    await update(ref(rtdb, `users/${me.uid}`), nextPatch);
  };

  const grantSelfPirozhki = async (amount: number) => {
    if (!me || me.uid !== CREATOR_UID) {
      throw new Error('Доступно только Создателю');
    }
    const amt = Math.max(1, Math.min(1000000, Math.floor(amount)));
    const newBal = (me.pirozhki || 0) + amt;
    await update(ref(rtdb, `users/${me.uid}`), { pirozhki: newBal });
    await set(ref(rtdb, `users/${me.uid}/pirozhki_history/${Date.now()}`), {
      amount: amt,
      timestamp: Date.now(),
      type: 'creator_grant',
      note: 'Выдача Создателем (Android)',
    });
    triggerHaptic(30);
  };

  const giftPirozhki = async (targetUid: string, amount: number, note = '') => {
    if (!me) throw new Error('Необходимо войти в аккаунт');
    if (targetUid === me.uid) throw new Error('Нельзя подарить пирожки самому себе');
    const amt = Math.floor(amount);
    if (amt <= 0) throw new Error('Укажите корректное количество');
    const myBal = me.pirozhki || 0;
    if (myBal < amt) throw new Error(`Недостаточно пирожков (у вас ${myBal} 🥟)`);

    const targetSnap = await get(ref(rtdb, `users/${targetUid}/pirozhki`));
    const targetBal = parseInt(String(targetSnap.val() ?? 0), 10) || 0;
    const targetUser = usersMap[targetUid];

    const now = Date.now();
    await update(ref(rtdb, `users/${me.uid}`), { pirozhki: myBal - amt });
    await update(ref(rtdb, `users/${targetUid}`), { pirozhki: targetBal + amt });
    await set(ref(rtdb, `users/${me.uid}/pirozhki_history/${now}`), {
      amount: -amt,
      timestamp: now,
      type: 'gift_out',
      note: `Подарок для @${targetUser?.nick || targetUid}` + (note ? `: ${note}` : ''),
    });
    await set(ref(rtdb, `users/${targetUid}/pirozhki_history/${now + 1}`), {
      amount: amt,
      timestamp: now,
      type: 'gift_in',
      note: `Подарок от @${me.nick}` + (note ? `: ${note}` : ''),
    });
    triggerHaptic(25);
  };

  const buyThemeOrFrame = async (themeId: string, frameId: string, totalCost: number) => {
    if (!me) throw new Error('Необходимо войти в аккаунт');
    const myBal = me.pirozhki || 0;
    if (myBal < totalCost) {
      throw new Error(`Недостаточно пирожков: нужно ${totalCost} 🥟, у вас ${myBal} 🥟`);
    }
    const unlockedThemes = Array.from(new Set([...(me.unlockedThemes || ['classic']), 'classic', themeId]));
    const unlockedFrames = Array.from(new Set([...(me.unlockedFrames || ['none']), 'none', frameId]));
    const newBal = myBal - totalCost;
    const now = Date.now();

    await update(ref(rtdb, `users/${me.uid}`), {
      pirozhki: newBal,
      steamTheme: themeId,
      steamFrame: frameId,
      unlockedThemes,
      unlockedFrames,
    });
    await set(ref(rtdb, `users/${me.uid}/pirozhki_history/${now}`), {
      amount: -totalCost,
      timestamp: now,
      type: 'buy_customization',
      note: `Покупка оформления: ${themeId} / ${frameId}`,
    });
    triggerHaptic(30);
  };

  const equipThemeAndFrame = async (themeId: string, frameId: string) => {
    if (!me) return;
    await update(ref(rtdb, `users/${me.uid}`), {
      steamTheme: themeId,
      steamFrame: frameId,
    });
    triggerHaptic(15);
  };

  const buyPrefix = async (
    prefixText: string,
    styleKey: string,
    cost: number,
    soundUrl = '',
    soundName = ''
  ) => {
    if (!me) throw new Error('Необходимо войти в аккаунт');
    const myBal = me.pirozhki || 0;
    if (myBal < cost) {
      throw new Error(`Недостаточно пирожков: требуется ${cost} 🥟`);
    }
    const newBal = myBal - cost;
    const now = Date.now();
    const patch: any = {
      pirozhki: newBal,
      prefix: prefixText.trim(),
      prefixStyle: styleKey,
    };
    if (soundUrl !== undefined) {
      patch.prefixSound = soundUrl;
      patch.prefixSoundName = soundName;
    }
    await update(ref(rtdb, `users/${me.uid}`), patch);
    await set(ref(rtdb, `users/${me.uid}/pirozhki_history/${now}`), {
      amount: -cost,
      timestamp: now,
      type: 'buy_prefix',
      note: `Покупка префикса: ${prefixText}`,
    });
    triggerHaptic(25);
  };

  const savePrefixSound = async (soundUrl: string, soundName: string) => {
    if (!me) return;
    await update(ref(rtdb, `users/${me.uid}`), {
      prefixSound: soundUrl || '',
      prefixSoundName: soundName || '',
    });
    triggerHaptic(15);
  };

  return (
    <AppContext.Provider
      value={{
        authUser,
        loadingAuth,
        me,
        chats,
        incomingRequests,
        outgoingRequests,
        usersMap,
        appThemeKey,
        appTheme,
        setAppTheme,
        setActiveChatId,
        toastState,
        dialogState,
        showToast,
        showDialog,
        dismissDialog,
        updateInfo,
        checkingUpdate,
        checkForUpdates,
        dismissUpdate,
        loginWithNickOrEmail,
        registerAccount,
        resetPassword,
        logout,
        openOrCreateDm,
        addFriendByNick,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        createGroupOrChannel,
        updateMyProfile,
        grantSelfPirozhki,
        giftPirozhki,
        buyThemeOrFrame,
        equipThemeAndFrame,
        buyPrefix,
        savePrefixSound,
        notificationsEnabled,
        openNotificationSettings,
        testNotification,
        bgSyncEnabled,
        setBgSyncEnabled,
        checkNotificationPermission,
        pinnedChatIds,
        mutedChatIds,
        archivedChatIds,
        markedUnreadIds,
        drafts,
        customFolders,
        chatWallpaper,
        chatFontSize,
        pinCode,
        stories,
        togglePinChat,
        toggleMuteChat,
        toggleArchiveChat,
        toggleMarkUnread,
        setDraft,
        createCustomFolder,
        deleteCustomFolder,
        toggleChatInFolder,
        setChatWallpaper,
        setChatFontSize,
        setPinCode,
        publishStory,
        markStoryViewed,
        personalNotes,
        setPersonalNote,
        favoriteStickers,
        recentStickers,
        toggleFavoriteSticker,
        pushRecentSticker,
        markAllChatsRead,
        toggleBlockUser,
        setPrivacyLastSeen,
        activeCallPeer,
        startCall,
        endActiveCallTrigger,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
