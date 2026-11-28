import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { onValue, push, ref, set } from 'firebase/database';
import { pickNativePhotoFromGallery, rtdb, triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';

interface EmojiCategory {
  id: string;
  icon: string;
  label: string;
  items: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'popular',
    icon: '🔥',
    label: 'Популярные',
    items: [
      '🎲', '🎯', '🏀', '⚽', '🎰', '😂', '🥹', '😍',
      '🥰', '😎', '🤩', '🥳', '😭', '😡', '🤯', '🤔',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🔥', '✨', '💯', '🎉', '🎊', '🥟', '🚀', '⚡',
      '👍', '👎', '👏', '🙏', '🤝', '🫶', '✌️', '🤙',
    ],
  },
  {
    id: 'smileys',
    icon: '😀',
    label: 'Смайлы',
    items: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
      '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
      '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷',
      '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴',
      '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐',
      '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺',
      '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
      '😡', '😠', '🤬', '😈', '💀', '💩', '🤡', '👻',
    ],
  },
  {
    id: 'gestures',
    icon: '👍',
    label: 'Жесты',
    items: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
      '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
      '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
      '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏',
      '✍️', '💅', '🤳', '💪', '🦾', '👀', '👁️', '🧠',
    ],
  },
  {
    id: 'nature',
    icon: '🌿',
    label: 'Природа',
    items: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
      '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈',
      '🙉', '🙊', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉',
      '🌸', '🌺', '🌻', '🌹', '🌷', '🌿', '🍀', '🍁',
      '🌞', '🌙', '⭐', '🌟', '⚡', '🔥', '❄️', '🌈',
    ],
  },
  {
    id: 'food',
    icon: '🥟',
    label: 'Еда',
    items: [
      '🥟', '🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🥚',
      '🍳', '🥞', '🥐', '🍞', '🧀', '🥗', '🌮', '🌯',
      '🍝', '🍜', '🍣', '🍱', '🍦', '🍩', '🍪', '🎂',
      '🍰', '🍫', '🍬', '🍭', '🍯', '☕', '🍵', '🧋',
    ],
  },
];

const FALLBACK_GIFS = [
  'https://media.tenor.com/images/0466286ca36748f5627e963d4a7d56a2/tenor.gif',
  'https://media.tenor.com/images/4fd49de4149a6d348e04f2465a3970af/tenor.gif',
  'https://media.tenor.com/images/7926f906b133287c010a6195a1e60e5e/tenor.gif',
  'https://media.tenor.com/images/2b1081762939c5ca650016867891b860/tenor.gif',
  'https://media.tenor.com/images/c2f3b58f7ba65ca89f6972700658742a/tenor.gif',
  'https://media.tenor.com/images/54451401d52c0dd2fe9ee5752857d53c/tenor.gif',
];

interface StickerPack {
  id: string;
  title: string;
  ownerUid?: string;
  isPublic?: boolean;
  isBuiltin?: boolean;
  stickers: Array<{ url: string; emoji?: string }>;
}

interface CustomEmojiPack {
  id: string;
  title: string;
  ownerUid?: string;
  isPublic?: boolean;
  isBuiltin?: boolean;
  items: Array<{ id: string; url: string }>;
}

interface EmojiStickerDrawerProps {
  onSelectEmoji: (emoji: string) => void;
  onBackspace: () => void;
  onSelectSticker: (url: string, emoji?: string) => void;
  onSelectCustomEmoji?: (token: string) => void;
  onSelectGif?: (gifUrl: string) => void;
}

