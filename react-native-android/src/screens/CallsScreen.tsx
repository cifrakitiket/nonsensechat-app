import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CallsScreen() {
  const insets = useSafeAreaInsets();

  const calls = [
    { id: 'c1', name: 'Мария', time: 'Сегодня, 14:20', missed: false, type: 'incoming' },
    { id: 'c2', name: 'Дмитрий', time: 'Вчера, 19:45', missed: true, type: 'incoming' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Звонки</Text>
        <TouchableOpacity style={styles.callBtn}>
          <Text style={styles.callBtnText}>📞 Новый</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.callItem}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{item.name[0]}</Text>
            </View>

            <View style={styles.callInfo}>
              <Text style={styles.callName}>{item.name}</Text>
              <Text style={[styles.callSub, item.missed && styles.callMissed]}>
                {item.missed ? '↙ Пропущенный' : '↙ Входящий'} · {item.time}
              </Text>
            </View>

            <TouchableOpacity style={styles.callbackBtn}>
              <Text style={styles.callbackIcon}>📞</Text>
            </TouchableOpacity>
          </View>
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
  callBtn: {
    backgroundColor: 'rgba(91, 143, 185, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  callBtnText: {
    color: '#5b8fb9',
    fontSize: 13,
    fontWeight: '600',
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1b2838',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  callSub: {
    fontSize: 12,
    color: '#6c7a89',
    marginTop: 2,
  },
  callMissed: {
    color: '#ef4444',
  },
  callbackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(91, 143, 185, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callbackIcon: {
    fontSize: 15,
  },
});
