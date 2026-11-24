import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, UserProfile } from '../context/AppContext';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';

export default function ContactsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, usersMap, openOrCreateDm } = useApp();
  const [search, setSearch] = useState('');

  const contacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.values(usersMap)
      .filter((u) => u.uid !== me?.uid)
      .filter((u) => {
        if (!q) return true;
        return (
          u.nick.toLowerCase().includes(q) ||
          (u.nickLower || '').includes(q) ||
          (u.prefix || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(!!b.online) - Number(!!a.online));
  }, [usersMap, me, search]);

  const handleChat = async (user: UserProfile) => {
    try {
      const chat = await openOrCreateDm(user.uid);
      if (chat) {
        navigation.navigate('ChatRoom', { chatId: chat.id, name: user.nick });
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось открыть чат');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Контакты ({contacts.length})</Text>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по контактам..."
          placeholderTextColor="#6c7a89"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactItem}
            activeOpacity={0.72}
            onPress={() => navigation.navigate('UserProfile', { uid: item.uid })}
          >
            <View style={{ marginRight: 12 }}>
              <FramedAvatar
                uri={item.avatar}
                name={item.nick}
                frameId={item.steamFrame || 'none'}
                size={46}
                online={!!item.online}
              />
            </View>

            <View style={styles.contactInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.contactName}>{item.nick}</Text>
                {item.prefix ? (
                  <PrefixBadge
                    prefix={item.prefix}
                    prefixStyle={item.prefixStyle}
                    prefixSound={item.prefixSound}
                  />
                ) : null}
              </View>
              <Text style={[styles.contactSub, item.online && styles.contactOnline]}>
                {item.online ? 'в сети' : 'не в сети'} · @{item.nickLower || item.nick}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actBtn}
                onPress={() =>
                  navigation.navigate('PirozhkiStore', {
                    initialTab: 'gift',
                    targetUid: item.uid,
                  })
                }
              >
                <Image
                  source={require('../../android/app/src/main/assets/public/pirozhok.png')}
                  style={{ width: 17, height: 17 }}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actBtn} onPress={() => handleChat(item)}>
                <Text style={styles.actBtnIcon}>💬</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C14' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131c2a',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, height: 40, color: '#fff', fontSize: 14 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  contactInfo: { flex: 1, marginRight: 8 },
  contactName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  contactSub: { fontSize: 12, color: '#6c7a89', marginTop: 2 },
  contactOnline: { color: '#22c55e' },
  actionButtons: { flexDirection: 'row', gap: 6 },
  actBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actBtnIcon: { fontSize: 16 },
});
