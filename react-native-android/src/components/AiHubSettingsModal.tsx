import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ref, remove, update } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import {
  AiHubSettings,
  AiProviderKey,
  useApp,
} from '../context/AppContext';
import { GlassCard } from './GlassCard';

interface AiHubSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const PROVIDERS: Array<{ key: AiProviderKey; label: string }> = [
  { key: 'gemini', label: 'Gemini' },
  { key: 'grok', label: 'Grok' },
  { key: 'claude', label: 'Claude' },
  { key: 'openai', label: 'GPT' },
  { key: 'deepseek', label: 'DeepSeek' },
  { key: 'openrouter', label: 'OpenRouter' },
  { key: 'custom', label: 'Ollama/API' },
];

const PROMPT_PRESETS = [
  {
    label: '✨ Универсал',
    text: 'Ты дружелюбный, умный и лаконичный ИИ-ассистент в NonsenseChat. Отвечай структурированно и по делу.',
  },
  {
    label: '💻 Кодер',
    text: 'Ты Senior Full-Stack разработчик. Пиши чистый надёжный код и давай точные архитектурные советы.',
  },
  {
    label: '🎨 Креатор',
    text: 'Ты талантливый копирайтер и креативный редактор. Пиши ярко и без штампов.',
  },
  {
    label: '⚡ Кратко',
    text: 'Отвечай строго по делу в 1–3 предложения без лишних вводных слов.',
  },
  {
    label: '😎 Бро',
    text: 'Ты весёлый и остроумный собеседник NonsenseChat. Общайся легко и с юмором.',
  },
];

