import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ContactsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const [contacts, setContacts] = useState([
    { uid: 'u1', name: 'Александр', username: 'alex', online: true, ava: '' },
    { uid: 'u2', name: 'Дмитрий', username: 'dima', online: false, ava: '' },
    { uid: 'u3', name: 'Мария', username: 'maria_design', online: true, ava: '' },
  ]);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Контакты</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Друга</Text>
        </TouchableOpacity>
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
        data={filtered}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ChatRoom', { chatId: 'dm_' + item.uid, name: item.name })}
          >
            <View style={styles.avatarWrap}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{item.name[0]}</Text>
              </View>
              {item.online && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={[styles.contactSub, item.online && styles.contactOnline]}>
                {item.online ? 'в сети' : 'был(а) недавно'}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actBtn}
                onPress={() => navigation.navigate('ChatRoom', { chatId: 'dm_' + item.uid, name: item.name })}
              >
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
  container: {
    flex: 1,
    backgroundColor: '#080C14',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  addBtn: {
    backgroundColor: 'rgba(91, 143, 185, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  addBtnText: {
    color: '#5b8fb9',
    fontSize: 13,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131c2a',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#fff',
    fontSize: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1b2838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#080C14',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  contactSub: {
    fontSize: 12,
    color: '#6c7a89',
    marginTop: 2,
  },
  contactOnline: {
    color: '#22c55e',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actBtnIcon: {
    fontSize: 16,
  },
});
