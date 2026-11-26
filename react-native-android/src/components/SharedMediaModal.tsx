import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';
import { LiquidBackground } from './LiquidBackground';
import { RADII } from '../theme/liquidGlass';

interface SharedMediaModalProps {
  visible: boolean;
  onClose: () => void;
  messages: any[];
  chatName: string;
  onOpenPhoto: (uri: string) => void;
  onPlayVoice: (msg: any) => void;
}

type MediaTab = 'photos' | 'files' | 'voice' | 'links';

const { width: SCREEN_W } = Dimensions.get('window');
const TILE_SIZE = Math.floor((SCREEN_W - 36) / 3);

function formatBytes(bytes = 0) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const SharedMediaModal: React.FC<SharedMediaModalProps> = ({
  visible,
  onClose,
  messages,
  chatName,
  onOpenPhoto,
  onPlayVoice,
}) => {
  const insets = useSafeAreaInsets();
  const { appTheme, showToast } = useApp();
  const [tab, setTab] = useState<MediaTab>('photos');

  const photos = useMemo(
    () =>
      messages
        .filter((m) => !m.destroyed && !m.selfDestructSec && (m.photoUrl || m.imageUrl || m.url))
        .map((m) => ({
          id: m.id,
          uri: m.photoUrl || m.imageUrl || m.url,
          author: m.author || '',
          at: m._atMs || 0,
        }))
        .reverse(),
    [messages]
  );

  const files = useMemo(
    () =>
      messages
        .filter((m) => m.type === 'file' || (m.fileUrl && !m.photoUrl && !m.audioUrl))
        .reverse(),
    [messages]
  );

  const voices = useMemo(
    () =>
      messages
        .filter((m) => m.type === 'voice' || m.type === 'audio' || m.audioUrl || m.voiceUrl)
        .reverse(),
    [messages]
  );

  const links = useMemo(() => {
    const out: Array<{ id: string; url: string; author: string; at: number }> = [];
    const regex = /https?:\/\/[^\s<>"']+/gi;
    messages.forEach((m) => {
      if (typeof m.text !== 'string') return;
      const matches = m.text.match(regex);
      if (matches) {
        matches.forEach((u: string, i: number) => {
          out.push({ id: `${m.id}_${i}`, url: u, author: m.author || 'Пользователь', at: m._atMs || 0 });
        });
      }
    });
    return out.reverse();
  }, [messages]);

  const tabs: Array<{ key: MediaTab; label: string; count: number }> = [
    { key: 'photos', label: 'Фото', count: photos.length },
    { key: 'files', label: 'Файлы', count: files.length },
    { key: 'voice', label: 'Голосовые', count: voices.length },
    { key: 'links', label: 'Ссылки', count: links.length },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LiquidBackground>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
            <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
              <TouchableOpacity style={styles.backBtn} onPress={onClose}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.title, { color: appTheme.text }]} numberOfLines={1}>
                  Общие медиа
                </Text>
                <Text style={[styles.sub, { color: appTheme.textSub }]} numberOfLines={1}>
                  {chatName}
                </Text>
              </View>
            </GlassCard>
          </View>

          <View style={styles.tabRow}>
            {tabs.map((t) => {
              const act = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[
                    styles.tabBtn,
                    {
                      backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.05)',
                      borderColor: act ? appTheme.accent : appTheme.border,
                    },
                  ]}
                >
                  <Text style={[styles.tabLabel, { color: act ? appTheme.accent : appTheme.textSub }]}>
                    {t.label} ({t.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {tab === 'photos' && (
            <FlatList
              key="photos_grid"
              data={photos}
              numColumns={3}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12, gap: 6 }}
              columnWrapperStyle={{ gap: 6 }}
              ListEmptyComponent={<Text style={[styles.empty, { color: appTheme.textSub }]}>Фотографий пока нет</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    onClose();
                    onOpenPhoto(item.uri);
                  }}
                >
                  <Image source={{ uri: item.uri }} style={styles.photoTile} />
                </TouchableOpacity>
              )}
            />
          )}

          {tab === 'files' && (
            <FlatList
              key="files_list"
              data={files}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              ListEmptyComponent={<Text style={[styles.empty, { color: appTheme.textSub }]}>Файлов пока нет</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (String(item.fileUrl).startsWith('http')) Linking.openURL(item.fileUrl).catch(() => {});
                    else showToast('Файл', `${item.fileName || 'Документ'} (${formatBytes(item.fileSize)})`, 'info');
                  }}
                >
                  <GlassCard radius={18} style={styles.rowCard}>
                    <View style={[styles.iconBox, { backgroundColor: appTheme.accentSoft }]}>
                      <Ionicons name="document-text" size={20} color={appTheme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: appTheme.text }]} numberOfLines={1}>
                        {item.fileName || 'Документ'}
                      </Text>
                      <Text style={[styles.rowSub, { color: appTheme.textSub }]}>
                        {formatBytes(item.fileSize) || 'Файл'} · {item.author || 'Участник'}
                      </Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              )}
            />
          )}

          {tab === 'voice' && (
            <FlatList
              key="voice_list"
              data={voices}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              ListEmptyComponent={<Text style={[styles.empty, { color: appTheme.textSub }]}>Голосовых сообщений нет</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onPlayVoice(item);
                  }}
                >
                  <GlassCard radius={18} style={styles.rowCard}>
                    <View style={[styles.iconBox, { backgroundColor: appTheme.accentSoft }]}>
                      <Ionicons name="mic" size={20} color={appTheme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: appTheme.text }]}>
                        Голосовое ({item.duration || 2} сек.)
                      </Text>
                      <Text style={[styles.rowSub, { color: appTheme.textSub }]}>
                        {item.author || 'Участник'} ·{' '}
                        {item._atMs ? new Date(item._atMs).toLocaleDateString('ru-RU') : ''}
                      </Text>
                    </View>
                    <Ionicons name="play-circle" size={26} color={appTheme.accent} />
                  </GlassCard>
                </TouchableOpacity>
              )}
            />
          )}

          {tab === 'links' && (
            <FlatList
              key="links_list"
              data={links}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              ListEmptyComponent={<Text style={[styles.empty, { color: appTheme.textSub }]}>Ссылок пока нет</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => Linking.openURL(item.url).catch(() => {})}>
                  <GlassCard radius={18} style={styles.rowCard}>
                    <View style={[styles.iconBox, { backgroundColor: appTheme.accentSoft }]}>
                      <Ionicons name="link" size={20} color={appTheme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: appTheme.accent }]} numberOfLines={1}>
                        {item.url}
                      </Text>
                      <Text style={[styles.rowSub, { color: appTheme.textSub }]}>{item.author}</Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </LiquidBackground>
    </Modal>
  );
};

const styles = StyleSheet.create({
  headerPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 6, marginBottom: 6 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  tabLabel: { fontSize: 11.5, fontWeight: '800' },
  photoTile: { width: TILE_SIZE, height: TILE_SIZE, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  rowCard: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 14 },
});
