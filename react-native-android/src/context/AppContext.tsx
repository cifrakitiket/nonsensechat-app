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
import { ref, onValue, get, set, update, push } from 'firebase/database';
import { auth, rtdb, triggerHaptic } from '../services/firebase';
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
    lastSeen: toMs(data.lastSeen),
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

interface AppContextValue {
  authUser: User | null;
  loadingAuth: boolean;
  me: UserProfile | null;
  chats: ChatItem[];
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
  loginWithNickOrEmail: (loginInput: string, password: string) => Promise<void>;
  registerAccount: (email: string, nick: string, password: string) => Promise<void>;
  resetPassword: (loginInput: string) => Promise<string>;
  logout: () => Promise<void>;
  openOrCreateDm: (targetUid: string) => Promise<ChatItem | null>;
  addFriendByNick: (nickOrUid: string) => Promise<ChatItem | null>;
  createGroupOrChannel: (type: 'group' | 'channel', name: string, desc?: string) => Promise<ChatItem | null>;
  updateMyProfile: (patch: Partial<UserProfile>) => Promise<void>;
  grantSelfPirozhki: (amount: number) => Promise<void>;
  giftPirozhki: (targetUid: string, amount: number, note?: string) => Promise<void>;
  buyThemeOrFrame: (themeId: string, frameId: string, totalCost: number) => Promise<void>;
  equipThemeAndFrame: (themeId: string, frameId: string) => Promise<void>;
  buyPrefix: (prefixText: string, styleKey: string, cost: number, soundUrl?: string, soundName?: string) => Promise<void>;
  savePrefixSound: (soundUrl: string, soundName: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [appThemeKey, setAppThemeKeyState] = useState<AppThemeKey>('dark');
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [dialogState, setDialogState] = useState<DialogConfig | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  const activeChatIdRef = useRef<string | null>(null);
  const prevLastMsgAtRef = useRef<Record<string, number>>({});
  const chatsInitializedRef = useRef<boolean>(false);
  const usersMapRef = useRef<Record<string, UserProfile>>({});

  useEffect(() => {
    usersMapRef.current = usersMap;
  }, [usersMap]);

  const setActiveChatId = (chatId: string | null) => {
    activeChatIdRef.current = chatId;
    if (chatId) {
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

          if (!isInitial && msgAt > prevAt && cid !== activeChatIdRef.current && raw.lastMsgUid !== uid) {
            newUnreads[cid] = (newUnreads[cid] || 0) + 1;
            const otherUid = raw.type === 'dm' ? members.find((m) => m !== uid) : undefined;
            const partner = otherUid ? usersMapRef.current[otherUid] : undefined;
            const title =
              partner?.nick ||
              (otherUid ? raw[`${otherUid}_nick`] : '') ||
              raw.name ||
              'Новое сообщение';
            const cleanBody = String(raw.lastMsg || 'Новое сообщение').replace(/<[^>]+>/g, '').trim();

            if (Platform.OS === 'android') {
              try {
                NativeModules.NotificationModule?.showNotification?.(title, cleanBody, cid);
              } catch (_) {}
            }
            if (AppState.currentState === 'active') {
              showToast(title, cleanBody, 'info');
            }
          }

          prevLastMsgAtRef.current[cid] = msgAt;
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

    return () => {
      unsubMe();
      unsubUsers();
      unsubChats();
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
        loginWithNickOrEmail,
        registerAccount,
        resetPassword,
        logout,
        openOrCreateDm,
        addFriendByNick,
        createGroupOrChannel,
        updateMyProfile,
        grantSelfPirozhki,
        giftPirozhki,
        buyThemeOrFrame,
        equipThemeAndFrame,
        buyPrefix,
        savePrefixSound,
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
