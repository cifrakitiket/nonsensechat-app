import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  APP_VERSION,
  APP_VERSION_CODE,
  CREATOR_UID,
  PROFILE_THEMES_CATALOG,
} from '../constants/catalogs';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, logout, grantSelfPirozhki } = useApp();

  if (!me) return null;

  const isCreator = me.uid === CREATOR_UID;
  const bal = me.pirozhki || 0;
  const theme =
    PROFILE_THEMES_CATALOG.find((t) => t.id === (me.steamTheme || 'classic')) ||
    PROFILE_THEMES_CATALOG[0];

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Профиль</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <Text style={{ color: '#60a5fa', fontWeight: '700', fontSize: 14 }}>Изм.</Text>
        </TouchableOpacity>
      </View>

      {/* Themed Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <FramedAvatar
          uri={me.avatar}
          name={me.nick}
          frameId={me.steamFrame || 'none'}
          size={92}
          online
          square
        />

        <View style={styles.nameRow}>
          <Text style={styles.userName}>{me.nick}</Text>
          {me.prefix ? (
            <PrefixBadge
              prefix={me.prefix}
              prefixStyle={me.prefixStyle}
              prefixSound={me.prefixSound}
              large
            />
          ) : null}
          {isCreator && (
            <View style={styles.devBadge}>
              <Text style={styles.devBadgeTxt}>&lt;/&gt;</Text>
            </View>
          )}
        </View>

        <Text style={styles.userUsername}>
          @{me.nickLower || me.nick} · {isCreator ? 'СЕО БЧ' : 'в сети'}
        </Text>
        {!!me.bio && <Text style={styles.userBio}>{me.bio}</Text>}

        <View style={styles.heroBtns}>
          <TouchableOpacity
            style={styles.heroBtnPri}
            onPress={() => navigation.navigate('UserProfile', { uid: me.uid })}
          >
            <Text style={styles.heroBtnTxt}>🪪 Мой профиль</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroBtnGold}
            onPress={() => navigation.navigate('ProfileCustomizer')}
          >
            <Text style={styles.heroBtnTxt}>🎨 Темы и рамки</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pirozhki Store Card */}
      <View style={styles.pirozhkiCard}>
        <View style={styles.pirozhkiTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image
              source={require('../../android/app/src/main/assets/public/pirozhok.png')}
              style={{ width: 34, height: 34 }}
            />
            <View>
              <Text style={styles.pirozhkiLbl}>БАЛАНС ПИРОЖКОВ</Text>
              <Text style={styles.pirozhkiVal}>
                {bal.toLocaleString('ru-RU')} 🥟{' '}
                <Text style={{ fontSize: 12, color: '#cbd5e1', fontWeight: '600' }}>
                  (~{(bal * 0.42).toFixed(2)} ₽)
                </Text>
              </Text>
            </View>
          </View>
          {isCreator && (
            <TouchableOpacity
              style={styles.creatorBtn}
              onPress={() =>
                grantSelfPirozhki(500).then(() => Alert.alert('Готово 🥟', '+500 пирожков начислено!'))
              }
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>⚡ +500 себе</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.pirozhkiActions}>
          <TouchableOpacity
            style={[styles.pActBtn, { backgroundColor: '#f59e0b' }]}
            onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'buy' })}
          >
            <Text style={{ color: '#000', fontWeight: '800', fontSize: 12.5 }}>+ Пополнить</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pActBtn}
            onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'prefixes' })}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>🏷️ Префиксы</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pActBtn}
            onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'gift' })}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>🎁 Угостить</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings List */}
      <View style={styles.settingsGroup}>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('ProfileCustomizer')}
        >
          <Text style={styles.settingIcon}>🎨</Text>
          <Text style={styles.settingText}>Темы профиля и рамки аватара</Text>
          <Text style={styles.settingVal}>{theme.name}</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'prefixes' })}
        >
          <Text style={styles.settingIcon}>🏷️</Text>
          <Text style={styles.settingText}>Кастомный префикс</Text>
          <Text style={styles.settingVal}>{me.prefix || 'Выбрать'}</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('PrefixSound')}
        >
          <Text style={styles.settingIcon}>🔊</Text>
          <Text style={styles.settingText}>Звук префикса (до 2с)</Text>
          <Text style={styles.settingVal}>{me.prefixSoundName || 'Настроить'}</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.settingIcon}>✏️</Text>
          <Text style={styles.settingText}>Редактировать личные данные</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() =>
            Share.share({
              title: 'Беспонтовый Чат (NonsenseChat)',
              message: 'Присоединяйся к NonsenseChat: https://nonsensechat.ru',
            })
          }
        >
          <Text style={styles.settingIcon}>📤</Text>
          <Text style={styles.settingText}>Поделиться приложением</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsGroup}>
        <View style={styles.settingItem}>
          <Text style={styles.settingIcon}>📱</Text>
          <Text style={styles.settingText}>Нативная сборка Android</Text>
          <Text style={styles.settingVal}>
            v{APP_VERSION} ({APP_VERSION_CODE})
          </Text>
        </View>
        <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
          <Text style={styles.settingIcon}>🚪</Text>
          <Text style={[styles.settingText, { color: '#ef4444' }]}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
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
  heroCard: {
    margin: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  userName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  devBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  devBadgeTxt: { color: '#c4b5fd', fontSize: 10.5, fontWeight: '800' },
  userUsername: { fontSize: 13.5, color: '#94a3b8', marginTop: 4 },
  userBio: { fontSize: 13, color: '#cbd5e1', marginTop: 8, textAlign: 'center' },
  heroBtns: { flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' },
  heroBtnPri: {
    flex: 1,
    backgroundColor: 'rgba(91,143,185,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(91,143,185,0.5)',
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
  },
  heroBtnGold: {
    flex: 1,
    backgroundColor: 'rgba(245,158,11,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.5)',
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
  },
  heroBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  pirozhkiCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.38)',
  },
  pirozhkiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pirozhkiLbl: { fontSize: 10.5, fontWeight: '800', color: '#cbd5e1', letterSpacing: 0.5 },
  pirozhkiVal: { fontSize: 19, fontWeight: '900', color: '#fbbf24' },
  creatorBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  pirozhkiActions: { flexDirection: 'row', gap: 8 },
  pActBtn: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  settingsGroup: {
    backgroundColor: '#101724',
    marginHorizontal: 14,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  settingIcon: { fontSize: 17, marginRight: 12 },
  settingText: { flex: 1, fontSize: 14.5, color: '#fff', fontWeight: '600' },
  settingVal: { fontSize: 12, color: '#fbbf24', marginRight: 6, maxWidth: 110 },
  settingArrow: { fontSize: 18, color: '#6c7a89' },
});
