import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
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
      '😀', '😂', '🥹', '😍', '🥰', '😎', '🤩', '🥳',
      '😭', '😡', '🤯', '🤔', '🫡', '🫠', '🤫', '😴',
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
      '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤',
      '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩',
      '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺',
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
      '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆',
      '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝',
      '🌸', '🌺', '🌻', '🌹', '🌷', '🌿', '🍀', '🍁',
      '🌞', '🌙', '⭐', '🌟', '⚡', '🔥', '❄️', '🌈',
    ],
  },
  {
    id: 'food',
    icon: '🥟',
    label: 'Еда',
    items: [
      '🥟', '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓',
      '🥚', '🍳', '🥞', '🧇', '🥐', '🍞', '🥖', '🥨',
      '🧀', '🥗', '🥪', '🌮', '🌯', '🥙', '🍝', '🍜',
      '🍲', '🍛', '🍣', '🍱', '🍤', '🍙', '🍚', '🍘',
      '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁',
      '🍫', '🍬', '🍭', '🍮', '🍯', '☕', '🍵', '🧋',
    ],
  },
  {
    id: 'activity',
    icon: '🎮',
    label: 'Активность',
    items: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
      '🎱', '🏓', '🏸', '🏒', '🥊', '🥋', '⛳', '🎯',
      '🎮', '🕹️', '🎲', '🧩', '♟️', '🎭', '🎨', '🎬',
      '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸',
      '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎫', '🎟️',
    ],
  },
  {
    id: 'symbols',
    icon: '💎',
    label: 'Символы',
    items: [
      '❤️', '💔', '❤️‍🔥', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💎', '👑', '🔔', '🔕', '📣', '💬',
      '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '✅', '❌',
      '⚠️', '🚫', '💯', '🔞', '💤', '💢', '💥', '💫',
    ],
  },
];

interface StickerPack {
  id: string;
  title: string;
  stickers: Array<{ url: string; emoji?: string }>;
}

interface EmojiStickerDrawerProps {
  onSelectEmoji: (emoji: string) => void;
  onBackspace: () => void;
  onSelectSticker: (url: string, emoji?: string) => void;
}

export const EmojiStickerDrawer: React.FC<EmojiStickerDrawerProps> = ({
  onSelectEmoji,
  onBackspace,
  onSelectSticker,
}) => {
  const { appTheme } = useApp();
  const [mode, setMode] = useState<'emoji' | 'stickers'>('emoji');
  const [catId, setCatId] = useState<string>('popular');
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [loadingPacks, setLoadingPacks] = useState(false);

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
              stickers: stickers as any,
            });
          }
        });
        setPacks(list);
        if (list.length > 0 && !selectedPackId) {
          setSelectedPackId(list[0].id);
        }
        setLoadingPacks(false);
      },
      () => setLoadingPacks(false)
    );
    return () => unsub();
  }, []);

  const currentCat = EMOJI_CATEGORIES.find((c) => c.id === catId) || EMOJI_CATEGORIES[0];
  const currentPack = packs.find((p) => p.id === selectedPackId) || packs[0];

  return (
    <View style={{ paddingHorizontal: 10, paddingBottom: 6 }}>
      <GlassCard radius={24} strong style={styles.container}>
        {/* Top Mode Tabs + Backspace */}
        <View style={[styles.topRow, { borderBottomColor: appTheme.border }]}>
          <View style={styles.modeTabs}>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic(6);
                setMode('emoji');
              }}
              style={[
                styles.modePill,
                mode === 'emoji' && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent },
              ]}
            >
              <Text style={[styles.modeText, { color: mode === 'emoji' ? appTheme.accent : appTheme.textSub }]}>
                😀 Эмодзи
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic(6);
                setMode('stickers');
              }}
              style={[
                styles.modePill,
                mode === 'stickers' && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent },
              ]}
            >
              <Text style={[styles.modeText, { color: mode === 'stickers' ? appTheme.accent : appTheme.textSub }]}>
                ✨ Стикеры ({packs.length})
              </Text>
            </TouchableOpacity>
          </View>

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
            {/* Category Strip */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catStrip}
            >
              {EMOJI_CATEGORIES.map((c) => {
                const active = c.id === catId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      triggerHaptic(6);
                      setCatId(c.id);
                    }}
                    style={[
                      styles.catBtn,
                      active && { backgroundColor: appTheme.accentSoft },
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 8-Column Emoji Grid */}
            <FlatList
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
        ) : (
          <View style={{ height: 226 }}>
            {loadingPacks ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={appTheme.accent} />
              </View>
            ) : packs.length === 0 ? (
              <View style={styles.centerBox}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>✨</Text>
                <Text style={{ color: appTheme.textSub, fontSize: 13, textAlign: 'center' }}>
                  Стикерпаки пока не добавлены
                </Text>
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catStrip}
                >
                  {packs.map((p) => {
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

                <FlatList
                  data={currentPack?.stickers || []}
                  keyExtractor={(_, idx) => `${currentPack?.id}_${idx}`}
                  numColumns={4}
                  contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.stickerCell}
                      onPress={() => {
                        triggerHaptic(12);
                        onSelectSticker(item.url, item.emoji);
                      }}
                    >
                      <Image source={{ uri: item.url }} style={styles.stickerImg} resizeMode="contain" />
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </View>
        )}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  backspaceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  catStrip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  catBtn: {
    width: 34,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emojiCell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChar: {
    fontSize: 23,
  },
  stickerCell: {
    flex: 1,
    height: 76,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerImg: {
    width: 66,
    height: 66,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
