import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  NativeModules,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { AiHubSettingsModal } from '../components/AiHubSettingsModal';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

interface KanbanTask {
  id: string;
  text: string;
  col: 'todo' | 'doing' | 'done';
}

const WHEEL_PRIZES = [5, 15, 25, 50, 100];

const FANCY_STYLES: Array<{ name: string; transform: (s: string) => string }> = [
  {
    name: 'Жирный Serif',
    transform: (s) =>
      s
        .split('')
        .map((c) => {
          const code = c.charCodeAt(0);
          if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d400 + (code - 65));
          if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d41a + (code - 97));
          return c;
        })
        .join(''),
  },
  {
    name: 'Моноширинный',
    transform: (s) =>
      s
        .split('')
        .map((c) => {
          const code = c.charCodeAt(0);
          if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d670 + (code - 65));
          if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d68a + (code - 97));
          return c;
        })
        .join(''),
  },
  {
    name: 'В кружках ⓐ',
    transform: (s) =>
      s
        .split('')
        .map((c) => {
          const code = c.charCodeAt(0);
          if (code >= 65 && code <= 90) return String.fromCodePoint(0x24b6 + (code - 65));
          if (code >= 97 && code <= 122) return String.fromCodePoint(0x24d0 + (code - 97));
          return c;
        })
        .join(''),
  },
  {
    name: 'Разрядка',
    transform: (s) => s.split('').join(' '),
  },
  {
    name: '『 Декоративный 』',
    transform: (s) => `『 ${s} 』`,
  },
];

