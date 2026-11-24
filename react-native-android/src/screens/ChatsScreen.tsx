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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, ChatItem } from '../context/AppContext';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';

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
  const { me, chats, usersMap, addFriendByNick, createGroupOrChannel } = useApp();

  const [activeFolder, setActiveFolder] = useState<'all' | 'dm' | 'groups' | 'channels'>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'friend' | 'group' | 'channel'>('friend');
  const [createInput, setCreateInput] = useState('');
  const [creating, setCreating] = useState(false);

  const getPartner = (chat: ChatItem) => {
    if (!me || chat.type !== 'dm') return null;
    const otherUid = (chat.members || []).find((id) => id !== me.uid);
    return otherUid ? usersMap[otherUid] : null;
  };

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
        lastMsg: 'Заметки, важные сообщения и облако',
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
      Alert.alert('Ошибка', e?.message || 'Не удалось выполнить действие');
    } finally {
      setCreating(false);
    }
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    const info = getChatDisplay(item);
    const partner = info.partner;
    const isSaved = item.type === 'saved';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.72}
        onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, name: info.name })}
      >
        <View style={styles.avatarWrap}>
          {isSaved ? (
            <View style={[styles.savedAva]}>
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
              <Text style={styles.chatName} numberOfLines={1}>
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
                <View style={styles.typeTag}>
                  <Text style={styles.typeTagText}>КАНАЛ</Text>
                </View>
              )}
            </View>
            <Text style={styles.chatTime}>{formatTime(item.lastMsgAt)}</Text>
          </View>

          <View style={styles.chatMsgRow}>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {stripHtml(item.lastMsg) || 'Нет сообщений'}
            </Text>
            {(item.unread || 0) > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#080C14" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../android/app/src/main/assets/public/logo.png')}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>NonsenseChat</Text>
        </View>

        <View style={styles.headerActions}>
          {/* Pirozhki Balance Capsule */}
          <TouchableOpacity
            style={styles.pirozhkiPill}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'buy' })}
          >
            <Image
              source={require('../../android/app/src/main/assets/public/pirozhok.png')}
              style={styles.pirozhokIcon}
            />
            <Text style={styles.pirozhkiCount}>{(me?.pirozhki || 0).toLocaleString('ru-RU')}</Text>
            <View style={styles.pirozhkiPlus}>
              <Text style={styles.pirozhkiPlusText}>+</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('ProfileCustomizer')}
          >
            <Text style={styles.headerIconText}>🎨</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={[styles.headerIconText, { fontSize: 20, color: '#60a5fa' }]}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск чатов и сообщений..."
          placeholderTextColor="#6c7a89"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Folders Tabs */}
      <View style={styles.foldersRow}>
        {[
          { key: 'all', label: 'ВСЕ' },
          { key: 'dm', label: 'ЛС' },
          { key: 'groups', label: 'ГРУППЫ' },
          { key: 'channels', label: 'КАНАЛЫ' },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.folderTab, activeFolder === f.key && styles.folderTabActive]}
            onPress={() => setActiveFolder(f.key as any)}
          >
            <Text
              style={[styles.folderTabText, activeFolder === f.key && styles.folderTabTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
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
            <Text style={styles.emptyText}>Чатов пока нет. Нажмите «＋», чтобы найти друга!</Text>
          </View>
        }
      />

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Новый диалог или сообщество</Text>
            <View style={styles.modeTabs}>
              {[
                { k: 'friend', l: 'Друг' },
                { k: 'group', l: 'Группа' },
                { k: 'channel', l: 'Канал' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.k}
                  style={[styles.modeTab, createMode === m.k && styles.modeTabAct]}
                  onPress={() => setCreateMode(m.k as any)}
                >
                  <Text style={[styles.modeTabTxt, createMode === m.k && { color: '#fff' }]}>
                    {m.l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder={
                createMode === 'friend'
                  ? 'Введите @юзернейм или UID'
                  : createMode === 'group'
                  ? 'Название группы'
                  : 'Название канала'
              }
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              value={createInput}
              onChangeText={setCreateInput}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtnSec}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPri}
                disabled={creating}
                onPress={handleCreateSubmit}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {creating ? 'Создание...' : 'Продолжить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 30, height: 30, borderRadius: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#ffffff' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pirozhkiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
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
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { fontSize: 15, color: '#e2e8f0' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131c2a',
    borderRadius: 12,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 13, marginRight: 8 },
  searchInput: { flex: 1, height: 38, color: '#fff', fontSize: 14 },
  foldersRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 6,
  },
  folderTab: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14 },
  folderTabActive: { backgroundColor: 'rgba(91, 143, 185, 0.22)' },
  folderTabText: { fontSize: 12, fontWeight: '700', color: '#8e9aa8' },
  folderTabTextActive: { color: '#60a5fa' },
  listContent: { paddingBottom: 24 },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  avatarWrap: { marginRight: 12 },
  savedAva: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1e3a8a',
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
  chatName: { fontSize: 15.5, fontWeight: '700', color: '#ffffff', flexShrink: 1 },
  typeTag: {
    backgroundColor: 'rgba(96, 165, 250, 0.16)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  typeTagText: { fontSize: 9, color: '#60a5fa', fontWeight: '800' },
  chatTime: { fontSize: 11.5, color: '#6c7a89' },
  chatMsgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 13.5, color: '#8e9aa8', flex: 1, marginRight: 8 },
  unreadBadge: {
    backgroundColor: '#5b8fb9',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyBox: { padding: 48, alignItems: 'center' },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { color: '#8e9aa8', textAlign: 'center', fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#131c2a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 14 },
  modeTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  modeTabAct: { backgroundColor: '#5b8fb9' },
  modeTabTxt: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  modalInput: {
    backgroundColor: '#0a0f18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 14.5,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  modalBtnSec: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  modalBtnPri: {
    backgroundColor: '#5b8fb9',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
