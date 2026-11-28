import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { get, ref } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';

interface StickerPackPreviewModalProps {
  visible: boolean;
  stickerUrl: string;
  customEmojiPackId?: string;
  onClose: () => void;
  onSendSticker: (url: string, emoji?: string) => void;
  onSelectCustomEmoji?: (token: string) => void;
}

export const StickerPackPreviewModal: React.FC<StickerPackPreviewModalProps> = ({
  visible,
  stickerUrl,
  customEmojiPackId = '',
  onClose,
  onSendSticker,
  onSelectCustomEmoji,
}) => {
  const {
    appTheme,
    favoriteStickers,
    toggleFavoriteSticker,
    installedPackIds,
    toggleInstallStickerPack,
    installedEmojiPackIds,
    toggleInstallEmojiPack,
    pushRecentCustomEmoji,
    showToast,
  } = useApp();

  const isCustomEmojiMode = !!customEmojiPackId;
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<{
    id: string;
    title: string;
    stickers: Array<{ url: string; emoji?: string; itemId?: string }>;
  } | null>(null);

  useEffect(() => {
    if (!visible || (!stickerUrl && !customEmojiPackId)) return;
    setLoading(true);
    setPack(null);
    (async () => {
      try {
        if (customEmojiPackId) {
          const snap = await get(ref(rtdb, `custom_emoji_packs/${customEmojiPackId}`));
          const raw = snap.val();
          if (raw && typeof raw === 'object') {
            const itemsRaw = Array.isArray(raw.items)
              ? raw.items
              : raw.items && typeof raw.items === 'object'
              ? Object.values(raw.items)
              : [];
            const mapped = itemsRaw
              .filter((s: any) => s && s.url)
              .map((s: any, idx: number) => ({
                url: s.url,
                itemId: s.id !== undefined ? String(s.id) : String(idx),
              }));
            setPack({
              id: customEmojiPackId,
              title: raw.title || 'Кастомные эмодзи',
              stickers: mapped,
            });
          }
        } else if (stickerUrl) {
          const snap = await get(ref(rtdb, 'sticker_packs'));
          const val = snap.val() || {};
          for (const pid of Object.keys(val)) {
            const raw = val[pid];
            if (!raw || typeof raw !== 'object') continue;
            const stickers = Array.isArray(raw.stickers)
              ? raw.stickers.filter((s: any) => s && s.url)
              : raw.stickers && typeof raw.stickers === 'object'
              ? Object.values(raw.stickers).filter((s: any) => s && s.url)
              : [];
            if (stickers.some((s: any) => s.url === stickerUrl)) {
              setPack({
                id: pid,
                title: raw.title || 'Стикерпак',
                stickers: stickers as any,
              });
              break;
            }
          }
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, [visible, stickerUrl, customEmojiPackId]);

  const isFav = !isCustomEmojiMode && favoriteStickers.includes(stickerUrl);
  const isInstalled = pack
    ? isCustomEmojiMode
      ? installedEmojiPackIds.includes(pack.id)
      : installedPackIds.includes(pack.id)
    : false;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <GlassCard radius={28} strong style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: appTheme.text }]} numberOfLines={1}>
                {isCustomEmojiMode ? '🎨 ' : '✨ '}
                {pack?.title || (isCustomEmojiMode ? 'Кастомные эмодзи' : 'Стикер')}
              </Text>
              <Text style={{ color: appTheme.textSub, fontSize: 12 }}>
                {pack
                  ? `${isCustomEmojiMode ? 'Эмодзи' : 'Стикеров'} в наборе: ${pack.stickers.length}`
                  : 'Нажмите для вставки'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={appTheme.textSub} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={appTheme.accent} style={{ marginVertical: 28 }} />
          ) : pack ? (
            <FlatList
              data={pack.stickers}
              numColumns={isCustomEmojiMode ? 5 : 4}
              keyExtractor={(_it, idx) => String(idx)}
              style={{ maxHeight: 260 }}
              contentContainerStyle={{ gap: 8 }}
              columnWrapperStyle={{ gap: 8 }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.cell}
                  onPress={() => {
                    triggerHaptic(10);
                    onClose();
                    if (isCustomEmojiMode && onSelectCustomEmoji) {
                      const tok = `[ce:${pack.id}:${item.itemId ?? String(index)}]`;
                      pushRecentCustomEmoji(tok);
                      onSelectCustomEmoji(tok);
                    } else {
                      onSendSticker(item.url, item.emoji);
                    }
                  }}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={
                      isCustomEmojiMode
                        ? { width: 42, height: 42, borderRadius: 9 }
                        : { width: 58, height: 58 }
                    }
                    resizeMode={isCustomEmojiMode ? 'cover' : 'contain'}
                  />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              {stickerUrl ? (
                <Image source={{ uri: stickerUrl }} style={{ width: 128, height: 128 }} resizeMode="contain" />
              ) : null}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {!isCustomEmojiMode && (
              <TouchableOpacity
                style={[styles.btnSec, { flex: 1, borderColor: appTheme.border }]}
                onPress={() => {
                  toggleFavoriteSticker(stickerUrl);
                  showToast(isFav ? 'Убрано из избранного' : 'Добавлено в ⭐ Избранные', undefined, 'info');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>
                  {isFav ? '⭐ В избранном' : '☆ В избранные'}
                </Text>
              </TouchableOpacity>
            )}
            {pack && (
              <TouchableOpacity
                style={[
                  styles.btnPri,
                  { flex: 1, backgroundColor: isInstalled ? 'rgba(34,197,94,0.22)' : appTheme.accent },
                ]}
                onPress={() => {
                  if (isCustomEmojiMode) {
                    toggleInstallEmojiPack(pack.id);
                    showToast(
                      isInstalled ? 'Набор эмодзи удалён' : 'Набор эмодзи добавлен 🎨',
                      pack.title,
                      'success'
                    );
                  } else {
                    toggleInstallStickerPack(pack.id);
                    showToast(
                      isInstalled ? 'Пак удалён из своих' : 'Стикерпак добавлен ✓',
                      pack.title,
                      'success'
                    );
                  }
                }}
              >
                <Text style={{ color: isInstalled ? '#4ade80' : '#000', fontWeight: '900', fontSize: 12.5 }}>
                  {isInstalled ? '✓ Установлен' : '＋ Добавить пак'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.74)', justifyContent: 'flex-end', padding: 12 },
  card: { padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSec: {
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnPri: {
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: 'center',
  },
});
