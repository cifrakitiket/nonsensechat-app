import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, ChatItem } from '../context/AppContext';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

function formatTime(ms?: number) {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function stripHtml(text?: string) {
  if (!text) return '';
  return String(text)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export default function ChatsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, chats, usersMap, appTheme, addFriendByNick, createGroupOrChannel, showToast } = useApp();

  const [activeFolder, setActiveFolder] = useState<'all' | 'dm' | 'groups' | 'channels'>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'friend' | 'group' | 'channel'>('friend');
  const [createInput, setCreateInput] = useState('');
  const [creating, setCreating] = useState(false);

  const getChatDisplay = (chat: ChatItem) => {
    if (chat.type === 'saved') {
      return { name: 'Избранное', avatar: '', frame: 'none', online: false, partner: null };
    }
    if (chat.type === 'dm' && me) {
      const otherUid = (chat.members || []).find((id) => id !== me.uid);
      const partner = otherUid ? usersMap[otherUid] : null;
      const name = partner?.nick || (otherUid ? chat[`${otherUid}_nick`] : '') || chat.name || 'Диалог';
      const avatar = partner?.avatar || (otherUid ? chat[`${otherUid}_ava`] : '') || chat.avatar || '';
      return {
        name,
        avatar,
        frame: partner?.steamFrame || 'none',
        online: !!partner?.online,
        partner,
      };
    }
    return {
      name: chat.name || (chat.type === 'channel' ? 'Канал' : 'Группа'),
      avatar: chat.avatar || '',
      frame: 'none',
      online: false,
      partner: null,
    };
  };

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = chats.filter((c) => {
      if (activeFolder === 'dm' && c.type !== 'dm') return false;
      if (activeFolder === 'groups' && c.type !== 'group') return false;
      if (activeFolder === 'channels' && c.type !== 'channel') return false;
      if (q) {
        const info = getChatDisplay(c);
        return (
          info.name.toLowerCase().includes(q) ||
          stripHtml(c.lastMsg).toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (!q && activeFolder === 'all' && me) {
      const savedCard: ChatItem = {
        id: `fav_${me.uid}`,
        type: 'saved',
        name: 'Избранное',
        members: [me.uid],
        lastMsg: 'Заметки, фото и облако',
        lastMsgAt: 0,
      };
      return [savedCard, ...base.filter((c) => c.id !== `fav_${me.uid}`)];
    }
    return base;
  }, [chats, activeFolder, search, me, usersMap]);

  const handleCreateSubmit = async () => {
    if (!createInput.trim()) return;
    setCreating(true);
    try {
      let chat: ChatItem | null = null;
      if (createMode === 'friend') {
        chat = await addFriendByNick(createInput);
      } else {
        chat = await createGroupOrChannel(createMode, createInput);
      }
      setShowCreateModal(false);
      setCreateInput('');
      if (chat) {
        const info = getChatDisplay(chat);
        navigation.navigate('ChatRoom', { chatId: chat.id, name: info.name });
      }
    } catch (e: any) {
      showToast('Ошибка', e?.message || 'Не удалось выполнить действие', 'error');
    } finally {
      setCreating(false);
    }
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    const info = getChatDisplay(item);
    const partner = info.partner;
    const isSaved = item.type === 'saved';

    return (
      <ScalePressable
        haptic
        style={{ marginHorizontal: 12, marginVertical: 4 }}
        onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, name: info.name })}
      >
        <GlassCard radius={RADII.ITEM} style={styles.chatCard}>
          <View style={styles.avatarWrap}>
            {isSaved ? (
              <View style={styles.savedAva}>
                <Text style={{ fontSize: 22 }}>🔖</Text>
              </View>
            ) : (
              <FramedAvatar
                uri={info.avatar}
                name={info.name}
                frameId={info.frame}
                size={52}
                online={info.online}
              />
            )}
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeaderRow}>
              <View style={styles.chatNameRow}>
                <Text style={[styles.chatName, { color: appTheme.text }]} numberOfLines={1}>
                  {info.name}
                </Text>
                {partner?.prefix ? (
                  <PrefixBadge
                    prefix={partner.prefix}
                    prefixStyle={partner.prefixStyle}
                    prefixSound={partner.prefixSound}
                  />
                ) : null}
                {item.type === 'channel' && (
                  <View style={[styles.typeTag, { backgroundColor: appTheme.accentSoft }]}>
                    <Text style={[styles.typeTagText, { color: appTheme.accent }]}>КАНАЛ</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.chatTime, { color: appTheme.textSub }]}>
                {formatTime(item.lastMsgAt)}
              </Text>
            </View>

            <View style={styles.chatMsgRow}>
              <Text style={[styles.lastMsg, { color: appTheme.textSub }]} numberOfLines={1}>
                {stripHtml(item.lastMsg) || 'Нет сообщений'}
              </Text>
              {(item.unread || 0) > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: appTheme.accent }]}>
                  <Text style={styles.unreadBadgeText}>{item.unread}</Text>
                </View>
              )}
            </View>
          </View>
        </GlassCard>
      </ScalePressable>
    );
  };

  return (
    <LiquidBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <StatusBar barStyle="light-content" backgroundColor={appTheme.canvas} />

        {/* Liquid Glass Header Pill */}
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../android/app/src/main/assets/public/logo.png')}
                style={styles.headerLogo}
              />
              <Text style={[styles.headerTitle, { color: appTheme.text }]}>NonsenseChat</Text>
            </View>

            <View style={styles.headerActions}>
              <ScalePressable
                haptic
                style={styles.pirozhkiPill}
                onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'buy' })}
              >
                <Image
                  source={require('../../android/app/src/main/assets/public/pirozhok.png')}
                  style={styles.pirozhokIcon}
                />
                <Text style={styles.pirozhkiCount}>
                  {(me?.pirozhki || 0).toLocaleString('ru-RU')}
                </Text>
                <View style={styles.pirozhkiPlus}>
                  <Text style={styles.pirozhkiPlusText}>+</Text>
                </View>
              </ScalePressable>

              <ScalePressable
                haptic
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate('ProfileCustomizer')}
              >
                <Text style={{ fontSize: 15 }}>🎨</Text>
              </ScalePressable>

              <ScalePressable
                haptic
                style={[styles.headerIconBtn, { backgroundColor: appTheme.accentSoft }]}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={{ fontSize: 19, color: appTheme.accent, fontWeight: '800' }}>＋</Text>
              </ScalePressable>
            </View>
          </GlassCard>
        </View>

        {/* Pill Search */}
        <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
          <GlassCard radius={RADII.PILL} style={styles.searchPill}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: appTheme.text }]}
              placeholder="Поиск чатов и сообщений..."
              placeholderTextColor={appTheme.textSub}
              value={search}
              onChangeText={setSearch}
            />
          </GlassCard>
        </View>

        {/* Pill Folder Tabs */}
        <View style={styles.foldersRow}>
          {[
            { key: 'all', label: 'ВСЕ' },
            { key: 'dm', label: 'ЛС' },
            { key: 'groups', label: 'ГРУППЫ' },
            { key: 'channels', label: 'КАНАЛЫ' },
          ].map((f) => {
            const act = activeFolder === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.folderTab,
                  {
                    backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.04)',
                    borderColor: act ? appTheme.accent : appTheme.border,
                  },
                ]}
                onPress={() => setActiveFolder(f.key as any)}
              >
                <Text
                  style={[
                    styles.folderTabText,
                    { color: act ? appTheme.accent : appTheme.textSub },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Chats List */}
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={[styles.emptyText, { color: appTheme.textSub }]}>
                Чатов пока нет. Нажмите «＋», чтобы найти друга!
              </Text>
            </View>
          }
        />

        {/* Liquid Glass Create Modal */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <GlassCard radius={RADII.CARD} strong style={styles.modalCard}>
              <Text style={[styles.modalTitle, { color: appTheme.text }]}>
                Новый диалог или сообщество
              </Text>
              <View style={styles.modeTabs}>
                {[
                  { k: 'friend', l: 'Друг' },
                  { k: 'group', l: 'Группа' },
                  { k: 'channel', l: 'Канал' },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.k}
                    style={[
                      styles.modeTab,
                      createMode === m.k && { backgroundColor: appTheme.accent },
                    ]}
                    onPress={() => setCreateMode(m.k as any)}
                  >
                    <Text
                      style={[
                        styles.modeTabTxt,
                        createMode === m.k && { color: '#000', fontWeight: '800' },
                      ]}
                    >
                      {m.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.modalInput, { backgroundColor: appTheme.glassInput, color: appTheme.text }]}
                placeholder={
                  createMode === 'friend'
                    ? 'Введите @юзернейм или UID'
                    : createMode === 'group'
                    ? 'Название группы'
                    : 'Название канала'
                }
                placeholderTextColor={appTheme.textSub}
                autoCapitalize="none"
                value={createInput}
                onChangeText={setCreateInput}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={styles.modalBtnSec}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={{ color: appTheme.textSub, fontWeight: '700' }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtnPri, { backgroundColor: appTheme.accent }]}
                  disabled={creating}
                  onPress={handleCreateSubmit}
                >
                  <Text style={{ color: '#000', fontWeight: '800' }}>
                    {creating ? 'Создание...' : 'Продолжить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </Modal>
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerLogo: { width: 30, height: 30, borderRadius: 15 },
  headerTitle: { fontSize: 16.5, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pirozhkiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  pirozhokIcon: { width: 16, height: 16 },
  pirozhkiCount: { color: '#fbbf24', fontSize: 12.5, fontWeight: '800' },
  pirozhkiPlus: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pirozhkiPlusText: { color: '#000', fontSize: 12, fontWeight: '900', lineHeight: 15 },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
  },
  searchIcon: { fontSize: 13, marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  foldersRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  folderTab: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  folderTabText: { fontSize: 11.5, fontWeight: '800' },
  listContent: { paddingBottom: 108 },
  chatCard: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  avatarWrap: { marginRight: 12 },
  savedAva: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: { flex: 1 },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  chatName: { fontSize: 15.5, fontWeight: '800', flexShrink: 1 },
  typeTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
  typeTagText: { fontSize: 9, fontWeight: '800' },
  chatTime: { fontSize: 11.5 },
  chatMsgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 13.5, flex: 1, marginRight: 8 },
  unreadBadge: {
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: '#000', fontSize: 11, fontWeight: '900' },
  emptyBox: { padding: 48, alignItems: 'center' },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { textAlign: 'center', fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: { padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14 },
  modeTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  modeTabTxt: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  modalInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  modalBtnSec: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  modalBtnPri: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
});
