import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';

interface PowerTemplatesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PowerTemplatesModal: React.FC<PowerTemplatesModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    appTheme,
    powerSaveMode,
    setPowerSaveMode,
    quickTemplates,
    saveQuickTemplate,
    deleteQuickTemplate,
    showToast,
  } = useApp();

  const [cmd, setCmd] = useState('');
  const [tplText, setTplText] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassCard radius={28} strong style={styles.card}>
          <Text style={[styles.title, { color: appTheme.text }]}>
            🔋 Энергосбережение и /шаблоны
          </Text>

          <View style={[styles.powerRow, { borderColor: appTheme.border }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                🔋 Режим энергосбережения
              </Text>
              <Text style={{ color: appTheme.textSub, fontSize: 11.5, marginTop: 2 }}>
                Отключает фоновые свечения, полноэкранные частицы эффектов и лишние анимации для экономии заряда
              </Text>
            </View>
            <Switch
              value={powerSaveMode}
              onValueChange={setPowerSaveMode}
              trackColor={{ false: 'rgba(255,255,255,0.12)', true: '#22c55e' }}
              thumbColor="#fff"
            />
          </View>

          <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 6 }}>
            ⚡ БЫСТРЫЕ ЗАГОТОВКИ ОТВЕТОВ (/ШАБЛОНЫ)
          </Text>
          <Text style={{ color: appTheme.textSub, fontSize: 11.5, marginBottom: 8 }}>
            Начните вводить «/» в любом чате, чтобы мгновенно вставить заготовку:
          </Text>

          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
            <TextInput
              style={[styles.input, { width: 95, color: appTheme.text, borderColor: appTheme.border }]}
              placeholder="/команда"
              placeholderTextColor={appTheme.textSub}
              autoCapitalize="none"
              value={cmd}
              onChangeText={setCmd}
            />
            <TextInput
              style={[styles.input, { flex: 1, color: appTheme.text, borderColor: appTheme.border }]}
              placeholder="Текст быстрого ответа..."
              placeholderTextColor={appTheme.textSub}
              value={tplText}
              onChangeText={setTplText}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: appTheme.accent }]}
              onPress={() => {
                if (!cmd.trim() || !tplText.trim()) return;
                saveQuickTemplate(cmd, tplText);
                setCmd('');
                setTplText('');
                showToast('Шаблон добавлен ⚡', undefined, 'success');
              }}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>＋</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 200 }}>
            {quickTemplates.map((t) => (
              <View key={t.id} style={[styles.tplRow, { borderColor: appTheme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: appTheme.accent, fontWeight: '900', fontSize: 13 }}>/{t.cmd}</Text>
                  <Text style={{ color: '#e2e8f0', fontSize: 12.5 }} numberOfLines={2}>
                    {t.text}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteQuickTemplate(t.id)} style={{ padding: 6 }}>
                  <Text style={{ color: '#ef4444', fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={{ color: appTheme.textSub, fontWeight: '700' }}>Готово</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.74)', justifyContent: 'center', padding: 16 },
  card: { padding: 18 },
  title: { fontSize: 16.5, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  powerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  addBtn: {
    width: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tplRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
