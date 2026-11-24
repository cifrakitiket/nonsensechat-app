import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, UserProfile } from '../context/AppContext';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

export default function ContactsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, usersMap, appTheme, openOrCreateDm } = useApp();
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
    <LiquidBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
            <Text style={[styles.headerTitle, { color: appTheme.text }]}>
              Контакты ({contacts.length})
            </Text>
          </GlassCard>
        </View>

        <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
          <GlassCard radius={RADII.PILL} style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: appTheme.text }]}
              placeholder="Поиск по контактам..."
              placeholderTextColor={appTheme.textSub}
              value={search}
              onChangeText={setSearch}
            />
          </GlassCard>
        </View>

        <FlatList
          data={contacts}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ paddingBottom: 108 }}
          renderItem={({ item }) => (
            <ScalePressable
              haptic
              style={{ marginHorizontal: 12, marginVertical: 4 }}
              onPress={() => navigation.navigate('UserProfile', { uid: item.uid })}
            >
              <GlassCard radius={RADII.ITEM} style={styles.contactCard}>
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
                    <Text style={[styles.contactName, { color: appTheme.text }]}>{item.nick}</Text>
                    {item.prefix ? (
                      <PrefixBadge
                        prefix={item.prefix}
                        prefixStyle={item.prefixStyle}
                        prefixSound={item.prefixSound}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.contactSub,
                      { color: item.online ? '#4ade80' : appTheme.textSub },
                    ]}
                  >
                    {item.online ? 'в сети' : 'не в сети'} · @{item.nickLower || item.nick}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <ScalePressable
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
                  </ScalePressable>
                  <ScalePressable
                    style={[styles.actBtn, { backgroundColor: appTheme.accentSoft }]}
                    onPress={() => handleChat(item)}
                  >
                    <Text style={{ fontSize: 16 }}>💬</Text>
                  </ScalePressable>
                </View>
              </GlassCard>
            </ScalePressable>
          )}
        />
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: { paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 40 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  contactCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  contactInfo: { flex: 1, marginRight: 8 },
  contactName: { fontSize: 15, fontWeight: '800' },
  contactSub: { fontSize: 12, marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 6 },
  actBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
