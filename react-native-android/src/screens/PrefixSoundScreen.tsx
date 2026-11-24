import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { PREFIX_SOUND_PRESETS } from '../constants/catalogs';
import { playPrefixSound } from '../services/firebase';

export default function PrefixSoundScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, savePrefixSound } = useApp();

  const [selectedSource, setSelectedSource] = useState(me?.prefixSound || '');
  const [selectedName, setSelectedName] = useState(me?.prefixSoundName || 'Без звука');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!me?.prefix) {
      Alert.alert('Сначала купите префикс', 'Откройте магазин Пирожков → Префиксы');
      return;
    }
    setSaving(true);
    try {
      await savePrefixSound(selectedSource, selectedName);
      Alert.alert('Готово 🔊', `Звук "${selectedName}" сохранён для вашего префикса!`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message);
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
        <Text style={styles.headerTitle}>Звук префикса (до 2с)</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.selectedBar}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>ВЫБРАННЫЙ ЗВУК:</Text>
          <Text style={{ color: '#fbbf24', fontSize: 15, fontWeight: '800', marginTop: 2 }}>
            {selectedName}
          </Text>
        </View>
        {!!selectedSource && (
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => playPrefixSound(selectedSource)}
          >
            <Text style={{ color: '#000', fontWeight: '800' }}>▶ Тест</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>ВСТРОЕННЫЕ ЗВУКОВЫЕ ПРЕСЕТЫ (12 ЭФФЕКТОВ)</Text>
        {PREFIX_SOUND_PRESETS.map((p) => {
          const key = `preset:${p.id}`;
          const act = selectedSource === key;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.card, act && styles.cardAct]}
              onPress={() => {
                setSelectedSource(key);
                setSelectedName(p.name);
                playPrefixSound(key);
              }}
            >
              <Text style={{ fontSize: 22 }}>{p.icon}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardName}>{p.name}</Text>
                <Text style={styles.cardSub}>
                  {p.dur} • {p.desc}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => playPrefixSound(key)}
              >
                <Text style={{ color: '#fff', fontSize: 12 }}>▶</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={async () => {
            setSelectedSource('');
            setSelectedName('Без звука');
            await savePrefixSound('', '');
            navigation.goBack();
          }}
        >
          <Text style={{ color: '#cbd5e1', fontWeight: '700' }}>Убрать звук</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={handleSave}
        >
          <Text style={{ color: '#000', fontWeight: '900', fontSize: 14.5 }}>
            {saving ? 'Сохранение...' : 'Сохранить звук ✓'}
          </Text>
        </TouchableOpacity>
      </View>
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
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  previewBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scroll: { paddingHorizontal: 14, paddingBottom: 24, gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131c2a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardAct: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  cardName: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
  cardSub: { color: '#94a3b8', fontSize: 12, marginTop: 1 },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0e1420',
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
