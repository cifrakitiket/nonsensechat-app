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
import { FramedAvatar } from '../components/FramedAvatar';

export default function EditProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, updateMyProfile } = useApp();

  const [nick, setNick] = useState(me?.nick || '');
  const [bio, setBio] = useState(me?.bio || '');
  const [avatar, setAvatar] = useState(me?.avatar || '');
  const [bday, setBday] = useState(me?.bday || '');
  const [phone, setPhone] = useState(me?.phone || '');
  const [saving, setSaving] = useState(false);

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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Редактировать профиль</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <FramedAvatar
            uri={avatar}
            name={nick || '?'}
            frameId={me?.steamFrame || 'none'}
            size={90}
            online
          />
        </View>

        <Text style={styles.label}>ЮЗЕРНЕЙМ</Text>
        <TextInput style={styles.input} value={nick} onChangeText={setNick} autoCapitalize="none" />

        <Text style={styles.label}>О СЕБЕ / СВОДКА</Text>
        <TextInput
          style={[styles.input, { height: 84, textAlignVertical: 'top' }]}
          multiline
          value={bio}
          onChangeText={setBio}
          placeholder="Расскажите о себе..."
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>ССЫЛКА НА АВАТАР (URL)</Text>
        <TextInput
          style={styles.input}
          value={avatar}
          onChangeText={setAvatar}
          autoCapitalize="none"
          placeholder="https://..."
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>ДЕНЬ РОЖДЕНИЯ</Text>
        <TextInput
          style={styles.input}
          value={bday}
          onChangeText={setBday}
          placeholder="ДД.ММ.ГГГГ"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>ТЕЛЕФОН</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+7..."
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
        />

        {!!me?.prefix && (
          <TouchableOpacity
            style={styles.soundBtn}
            onPress={() => navigation.navigate('PrefixSound')}
          >
            <Text style={{ color: '#fbbf24', fontWeight: '700' }}>
              🔊 Настроить звук префикса ({me.prefixSoundName || 'Выбрать'})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Сохранить изменения</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 32 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8aabb8',
    marginTop: 12,
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#131c2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 14.5,
  },
  soundBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtn: {
    marginTop: 22,
    backgroundColor: '#5b8fb9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
