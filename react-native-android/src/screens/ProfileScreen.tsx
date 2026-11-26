import React, { useState } from 'react';
import {
  Image,
  NativeModules,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
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
  const {
    me,
    logout,
    grantSelfPirozhki,
    updateMyProfile,
    appTheme,
    appThemeKey,
    setAppTheme,
    showToast,
    showDialog,
    checkingUpdate,
    checkForUpdates,
    notificationsEnabled,
    openNotificationSettings,
    testNotification,
    bgSyncEnabled,
    setBgSyncEnabled,
    chatWallpaper,
    setChatWallpaper,
    chatFontSize,
    setChatFontSize,
    pinCode,
    setPinCode,
  } = useApp();
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

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

        {/* Уведомления и фоновая служба */}
        <View style={{ paddingHorizontal: 12, marginBottom: 14 }}>
          <GlassCard radius={RADII.CARD}>
            <View style={[styles.settingItem, { borderBottomColor: appTheme.border }]}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingText, { color: appTheme.text }]}>Уведомления в системе</Text>
                <Text style={{ fontSize: 11.5, color: notificationsEnabled ? '#22c55e' : '#ef4444' }}>
                  {notificationsEnabled ? 'Разрешены в Android ✓' : 'Отключены в настройках Android ⚠️'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={openNotificationSettings}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '700' }}>Настройки</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.settingItem, { borderBottomColor: appTheme.border }]}>
              <Text style={styles.settingIcon}>⚡</Text>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.settingText, { color: appTheme.text }]}>Фоновый приём сообщений</Text>
                <Text style={{ fontSize: 11.5, color: appTheme.textSub }}>
                  Приём сообщений в спящем режиме без постоянного значка
                </Text>
              </View>
              <Switch
                value={bgSyncEnabled}
                onValueChange={(val) => setBgSyncEnabled(val)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: appTheme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={testNotification}
            >
              <Text style={styles.settingIcon}>🔊</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Проверить звук и вибрацию</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Оформление чатов и Приватность (Обои, Шрифт, PIN) */}
        <View style={{ paddingHorizontal: 12, marginBottom: 14 }}>
          <GlassCard radius={RADII.CARD}>
            <View style={[styles.settingItem, { borderBottomColor: appTheme.border, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
              <Text style={[styles.settingText, { color: appTheme.text, fontWeight: '700' }]}>🖼️ Обои в чатах</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { key: 'stars', label: '✨ Звёзды' },
                  { key: 'bubbles', label: '🫧 Пузыри' },
                  { key: 'aurora', label: '🌌 Аврора' },
                  { key: 'mesh', label: '🔮 Стекло' },
                  { key: 'grid', label: '📐 Сетка' },
                  { key: 'none', label: '🚫 Нет' },
                ].map((wp) => {
                  const act = chatWallpaper === wp.key;
                  return (
                    <TouchableOpacity
                      key={wp.key}
                      onPress={() => setChatWallpaper(wp.key as any)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 14,
                        backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                        borderWidth: 1,
                        borderColor: act ? appTheme.accent : appTheme.border,
                      }}
                    >
                      <Text style={{ color: act ? appTheme.accent : appTheme.textSub, fontSize: 12, fontWeight: '700' }}>
                        {wp.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.settingItem, { borderBottomColor: appTheme.border }]}>
              <Text style={styles.settingIcon}>🔠</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingText, { color: appTheme.text }]}>Размер шрифта сообщений</Text>
                <Text style={{ color: appTheme.textSub, fontSize: 11.5 }}>Предпросмотр: {chatFontSize}px</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setChatFontSize(chatFontSize - 1)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: appTheme.text, fontWeight: '900', fontSize: 15 }}>A-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setChatFontSize(chatFontSize + 1)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: appTheme.text, fontWeight: '900', fontSize: 15 }}>A+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setPinInput('');
                setShowPinModal(true);
              }}
            >
              <Text style={styles.settingIcon}>🔐</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingText, { color: appTheme.text }]}>Код-пароль (PIN)</Text>
                <Text style={{ fontSize: 11.5, color: pinCode ? '#22c55e' : appTheme.textSub }}>
                  {pinCode ? 'Включён 🔒 (запрос при входе)' : 'Выключен'}
                </Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={{ paddingHorizontal: 12, marginBottom: 20 }}>
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

      {/* PIN Setup Modal */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 20 }}>
          <GlassCard radius={RADII.CARD} strong style={{ padding: 20 }}>
            <Text style={{ color: appTheme.text, fontSize: 17, fontWeight: '800', marginBottom: 8 }}>
              🔐 Код-пароль (4 цифры)
            </Text>
            <Text style={{ color: appTheme.textSub, fontSize: 12.5, marginBottom: 14 }}>
              {pinCode
                ? 'Введите новый 4-значный PIN или нажмите «Отключить PIN»'
                : 'Защитите вход в приложение 4-значным кодом'}
            </Text>
            <TextInput
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: appTheme.border,
                backgroundColor: appTheme.glassInput,
                color: appTheme.text,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 18,
                letterSpacing: 8,
                textAlign: 'center',
              }}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={appTheme.textSub}
              value={pinInput}
              onChangeText={(t) => setPinInput(t.replace(/[^0-9]/g, ''))}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              {pinCode ? (
                <TouchableOpacity
                  style={{ paddingHorizontal: 14, paddingVertical: 10 }}
                  onPress={() => {
                    setPinCode('');
                    setShowPinModal(false);
                    showToast('Код-пароль отключён', undefined, 'info');
                  }}
                >
                  <Text style={{ color: '#ef4444', fontWeight: '700' }}>Отключить PIN</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={{ paddingHorizontal: 14, paddingVertical: 10 }}
                onPress={() => setShowPinModal(false)}
              >
                <Text style={{ color: appTheme.textSub, fontWeight: '700' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: appTheme.accent }}
                onPress={() => {
                  if (pinInput.length !== 4) {
                    showToast('PIN', 'Введите ровно 4 цифры', 'error');
                    return;
                  }
                  setPinCode(pinInput);
                  setShowPinModal(false);
                  showToast('Код-пароль установлен 🔐', undefined, 'success');
                }}
              >
                <Text style={{ color: '#000', fontWeight: '900' }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
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
