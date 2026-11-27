import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { get, ref } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';
import { LiquidBackground } from './LiquidBackground';
import { RADII } from '../theme/liquidGlass';

interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenChatMessage: (chatId: string, chatName: string, msgId?: string) => void;
  onOpenUser: (uid: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  visible,
  onClose,
  onOpenChatMessage,
  onOpenUser,
}) => {
  const insets = useSafeAreaInsets();
  const { me, chats, usersMap, appTheme } = useApp();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'msgs' | 'chats' | 'people' | 'links'>('msgs');
  const [allMsgs, setAllMsgs] = useState<Array<{ id: string; chatId: string; chatName: string; text: string; author: string; at: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    (async () => {
      try {
        const collected: Array<{ id: string; chatId: string; chatName: string; text: string; author: string; at: number }> = [];
        for (const c of chats.slice(0, 20)) {
          const otherUid = c.type === 'dm' && me ? (c.members || []).find((m) => m !== me.uid) : undefined;
          const chatName = otherUid ? usersMap[otherUid]?.nick || c.name || 'Диалог' : c.name || 'Чат';
          const snap = await get(ref(rtdb, `messages/${c.id}`));
          const val = snap.val() || {};
          Object.keys(val).forEach((mid) => {
            const m = val[mid];
            if (m && typeof m.text === 'string' && m.text.trim()) {
              collected.push({
                id: mid,
                chatId: c.id,
                chatName,
                text: m.text,
                author: m.author || 'Участник',
                at: Number(m.at) || 0,
              });
            }
          });
        }
        collected.sort((a, b) => b.at - a.at);
        setAllMsgs(collected);
      } catch (_) {
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const q = query.trim().toLowerCase();

  const matchedMsgs = useMemo(
    () => (q ? allMsgs.filter((m) => m.text.toLowerCase().includes(q)).slice(0, 60) : allMsgs.slice(0, 30)),
    [allMsgs, q]
  );

  const matchedChats = useMemo(
    () =>
      chats.filter((c) => {
        const otherUid = c.type === 'dm' && me ? (c.members || []).find((m) => m !== me.uid) : undefined;
        const name = otherUid ? usersMap[otherUid]?.nick || c.name || '' : c.name || '';
        return !q || name.toLowerCase().includes(q);
      }),
    [chats, q, me, usersMap]
  );

  const matchedPeople = useMemo(
    () =>
      Object.values(usersMap).filter(
        (u) => u.uid !== me?.uid && (!q || u.nick.toLowerCase().includes(q) || (u.bio || '').toLowerCase().includes(q))
      ),
    [usersMap, q, me?.uid]
  );

  const matchedLinks = useMemo(() => {
    const out: Array<{ key: string; url: string; chatName: string }> = [];
    const rx = /https?:\/\/[^\s<>"']+/gi;
    allMsgs.forEach((m) => {
      const found = m.text.match(rx);
      if (found) {
        found.forEach((u, idx) => {
          if (!q || u.toLowerCase().includes(q) || m.chatName.toLowerCase().includes(q)) {
            out.push({ key: `${m.id}_${idx}`, url: u, chatName: m.chatName });
          }
        });
      }
    });
    return out.slice(0, 50);
  }, [allMsgs, q]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LiquidBackground>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
            <GlassCard radius={RADII.PILL} strong style={styles.searchPill}>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Глобальный поиск по всему БЧ..."
                placeholderTextColor={appTheme.textSub}
                style={[styles.input, { color: appTheme.text }]}
                autoFocus
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={appTheme.textSub} />
                </TouchableOpacity>
              )}
            </GlassCard>
          </View>

          <View style={styles.tabRow}>
            {[
              { k: 'msgs', l: `Сообщения (${matchedMsgs.length})` },
              { k: 'chats', l: `Чаты (${matchedChats.length})` },
              { k: 'people', l: `Люди (${matchedPeople.length})` },
              { k: 'links', l: `Ссылки (${matchedLinks.length})` },
            ].map((t) => {
              const act = tab === t.k;
              return (
                <TouchableOpacity
                  key={t.k}
                  onPress={() => setTab(t.k as any)}
                  style={[
                    styles.tabBtn,
                    {
                      backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.05)',
                      borderColor: act ? appTheme.accent : appTheme.border,
                    },
                  ]}
                >
                  <Text style={{ color: act ? appTheme.accent : appTheme.textSub, fontSize: 11, fontWeight: '800' }}>
                    {t.l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={appTheme.accent} style={{ marginTop: 36 }} />
          ) : tab === 'msgs' ? (
            <FlatList
              data={matchedMsgs}
              keyExtractor={(item) => `${item.chatId}_${item.id}`}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onOpenChatMessage(item.chatId, item.chatName, item.id);
                  }}
                >
                  <GlassCard radius={18} style={styles.row}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 13 }}>{item.chatName}</Text>
                      <Text style={{ color: appTheme.textSub, fontSize: 11 }}>
                        {item.at ? new Date(item.at).toLocaleDateString('ru-RU') : ''}
                      </Text>
                    </View>
                    <Text style={{ color: appTheme.text, fontSize: 13.5, marginTop: 3 }} numberOfLines={2}>
                      <Text style={{ color: appTheme.textSub }}>{item.author}: </Text>
                      {item.text}
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              )}
            />
          ) : tab === 'chats' ? (
            <FlatList
              data={matchedChats}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              renderItem={({ item }) => {
                const otherUid = item.type === 'dm' && me ? (item.members || []).find((m) => m !== me.uid) : undefined;
                const name = otherUid ? usersMap[otherUid]?.nick || item.name || 'Диалог' : item.name || 'Чат';
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      onOpenChatMessage(item.id, name);
                    }}
                  >
                    <GlassCard radius={18} style={styles.row}>
                      <Text style={{ color: appTheme.text, fontWeight: '800', fontSize: 14.5 }}>💬 {name}</Text>
                    </GlassCard>
                  </TouchableOpacity>
                );
              }}
            />
          ) : tab === 'people' ? (
            <FlatList
              data={matchedPeople}
              keyExtractor={(item) => item.uid}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onOpenUser(item.uid);
                  }}
                >
                  <GlassCard radius={18} style={styles.row}>
                    <Text style={{ color: appTheme.text, fontWeight: '800', fontSize: 14.5 }}>👤 @{item.nick}</Text>
                    {!!item.bio && (
                      <Text style={{ color: appTheme.textSub, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {item.bio}
                      </Text>
                    )}
                  </GlassCard>
                </TouchableOpacity>
              )}
            />
          ) : (
            <FlatList
              data={matchedLinks}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => Linking.openURL(item.url).catch(() => {})}>
                  <GlassCard radius={18} style={styles.row}>
                    <Text style={{ color: appTheme.accent, fontWeight: '700', fontSize: 13.5 }} numberOfLines={1}>
                      🔗 {item.url}
                    </Text>
                    <Text style={{ color: appTheme.textSub, fontSize: 11.5, marginTop: 2 }}>{item.chatName}</Text>
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

