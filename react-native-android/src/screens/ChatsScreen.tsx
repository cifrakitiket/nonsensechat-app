import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeFolder, setActiveFolder] = useState<'all' | 'dm' | 'groups'>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Mock initial chats data (populated in realtime from Firestore)
  const [chats, setChats] = useState([
    {
      id: 'chat_saved',
      name: 'Избранное',
      avatar: '',
      lastMsg: 'Заметки и важные сообщения',
      time: '18:40',
      unread: 0,
      isSaved: true,
      type: 'saved',
    },
    {
      id: 'chat_general',
      name: 'Беспонтовый Чат — Главный',
      avatar: 'https://nonsensechat.ru/logo.png',
      lastMsg: 'Добро пожаловать в обновленный Android-клиент!',
      time: '19:22',
      unread: 2,
      type: 'group',
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const renderChatItem = ({ item }: any) => {
    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, name: item.name })}
      >
        <View style={styles.avatarWrap}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>
                {item.isSaved ? '⭐️' : (item.name?.[0] || '?')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.chatTime}>{item.time}</Text>
          </View>

          <View style={styles.chatMsgRow}>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {item.lastMsg}
            </Text>
            {item.unread > 0 && (
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
          <Image source={{ uri: 'https://nonsensechat.ru/logo.png' }} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Беспонтовый Чат</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => {}}>
          <Text style={styles.headerIconText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Folders Tabs */}
      <View style={styles.foldersRow}>
        <TouchableOpacity
          style={[styles.folderTab, activeFolder === 'all' && styles.folderTabActive]}
          onPress={() => setActiveFolder('all')}
        >
          <Text style={[styles.folderTabText, activeFolder === 'all' && styles.folderTabTextActive]}>
            ВСЕ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.folderTab, activeFolder === 'dm' && styles.folderTabActive]}
          onPress={() => setActiveFolder('dm')}
        >
          <Text style={[styles.folderTabText, activeFolder === 'dm' && styles.folderTabTextActive]}>
            ЛИЧНЫЕ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.folderTab, activeFolder === 'groups' && styles.folderTabActive]}
          onPress={() => setActiveFolder('groups')}
        >
          <Text style={[styles.folderTabText, activeFolder === 'groups' && styles.folderTabTextActive]}>
            ГРУППЫ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chats List */}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5b8fb9" />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  headerIconBtn: {
    padding: 6,
  },
  headerIconText: {
    fontSize: 18,
    color: '#8e9aa8',
  },
  foldersRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    gap: 8,
  },
  folderTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  folderTabActive: {
    backgroundColor: 'rgba(91, 143, 185, 0.2)',
  },
  folderTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e9aa8',
  },
  folderTabTextActive: {
    color: '#5b8fb9',
  },
  listContent: {
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  avatarWrap: {
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: '#1b2838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#6c7a89',
  },
  chatMsgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsg: {
    fontSize: 13.5,
    color: '#8e9aa8',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#5b8fb9',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