export const EmojiStickerDrawer: React.FC<EmojiStickerDrawerProps> = ({
  onSelectEmoji,
  onBackspace,
  onSelectSticker,
  onSelectCustomEmoji,
  onSelectGif,
}) => {
  const {
    me,
    appTheme,
    favoriteStickers,
    recentStickers,
    installedPackIds,
    toggleInstallStickerPack,
    installedEmojiPackIds,
    toggleInstallEmojiPack,
    recentCustomEmojis,
    pushRecentCustomEmoji,
    customEmojiMap,
    toggleFavoriteSticker,
    pushRecentSticker,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'emoji' | 'custom' | 'stickers' | 'gif'>('emoji');
  const [catId, setCatId] = useState<string>('popular');
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [loadingPacks, setLoadingPacks] = useState(false);

  const [emojiPacks, setEmojiPacks] = useState<CustomEmojiPack[]>([]);
  const [selectedEmojiPackId, setSelectedEmojiPackId] = useState<string>('');
  const [loadingEmojiPacks, setLoadingEmojiPacks] = useState(false);

  // GIF state
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState<string[]>(FALLBACK_GIFS);
  const [loadingGifs, setLoadingGifs] = useState(false);

  // Private Sticker Pack / Custom Emoji Pack builder modal
  const [builderKind, setBuilderKind] = useState<'sticker' | 'custom' | null>(null);
  const [packTitle, setPackTitle] = useState('');
  const [packPhotos, setPackPhotos] = useState<string[]>([]);
  const [savingPack, setSavingPack] = useState(false);

  useEffect(() => {
    setLoadingPacks(true);
    const pRef = ref(rtdb, 'sticker_packs');
    const unsub = onValue(
      pRef,
      (snap) => {
        const val = snap.val() || {};
        const list: StickerPack[] = [];
        Object.keys(val).forEach((pid) => {
          const raw = val[pid];
          if (!raw || typeof raw !== 'object') return;
          const stickers = Array.isArray(raw.stickers)
            ? raw.stickers.filter((s: any) => s && s.url)
            : raw.stickers && typeof raw.stickers === 'object'
            ? Object.values(raw.stickers).filter((s: any) => s && s.url)
            : [];
          if (stickers.length > 0) {
            list.push({
              id: pid,
              title: raw.title || 'Стикеры',
              ownerUid: raw.ownerUid,
              isPublic: !!raw.isPublic,
              isBuiltin: !!raw.isBuiltin,
              stickers: stickers as any,
            });
          }
        });
        setPacks(list);
        setLoadingPacks(false);
      },
      () => setLoadingPacks(false)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    setLoadingEmojiPacks(true);
    const ceRef = ref(rtdb, 'custom_emoji_packs');
    const unsub = onValue(
      ceRef,
      (snap) => {
        const val = snap.val() || {};
        const list: CustomEmojiPack[] = [];
        Object.keys(val).forEach((pid) => {
          const raw = val[pid];
          if (!raw || typeof raw !== 'object') return;
          const itemsRaw = Array.isArray(raw.items)
            ? raw.items
            : raw.items && typeof raw.items === 'object'
            ? Object.values(raw.items)
            : [];
          const items = itemsRaw
            .filter((s: any) => s && s.url)
            .map((s: any, idx: number) => ({
              id: s.id !== undefined ? String(s.id) : String(idx),
              url: s.url,
            }));
          if (items.length > 0) {
            list.push({
              id: pid,
              title: raw.title || 'Эмодзи',
              ownerUid: raw.ownerUid,
              isPublic: !!raw.isPublic,
              isBuiltin: !!raw.isBuiltin,
              items,
            });
          }
        });
        setEmojiPacks(list);
        setLoadingEmojiPacks(false);
      },
      () => setLoadingEmojiPacks(false)
    );
    return () => unsub();
  }, []);

  const fetchGifs = async (q: string) => {
    setLoadingGifs(true);
    try {
      const endpoint = q.trim()
        ? `https://g.tenor.com/v1/search?key=LIVDSRZULELA&q=${encodeURIComponent(q.trim())}&limit=21&media_filter=minimal`
        : 'https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=21&media_filter=minimal';
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data && Array.isArray(data.results)) {
        const urls = data.results
          .map((r: any) => r?.media?.[0]?.tinygif?.url || r?.media?.[0]?.gif?.url)
          .filter(Boolean);
        if (urls.length > 0) setGifs(urls);
      }
    } catch (_) {
      setGifs(FALLBACK_GIFS);
    } finally {
      setLoadingGifs(false);
    }
  };

  useEffect(() => {
    if (mode === 'gif') {
      fetchGifs(gifQuery);
    }
  }, [mode]);

  // Privacy: show ONLY built-in/public packs, packs created by this user, or packs explicitly installed by this user
  const allPacks = useMemo(() => {
    const virtual: StickerPack[] = [];
    if (favoriteStickers.length > 0) {
      virtual.push({
        id: '__fav__',
        title: `⭐ Избранные (${favoriteStickers.length})`,
        stickers: favoriteStickers.map((u) => ({ url: u })),
      });
    }
    if (recentStickers.length > 0) {
      virtual.push({
        id: '__recent__',
        title: '🕒 Недавние',
        stickers: recentStickers.map((u) => ({ url: u })),
      });
    }
    const visibleUserPacks = packs.filter(
      (p) =>
        p.isPublic === true ||
        p.isBuiltin === true ||
        (me?.uid && p.ownerUid === me.uid) ||
        installedPackIds.includes(p.id)
    );
    return [...virtual, ...visibleUserPacks];
  }, [favoriteStickers, recentStickers, packs, installedPackIds, me?.uid]);

  const visibleEmojiPacks = useMemo(() => {
    const virtual: CustomEmojiPack[] = [];
    if (recentCustomEmojis.length > 0) {
      const recentItems = recentCustomEmojis
        .map((tok) => {
          const m = tok.match(/^\[ce:([^:\]]+):([^:\]]+)\]$/);
          if (!m) return null;
          const url = customEmojiMap[`${m[1]}:${m[2]}`];
          return url ? { id: `${m[1]}:${m[2]}`, url, token: tok } : null;
        })
        .filter(Boolean) as Array<{ id: string; url: string }>;
      if (recentItems.length > 0) {
        virtual.push({ id: '__ce_recent__', title: '🕒 Недавние', items: recentItems });
      }
    }
    const ownOrInstalled = emojiPacks.filter(
      (p) =>
        p.isPublic === true ||
        p.isBuiltin === true ||
        (me?.uid && p.ownerUid === me.uid) ||
        installedEmojiPackIds.includes(p.id)
    );
    return [...virtual, ...ownOrInstalled];
  }, [recentCustomEmojis, customEmojiMap, emojiPacks, installedEmojiPackIds, me?.uid]);

  const currentCat = EMOJI_CATEGORIES.find((c) => c.id === catId) || EMOJI_CATEGORIES[0];
  const currentPack = allPacks.find((p) => p.id === selectedPackId) || allPacks[0];
  const currentEmojiPack = visibleEmojiPacks.find((p) => p.id === selectedEmojiPackId) || visibleEmojiPacks[0];

  const handleAddPackPhoto = async () => {
    try {
      const picked = await pickNativePhotoFromGallery();
      if (picked?.dataUrl) {
        setPackPhotos((prev) => [...prev, picked.dataUrl].slice(0, 16));
      }
    } catch (_) {}
  };

  const handleSavePack = async () => {
    const clean = packTitle.trim();
    if (!clean || packPhotos.length === 0 || savingPack || !builderKind) {
      showToast(
        builderKind === 'custom' ? 'Кастомные эмодзи' : 'Стикерпак',
        'Укажите название и добавьте хотя бы 1 картинку',
        'error'
      );
      return;
    }
    setSavingPack(true);
    try {
      if (builderKind === 'custom') {
        const ceRef = push(ref(rtdb, 'custom_emoji_packs'));
        await set(ceRef, {
          title: clean,
          ownerUid: me?.uid || '',
          ownerNick: me?.nick || '',
          isPublic: false,
          items: packPhotos.map((url, idx) => ({ id: String(idx), url })),
          createdAt: Date.now(),
        });
        if (ceRef.key) {
          if (!installedEmojiPackIds.includes(ceRef.key)) {
            toggleInstallEmojiPack(ceRef.key);
          }
          setSelectedEmojiPackId(ceRef.key);
        }
        setBuilderKind(null);
        setPackTitle('');
        setPackPhotos([]);
        showToast('Набор эмодзи создан 🎨', 'Личный набор: виден только вам и получателям в чате', 'success');
      } else {
        const pRef = push(ref(rtdb, 'sticker_packs'));
        await set(pRef, {
          title: clean,
          ownerUid: me?.uid || '',
          ownerNick: me?.nick || '',
          isPublic: false,
          stickers: packPhotos.map((url) => ({ url, emoji: '✨' })),
          createdAt: Date.now(),
        });
        if (pRef.key) {
          if (!installedPackIds.includes(pRef.key)) {
            toggleInstallStickerPack(pRef.key);
          }
          setSelectedPackId(pRef.key);
        }
        setBuilderKind(null);
        setPackTitle('');
        setPackPhotos([]);
        showToast('Личный стикерпак создан ✨', 'Виден только вам (другие могут добавить по вашему стикеру)', 'success');
      }
    } catch (e: any) {
      showToast('Ошибка', e?.message || 'Не удалось сохранить набор', 'error');
    } finally {
      setSavingPack(false);
    }
  };

  return (
    <View style={{ paddingHorizontal: 10, paddingBottom: 6 }}>
      <GlassCard radius={24} strong style={styles.container}>
        {/* Top Mode Tabs + Backspace */}
        <View style={[styles.topRow, { borderBottomColor: appTheme.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeTabs}>
            {[
              { k: 'emoji', l: '😀 Эмодзи' },
              { k: 'custom', l: '🎨 Кастом' },
              { k: 'stickers', l: '✨ Стикеры' },
              { k: 'gif', l: '🎬 GIF' },
            ].map((tb) => {
              const act = mode === tb.k;
              return (
                <TouchableOpacity
                  key={tb.k}
                  onPress={() => {
                    triggerHaptic(6);
                    setMode(tb.k as any);
                  }}
                  style={[
                    styles.modePill,
                    act && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent },
                  ]}
                >
                  <Text style={[styles.modeText, { color: act ? appTheme.accent : appTheme.textSub }]}>
                    {tb.l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {mode === 'emoji' && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic(8);
                onBackspace();
              }}
              style={[styles.backspaceBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
            >
              <Text style={{ color: appTheme.text, fontSize: 15, fontWeight: '700' }}>⌫</Text>
            </TouchableOpacity>
          )}
        </View>

        {mode === 'emoji' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catStrip}>
              {EMOJI_CATEGORIES.map((c) => {
                const active = c.id === catId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      triggerHaptic(6);
                      setCatId(c.id);
                    }}
                    style={[styles.catBtn, active && { backgroundColor: appTheme.accentSoft }]}
                  >
                    <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <FlatList
              key="emoji_grid"
              data={currentCat.items}
              keyExtractor={(item, idx) => `${currentCat.id}_${idx}`}
              numColumns={8}
              style={{ height: 186 }}
              contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.emojiCell}
                  onPress={() => {
                    triggerHaptic(6);
                    onSelectEmoji(item);
                  }}
                >
                  <Text style={styles.emojiChar}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </>
        ) : mode === 'custom' ? (
          <View style={{ height: 226 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catStrip}>
              <TouchableOpacity
                onPress={() => {
                  setPackTitle('');
                  setPackPhotos([]);
                  setBuilderKind('custom');
                }}
                style={[styles.packPill, { borderColor: appTheme.accent, backgroundColor: appTheme.accentSoft }]}
              >
                <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '800' }}>＋ Свой набор</Text>
              </TouchableOpacity>
              {visibleEmojiPacks.map((p) => {
                const active = p.id === (currentEmojiPack?.id || '');
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => {
                      triggerHaptic(6);
                      setSelectedEmojiPackId(p.id);
                    }}
                    style={[
                      styles.packPill,
                      active && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? appTheme.accent : appTheme.textSub,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingEmojiPacks ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={appTheme.accent} />
              </View>
            ) : !currentEmojiPack ? (
              <View style={styles.centerBox}>
                <Text style={{ color: appTheme.textSub, fontSize: 12.5, textAlign: 'center' }}>
                  Создайте свой личный набор кастомных эмодзи — другие не увидят его, пока вы не отправите их в чат!
                </Text>
              </View>
            ) : (
              <FlatList
                key="custom_emoji_grid"
                data={currentEmojiPack.items}
                keyExtractor={(it, idx) => `${currentEmojiPack.id}_${it.id}_${idx}`}
                numColumns={7}
                contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
                renderItem={({ item }) => {
                  const tok =
                    currentEmojiPack.id === '__ce_recent__'
                      ? `[ce:${item.id}]`
                      : `[ce:${currentEmojiPack.id}:${item.id}]`;
                  return (
                    <TouchableOpacity
                      style={styles.customEmojiCell}
                      onPress={() => {
                        triggerHaptic(8);
                        pushRecentCustomEmoji(tok);
                        onSelectCustomEmoji?.(tok);
                      }}
                    >
                      <Image source={{ uri: item.url }} style={styles.customEmojiImg} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        ) : mode === 'stickers' ? (
          <View style={{ height: 226 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catStrip}>
              <TouchableOpacity
                onPress={() => {
                  setPackTitle('');
                  setPackPhotos([]);
                  setBuilderKind('sticker');
                }}
                style={[styles.packPill, { borderColor: appTheme.accent, backgroundColor: appTheme.accentSoft }]}
              >
                <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '800' }}>＋ Свой пак</Text>
              </TouchableOpacity>
              {allPacks.map((p) => {
                const active = p.id === (currentPack?.id || '');
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => {
                      triggerHaptic(6);
                      setSelectedPackId(p.id);
                    }}
                    style={[
                      styles.packPill,
                      active && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? appTheme.accent : appTheme.textSub,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingPacks ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={appTheme.accent} />
              </View>
            ) : !currentPack ? (
              <View style={styles.centerBox}>
                <Text style={{ color: appTheme.textSub, fontSize: 12.5 }}>
                  Нажмите «＋ Свой пак», чтобы создать стикеры из фото!
                </Text>
              </View>
            ) : (
              <FlatList
                key="sticker_grid"
                data={currentPack.stickers}
                keyExtractor={(_, idx) => `${currentPack.id}_${idx}`}
                numColumns={4}
                contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
                renderItem={({ item }) => {
                  const isFav = favoriteStickers.includes(item.url);
                  return (
                    <TouchableOpacity
                      style={styles.stickerCell}
                      onPress={() => {
                        triggerHaptic(12);
                        pushRecentSticker(item.url);
                        onSelectSticker(item.url, item.emoji);
                      }}
                      onLongPress={() => {
                        toggleFavoriteSticker(item.url);
                        showToast(
                          isFav ? 'Убрано из избранных' : '⭐ Стикер в избранном!',
                          'Долгое нажатие переключает избранное',
                          'info'
                        );
                      }}
                    >
                      <Image source={{ uri: item.url }} style={styles.stickerImg} resizeMode="contain" />
                      {isFav && <Text style={styles.favStar}>⭐</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        ) : (
          <View style={{ height: 226 }}>
            <View style={styles.gifSearchRow}>
              <TextInput
                value={gifQuery}
                onChangeText={setGifQuery}
                onSubmitEditing={() => fetchGifs(gifQuery)}
                placeholder="Поиск GIF (мемы, коты, смех)..."
                placeholderTextColor={appTheme.textSub}
                style={[styles.gifInput, { color: appTheme.text, borderColor: appTheme.border }]}
              />
              <TouchableOpacity
                onPress={() => fetchGifs(gifQuery)}
                style={[styles.gifSearchBtn, { backgroundColor: appTheme.accent }]}
              >
                <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>Найти</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catStrip}>
              {['🔥 Тренды', '😂 Смех', '🐱 Котики', '😎 Кайф', '❤️ Любовь', '🎉 Туса'].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.packPill}
                  onPress={() => {
                    const q = chip.includes('Тренды') ? '' : chip.split(' ')[1];
                    setGifQuery(q);
                    fetchGifs(q);
                  }}
                >
                  <Text style={{ color: appTheme.textSub, fontSize: 11.5, fontWeight: '700' }}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loadingGifs ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={appTheme.accent} />
              </View>
            ) : (
              <FlatList
                key="gif_grid"
                data={gifs}
                keyExtractor={(u, idx) => `gif_${idx}_${u}`}
                numColumns={3}
                contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8, gap: 6 }}
                columnWrapperStyle={{ gap: 6 }}
                renderItem={({ item: gifUrl }) => (
                  <TouchableOpacity
                    style={styles.gifCell}
                    onPress={() => {
                      triggerHaptic(12);
                      if (onSelectGif) onSelectGif(gifUrl);
                      else onSelectSticker(gifUrl, '🎬 GIF');
                    }}
                  >
                    <Image source={{ uri: gifUrl }} style={styles.gifImg} resizeMode="cover" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </GlassCard>

      {/* Private Sticker / Custom Emoji Pack Builder Modal */}
      <Modal visible={!!builderKind} transparent animationType="fade" onRequestClose={() => setBuilderKind(null)}>
        <View style={styles.modalBackdrop}>
          <GlassCard radius={26} strong style={{ padding: 18 }}>
            <Text style={{ color: appTheme.text, fontSize: 17, fontWeight: '800', marginBottom: 4 }}>
              {builderKind === 'custom' ? '🎨 Личный набор кастомных эмодзи' : '✨ Личный стикерпак'}
            </Text>
            <Text style={{ color: appTheme.textSub, fontSize: 12, marginBottom: 10 }}>
              Другие пользователи не увидят ваш набор в каталоге — только если вы сами отправите его в чат.
            </Text>
            <TextInput
              value={packTitle}
              onChangeText={setPackTitle}
              placeholder={builderKind === 'custom' ? 'Название набора эмодзи...' : 'Название стикерпака...'}
              placeholderTextColor={appTheme.textSub}
              style={[styles.gifInput, { color: appTheme.text, borderColor: appTheme.border, marginBottom: 10 }]}
            />
            <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
              {packPhotos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={{ width: 64, height: 64, borderRadius: 12 }} />
              ))}
              <TouchableOpacity
                onPress={handleAddPackPhoto}
                style={[styles.addStickerTile, { borderColor: appTheme.accent }]}
              >
                <Text style={{ color: appTheme.accent, fontSize: 22, fontWeight: '800' }}>＋</Text>
                <Text style={{ color: appTheme.accent, fontSize: 10, fontWeight: '700' }}>Фото</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <TouchableOpacity onPress={() => setBuilderKind(null)} style={{ padding: 10 }}>
                <Text style={{ color: appTheme.textSub, fontWeight: '700' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePack}
                disabled={savingPack}
                style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: appTheme.accent }}
              >
                <Text style={{ color: '#000', fontWeight: '900' }}>
                  {savingPack ? '...' : `Создать (${packPhotos.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  modeTabs: { flexDirection: 'row', gap: 6 },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeText: { fontSize: 12, fontWeight: '800' },
  backspaceBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  catStrip: { paddingHorizontal: 8, paddingVertical: 6, gap: 6 },
  catBtn: { width: 34, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  packPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emojiCell: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  emojiChar: { fontSize: 23 },
  customEmojiCell: { flex: 1, height: 44, padding: 3, alignItems: 'center', justifyContent: 'center' },
  customEmojiImg: { width: 34, height: 34, borderRadius: 8 },
  stickerCell: { flex: 1, height: 76, padding: 4, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  stickerImg: { width: 66, height: 66 },
  favStar: { position: 'absolute', top: 2, right: 4, fontSize: 10 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  gifSearchRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingTop: 6 },
  gifInput: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  gifSearchBtn: { paddingHorizontal: 12, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gifCell: { flex: 1, height: 82, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
  gifImg: { width: '100%', height: '100%' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 20 },
  addStickerTile: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