interface ChatDateJumpModalProps {
  visible: boolean;
  onClose: () => void;
  messages: any[];
  onJumpToMsgId: (msgId: string) => void;
}

export const ChatDateJumpModal: React.FC<ChatDateJumpModalProps> = ({
  visible,
  onClose,
  messages,
  onJumpToMsgId,
}) => {
  const { appTheme } = useApp();

  const dateBuckets = useMemo(() => {
    const map = new Map<string, { label: string; firstMsgId: string; count: number; ts: number }>();
    messages.forEach((m) => {
      if (!m._atMs) return;
      const d = new Date(m._atMs);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
          firstMsgId: m.id,
          count: 1,
          ts: m._atMs,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.ts - a.ts);
  }, [messages]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.calBackdrop} activeOpacity={1} onPress={onClose}>
        <GlassCard radius={28} strong style={styles.calCard}>
          <Text style={{ color: appTheme.text, fontSize: 17, fontWeight: '800', marginBottom: 10 }}>
            📅 Перейти к дате
          </Text>
          <FlatList
            data={dateBuckets}
            keyExtractor={(item) => item.firstMsgId}
            style={{ maxHeight: 300 }}
            ListEmptyComponent={<Text style={{ color: appTheme.textSub }}>Нет сообщений с датами</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.dateRow, { borderColor: appTheme.border }]}
                onPress={() => {
                  triggerHaptic(10);
                  onClose();
                  onJumpToMsgId(item.firstMsgId);
                }}
              >
                <Text style={{ color: appTheme.text, fontWeight: '700', fontSize: 14 }}>{item.label}</Text>
                <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 12 }}>
                  {item.count} сообщ. ›
                </Text>
              </TouchableOpacity>
            )}
          />
        </GlassCard>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  searchPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  input: { flex: 1, fontSize: 14.5, paddingVertical: 4 },
  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 6 },
  tabBtn: { flex: 1, paddingVertical: 7, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  row: { padding: 12 },
  calBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  calCard: { padding: 18 },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
