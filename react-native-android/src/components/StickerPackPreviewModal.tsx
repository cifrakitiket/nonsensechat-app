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
  onClose: () => void;
  onSendSticker: (url: string, emoji?: string) => void;
}

export const StickerPackPreviewModal: React.FC<StickerPackPreviewModalProps> = ({
  visible,
  stickerUrl,
  onClose,
  onSendSticker,
}) => {
  const {
    appTheme,
    favoriteStickers,
    toggleFavoriteSticker,
    installedPackIds,
    toggleInstallStickerPack,
    showToast,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<{
    id: string;
    title: string;
    stickers: Array<{ url: string; emoji?: string }>;
  } | null>(null);

  useEffect(() => {
    if (!visible || !stickerUrl) return;
    setLoading(true);
    setPack(null);
    (async () => {
      try {
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
      } catch (_) {}
      setLoading(false);
    })();
  }, [visible, stickerUrl]);

  const isFav = favoriteStickers.includes(stickerUrl);
  const isInstalled = pack ? installedPackIds.includes(pack.id) : false;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <GlassCard radius={28} strong style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: appTheme.text }]} numberOfLines={1}>
                ✨ {pack?.title || 'Стикер'}
              </Text>
              <Text style={{ color: appTheme.textSub, fontSize: 12 }}>
                {pack ? `Стикеров в наборе: ${pack.stickers.length}` : 'Нажмите на стикер для отправки'}
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
              numColumns={4}
              keyExtractor={(_it, idx) => String(idx)}
              style={{ maxHeight: 260 }}
              contentContainerStyle={{ gap: 8 }}
              columnWrapperStyle={{ gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cell}
                  onPress={() => {
                    triggerHaptic(10);
                    onClose();
                    onSendSticker(item.url, item.emoji);
                  }}
                >
                  <Image source={{ uri: item.url }} style={{ width: 58, height: 58 }} resizeMode="contain" />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Image source={{ uri: stickerUrl }} style={{ width: 128, height: 128 }} resizeMode="contain" />
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
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
            {pack && (
              <TouchableOpacity
                style={[
                  styles.btnPri,
                  { flex: 1, backgroundColor: isInstalled ? 'rgba(34,197,94,0.22)' : appTheme.accent },
                ]}
                onPress={() => {
                  toggleInstallStickerPack(pack.id);
                  showToast(
                    isInstalled ? 'Пак удалён из своих' : 'Стикерпак добавлен ✓',
                    pack.title,
                    'success'
                  );
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
