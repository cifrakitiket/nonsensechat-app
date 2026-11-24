import React, { useRef, useState } from 'react';
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
import {
  playPrefixSound,
  pickNativeAudio,
  startNativeVoiceRecording,
  stopNativeVoiceRecording,
  cancelNativeVoiceRecording,
} from '../services/firebase';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

export default function PrefixSoundScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, savePrefixSound, appTheme } = useApp();

  const [tab, setTab] = useState<'presets' | 'upload' | 'mic'>('presets');
  const [selectedSource, setSelectedSource] = useState(me?.prefixSound || '');
  const [selectedName, setSelectedName] = useState(me?.prefixSoundName || 'Без звука');
  const [saving, setSaving] = useState(false);

  // Mic 2.0s recorder
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const timerRef = useRef<any>(null);

  const handlePickAudioFile = async () => {
    try {
      const res = await pickNativeAudio();
      if (res?.dataUrl) {
        const cleanName = (res.fileName || 'Аудио').replace(/\.[^/.]+$/, '').slice(0, 18);
        setSelectedSource(res.dataUrl);
        setSelectedName(`Файл: ${cleanName}`);
        playPrefixSound(res.dataUrl);
      }
    } catch (e: any) {
      if (e?.code !== 'CANCELLED') Alert.alert('Аудио', e?.message);
    }
  };

  const handleStartMic = async () => {
    try {
      await startNativeVoiceRecording(2000);
      setRecording(true);
      setRecMs(0);
      const started = Date.now();
      timerRef.current = setInterval(async () => {
        const elapsed = Date.now() - started;
        setRecMs(Math.min(2000, elapsed));
        if (elapsed >= 2000) {
          await handleStopMic();
        }
      }, 100);
    } catch (e: any) {
      Alert.alert('Микрофон', e?.message || 'Разрешите доступ к микрофону');
    }
  };

  const handleStopMic = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    try {
      const res = await stopNativeVoiceRecording();
      if (res?.dataUrl) {
        setSelectedSource(res.dataUrl);
        setSelectedName('Голос (до 2.0с)');
        playPrefixSound(res.dataUrl);
      }
    } catch (_) {
      cancelNativeVoiceRecording();
    }
  };

  const handleSave = async () => {
    if (!me?.prefix) {
      Alert.alert('Сначала купите префикс', 'Откройте Магазин Пирожков → Префиксы');
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
    <LiquidBackground>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
              <Text style={{ fontSize: 20, color: '#fff', fontWeight: '800' }}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: appTheme.text }]}>Звук префикса (до 2с)</Text>
            <View style={{ width: 34 }} />
          </GlassCard>
        </View>

        <View style={{ paddingHorizontal: 12, marginBottom: 10 }}>
          <GlassCard radius={RADII.CARD} style={styles.selectedBar}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: appTheme.textSub, fontSize: 10.5, fontWeight: '800' }}>ВЫБРАННЫЙ ЗВУК:</Text>
              <Text style={{ color: '#fbbf24', fontSize: 15, fontWeight: '800', marginTop: 2 }}>
                {selectedName}
              </Text>
            </View>
            {!!selectedSource && (
              <ScalePressable style={styles.previewBtn} onPress={() => playPrefixSound(selectedSource)}>
                <Text style={{ color: '#000', fontWeight: '900' }}>▶ Тест</Text>
              </ScalePressable>
            )}
          </GlassCard>
        </View>

        {/* 3 Tabs */}
        <View style={{ paddingHorizontal: 12, marginBottom: 10 }}>
          <GlassCard radius={RADII.PILL} style={styles.tabsRow}>
            {[
              { k: 'presets', l: '🎵 Пресеты' },
              { k: 'upload', l: '📁 Файл' },
              { k: 'mic', l: '🎤 Микрофон' },
            ].map((t) => (
              <TouchableOpacity
                key={t.k}
                style={[styles.tabBtn, tab === t.k && { backgroundColor: '#f59e0b' }]}
                onPress={() => setTab(t.k as any)}
              >
                <Text style={[styles.tabText, tab === t.k && { color: '#000' }]}>{t.l}</Text>
              </TouchableOpacity>
            ))}
          </GlassCard>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {tab === 'presets' &&
            PREFIX_SOUND_PRESETS.map((p) => {
              const key = `preset:${p.id}`;
              const act = selectedSource === key;
              return (
                <ScalePressable
                  key={p.id}
                  onPress={() => {
                    setSelectedSource(key);
                    setSelectedName(p.name);
                    playPrefixSound(key);
                  }}
                >
                  <GlassCard
                    radius={22}
                    style={[
                      styles.card,
                      act && { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.16)' },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{p.icon}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cardName}>{p.name}</Text>
                      <Text style={styles.cardSub}>
                        {p.dur} • {p.desc}
                      </Text>
                    </View>
                    <View style={styles.playBtn}>
                      <Text style={{ color: '#fff', fontSize: 12 }}>▶</Text>
                    </View>
                  </GlassCard>
                </ScalePressable>
              );
            })}

          {tab === 'upload' && (
            <GlassCard radius={RADII.CARD} style={styles.actionBox}>
              <Text style={{ fontSize: 38, marginBottom: 10 }}>🎵</Text>
              <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '800', marginBottom: 6 }}>
                Загрузить аудиофайл с телефона
              </Text>
              <Text style={{ color: appTheme.textSub, fontSize: 12.5, textAlign: 'center', marginBottom: 18 }}>
                MP3, WAV, M4A, OGG · Воспроизведение автоматически ограничивается 2.0 секундами
              </Text>
              <ScalePressable style={styles.bigGoldBtn} onPress={handlePickAudioFile}>
                <Text style={{ color: '#000', fontWeight: '900' }}>📁 Выбрать аудиофайл</Text>
              </ScalePressable>
            </GlassCard>
          )}

          {tab === 'mic' && (
            <GlassCard radius={RADII.CARD} style={styles.actionBox}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>{recording ? '🔴' : '🎙️'}</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>
                {recording ? `Запись: ${(recMs / 1000).toFixed(1)} / 2.0 с` : 'Записать звук до 2.0 секунд'}
              </Text>
              <Text style={{ color: appTheme.textSub, fontSize: 12.5, textAlign: 'center', marginBottom: 18 }}>
                Нажмите, скажите короткую фразу — запись остановится автоматически через 2 секунды
              </Text>
              <ScalePressable
                style={[styles.bigGoldBtn, recording && { backgroundColor: '#ef4444' }]}
                onPress={recording ? handleStopMic : handleStartMic}
              >
                <Text style={{ color: recording ? '#fff' : '#000', fontWeight: '900' }}>
                  {recording ? '■ Остановить запись' : '🎤 Начать запись (2.0с)'}
                </Text>
              </ScalePressable>
            </GlassCard>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <ScalePressable
            style={styles.clearBtn}
            onPress={async () => {
              setSelectedSource('');
              setSelectedName('Без звука');
              await savePrefixSound('', '');
              navigation.goBack();
            }}
          >
            <Text style={{ color: '#cbd5e1', fontWeight: '700' }}>Убрать</Text>
          </ScalePressable>
          <ScalePressable
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            disabled={saving}
            onPress={handleSave}
          >
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 14.5 }}>
              {saving ? 'Сохранение...' : 'Сохранить звук ✓'}
            </Text>
          </ScalePressable>
        </View>
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 7 },
  backCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  selectedBar: { flexDirection: 'row', alignItems: 'center', padding: 14, borderColor: 'rgba(245, 158, 11, 0.35)' },
  previewBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  tabsRow: { flexDirection: 'row', padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabText: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  scroll: { paddingHorizontal: 12, paddingBottom: 24, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  cardName: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
  cardSub: { color: '#94a3b8', fontSize: 12, marginTop: 1 },
  playBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  actionBox: { padding: 24, alignItems: 'center' },
  bigGoldBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  footer: { flexDirection: 'row', gap: 10, padding: 14 },
  clearBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center' },
  saveBtn: { flex: 1, backgroundColor: '#f59e0b', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
});
