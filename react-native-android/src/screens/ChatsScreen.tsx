import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  NativeModules,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { get, push, ref, set, update } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { useApp, ChatItem } from '../context/AppContext';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { StoriesBar } from '../components/StoriesBar';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { SpecialBadges } from '../components/SpecialBadges';
import { CREATOR_UID } from '../constants/catalogs';
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

function formatLastMsgPreview(rawMsg?: string, isMine?: boolean) {
  if (!rawMsg) return 'Нет сообщений';
  const clean = stripHtml(rawMsg);
  let text = clean;
  if (clean.startsWith('data:image') || clean.includes('📷 Фото') || clean.includes('photo_')) text = '📷 Фотография';
  else if (clean.includes('⭕') || clean.includes('Кружочек')) text = '⭕ Видеосообщение';
  else if (clean.includes('🎬 GIF')) text = '🎬 GIF';
  else if (clean.includes('🎤') || clean.includes('[Голосовое]')) text = '🎤 Голосовое сообщение';
  else if (clean.includes('📎') || clean.includes('📄') || clean.includes('file_')) text = '📄 Документ';
  else if (clean.includes('📊') || clean.includes('Опрос:')) text = '📊 Опрос';
  else if (clean.includes('✅ Чек-лист')) text = '✅ Чек-лист задач';
  else if (clean.includes('📍')) text = clean;
  else if (clean.includes('🥧')) text = '🥧 Подарок пирожков';
  else if (clean.includes('✨ Стикер')) text = '✨ Стикер';
  return isMine ? `✓ ${text}` : text;
}