export default function SuperAppScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    me,
    appTheme,
    aiSettings,
    openAiHubChat,
    lastWheelSpinAt,
    claimDailyWheelBonus,
    showToast,
  } = useApp();

  const [showAiSettings, setShowAiSettings] = useState(false);

  // Wheel of Fortune state
  const [spinning, setSpinning] = useState(false);
  const wheelAnim = useRef(new Animated.Value(0)).current;
  const canSpin = Date.now() - lastWheelSpinAt >= 24 * 60 * 60 * 1000;

  // Kanban board state
  const [tasks, setTasks] = useState<KanbanTask[]>([
    { id: 'k1', text: 'Проверить обновление БЧ v6.0', col: 'done' },
    { id: 'k2', text: 'Протестировать ИИ Хаб', col: 'doing' },
  ]);
  const [newTask, setNewTask] = useState('');

  // Converter state
  const [pirozhkiAmt, setPirozhkiAmt] = useState('100');

  // Fancy font generator
  const [fontInput, setFontInput] = useState('NonsenseChat');

  useEffect(() => {
    (async () => {
      try {
        const raw = await NativeModules.NativeStorageModule?.getItem?.('nc_kanban_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setTasks(parsed);
        }
      } catch (_) {}
    })();
  }, []);

  const saveTasks = (next: KanbanTask[]) => {
    setTasks(next);
    try {
      NativeModules.NativeStorageModule?.setItem?.('nc_kanban_v1', JSON.stringify(next));
    } catch (_) {}
  };

  const handleSpinWheel = () => {
    if (!canSpin || spinning) {
      showToast('Колесо Фортуны 🎡', 'Следующий бесплатный спин через 24 часа!', 'info');
      return;
    }
    setSpinning(true);
    triggerHaptic(18);
    wheelAnim.setValue(0);
    Animated.timing(wheelAnim, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: true,
    }).start(async () => {
      const prize = WHEEL_PRIZES[Math.floor(Math.random() * WHEEL_PRIZES.length)];
      try {
        await claimDailyWheelBonus(prize);
        showToast('Джекпот! 🎉', `Вы выиграли +${prize} пирожков 🥟!`, 'success');
      } catch (e: any) {
        showToast('Колесо Фортуны', e?.message || 'Попробуйте позже', 'error');
      } finally {
        setSpinning(false);
      }
    });
  };

  const conv = useMemo(() => {
    const p = Math.max(0, parseFloat(pirozhkiAmt.replace(',', '.')) || 0);
    const rub = p * 0.42;
    return {
      rub: rub.toFixed(2),
      usd: (rub / 92).toFixed(2),
      eur: (rub / 100).toFixed(2),
      ton: (rub / 520).toFixed(4),
      btc: (rub / 8400000).toFixed(7),
    };
  }, [pirozhkiAmt]);

  const wheelRotate = wheelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1080deg'],
  });

  return (
    <LiquidBackground>
      <ScrollView
        style={{ flex: 1, paddingTop: insets.top }}
        contentContainerStyle={{ paddingBottom: 112, paddingHorizontal: 12, gap: 12 }}
      >
        <View style={{ paddingTop: 6 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {navigation.canGoBack() && (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#fff', fontWeight: '800' }}>←</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.headerTitle, { color: appTheme.text }]}>🚀 Суперапп БЧ</Text>
            </View>
            <Text style={{ color: '#fbbf24', fontWeight: '900', fontSize: 13 }}>
              🥧 {(me?.pirozhki || 0).toLocaleString('ru-RU')}
            </Text>
          </GlassCard>
        </View>

        {/* 1. AI Hub Launcher Card */}
        <GlassCard radius={RADII.CARD} style={[styles.card, { borderColor: 'rgba(14,165,233,0.45)', backgroundColor: 'rgba(14,165,233,0.12)' }]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>🤖 ИИ Хаб (7 нейросетей)</Text>
              <Text style={{ color: appTheme.textSub, fontSize: 12, marginTop: 2 }}>
                Активен: {aiSettings.activeProvider.toUpperCase()} · Команды gemini:, grok:, claude: в любом чате
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAiSettings(true)}
              style={[styles.miniBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>⚙️ API</Text>
            </TouchableOpacity>
          </View>
          <ScalePressable
            style={[styles.priBtn, { backgroundColor: '#0ea5e9', marginTop: 12 }]}
            onPress={async () => {
              const chat = await openAiHubChat();
              if (chat) navigation.navigate('ChatRoom', { chatId: chat.id, name: '🤖 ИИ Хаб' });
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>💬 Открыть чат с ИИ</Text>
          </ScalePressable>
        </GlassCard>

        {/* 2. Daily Wheel of Fortune */}
        <GlassCard radius={RADII.CARD} style={[styles.card, { borderColor: 'rgba(245,158,11,0.45)', backgroundColor: 'rgba(245,158,11,0.1)' }]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>🎡 Колесо Фортуны Пирожков</Text>
              <Text style={{ color: appTheme.textSub, fontSize: 12, marginTop: 2 }}>
                Ежедневный бонус: 5, 15, 25, 50 или 100 🥟
              </Text>
            </View>
            <Animated.Text style={{ fontSize: 34, transform: [{ rotate: wheelRotate }] }}>🎡</Animated.Text>
          </View>
          <ScalePressable
            style={[
              styles.priBtn,
              { backgroundColor: canSpin ? '#f59e0b' : 'rgba(255,255,255,0.1)', marginTop: 10 },
            ]}
            disabled={spinning}
            onPress={handleSpinWheel}
          >
            <Text style={{ color: canSpin ? '#000' : appTheme.textSub, fontWeight: '900', fontSize: 13.5 }}>
              {spinning ? 'Крутим барабан...' : canSpin ? '🎁 Крутить и забрать пирожки!' : '✓ Бонус получен (ждем 24ч)'}
            </Text>
          </ScalePressable>
        </GlassCard>

        {/* 3. Personal Kanban Board */}
        <GlassCard radius={RADII.CARD} style={styles.card}>
          <Text style={styles.cardTitle}>📋 Канбан-заметки</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1, color: appTheme.text, borderColor: appTheme.border }]}
              placeholder="Новая задача..."
              placeholderTextColor={appTheme.textSub}
              value={newTask}
              onChangeText={setNewTask}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: appTheme.accent }]}
              onPress={() => {
                if (!newTask.trim()) return;
                saveTasks([{ id: `k_${Date.now()}`, text: newTask.trim(), col: 'todo' }, ...tasks]);
                setNewTask('');
                triggerHaptic(8);
              }}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>＋</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 6, marginTop: 10 }}>
            {tasks.map((t) => {
              const badge =
                t.col === 'todo' ? '📌 Идея' : t.col === 'doing' ? '⚡ В работе' : '✅ Готово';
              const nextCol =
                t.col === 'todo' ? 'doing' : t.col === 'doing' ? 'done' : 'todo';
              return (
                <View key={t.id} style={[styles.kanbanRow, { borderColor: appTheme.border }]}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() =>
                      saveTasks(tasks.map((x) => (x.id === t.id ? { ...x, col: nextCol } : x)))
                    }
                  >
                    <Text style={{ color: appTheme.accent, fontSize: 11, fontWeight: '800' }}>{badge}</Text>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 13.5,
                        textDecorationLine: t.col === 'done' ? 'line-through' : 'none',
                      }}
                    >
                      {t.text}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => saveTasks(tasks.filter((x) => x.id !== t.id))}
                    style={{ padding: 6 }}
                  >
                    <Text style={{ color: '#ef4444', fontWeight: '800' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* 4. Currency & Pirozhki Converter */}
        <GlassCard radius={RADII.CARD} style={styles.card}>
          <Text style={styles.cardTitle}>💱 Конвертер Пирожков и Валют</Text>
          <TextInput
            style={[styles.input, { color: appTheme.text, borderColor: appTheme.border, marginTop: 8 }]}
            keyboardType="numeric"
            value={pirozhkiAmt}
            onChangeText={setPirozhkiAmt}
            placeholder="Количество пирожков 🥟"
            placeholderTextColor={appTheme.textSub}
          />
          <View style={styles.convGrid}>
            {[
              { l: 'RUB ₽', v: conv.rub },
              { l: 'USD $', v: conv.usd },
              { l: 'EUR €', v: conv.eur },
              { l: 'TON 💎', v: conv.ton },
              { l: 'BTC ₿', v: conv.btc },
            ].map((c) => (
              <View key={c.l} style={styles.convCell}>
                <Text style={{ color: appTheme.textSub, fontSize: 11, fontWeight: '700' }}>{c.l}</Text>
                <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '900', marginTop: 2 }}>{c.v}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* 5. Fancy Unicode Font Generator */}
        <GlassCard radius={RADII.CARD} style={styles.card}>
          <Text style={styles.cardTitle}>✨ Генератор редких шрифтов</Text>
          <TextInput
            style={[styles.input, { color: appTheme.text, borderColor: appTheme.border, marginTop: 8 }]}
            value={fontInput}
            onChangeText={setFontInput}
            placeholder="Введите текст (латиница/фраза)..."
            placeholderTextColor={appTheme.textSub}
          />
          <View style={{ gap: 6, marginTop: 8 }}>
            {FANCY_STYLES.map((fsItem) => {
              const out = fsItem.transform(fontInput || 'NonsenseChat');
              return (
                <TouchableOpacity
                  key={fsItem.name}
                  style={[styles.kanbanRow, { borderColor: appTheme.border }]}
                  onPress={() => {
                    Share.share({ message: out }).catch(() => {});
                    triggerHaptic(10);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: appTheme.textSub, fontSize: 10.5 }}>{fsItem.name}</Text>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{out}</Text>
                  </View>
                  <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 12 }}>📋</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>
      </ScrollView>

      <AiHubSettingsModal visible={showAiSettings} onClose={() => setShowAiSettings(false)} />
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  headerTitle: { fontSize: 17, fontWeight: '900' },
  card: { padding: 16 },
  cardTitle: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  miniBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  priBtn: { paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  addBtn: { width: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  kanbanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  convGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  convCell: {
    width: '31%',
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
});
