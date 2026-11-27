import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { onValue, ref, remove } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { FramedAvatar } from './FramedAvatar';
import { GlassCard } from './GlassCard';

interface AccountsDevicesHiddenModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AccountsDevicesHiddenModal: React.FC<AccountsDevicesHiddenModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    me,
    appTheme,
    showToast,
    savedAccounts,
    switchSavedAccount,
    removeSavedAccount,
    loginWithNickOrEmail,
    deviceSessionId,
    hiddenVaultChatIds,
    vaultPasscode,
    setVaultPasscode,
    toggleVaultChat,
    chats,
  } = useApp();

  const [tab, setTab] = useState<'accounts' | 'devices' | 'vault'>('accounts');
  const [sessions, setSessions] = useState<any[]>([]);
  const [addingAccount, setAddingAccount] = useState(false);
  const [addLogin, setAddLogin] = useState('');
  const [addPass, setAddPass] = useState('');
  const [vaultInput, setVaultInput] = useState(vaultPasscode);

  useEffect(() => {
    if (!visible || !me?.uid) return;
    setVaultInput(vaultPasscode);
    const sRef = ref(rtdb, `users/${me.uid}/sessions`);
    const unsub = onValue(sRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.keys(val)
        .map((k) => ({ id: k, ...val[k] }))
        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
      setSessions(list);
    });
    return () => unsub();
  }, [visible, me?.uid]);

  const handleAddAccount = async () => {
    if (!addLogin.trim() || !addPass.trim()) return;
    try {
      await loginWithNickOrEmail(addLogin.trim(), addPass);
      setAddingAccount(false);
      setAddLogin('');
      setAddPass('');
      onClose();
      showToast('Аккаунт переключён 🔄', undefined, 'success');
    } catch (e: any) {
      showToast('Ошибка входа', e?.message || 'Проверьте логин и пароль', 'error');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassCard radius={28} strong style={styles.card}>
          <Text style={[styles.title, { color: appTheme.text }]}>
            Мультиаккаунт, Устройства и Сейф
          </Text>

          <View style={styles.tabs}>
            {[
              { k: 'accounts', l: '🔄 Аккаунты' },
              { k: 'devices', l: '📱 Сеансы' },
              { k: 'vault', l: '🕵️ Сейф' },
            ].map((t) => {
              const act = tab === t.k;
              return (
                <TouchableOpacity
                  key={t.k}
                  onPress={() => setTab(t.k as any)}
                  style={[
                    styles.tabBtn,
                    {
                      backgroundColor: act ? appTheme.accentSoft : 'rgba(255,255,255,0.05)',
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
          </View>

          <ScrollView style={{ maxHeight: 330 }}>
            {tab === 'accounts' && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: appTheme.textSub, fontSize: 12 }}>
                  Быстрое переключение до 3 аккаунтов (как в ТГ):
                </Text>
                {savedAccounts.map((acc) => {
                  const isCurrent = acc.uid === me?.uid;
                  return (
                    <TouchableOpacity
                      key={acc.uid}
                      style={[
                        styles.row,
                        isCurrent && { borderColor: appTheme.accent, backgroundColor: appTheme.accentSoft },
                      ]}
                      onPress={async () => {
                        if (isCurrent) return;
                        try {
                          await switchSavedAccount(acc);
                          onClose();
                          showToast('Добро пожаловать 🔄', `@${acc.nick}`, 'success');
                        } catch (e: any) {
                          setAddingAccount(true);
                          setAddLogin(acc.email || acc.nick);
                          showToast('Введите пароль', e?.message, 'info');
                        }
                      }}
                    >
                      <FramedAvatar uri={acc.avatar} name={acc.nick} size={40} online={isCurrent} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                          @{acc.nick} {isCurrent ? '✓ (Активен)' : ''}
                        </Text>
                        <Text style={{ color: appTheme.textSub, fontSize: 11.5 }}>{acc.email}</Text>
                      </View>
                      {!isCurrent && (
                        <TouchableOpacity onPress={() => removeSavedAccount(acc.uid)} style={{ padding: 6 }}>
                          <Text style={{ color: '#f87171', fontWeight: '800' }}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {savedAccounts.length < 3 && !addingAccount && (
                  <TouchableOpacity
                    style={[styles.priBtn, { backgroundColor: appTheme.accent }]}
                    onPress={() => setAddingAccount(true)}
                  >
                    <Text style={{ color: '#000', fontWeight: '900' }}>＋ Добавить аккаунт ({savedAccounts.length}/3)</Text>
                  </TouchableOpacity>
                )}

                {addingAccount && (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    <TextInput
                      style={[styles.input, { color: appTheme.text, borderColor: appTheme.border }]}
                      placeholder="@юзернейм или Email"
                      placeholderTextColor={appTheme.textSub}
                      autoCapitalize="none"
                      value={addLogin}
                      onChangeText={setAddLogin}
                    />
                    <TextInput
                      style={[styles.input, { color: appTheme.text, borderColor: appTheme.border }]}
                      placeholder="Пароль"
                      placeholderTextColor={appTheme.textSub}
                      secureTextEntry
                      value={addPass}
                      onChangeText={setAddPass}
                    />
                    <TouchableOpacity
                      style={[styles.priBtn, { backgroundColor: appTheme.accent }]}
                      onPress={handleAddAccount}
                    >
                      <Text style={{ color: '#000', fontWeight: '900' }}>Войти и привязать</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {tab === 'devices' && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: appTheme.textSub, fontSize: 12 }}>
                  Активные устройства и сеансы вашего аккаунта:
                </Text>
                {sessions.map((s) => {
                  const isThis = s.id === deviceSessionId;
                  return (
                    <View key={s.id} style={styles.row}>
                      <Text style={{ fontSize: 22, marginRight: 10 }}>{isThis ? '📱' : '💻'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>
                          {s.device || 'Устройство'} {isThis ? '· Это устройство' : ''}
                        </Text>
                        <Text style={{ color: appTheme.textSub, fontSize: 11.5 }}>
                          Активность: {s.lastActive ? new Date(s.lastActive).toLocaleString('ru-RU') : 'недавно'}
                        </Text>
                      </View>
                      {!isThis && me?.uid && (
                        <TouchableOpacity
                          onPress={() => {
                            remove(ref(rtdb, `users/${me.uid}/sessions/${s.id}`));
                            triggerHaptic(12);
                            showToast('Сеанс завершён', undefined, 'info');
                          }}
                        >
                          <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }}>Выйти</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                {sessions.length > 1 && me?.uid && (
                  <TouchableOpacity
                    style={[styles.priBtn, { backgroundColor: 'rgba(239,68,68,0.2)' }]}
                    onPress={() => {
                      sessions.forEach((s) => {
                        if (s.id !== deviceSessionId) {
                          remove(ref(rtdb, `users/${me.uid}/sessions/${s.id}`));
                        }
                      });
                      showToast('Готово 🛡️', 'Все другие сеансы завершены', 'success');
                    }}
                  >
                    <Text style={{ color: '#f87171', fontWeight: '900' }}>✋ Завершить все другие сеансы</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {tab === 'vault' && (
              <View style={{ gap: 10 }}>
                <Text style={{ color: appTheme.textSub, fontSize: 12, lineHeight: 17 }}>
                  Скрытые чаты исчезают из общего списка! Чтобы увидеть их, просто введите секретный код в строку поиска чатов.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: appTheme.text, borderColor: appTheme.border }]}
                    placeholder="Секретный код сейфа"
                    placeholderTextColor={appTheme.textSub}
                    value={vaultInput}
                    onChangeText={setVaultInput}
                  />
                  <TouchableOpacity
                    style={[styles.priBtn, { backgroundColor: appTheme.accent, paddingHorizontal: 16 }]}
                    onPress={() => {
                      setVaultPasscode(vaultInput);
                      showToast('Код сейфа обновлён 🕵️', `Введите «${vaultInput}» в поиске чатов`, 'success');
                    }}
                  >
                    <Text style={{ color: '#000', fontWeight: '900' }}>Сохр.</Text>
                  </TouchableOpacity>
                </View>

                <Text style={{ color: appTheme.accent, fontSize: 12, fontWeight: '800', marginTop: 4 }}>
                  СКРЫТЫХ ЧАТОВ В СЕЙФЕ: {hiddenVaultChatIds.length}
                </Text>
                {hiddenVaultChatIds.map((cid) => {
                  const ch = chats.find((c) => c.id === cid);
                  return (
                    <View key={cid} style={styles.row}>
                      <Text style={{ color: '#fff', flex: 1, fontWeight: '700' }}>
                        🕵️ {ch?.name || `Чат ${cid.slice(0, 6)}`}
                      </Text>
                      <TouchableOpacity onPress={() => toggleVaultChat(cid)}>
                        <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 12 }}>Вернуть</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={{ color: appTheme.textSub, fontWeight: '700' }}>Закрыть</Text>
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
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  priBtn: {
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
