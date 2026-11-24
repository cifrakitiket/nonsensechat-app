import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { pickNativeImage, takeNativePhoto } from '../services/firebase';
import { FramedAvatar } from '../components/FramedAvatar';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

export default function EditProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, updateMyProfile, appTheme } = useApp();

  const [nick, setNick] = useState(me?.nick || '');
  const [bio, setBio] = useState(me?.bio || '');
  const [avatar, setAvatar] = useState(me?.avatar || '');
  const [bday, setBday] = useState(me?.bday || '');
  const [phone, setPhone] = useState(me?.phone || '');
  const [saving, setSaving] = useState(false);

  const pickAvatar = async (fromCam: boolean) => {
    try {
      const res = fromCam ? await takeNativePhoto() : await pickNativeImage();
      if (res?.dataUrl) setAvatar(res.dataUrl);
    } catch (e: any) {
      if (e?.code !== 'CANCELLED') Alert.alert('Фото', e?.message);
    }
  };

  const handleSave = async () => {
    if (!nick.trim()) {
      Alert.alert('Ошибка', 'Юзернейм не может быть пустым');
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({
        nick: nick.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
        bday: bday.trim(),
        phone: phone.trim(),
      });
      Alert.alert('Сохранено ✓', 'Данные профиля обновлены');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось обновить профиль');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LiquidBackground>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
              <Text style={{ fontSize: 20, color: '#fff', fontWeight: '800' }}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: appTheme.text }]}>Редактировать</Text>
            <View style={{ width: 34 }} />
          </GlassCard>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <GlassCard radius={RADII.CARD} style={styles.formCard}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <FramedAvatar
                uri={avatar}
                name={nick || '?'}
                frameId={me?.steamFrame || 'none'}
                size={94}
                online
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <ScalePressable
                  style={[styles.photoBtn, { backgroundColor: appTheme.accentSoft }]}
                  onPress={() => pickAvatar(false)}
                >
                  <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 12.5 }}>
                    🖼️ Из галереи
                  </Text>
                </ScalePressable>
                <ScalePressable
                  style={styles.photoBtn}
                  onPress={() => pickAvatar(true)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>
                    📸 Камера
                  </Text>
                </ScalePressable>
              </View>
            </View>

            <Text style={[styles.label, { color: appTheme.textSub }]}>ЮЗЕРНЕЙМ</Text>
            <TextInput
              style={[styles.input, { backgroundColor: appTheme.glassInput, color: appTheme.text }]}
              value={nick}
              onChangeText={setNick}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: appTheme.textSub }]}>О СЕБЕ / СВОДКА</Text>
            <TextInput
              style={[styles.input, { backgroundColor: appTheme.glassInput, color: appTheme.text, height: 84, textAlignVertical: 'top' }]}
              multiline
              value={bio}
              onChangeText={setBio}
              placeholder="Расскажите о себе..."
              placeholderTextColor={appTheme.textSub}
            />

            <Text style={[styles.label, { color: appTheme.textSub }]}>ДЕНЬ РОЖДЕНИЯ</Text>
            <TextInput
              style={[styles.input, { backgroundColor: appTheme.glassInput, color: appTheme.text }]}
              value={bday}
              onChangeText={setBday}
              placeholder="ДД.ММ.ГГГГ"
              placeholderTextColor={appTheme.textSub}
            />

            <Text style={[styles.label, { color: appTheme.textSub }]}>ТЕЛЕФОН</Text>
            <TextInput
              style={[styles.input, { backgroundColor: appTheme.glassInput, color: appTheme.text }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+7..."
              placeholderTextColor={appTheme.textSub}
              keyboardType="phone-pad"
            />

            {!!me?.prefix && (
              <ScalePressable
                style={styles.soundBtn}
                onPress={() => navigation.navigate('PrefixSound')}
              >
                <Text style={{ color: '#fbbf24', fontWeight: '800' }}>
                  🔊 Настроить звук префикса ({me.prefixSoundName || 'Выбрать'})
                </Text>
              </ScalePressable>
            )}

            <ScalePressable
              style={[styles.saveBtn, { backgroundColor: appTheme.accent }, saving && { opacity: 0.6 }]}
              disabled={saving}
              onPress={handleSave}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveText}>Сохранить изменения</Text>
              )}
            </ScalePressable>
          </GlassCard>
        </ScrollView>
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16.5, fontWeight: '800' },
  scroll: { padding: 12, paddingBottom: 32 },
  formCard: { padding: 18 },
  photoBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  label: { fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 6, letterSpacing: 0.6 },
  input: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
  },
  soundBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtn: { marginTop: 20, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#000', fontSize: 15, fontWeight: '900' },
});
