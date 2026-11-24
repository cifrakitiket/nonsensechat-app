import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  APP_VERSION,
  APP_VERSION_CODE,
  CREATOR_UID,
  PROFILE_THEMES_CATALOG,
} from '../constants/catalogs';
import { TelegramAttachSheet } from '../components/TelegramAttachSheet';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { AppThemeKey, LIQUID_THEMES, RADII } from '../theme/liquidGlass';

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, logout, grantSelfPirozhki, updateMyProfile, appTheme, appThemeKey, setAppTheme, showToast, showDialog, checkingUpdate, checkForUpdates } = useApp();
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);

  if (!me) return null;

  const isCreator = me.uid === CREATOR_UID;
  const bal = me.pirozhki || 0;
  const profileTheme =
    PROFILE_THEMES_CATALOG.find((t) => t.id === (me.steamTheme || 'classic')) ||
    PROFILE_THEMES_CATALOG[0];

  const handleChangeAvatar = () => {
    setShowAvatarSheet(true);
  };

  const handleLogout = () => {
    showDialog({
      title: 'Выход',
      message: 'Вы уверены, что хотите выйти из аккаунта?',
      buttons: [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => logout() },
      ],
    });
  };

  return (
    <LiquidBackground>
      <ScrollView
        style={{ flex: 1, paddingTop: insets.top }}
        contentContainerStyle={{ paddingBottom: 112 }}
      >
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
            <Text style={[styles.headerTitle, { color: appTheme.text }]}>Профиль</Text>
            <ScalePressable onPress={() => navigation.navigate('EditProfile')}>
              <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 13.5 }}>Изм.</Text>
            </ScalePressable>
          </GlassCard>
        </View>

        {/* Liquid Glass Themed Hero Card */}
        <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
          <GlassCard
            radius={RADII.CARD}
            style={[
              styles.heroCard,
              {
                backgroundColor:
                  me.steamTheme && me.steamTheme !== 'classic' ? profileTheme.card : appTheme.glass,
                borderColor: profileTheme.border,
              },
            ]}
          >
            <TouchableOpacity activeOpacity={0.85} onPress={handleChangeAvatar} style={{ position: 'relative' }}>
              <FramedAvatar
                uri={me.avatar}
                name={me.nick}
                frameId={me.steamFrame || 'none'}
                size={94}
                online
              />
              <View style={[styles.camBadge, { backgroundColor: appTheme.accent }]}>
                <Text style={{ fontSize: 13 }}>📷</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: appTheme.text }]}>{me.nick}</Text>
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

            <Text style={[styles.userUsername, { color: appTheme.textSub }]}>
              @{me.nickLower || me.nick} · {isCreator ? 'СЕО БЧ' : 'в сети'}
            </Text>
            {!!me.bio && <Text style={styles.userBio}>{me.bio}</Text>}

            <View style={styles.heroBtns}>
              <ScalePressable
                haptic
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('UserProfile', { uid: me.uid })}
              >
                <View style={[styles.heroBtn, { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent }]}>
                  <Text style={styles.heroBtnTxt}>🪪 Мой профиль</Text>
                </View>
              </ScalePressable>
              <ScalePressable
                haptic
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('ProfileCustomizer')}
              >
                <View style={[styles.heroBtn, { backgroundColor: 'rgba(245,158,11,0.22)', borderColor: 'rgba(245,158,11,0.5)' }]}>
                  <Text style={styles.heroBtnTxt}>🎨 Темы и рамки</Text>
                </View>
              </ScalePressable>
            </View>
          </GlassCard>
        </View>

        {/* Pirozhki Glass Wallet */}
        <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
          <GlassCard
            radius={RADII.CARD}
            style={[styles.pirozhkiCard, { backgroundColor: 'rgba(245, 158, 11, 0.14)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}
          >
            <View style={styles.pirozhkiTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Image
                  source={require('../../android/app/src/main/assets/public/pirozhok.png')}
                  style={{ width: 36, height: 36 }}
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
                <ScalePressable
                  haptic
                  style={styles.creatorBtn}
                  onPress={() =>
                    grantSelfPirozhki(500).then(() => showToast('Готово 🥟', '+500 пирожков начислено!', 'success'))
                  }
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>⚡ +500 себе</Text>
                </ScalePressable>
              )}
            </View>

            <View style={styles.pirozhkiActions}>
              <ScalePressable
                haptic
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'buy' })}
              >
                <View style={[styles.pActBtn, { backgroundColor: '#f59e0b', borderColor: '#fbbf24' }]}>
                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 12.5 }}>+ Пополнить</Text>
                </View>
              </ScalePressable>
              <ScalePressable
                haptic
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'prefixes' })}
              >
                <View style={styles.pActBtn}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>🏷️ Префиксы</Text>
                </View>
              </ScalePressable>
              <ScalePressable
                haptic
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'gift' })}
              >
                <View style={styles.pActBtn}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>🎁 Угостить</Text>
                </View>
              </ScalePressable>
            </View>
          </GlassCard>
        </View>

        {/* Liquid Glass App Theme Switcher */}
        <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
          <GlassCard radius={RADII.CARD} style={{ padding: 14 }}>
            <Text style={[styles.themeTitle, { color: appTheme.textSub }]}>ТЕМА ИНТЕРФЕЙСА (LIQUID GLASS)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(Object.keys(LIQUID_THEMES) as AppThemeKey[]).map((k) => {
                const t = LIQUID_THEMES[k];
                const act = appThemeKey === k;
                return (
                  <TouchableOpacity
                    key={k}
                    style={[
                      styles.themeChip,
                      {
                        backgroundColor: t.glass,
                        borderColor: act ? t.accent : 'rgba(255,255,255,0.14)',
                      },
                    ]}
                    onPress={() => setAppTheme(k)}
                  >
                    <View style={[styles.themeDot, { backgroundColor: t.accent }]} />
                    <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: act ? '800' : '600' }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </GlassCard>
        </View>

        {/* Settings List */}
        <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
          <GlassCard radius={RADII.CARD}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('ProfileCustomizer')}
            >
              <Text style={styles.settingIcon}>🎨</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Темы профиля и рамки</Text>
              <Text style={styles.settingVal}>{profileTheme.name}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'prefixes' })}
            >
              <Text style={styles.settingIcon}>🏷️</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Кастомный префикс</Text>
              <Text style={styles.settingVal}>{me.prefix || 'Выбрать'}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('PrefixSound')}
            >
              <Text style={styles.settingIcon}>🔊</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Звук префикса (до 2с)</Text>
              <Text style={styles.settingVal}>{me.prefixSoundName || 'Настроить'}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={styles.settingIcon}>✏️</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Редактировать данные и фото</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() =>
                Share.share({
                  title: 'Беспонтовый Чат (NonsenseChat)',
                  message: 'Присоединяйся к NonsenseChat: https://nonsensechat.ru',
                })
              }
            >
              <Text style={styles.settingIcon}>📤</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Поделиться приложением</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={{ paddingHorizontal: 12 }}>
          <GlassCard radius={RADII.CARD}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => checkForUpdates(false)}
              disabled={checkingUpdate}
            >
              <Text style={styles.settingIcon}>🔄</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>
                {checkingUpdate ? 'Проверка обновлений...' : 'Проверить обновления (VK Cloud)'}
              </Text>
              <Text style={styles.settingVal}>
                v{APP_VERSION} ({APP_VERSION_CODE})
              </Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={handleLogout}
            >
              <Text style={styles.settingIcon}>🚪</Text>
              <Text style={[styles.settingText, { color: '#ef4444' }]}>Выйти из аккаунта</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </ScrollView>

      <TelegramAttachSheet
        visible={showAvatarSheet}
        mode="avatar"
        onClose={() => setShowAvatarSheet(false)}
        onPickAvatar={async (dataUrl) => {
          await updateMyProfile({ avatar: dataUrl });
          showToast('Аватар обновлён ✓', undefined, 'success');
        }}
      />
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  heroCard: { padding: 20, alignItems: 'center' },
  camBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#050914',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  userName: { fontSize: 21, fontWeight: '800' },
  devBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  devBadgeTxt: { color: '#c4b5fd', fontSize: 10.5, fontWeight: '800' },
  userUsername: { fontSize: 13.5, marginTop: 4 },
  userBio: { fontSize: 13.5, color: '#cbd5e1', marginTop: 8, textAlign: 'center' },
  heroBtns: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  heroBtn: { borderWidth: 1, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  heroBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  pirozhkiCard: { padding: 16 },
  pirozhkiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pirozhkiLbl: { fontSize: 10.5, fontWeight: '800', color: '#cbd5e1', letterSpacing: 0.5 },
  pirozhkiVal: { fontSize: 19, fontWeight: '900', color: '#fbbf24' },
  creatorBtn: { backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  pirozhkiActions: { flexDirection: 'row', gap: 8 },
  pActBtn: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  themeTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, marginBottom: 10 },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    marginRight: 8,
  },
  themeDot: { width: 10, height: 10, borderRadius: 5 },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingIcon: { fontSize: 17, marginRight: 12 },
  settingText: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  settingVal: { fontSize: 12, color: '#fbbf24', marginRight: 6, maxWidth: 110 },
  settingArrow: { fontSize: 18, color: '#6c7a89' },
});
