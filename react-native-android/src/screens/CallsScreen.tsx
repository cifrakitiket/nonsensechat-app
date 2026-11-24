import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { FramedAvatar } from '../components/FramedAvatar';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

export default function CallsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, usersMap, appTheme, openOrCreateDm, showToast } = useApp();
  const [calls, setCalls] = useState<any[]>([]);

  useEffect(() => {
    if (!me) return;
    const cRef = ref(rtdb, `call_history/${me.uid}`);
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
    <LiquidBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
            <Text style={[styles.headerTitle, { color: appTheme.text }]}>Звонки</Text>
            <ScalePressable
              style={[styles.callBtn, { backgroundColor: appTheme.accentSoft }]}
              onPress={() => navigation.navigate('Contacts')}
            >
              <Text style={[styles.callBtnText, { color: appTheme.accent }]}>📞 Контакты</Text>
            </ScalePressable>
          </GlassCard>
        </View>

        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 108 }}
          ListEmptyComponent={
            <View style={{ padding: 20 }}>
              <GlassCard radius={RADII.CARD} style={styles.emptyBox}>
                <Text style={{ fontSize: 38, marginBottom: 10 }}>📞</Text>
                <Text style={[styles.emptyTitle, { color: appTheme.text }]}>История звонков пуста</Text>
                <Text style={[styles.emptySub, { color: appTheme.textSub }]}>
                  Откройте чат или выберите собеседника во вкладке «Контакты»
                </Text>
                <ScalePressable
                  style={[styles.goContactsBtn, { backgroundColor: appTheme.accent }]}
                  onPress={() => navigation.navigate('Contacts')}
                >
                  <Text style={{ color: '#000', fontWeight: '800' }}>Перейти к контактам</Text>
                </ScalePressable>
              </GlassCard>
            </View>
          }
          renderItem={({ item }) => {
            const peer = item.peerUid ? usersMap[item.peerUid] : undefined;
            const peerName = peer?.nick || item.peerName || item.name || 'Собеседник';
            const ts = item.timestamp || item.at;
            const timeStr = ts ? new Date(ts).toLocaleString('ru-RU') : '';
            return (
              <View style={{ marginHorizontal: 12, marginVertical: 4 }}>
                <GlassCard radius={RADII.ITEM} style={styles.callCard}>
                  <FramedAvatar
                    uri={peer?.avatar || item.peerAva}
                    name={peerName}
                    frameId={peer?.steamFrame || 'none'}
                    size={46}
                  />

                  <View style={styles.callInfo}>
                    <Text style={[styles.callName, { color: appTheme.text }]}>{peerName}</Text>
                    <Text
                      style={[
                        styles.callSub,
                        { color: item.missed ? '#ef4444' : appTheme.textSub },
                      ]}
                    >
                      {item.missed ? '↙ Пропущенный' : item.outgoing ? '↗ Исходящий' : '↙ Входящий'}
                      {timeStr ? ` · ${timeStr}` : ''}
                    </Text>
                  </View>

                  <ScalePressable
                    style={[styles.callbackBtn, { backgroundColor: appTheme.accentSoft }]}
                    onPress={() => {
                      if (item.peerUid) handleCallContact(item.peerUid, peerName);
                      else showToast('Звонок', `Контакт: ${peerName}`, 'info');
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>💬</Text>
                  </ScalePressable>
                </GlassCard>
              </View>
            );
          }}
        />
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  callBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  callBtnText: { fontSize: 12.5, fontWeight: '800' },
  emptyBox: { padding: 28, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', marginBottom: 18 },
  goContactsBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999 },
  callCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  callInfo: { flex: 1 },
  callName: { fontSize: 15, fontWeight: '700' },
  callSub: { fontSize: 12, marginTop: 2 },
  callbackBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