export default function ChatsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    me,
    chats,
    incomingRequests,
    acceptFriendRequest,
    declineFriendRequest,
    usersMap,
    appTheme,
    openOrCreateDm,
    addFriendByNick,
    createGroupOrChannel,
    showToast,
    notificationsEnabled,
    openNotificationSettings,
    pinnedChatIds,
    mutedChatIds,
    archivedChatIds,
    markedUnreadIds,
    drafts,
    customFolders,
    togglePinChat,
    toggleMuteChat,
    toggleArchiveChat,
    toggleMarkUnread,
    createCustomFolder,
    deleteCustomFolder,
    toggleChatInFolder,
    markAllChatsRead,
    hiddenVaultChatIds,
    vaultPasscode,
    toggleVaultChat,
    joinChatByInvite,
    openAiHubChat,
    creatorAddFriendDirect,
    stories,
  } = useApp();

  const [storiesExpanded, setStoriesExpanded] = useState(true);
  const scrollYRef = useRef(0);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    NativeModules.NativeStorageModule?.getItem?.('nc_stories_expanded')
      .then((val: string | null) => {
        if (val === '0') setStoriesExpanded(false);
      })
      .catch(() => {});
  }, []);

  const setStoriesVisible = (next: boolean) => {
    if (next === storiesExpanded) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStoriesExpanded(next);
    NativeModules.NativeStorageModule?.setItem?.('nc_stories_expanded', next ? '1' : '0')?.catch?.(() => {});
  };

  const storyMiniAvatars = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ uid: string; nick: string; avatar?: string }> = [];
    stories.forEach((s) => {
      if (!seen.has(s.uid)) {
        seen.add(s.uid);
        list.push({ uid: s.uid, nick: s.nick, avatar: s.avatar });
      }
    });
    return list.slice(0, 3);
  }, [stories]);

  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'friend' | 'group' | 'channel' | 'invite'>('friend');
  const [createInput, setCreateInput] = useState('');
  const [creating, setCreating] = useState(false);

  // Quick Peek & Context Menu state
  const [peekChat, setPeekChat] = useState<ChatItem | null>(null);
  const [peekMessages, setPeekMessages] = useState<any[]>([]);
  const [loadingPeek, setLoadingPeek] = useState(false);

  // Create Custom Folder Modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [newFolderChatIds, setNewFolderChatIds] = useState<string[]>([]);

  const getChatDisplay = (chat: ChatItem) => {
    if (chat.type === 'saved') {
      return { name: 'Избранное', avatar: '', frame: 'none', online: false, partner: null };
    }
    if (chat.type === 'ai_hub' || String(chat.id || '').startsWith('aihub_')) {
      return { name: '🤖 ИИ Хаб', avatar: '', frame: 'none', online: true, partner: null };
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

  const openChatPeek = async (chat: ChatItem) => {
    triggerHaptic(16);
    setPeekChat(chat);
    setPeekMessages([]);
    setLoadingPeek(true);
    try {
      const snap = await get(ref(rtdb, `messages/${chat.id}`));
      const val = snap.val() || {};
      const list = Object.keys(val)
        .filter((k) => val[k] && typeof val[k] === 'object')
        .map((k) => ({ id: k, ...val[k] }))
        .sort((a, b) => (a.at || 0) - (b.at || 0))
        .slice(-5);
      setPeekMessages(list);
    } catch (_) {
    } finally {
      setLoadingPeek(false);
    }
  };

  const handleReplyToStory = async (authorUid: string, msgText: string) => {
    const chat = await openOrCreateDm(authorUid);
    if (chat && me) {
      const newRef = push(ref(rtdb, `messages/${chat.id}`));
      await set(newRef, {
        uid: me.uid,
        author: me.nick,
        at: Date.now(),
        type: 'text',
        text: msgText,
      });
      await update(ref(rtdb, `chats/${chat.id}`), {
        lastMsg: msgText,
        lastMsgAt: Date.now(),
        lastMsgUid: me.uid,
      });
      const info = getChatDisplay(chat);
      navigation.navigate('ChatRoom', { chatId: chat.id, name: info.name });
    }
  };

  const isVaultQuery = !!vaultPasscode && search.trim() === vaultPasscode;

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    const custom = customFolders.find((f) => f.id === activeFolder);

    const base = chats.filter((c) => {
      const inVault = hiddenVaultChatIds.includes(c.id);
      if (isVaultQuery) return inVault;
      if (inVault) return false;

      const isArch = archivedChatIds.includes(c.id);
      if (showArchived ? !isArch : isArch) return false;

      if (activeFolder === 'dm' && c.type !== 'dm') return false;
      if (activeFolder === 'groups' && c.type !== 'group') return false;
      if (activeFolder === 'channels' && c.type !== 'channel') return false;
      if (custom && !custom.chatIds.includes(c.id)) return false;

      if (q) {
        const info = getChatDisplay(c);
        return (
          info.name.toLowerCase().includes(q) ||
          stripHtml(c.lastMsg).toLowerCase().includes(q)
        );
      }
      return true;
    });

    const sorted = [...base].sort((a, b) => {
      const ap = pinnedChatIds.includes(a.id) ? 1 : 0;
      const bp = pinnedChatIds.includes(b.id) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (b.lastMsgAt || 0) - (a.lastMsgAt || 0);
    });

    if (!showArchived && !q && activeFolder === 'all' && me) {
      const savedCard: ChatItem = {
        id: `fav_${me.uid}`,
        type: 'saved',
        name: 'Избранное',
        members: [me.uid],
        lastMsg: 'Заметки, фото и облако',
        lastMsgAt: 0,
      };
      const aiCard: ChatItem = {
        id: `aihub_${me.uid}`,
        type: 'ai_hub',
        name: '🤖 ИИ Хаб',
        members: [me.uid],
        lastMsg: 'Нейросети Gemini, Grok, Claude, GPT',
        lastMsgAt: 0,
      };
      return [
        savedCard,
        aiCard,
        ...sorted.filter((c) => c.id !== `fav_${me.uid}` && c.id !== `aihub_${me.uid}`),
      ];
    }
    return sorted;
  }, [chats, activeFolder, showArchived, search, me, usersMap, archivedChatIds, pinnedChatIds, customFolders, hiddenVaultChatIds, isVaultQuery]);

  const handleCreateSubmit = async () => {
    if (!createInput.trim()) return;
    setCreating(true);
    try {
      if (createMode === 'invite') {
        const res = await joinChatByInvite(createInput);
        setShowCreateModal(false);
        setCreateInput('');
        if (res.pending) {
          showToast('Заявка отправлена ⏳', 'Ожидайте одобрения администратором', 'info');
        } else if (res.chat) {
          showToast('Вы вступили ✓', res.chat.name || 'Сообщество', 'success');
          navigation.navigate('ChatRoom', { chatId: res.chat.id, name: res.chat.name || 'Чат' });
        }
        return;
      }
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
    const isAiHubItem = item.type === 'ai_hub' || String(item.id || '').startsWith('aihub_');
    const isPinned = pinnedChatIds.includes(item.id);
    const isMuted = mutedChatIds.includes(item.id);
    const isMarkedUnread = markedUnreadIds.includes(item.id);
    const draftText = drafts[item.id];
    const unreadCount = item.unread || 0;

    return (
      <ScalePressable
        haptic
        style={{ marginHorizontal: 12, marginVertical: 4 }}
        onPress={async () => {
          if (isAiHubItem) {
            const aiChat = await openAiHubChat();
            if (aiChat) navigation.navigate('ChatRoom', { chatId: aiChat.id, name: '🤖 ИИ Хаб' });
            return;
          }
          navigation.navigate('ChatRoom', { chatId: item.id, name: info.name });
        }}
        onLongPress={() => !isSaved && !isAiHubItem && openChatPeek(item)}
      >
        <GlassCard radius={RADII.ITEM} style={styles.chatCard}>
          <View style={styles.avatarWrap}>
            {isSaved ? (
              <View style={styles.savedAva}>
                <Text style={{ fontSize: 22 }}>🔖</Text>
              </View>
            ) : isAiHubItem ? (
              <View style={[styles.savedAva, { backgroundColor: 'rgba(14,165,233,0.28)', borderColor: '#38bdf8' }]}>
                <Text style={{ fontSize: 22 }}>🤖</Text>
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
                {partner && <SpecialBadges uid={partner.uid} user={partner} />}
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
                {isMuted && <Ionicons name="volume-mute" size={13} color={appTheme.textSub} />}
                {isPinned && <Text style={{ fontSize: 11 }}>📌</Text>}
              </View>
              <Text style={[styles.chatTime, { color: appTheme.textSub }]}>
                {formatTime(item.lastMsgAt)}
              </Text>
            </View>

            <View style={styles.chatMsgRow}>
              {draftText ? (
                <Text style={[styles.lastMsg, { color: appTheme.textSub }]} numberOfLines={1}>
                  <Text style={{ color: '#f87171', fontWeight: '800' }}>Черновик: </Text>
                  {draftText}
                </Text>
              ) : (
                <Text style={[styles.lastMsg, { color: appTheme.textSub }]} numberOfLines={1}>
                  {formatLastMsgPreview(item.lastMsg, me ? item.lastMsgUid === me.uid : false)}
                </Text>
              )}
              {unreadCount > 0 ? (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: isMuted ? 'rgba(148,163,184,0.35)' : appTheme.accent },
                  ]}
                >
                  <Text style={[styles.unreadBadgeText, isMuted && { color: '#fff' }]}>{unreadCount}</Text>
                </View>
              ) : isMarkedUnread ? (
                <View style={[styles.unreadBadge, { backgroundColor: appTheme.accent, minWidth: 12, height: 12, paddingHorizontal: 0 }]} />
              ) : null}
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
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.logoRow}
              onPress={() => {
                triggerHaptic(8);
                setStoriesVisible(!storiesExpanded);
              }}
            >
              <Image
                source={require('../../android/app/src/main/assets/public/logo.png')}
                style={styles.headerLogo}
              />
              <Text style={[styles.headerTitle, { color: appTheme.text }]} numberOfLines={1}>
                NonsenseChat
              </Text>
              <View style={styles.storiesMiniCluster}>
                {!storiesExpanded && storyMiniAvatars.length > 0 && (
                  <View style={styles.miniAvatarsStack}>
                    {storyMiniAvatars.map((st, idx) =>
                      st.avatar ? (
                        <Image
                          key={st.uid}
                          source={{ uri: st.avatar }}
                          style={[
                            styles.miniStoryAva,
                            { borderColor: appTheme.accent, marginLeft: idx === 0 ? 0 : -7 },
                          ]}
                        />
                      ) : (
                        <View
                          key={st.uid}
                          style={[
                            styles.miniStoryAva,
                            styles.miniStoryFallback,
                            { borderColor: appTheme.accent, marginLeft: idx === 0 ? 0 : -7 },
                          ]}
                        >
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>
                            {(st.nick || '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                )}
                <Ionicons
                  name={storiesExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={appTheme.textSub}
                />
              </View>
            </TouchableOpacity>

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

              {(chats.some((c) => (c.unread || 0) > 0) || markedUnreadIds.length > 0) && (
                <ScalePressable
                  haptic
                  style={styles.headerIconBtn}
                  onPress={() => {
                    markAllChatsRead();
                    showToast('Прочитано ✓✓', 'Все чаты помечены прочитанными', 'success');
                  }}
                >
                  <Text style={{ fontSize: 12, color: appTheme.accent, fontWeight: '900' }}>✓✓</Text>
                </ScalePressable>
              )}

              <ScalePressable
                haptic
                style={[styles.headerIconBtn, { backgroundColor: appTheme.accentSoft }]}
                onPress={() => navigation.navigate('SuperApp')}
              >
                <Text style={{ fontSize: 16 }}>🚀</Text>
              </ScalePressable>
            </View>
          </GlassCard>
        </View>

        {/* System Notifications Alert */}
        {!notificationsEnabled && (
          <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openNotificationSettings}
              style={styles.notifBanner}
            >
              <Ionicons name="notifications-off" size={20} color="#f87171" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                  Уведомления отключены в системе
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11.5 }}>
                  Нажмите, чтобы включить в настройках и не пропускать сообщения
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#f87171" />
            </TouchableOpacity>
          </View>
        )}

        {/* Pill Search */}
        <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
          <GlassCard radius={RADII.PILL} style={styles.searchPill}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: appTheme.text }]}
              placeholder="Поиск"
              placeholderTextColor={appTheme.textSub}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 6 }}>
                <Ionicons name="close-circle" size={18} color={appTheme.textSub} />
              </TouchableOpacity>
            )}
          </GlassCard>
          {search.trim().length > 0 && !isVaultQuery && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowGlobalSearch(true)}
              style={{
                marginTop: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: appTheme.accentSoft,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: appTheme.accent, fontSize: 12.5, fontWeight: '700' }} numberOfLines={1}>
                🔍 Искать «{search.trim()}» во всех сообщениях
              </Text>
              <Ionicons name="chevron-forward" size={16} color={appTheme.accent} />
            </TouchableOpacity>
          )}
          {isVaultQuery && (
            <View style={{ marginTop: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.22)', borderWidth: 1, borderColor: '#8b5cf6' }}>
              <Text style={{ color: '#e9d5ff', fontWeight: '800', fontSize: 12.5 }}>
                🕵️ Секретный сейф открыт · Скрытых чатов: {hiddenVaultChatIds.length}
              </Text>
            </View>
          )}
        </View>
        <View
          style={
            storiesExpanded
              ? styles.storiesOpenWrap
              : styles.storiesCollapsedWrap
          }
          pointerEvents={storiesExpanded ? 'auto' : 'none'}
        >
          <StoriesBar onReplyToStory={handleReplyToStory} />
        </View>

        {/* Pill Folder Tabs (with Custom Folders) */}
        <View style={{ flexShrink: 0, height: 42, marginBottom: 6, justifyContent: 'center' }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={[styles.foldersRow, { alignItems: 'center' }]}
          >
            {[
              { key: 'all', label: 'Все' },
              { key: 'dm', label: 'Личные' },
              { key: 'groups', label: 'Группы' },
              { key: 'channels', label: 'Каналы' },
              ...(incomingRequests.length > 0
                ? [{ key: 'reqs', label: `Заявки (${incomingRequests.length})` }]
                : []),
              ...customFolders.map((cf) => ({ key: cf.id, label: `${cf.icon} ${cf.name}` })),
            ].map((f) => {
              const act = activeFolder === f.key && !showArchived;
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
                  onPress={() => {
                    setShowArchived(false);
                    setActiveFolder(f.key);
                  }}
                  onLongPress={() => {
                    if (f.key.startsWith('fld_')) {
                      deleteCustomFolder(f.key);
                      setActiveFolder('all');
                      showToast('Папка удалена', f.label, 'info');
                    }
                  }}
                >
                  <Text
                    numberOfLines={1}
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
            <TouchableOpacity
              style={[
                styles.folderTab,
                {
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: appTheme.border,
                  paddingHorizontal: 10,
                  opacity: 0.75,
                },
              ]}
              onPress={() => {
                setNewFolderName('');
                setNewFolderIcon('📁');
                setNewFolderChatIds([]);
                setShowFolderModal(true);
              }}
            >
              <Ionicons name="add" size={16} color={appTheme.textSub} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Archive Toggle Pill */}
        {archivedChatIds.length > 0 && activeFolder !== 'reqs' && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={{ paddingHorizontal: 12, marginBottom: 6 }}
            onPress={() => setShowArchived((v) => !v)}
          >
            <GlassCard radius={18} style={styles.archiveBar}>
              <Text style={{ fontSize: 16 }}>📦</Text>
              <Text style={{ color: appTheme.text, fontWeight: '700', fontSize: 13.5, flex: 1 }}>
                {showArchived ? '← Назад ко всем чатам' : `Архив чатов (${archivedChatIds.length})`}
              </Text>
              <Ionicons name={showArchived ? 'arrow-back' : 'chevron-forward'} size={16} color={appTheme.textSub} />
            </GlassCard>
          </TouchableOpacity>
        )}

        {/* Chats List or Friend Requests */}
        {activeFolder === 'reqs' ? (
          <FlatList
            data={incomingRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🤝</Text>
                <Text style={[styles.emptyText, { color: appTheme.textSub }]}>
                  Входящих заявок в друзья пока нет
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const sender = usersMap[item.from];
              const nick = sender?.nick || item.fromNick || 'Пользователь';
              return (
                <View style={{ marginHorizontal: 12, marginVertical: 4 }}>
                  <GlassCard radius={RADII.ITEM} style={styles.chatCard}>
                    <FramedAvatar
                      uri={sender?.avatar}
                      name={nick}
                      frameId={sender?.steamFrame || 'none'}
                      size={48}
                      online={!!sender?.online}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: appTheme.text, fontWeight: '800', fontSize: 15 }}>{nick}</Text>
                      <Text style={{ color: appTheme.textSub, fontSize: 12.5 }}>Хочет добавить вас в друзья</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 14,
                          backgroundColor: appTheme.accent,
                        }}
                        onPress={async () => {
                          const chat = await acceptFriendRequest(item);
                          showToast('Принято ✓', `${nick} добавлен в друзья`, 'success');
                          if (chat) {
                            navigation.navigate('ChatRoom', { chatId: chat.id, name: nick });
                          }
                        }}
                      >
                        <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>Принять</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 14,
                          backgroundColor: 'rgba(239,68,68,0.16)',
                        }}
                        onPress={async () => {
                          await declineFriendRequest(item.id);
                          showToast('Отклонено', `Заявка от ${nick} отклонена`, 'info');
                        }}
                      >
                        <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                </View>
              );
            }}
          />
        ) : (
          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={styles.listContent}
            scrollEventThrottle={32}
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              scrollYRef.current = y;
              if (y > 28 && storiesExpanded) {
                setStoriesVisible(false);
              } else if (y < -28 && !storiesExpanded) {
                triggerHaptic(8);
                setStoriesVisible(true);
              }
            }}
            onTouchStart={(e) => {
              touchStartYRef.current = e.nativeEvent.pageY;
            }}
            onTouchEnd={(e) => {
              const dy = e.nativeEvent.pageY - touchStartYRef.current;
              if (scrollYRef.current <= 4 && dy > 44 && !storiesExpanded) {
                triggerHaptic(8);
                setStoriesVisible(true);
              }
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={[styles.emptyText, { color: appTheme.textSub }]}>
                  Чатов пока нет. Нажмите ✏️ внизу справа, чтобы начать диалог!
                </Text>
              </View>
            }
          />
        )}

        {/* Floating Action Button for new chat */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: appTheme.accent }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="create-outline" size={26} color="#000" />
        </TouchableOpacity>

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
                  { k: 'invite', l: '🔗 Инвайт' },
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
                    : createMode === 'channel'
                    ? 'Название канала'
                    : 'Код инвайта (напр. nc_ab12cd)'
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
                {me?.uid === CREATOR_UID && createMode === 'friend' && (
                  <TouchableOpacity
                    style={[styles.modalBtnPri, { backgroundColor: '#7c3aed' }]}
                    disabled={creating}
                    onPress={async () => {
                      if (!createInput.trim()) return;
                      setCreating(true);
                      try {
                        const c = await creatorAddFriendDirect(createInput);
                        setShowCreateModal(false);
                        setCreateInput('');
                        if (c) navigation.navigate('ChatRoom', { chatId: c.id, name: getChatDisplay(c).name });
                      } catch (e: any) {
                        showToast('Ошибка', e?.message, 'error');
                      } finally {
                        setCreating(false);
                      }
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900' }}>⚡ Без заявки</Text>
                  </TouchableOpacity>
                )}
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

        {/* Quick Peek Preview + Chat Context Menu Modal */}
        <Modal visible={!!peekChat} transparent animationType="fade" onRequestClose={() => setPeekChat(null)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPeekChat(null)}>
            {peekChat && (
              <GlassCard radius={RADII.CARD} strong style={styles.modalCard}>
                <Text style={[styles.modalTitle, { color: appTheme.text, marginBottom: 8 }]}>
                  👁️ {getChatDisplay(peekChat).name}
                </Text>
                <View style={styles.peekBox}>
                  {loadingPeek ? (
                    <ActivityIndicator color={appTheme.accent} />
                  ) : peekMessages.length === 0 ? (
                    <Text style={{ color: appTheme.textSub, fontSize: 12.5 }}>Сообщений пока нет</Text>
                  ) : (
                    peekMessages.map((pm) => (
                      <View key={pm.id} style={{ marginBottom: 6 }}>
                        <Text style={{ color: appTheme.accent, fontSize: 11.5, fontWeight: '700' }}>
                          {pm.author || 'Участник'}
                        </Text>
                        <Text style={{ color: appTheme.text, fontSize: 13 }} numberOfLines={2}>
                          {stripHtml(pm.text) || 'Медиа-сообщение'}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={{ marginTop: 10, gap: 4 }}>
                  <TouchableOpacity
                    style={styles.ctxRow}
                    onPress={() => {
                      const id = peekChat.id;
                      setPeekChat(null);
                      togglePinChat(id);
                    }}
                  >
                    <Text style={styles.ctxText}>
                      {pinnedChatIds.includes(peekChat.id) ? '📌 Открепить чат' : '📌 Закрепить сверху'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.ctxRow}
                    onPress={() => {
                      const id = peekChat.id;
                      setPeekChat(null);
                      toggleMuteChat(id);
                    }}
                  >
                    <Text style={styles.ctxText}>
                      {mutedChatIds.includes(peekChat.id) ? '🔔 Включить звук' : '🔇 Без звука'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.ctxRow}
                    onPress={() => {
                      const id = peekChat.id;
                      setPeekChat(null);
                      toggleArchiveChat(id);
                    }}
                  >
                    <Text style={styles.ctxText}>
                      {archivedChatIds.includes(peekChat.id) ? '📤 Убрать из архива' : '📦 В архив'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.ctxRow}
                    onPress={() => {
                      const id = peekChat.id;
                      setPeekChat(null);
                      toggleMarkUnread(id);
                    }}
                  >
                    <Text style={styles.ctxText}>
                      {markedUnreadIds.includes(peekChat.id) ? '✓ Снять непрочитанное' : '🔵 Пометить непрочитанным'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.ctxRow}
                    onPress={() => {
                      const id = peekChat.id;
                      setPeekChat(null);
                      toggleVaultChat(id);
                      showToast(
                        hiddenVaultChatIds.includes(id) ? 'Возвращён из сейфа' : 'Скрыт в Сейф 🕵️',
                        `Код сейфа: ${vaultPasscode}`,
                        'info'
                      );
                    }}
                  >
                    <Text style={styles.ctxText}>
                      {hiddenVaultChatIds.includes(peekChat.id)
                        ? '🔓 Вернуть чат из Сейфа'
                        : '🕵️ Скрыть чат в Секретный сейф'}
                    </Text>
                  </TouchableOpacity>
                  {customFolders.map((cf) => {
                    const inFld = cf.chatIds.includes(peekChat.id);
                    return (
                      <TouchableOpacity
                        key={cf.id}
                        style={styles.ctxRow}
                        onPress={() => {
                          toggleChatInFolder(cf.id, peekChat.id);
                          setPeekChat(null);
                        }}
                      >
                        <Text style={styles.ctxText}>
                          {cf.icon} {inFld ? `Убрать из «${cf.name}»` : `Добавить в «${cf.name}»`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </GlassCard>
            )}
          </TouchableOpacity>
        </Modal>

        {/* Create Custom Folder Modal */}
        <Modal visible={showFolderModal} transparent animationType="fade" onRequestClose={() => setShowFolderModal(false)}>
          <View style={styles.modalBackdrop}>
            <GlassCard radius={RADII.CARD} strong style={styles.modalCard}>
              <Text style={[styles.modalTitle, { color: appTheme.text }]}>Новая папка чатов</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {['📁', '🔥', '💼', '🎮', '❤️', '🎓'].map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    onPress={() => setNewFolderIcon(ic)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: newFolderIcon === ic ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: newFolderIcon === ic ? appTheme.accent : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.modalInput, { color: appTheme.text, backgroundColor: appTheme.glassInput, marginBottom: 10 }]}
                placeholder="Название папки (например: Работа)"
                placeholderTextColor={appTheme.textSub}
                value={newFolderName}
                onChangeText={setNewFolderName}
              />
              <Text style={{ color: appTheme.textSub, fontSize: 12, marginBottom: 6 }}>
                Выберите чаты ({newFolderChatIds.length}):
              </Text>
              <ScrollView style={{ maxHeight: 160 }}>
                {chats.map((c) => {
                  const sel = newFolderChatIds.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.ctxRow, { flexDirection: 'row', justifyContent: 'space-between' }]}
                      onPress={() =>
                        setNewFolderChatIds((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                        )
                      }
                    >
                      <Text style={{ color: '#fff', fontSize: 13.5 }}>{getChatDisplay(c).name}</Text>
                      <Text style={{ color: appTheme.accent, fontWeight: '900' }}>{sel ? '✓' : '○'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalBtnSec} onPress={() => setShowFolderModal(false)}>
                  <Text style={{ color: appTheme.textSub, fontWeight: '700' }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtnPri, { backgroundColor: appTheme.accent }]}
                  onPress={() => {
                    if (!newFolderName.trim()) {
                      showToast('Папка', 'Введите название папки', 'error');
                      return;
                    }
                    createCustomFolder(newFolderName, newFolderIcon, newFolderChatIds);
                    setShowFolderModal(false);
                    showToast('Папка создана ✓', `${newFolderIcon} ${newFolderName}`, 'success');
                  }}
                >
                  <Text style={{ color: '#000', fontWeight: '900' }}>Создать</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </Modal>

        <GlobalSearchModal
          visible={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
          onOpenChatMessage={(cid, cname, mid) =>
            navigation.navigate('ChatRoom', { chatId: cid, name: cname, jumpToMsgId: mid })
          }
          onOpenUser={(uid) => navigation.navigate('UserProfile', { uid })}
        />
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
  logoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 6 },
  headerLogo: { width: 30, height: 30, borderRadius: 15 },
  headerTitle: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  storiesMiniCluster: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniAvatarsStack: { flexDirection: 'row', alignItems: 'center' },
  miniStoryAva: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  miniStoryFallback: { backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  storiesOpenWrap: { overflow: 'hidden' },
  storiesCollapsedWrap: { height: 0, opacity: 0, overflow: 'hidden' },
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
    paddingVertical: 3,
    gap: 6,
  },
  folderTab: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderTabText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    includeFontPadding: false,
  },
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
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: 'rgba(239, 68, 68, 0.38)',
  },
  fab: {
    position: 'absolute',
    bottom: 92,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  archiveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  peekBox: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ctxRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  ctxText: { color: '#f8fafc', fontSize: 14.5, fontWeight: '600' },
});
