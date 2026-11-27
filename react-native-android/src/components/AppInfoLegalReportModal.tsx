import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { push, ref, set } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { APP_VERSION, APP_VERSION_CODE } from '../constants/catalogs';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';

export type InfoModalMode = 'info' | 'legal' | 'report' | 'e2ee';

interface AppInfoLegalReportModalProps {
  visible: boolean;
  mode: InfoModalMode;
  onClose: () => void;
  e2eeChatId?: string;
  e2eeMembers?: string[];
  reportTargetName?: string;
  reportTargetId?: string;
}

const E2EE_EMOJIS = ['🔐', '🛡️', '⚡', '🔥', '💎', '🦊', '🚀', '🌙', '🌊', '🍀', '🎯', '👑', '🔮', '🎧', '🧬', '🥟'];

export const AppInfoLegalReportModal: React.FC<AppInfoLegalReportModalProps> = ({
  visible,
  mode,
  onClose,
  e2eeChatId = '',
  e2eeMembers = [],
  reportTargetName = '',
  reportTargetId = '',
}) => {
  const { me, appTheme, showToast } = useApp();
  const [legalTab, setLegalTab] = useState<'offer' | 'privacy' | 'rules' | 'pay'>('offer');
  const [reportReason, setReportReason] = useState('Спам / Мошенничество');
  const [reportDetails, setReportDetails] = useState('');

  const e2eeFingerprint = useMemo(() => {
    const seed = `${e2eeChatId}:${[...e2eeMembers].sort().join(':')}`;
    let h = 2166136261;
    const out: string[] = [];
    for (let i = 0; i < 16; i++) {
      h ^= seed.charCodeAt(i % Math.max(1, seed.length)) + i * 31;
      h = Math.imul(h, 16777619);
      out.push(E2EE_EMOJIS[(h >>> 0) % E2EE_EMOJIS.length]);
    }
    return out;
  }, [e2eeChatId, e2eeMembers]);

  const handleSubmitReport = async () => {
    if (!me) return;
    const rRef = push(ref(rtdb, 'reports'));
    await set(rRef, {
      reporterUid: me.uid,
      reporterNick: me.nick,
      targetId: reportTargetId || e2eeChatId || 'unknown',
      targetName: reportTargetName || 'Объект',
      reason: reportReason,
      details: reportDetails.trim(),
      at: Date.now(),
    });
    setReportDetails('');
    triggerHaptic(15);
    showToast('Жалоба отправлена ✓', 'Модерация NonsenseChat рассмотрит обращение', 'success');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassCard radius={28} strong style={styles.card}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: appTheme.text }]}>
              {mode === 'info'
                ? 'ℹ️ О NonsenseChat'
                : mode === 'legal'
                ? '⚖️ Правовой центр'
                : mode === 'report'
                ? '⚠️ Отправить жалобу'
                : '🔒 Ключ шифрования E2EE'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={appTheme.textSub} />
            </TouchableOpacity>
          </View>

          {mode === 'info' && (
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10 }}>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Image
                  source={require('../../android/app/src/main/assets/public/logo.png')}
                  style={{ width: 72, height: 72, borderRadius: 22 }}
                />
                <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900', marginTop: 8 }}>
                  Беспонтовый Чат
                </Text>
                <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 13 }}>
                  NonsenseChat {APP_VERSION} Minimalist Edition (Build {APP_VERSION_CODE})
                </Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoHead}>🚀 CHANGELOG</Text>
                <Text style={styles.infoTxt}>
                  • v3.0 Minimalist Edition: Генеральная уборка интерфейса в стиле Telegram — чистые шапки чатов и панель ввода без лишних кнопок, единый центр оформления чатов и профиля, плавная 4-вкладочная навигация и быстрый доступ к Супераппу.{'\n'}
                  • v6.0.0 SuperApp: Единое слияние веб-версии и Android! Вкладка Суперапп (ИИ Хаб 7 моделей, Колесо Фортуны, Канбан, Конвертер, Редкие шрифты), живой калькулятор с корнями ∛√, быстрые команды gemini:/grok:, сворачивание звонков + ClearVoice AI™, E2EE-ключ, спец-бейджи ♀ и &lt;/&gt;, история пирожков.{'\n'}
                  • v5.3.0: Эффекты сообщений, Фоторедактор, Спойлеры фото, Плавающий плеер и MP3, Переводчик RU↔EN, Расшифровка ГС, Бусты и Платные посты, Голосовые комнаты, Инвайты, Сейф.{'\n'}
                  • v5.2.0: WebRTC-звонки 1-на-1, Кружочки, Мини-игры ТГ, GIF и свои стикерпаки, Опросы 2.0, Чек-листы, Темы форума, Глобальный поиск, QR-визитка.{'\n'}
                  • v5.0.0: Истории 24ч, Свайп-ответы, Двойной тап ❤️, Сгорающие фото, Пин-код, Обои.
                </Text>
              </View>
            </ScrollView>
          )}

          {mode === 'legal' && (
            <View style={{ gap: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {[
                  { k: 'offer', l: 'Оферта' },
                  { k: 'privacy', l: '152-ФЗ Приватность' },
                  { k: 'rules', l: 'Правила 18+' },
                  { k: 'pay', l: 'ЮKassa' },
                ].map((t) => {
                  const act = legalTab === t.k;
                  return (
                    <TouchableOpacity
                      key={t.k}
                      onPress={() => setLegalTab(t.k as any)}
                      style={[
                        styles.tabChip,
                        {
                          backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                          borderColor: act ? appTheme.accent : appTheme.border,
                        },
                      ]}
                    >
                      <Text style={{ color: act ? appTheme.accent : appTheme.textSub, fontSize: 12, fontWeight: '800' }}>
                        {t.l}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <ScrollView style={[styles.infoBox, { maxHeight: 300 }]}>
                <Text style={styles.infoTxt}>
                  {legalTab === 'offer'
                    ? 'Публичная оферта NonsenseChat (Беспонтовый Чат): сервис предоставляет функции обмена сообщениями, аудио/видеосвязи и внутренней валюты «Пирожки» (1 🥟 = 0.42 ₽) на условиях добросовестного использования.'
                    : legalTab === 'privacy'
                    ? 'Политика конфиденциальности (152-ФЗ): мы храним только необходимые для работы аккаунта данные (Email, юзернейм, профиль и сообщения в Firebase). Вы можете в любой момент удалить аккаунт и экспортировать историю чата.'
                    : legalTab === 'rules'
                    ? 'Правила сообщества (149-ФЗ, 436-ФЗ): запрещены спам, мошенничество, травля, публикация незаконного контента и взлом чужих аккаунтов. Нарушения можно обжаловать через кнопку «Пожаловаться».'
                    : 'Оплата через ЮKassa / СБП: зачисление Пирожков происходит автоматически после подтверждения платежа на стороне платёжного шлюза ЮKassa.'}
                </Text>
              </ScrollView>
            </View>
          )}

          {mode === 'report' && (
            <View style={{ gap: 10 }}>
              <Text style={{ color: appTheme.textSub, fontSize: 12.5 }}>
                Объект жалобы: <Text style={{ color: '#fff', fontWeight: '800' }}>{reportTargetName || 'Чат / Пользователь'}</Text>
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {['Спам / Мошенничество', 'Оскорбления', 'Запрещённый контент', 'Фейк'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setReportReason(r)}
                    style={[
                      styles.tabChip,
                      {
                        backgroundColor: reportReason === r ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                        borderColor: reportReason === r ? '#ef4444' : appTheme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: reportReason === r ? '#fca5a5' : appTheme.textSub, fontSize: 12, fontWeight: '700' }}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                multiline
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Опишите проблему подробнее (необязательно)..."
                placeholderTextColor={appTheme.textSub}
                style={[styles.input, { color: appTheme.text, borderColor: appTheme.border, minHeight: 80, textAlignVertical: 'top' }]}
              />
              <TouchableOpacity
                style={[styles.priBtn, { backgroundColor: '#ef4444' }]}
                onPress={handleSubmitReport}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }}>Отправить жалобу</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'e2ee' && (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <View style={styles.e2eeGrid}>
                {e2eeFingerprint.map((em, idx) => (
                  <View key={idx} style={styles.e2eeCell}>
                    <Text style={{ fontSize: 28 }}>{em}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: '#e2e8f0', fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                Если эти 16 эмодзи совпадают на устройстве вашего собеседника, ваш диалог защищён сквозным отпечатком ключа!
              </Text>
            </View>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.74)', justifyContent: 'center', padding: 16 },
  card: { padding: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  infoBox: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoHead: { color: '#38bdf8', fontWeight: '900', fontSize: 12, marginBottom: 6 },
  infoTxt: { color: '#cbd5e1', fontSize: 12.5, lineHeight: 19 },
  tabChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
  },
  priBtn: { paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  e2eeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 216,
    gap: 8,
    padding: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  e2eeCell: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
});
