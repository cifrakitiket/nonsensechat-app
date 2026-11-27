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
import { ProfileQrAndNotesModal } from '../components/ProfileQrAndNotesModal';
import { StorageAndPrivacyModal } from '../components/StorageAndPrivacyModal';
import { AccountsDevicesHiddenModal } from '../components/AccountsDevicesHiddenModal';
import { PowerTemplatesModal } from '../components/PowerTemplatesModal';
import { SpecialBadges } from '../components/SpecialBadges';
import { AiHubSettingsModal } from '../components/AiHubSettingsModal';
import { AppInfoLegalReportModal, InfoModalMode } from '../components/AppInfoLegalReportModal';
import { RADII } from '../theme/liquidGlass';

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    me,
    logout,
    grantSelfPirozhki,
    updateMyProfile,
    appTheme,
    showToast,
    showDialog,
    checkingUpdate,
    checkForUpdates,
    notificationsEnabled,
    openNotificationSettings,
    bgSyncEnabled,
    setBgSyncEnabled,
    pinCode,
    setPinCode,
    appLang,
    setAppLang,
    clearVoiceConfig,
    setClearVoiceConfig,
  } = useApp();
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showStoragePrivacyModal, setShowStoragePrivacyModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showPowerModal, setShowPowerModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [infoModalMode, setInfoModalMode] = useState<InfoModalMode | null>(null);

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
              <SpecialBadges uid={me.uid} user={me} large />
              {me.prefix ? (
                <PrefixBadge
                  prefix={me.prefix}
                  prefixStyle={me.prefixStyle}
                  prefixSound={me.prefixSound}
                  large
                />
              ) : null}
            </View>

            <Text style={[styles.userUsername, { color: appTheme.textSub }]}>
              @{me.nickLower || me.nick} · {isCreator ? 'СЕО БЧ' : 'в сети'}
            </Text>
            {!!me.bio && <Text style={styles.userBio}>{me.bio}</Text>}

            <TouchableOpacity
              onPress={() => navigation.navigate('UserProfile', { uid: me.uid })}
              style={{
                marginTop: 12,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderWidth: 1,
                borderColor: appTheme.border,
              }}
            >
              <Text style={{ color: appTheme.accent, fontSize: 12.5, fontWeight: '800' }}>
                🪪 Публичный профиль ›
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Compact Pirozhki Glass Wallet */}
        <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
          <GlassCard
            radius={RADII.CARD}
            style={[styles.pirozhkiCard, { backgroundColor: 'rgba(245, 158, 11, 0.14)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Image
                  source={require('../../android/app/src/main/assets/public/pirozhok.png')}
                  style={{ width: 34, height: 34 }}
                />
                <View>
                  <Text style={styles.pirozhkiLbl}>ПИРОЖКИ</Text>
                  <Text style={styles.pirozhkiVal}>
                    {bal.toLocaleString('ru-RU')} 🥟{' '}
                    <Text style={{ fontSize: 12, color: '#cbd5e1', fontWeight: '600' }}>
                      (~{(bal * 0.42).toFixed(0)} ₽)
                    </Text>
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isCreator && (
                  <ScalePressable
                    haptic
                    style={styles.creatorBtn}
                    onPress={() =>
                      grantSelfPirozhki(500).then(() => showToast('Готово 🥟', '+500 пирожков начислено!', 'success'))
                    }
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11.5 }}>+500</Text>
                  </ScalePressable>
                )}
                <ScalePressable
                  haptic
                  style={{ backgroundColor: '#f59e0b', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 }}
                  onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'buy' })}
                >
                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 12.5 }}>Магазин</Text>
                </ScalePressable>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Group 1: SuperApp, Appearance & Identity */}
        <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
          <GlassCard radius={RADII.CARD}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('SuperApp')}
            >
              <Text style={styles.settingIcon}>🚀</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Мини-аппы и ИИ-инструменты</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowAiModal(true)}
            >
              <Text style={styles.settingIcon}>🤖</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Настройки ИИ Хаба (7 моделей)</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('ProfileCustomizer')}
            >
              <Text style={styles.settingIcon}>🎨</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Оформление, темы, обои и шрифт</Text>
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
              <Text style={[styles.settingText, { color: appTheme.text }]}>Звук префикса</Text>
              <Text style={styles.settingVal}>{me.prefixSoundName || 'Настроить'}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() => setShowQrModal(true)}
            >
              <Text style={styles.settingIcon}>📱</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Мой QR-код визитка</Text>
              <Text style={styles.settingVal}>@{me.nick}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Group 2: Privacy, Security & Notifications */}
        <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
          <GlassCard radius={RADII.CARD}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowAccountsModal(true)}
            >
              <Text style={styles.settingIcon}>🔄</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Аккаунты, Сеансы и Сейф</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowStoragePrivacyModal(true)}
            >
              <Text style={styles.settingIcon}>🛡️</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Приватность, ЧС и Память</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                setPinInput('');
                setShowPinModal(true);
              }}
            >
              <Text style={styles.settingIcon}>🔐</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Код-пароль (PIN)</Text>
              <Text style={[styles.settingVal, { color: pinCode ? '#22c55e' : appTheme.textSub }]}>
                {pinCode ? 'Вкл.' : 'Выкл.'}
              </Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={openNotificationSettings}
            >
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Уведомления Android</Text>
              <Text style={[styles.settingVal, { color: notificationsEnabled ? '#22c55e' : '#ef4444' }]}>
                {notificationsEnabled ? 'Вкл.' : 'Выкл.'}
              </Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <View style={[styles.settingItem, { borderBottomColor: appTheme.border }]}>
              <Text style={styles.settingIcon}>⚡</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Фоновый приём</Text>
              <Switch
                value={bgSyncEnabled}
                onValueChange={(val) => setBgSyncEnabled(val)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: appTheme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.settingItem, { borderBottomColor: appTheme.border }]}>
              <Text style={styles.settingIcon}>🎙️</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>ClearVoice AI™ (Шумодав)</Text>
              <Switch
                value={clearVoiceConfig.enabled}
                onValueChange={(v) => setClearVoiceConfig({ ...clearVoiceConfig, enabled: v })}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#22c55e' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() => setShowPowerModal(true)}
            >
              <Text style={styles.settingIcon}>🔋</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Энергосбережение и /шаблоны</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Group 3: App, Language & Updates */}
        <View style={{ paddingHorizontal: 12, marginBottom: 20 }}>
          <GlassCard radius={RADII.CARD}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                const order = ['ru', 'en', 'uk', 'ru-pre'] as const;
                const labels: Record<string, string> = {
                  ru: '🇷🇺 Русский',
                  en: '🇬🇧 English',
                  uk: '🇺🇦 Українська',
                  'ru-pre': '📜 Дореформенный Ъ',
                };
                const idx = order.indexOf(appLang as any);
                const next = order[(idx + 1) % order.length];
                setAppLang(next);
                showToast('Язык изменён 🌐', labels[next], 'success');
              }}
            >
              <Text style={styles.settingIcon}>🌐</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Язык интерфейса</Text>
              <Text style={styles.settingVal}>
                {appLang === 'en'
                  ? 'English'
                  : appLang === 'uk'
                  ? 'Українська'
                  : appLang === 'ru-pre'
                  ? 'Дореф. Ъ'
                  : 'Русский'}
              </Text>
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
              <Text style={[styles.settingText, { color: appTheme.text }]}>Поделиться NonsenseChat</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setInfoModalMode('info')}
            >
              <Text style={styles.settingIcon}>ℹ️</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>О NonsenseChat {APP_VERSION}</Text>
              <Text style={styles.settingVal}>v{APP_VERSION}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setInfoModalMode('legal')}
            >
              <Text style={styles.settingIcon}>⚖️</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>Правовая информация (152-ФЗ)</Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => checkForUpdates(false)}
              disabled={checkingUpdate}
            >
              <Text style={styles.settingIcon}>🔄</Text>
              <Text style={[styles.settingText, { color: appTheme.text }]}>
                {checkingUpdate ? 'Проверка обновлений...' : 'Проверить обновления'}
              </Text>
              <Text style={styles.settingVal}>
                {APP_VERSION} ({APP_VERSION_CODE})
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

      <ProfileQrAndNotesModal
        visible={showQrModal}
        onClose={() => setShowQrModal(false)}
        uid={me.uid}
        nick={me.nick}
        avatar={me.avatar}
      />

      <StorageAndPrivacyModal
        visible={showStoragePrivacyModal}
        onClose={() => setShowStoragePrivacyModal(false)}
      />

      <AccountsDevicesHiddenModal
        visible={showAccountsModal}
        onClose={() => setShowAccountsModal(false)}
      />

      <PowerTemplatesModal
        visible={showPowerModal}
        onClose={() => setShowPowerModal(false)}
      />

      <AiHubSettingsModal
        visible={showAiModal}
        onClose={() => setShowAiModal(false)}
      />

      <AppInfoLegalReportModal
        visible={!!infoModalMode}
        mode={infoModalMode || 'info'}
        onClose={() => setInfoModalMode(null)}
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
