import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { FramedAvatar } from '../components/FramedAvatar';

export default function CallsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, usersMap, openOrCreateDm } = useApp();
  const [calls, setCalls] = useState<any[]>([]);

  useEffect(() => {
    if (!me) return;
    const cRef = ref(rtdb, `users/${me.uid}/call_history`);
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.keys(val)
        .map((k) => ({ id: k, ...val[k] }))
        .sort((a, b) => (b.timestamp || b.at || 0) - (a.timestamp || a.at || 0));
      setCalls(list);
    });
    return () => unsub();
  }, [me]);

  const handleCallContact = async (targetUid: string, nick: string) => {
    const chat = await openOrCreateDm(targetUid);
    if (chat) {
      navigation.navigate('ChatRoom', { chatId: chat.id, name: nick });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Звонки</Text>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => navigation.navigate('Contacts')}
        >
          <Text style={styles.callBtnText}>📞 Контакты</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 38, marginBottom: 10 }}>📞</Text>
            <Text style={styles.emptyTitle}>История звонков пуста</Text>
            <Text style={styles.emptySub}>
              Откройте чат или выберите собеседника во вкладке «Контакты»
            </Text>
            <TouchableOpacity
              style={styles.goContactsBtn}
              onPress={() => navigation.navigate('Contacts')}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Перейти к контактам</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const peer = item.peerUid ? usersMap[item.peerUid] : undefined;
          const peerName = peer?.nick || item.peerName || item.name || 'Собеседник';
          const ts = item.timestamp || item.at;
          const timeStr = ts ? new Date(ts).toLocaleString('ru-RU') : '';
          return (
            <View style={styles.callItem}>
              <FramedAvatar
                uri={peer?.avatar || item.peerAva}
                name={peerName}
                frameId={peer?.steamFrame || 'none'}
                size={44}
              />

              <View style={styles.callInfo}>
                <Text style={styles.callName}>{peerName}</Text>
                <Text style={[styles.callSub, item.missed && styles.callMissed]}>
                  {item.missed ? '↙ Пропущенный' : item.outgoing ? '↗ Исходящий' : '↙ Входящий'}
                  {timeStr ? ` · ${timeStr}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.callbackBtn}
                onPress={() => {
                  if (item.peerUid) handleCallContact(item.peerUid, peerName);
                  else Alert.alert('Звонок', `Контакт: ${peerName}`);
                }}
              >
                <Text style={styles.callbackIcon}>💬</Text>
              </TouchableOpacity>
            </View>
          );
        }}
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
  callBtn: {
    backgroundColor: 'rgba(91,143,185,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  callBtnText: { color: '#5b8fb9', fontSize: 13, fontWeight: '600' },
  emptyBox: { padding: 44, alignItems: 'center' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: '#8e9aa8', fontSize: 13, textAlign: 'center', marginBottom: 18 },
  goContactsBtn: {
    backgroundColor: '#5b8fb9',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  callInfo: { flex: 1 },
  callName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  callSub: { fontSize: 12, color: '#6c7a89', marginTop: 2 },
  callMissed: { color: '#ef4444' },
  callbackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(91,143,185,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callbackIcon: { fontSize: 15 },
});