export const AiHubSettingsModal: React.FC<AiHubSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    me,
    appTheme,
    aiSettings,
    setAiSettings,
    callAiHubProvider,
    showToast,
  } = useApp();

  const [draft, setDraft] = useState<AiHubSettings>(aiSettings);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setDraft(aiSettings);
      setTestStatus('');
    }
  }, [visible, aiSettings]);

  const prov = draft.activeProvider;
  const keyFieldMap: Record<AiProviderKey, keyof AiHubSettings> = {
    gemini: 'geminiKey',
    grok: 'grokKey',
    claude: 'claudeKey',
    openai: 'openaiKey',
    deepseek: 'deepseekKey',
    openrouter: 'openrouterKey',
    custom: 'customKey',
  };
  const modelFieldMap: Record<AiProviderKey, keyof AiHubSettings> = {
    gemini: 'geminiModel',
    grok: 'grokModel',
    claude: 'claudeModel',
    openai: 'openaiModel',
    deepseek: 'deepseekModel',
    openrouter: 'openrouterModel',
    custom: 'customModel',
  };

  const activeKeyName = keyFieldMap[prov];
  const activeModelName = modelFieldMap[prov];

  const handleTest = async () => {
    setAiSettings(draft);
    setTesting(true);
    setTestStatus('Проверяем связь с нейросетью...');
    try {
      const ans = await callAiHubProvider('Ответь одним словом: Работает', {
        providerOverride: prov,
        maxChars: 80,
      });
      setTestStatus(`✓ Успешно: ${ans.slice(0, 80)}`);
    } catch (e: any) {
      setTestStatus(`⚠️ Ошибка: ${e?.message || 'Сбой соединения'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleClearAiChat = async () => {
    if (!me?.uid) return;
    const chatId = `aihub_${me.uid}`;
    await remove(ref(rtdb, `messages/${chatId}`)).catch(() => {});
    await update(ref(rtdb, `chats/${chatId}`), {
      lastMsg: 'Диалог очищен. Готов к новым вопросам.',
      lastMsgAt: Date.now(),
    }).catch(() => {});
    triggerHaptic(14);
    showToast('ИИ Хаб очищен 🗑️', undefined, 'info');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassCard radius={28} strong style={styles.card}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: appTheme.text }]}>🤖 Настройки ИИ Хаба</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={appTheme.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {PROVIDERS.map((p) => {
                const act = prov === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => setDraft((prev) => ({ ...prev, activeProvider: p.key }))}
                    style={[
                      styles.provTab,
                      {
                        backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.06)',
                        borderColor: act ? appTheme.accent : appTheme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: act ? appTheme.accent : appTheme.textSub, fontWeight: '800', fontSize: 12 }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.lbl}>API-КЛЮЧ (ЕСЛИ ПУСТО — РАБОТАЕТ БЕСПЛАТНЫЙ ШЛЮЗ)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TextInput
                style={[styles.input, { flex: 1, color: appTheme.text, borderColor: appTheme.border }]}
                value={String(draft[activeKeyName] || '')}
                onChangeText={(v) => setDraft((prev) => ({ ...prev, [activeKeyName]: v }))}
                placeholder={`Ключ для ${prov.toUpperCase()}...`}
                placeholderTextColor={appTheme.textSub}
                secureTextEntry={!showKey}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowKey((v) => !v)}
                style={[styles.eyeBtn, { borderColor: appTheme.border }]}
              >
                <Ionicons name={showKey ? 'eye-off' : 'eye'} size={18} color={appTheme.textSub} />
              </TouchableOpacity>
            </View>

            {prov === 'custom' && (
              <>
                <Text style={styles.lbl}>ENDPOINT URL (OLLAMA / VLLM)</Text>
                <TextInput
                  style={[styles.input, { color: appTheme.text, borderColor: appTheme.border }]}
                  value={draft.customUrl}
                  onChangeText={(v) => setDraft((prev) => ({ ...prev, customUrl: v }))}
                  placeholder="http://localhost:11434/v1"
                  placeholderTextColor={appTheme.textSub}
                  autoCapitalize="none"
                />
              </>
            )}

            <Text style={styles.lbl}>МОДЕЛЬ</Text>
            <TextInput
              style={[styles.input, { color: appTheme.text, borderColor: appTheme.border }]}
              value={String(draft[activeModelName] || '')}
              onChangeText={(v) => setDraft((prev) => ({ ...prev, [activeModelName]: v }))}
              placeholder="Название модели..."
              placeholderTextColor={appTheme.textSub}
              autoCapitalize="none"
            />

            <Text style={styles.lbl}>СИСТЕМНЫЙ ПРОМПТ И ХАРАКТЕР</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {PROMPT_PRESETS.map((pr) => (
                <TouchableOpacity
                  key={pr.label}
                  onPress={() => setDraft((prev) => ({ ...prev, systemPrompt: pr.text }))}
                  style={[styles.provTab, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: appTheme.border }]}
                >
                  <Text style={{ color: '#e2e8f0', fontSize: 11.5, fontWeight: '700' }}>{pr.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              multiline
              style={[styles.input, { color: appTheme.text, borderColor: appTheme.border, minHeight: 68, textAlignVertical: 'top' }]}
              value={draft.systemPrompt}
              onChangeText={(v) => setDraft((prev) => ({ ...prev, systemPrompt: v }))}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleTest}
                disabled={testing}
                style={[styles.secBtn, { flex: 1, borderColor: appTheme.accent }]}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={appTheme.accent} />
                ) : (
                  <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 12.5 }}>
                    🔌 Проверить связь
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearAiChat}
                style={[styles.secBtn, { borderColor: 'rgba(239,68,68,0.45)', paddingHorizontal: 14 }]}
              >
                <Text style={{ color: '#f87171', fontWeight: '800', fontSize: 12.5 }}>🗑️ Очистить</Text>
              </TouchableOpacity>
            </View>

            {!!testStatus && (
              <Text style={{ color: testStatus.startsWith('✓') ? '#4ade80' : '#fbbf24', fontSize: 12, fontWeight: '700' }}>
                {testStatus}
              </Text>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: appTheme.accent }]}
            onPress={() => {
              setAiSettings(draft);
              showToast('ИИ Хаб сохранён 🤖', `Активен: ${draft.activeProvider.toUpperCase()}`, 'success');
              onClose();
            }}
          >
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 14.5 }}>Сохранить настройки</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end', padding: 12 },
  card: { padding: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  provTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  lbl: { color: '#94a3b8', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, marginTop: 4 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secBtn: {
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  saveBtn: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
  },
});
