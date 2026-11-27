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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { push, ref, remove, set, update } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { ChatItem, useApp } from '../context/AppContext';
import { FramedAvatar } from './FramedAvatar';
import { GlassCard } from './GlassCard';

interface GroupTopicsAdminModalProps {
  visible: boolean;
  onClose: () => void;
  chat: ChatItem;
}

export const GroupTopicsAdminModal: React.FC<GroupTopicsAdminModalProps> = ({
  visible,
  onClose,
  chat,
}) => {
  const { me, usersMap, appTheme, showToast } = useApp();
  const [tab, setTab] = useState<'topics' | 'admins' | 'slow'>('topics');
  const [topicName, setTopicName] = useState('');
  const [topicIcon, setTopicIcon] = useState('💬');
  const [titleUid, setTitleUid] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');

  const isAdmin =
    !!me &&
    (chat.owner === me.uid ||
      (Array.isArray(chat.admins) && chat.admins.includes(me.uid)));

  const topicsObj = chat.topics && typeof chat.topics === 'object' ? chat.topics : {};
  const topicsList = Object.keys(topicsObj).map((k) => ({ id: k, ...topicsObj[k] }));
  const adminsList: string[] = Array.isArray(chat.admins)
    ? chat.admins
    : chat.admins && typeof chat.admins === 'object'
    ? Object.values(chat.admins)
    : [];
  const bannedList: string[] = Array.isArray(chat.bannedUids)
    ? chat.bannedUids
    : chat.bannedUids && typeof chat.bannedUids === 'object'
    ? Object.values(chat.bannedUids)
    : [];
  const adminTitles = chat.adminTitles && typeof chat.adminTitles === 'object' ? chat.adminTitles : {};
  const slowSec = Number(chat.slowModeSec) || 0;

  const handleAddTopic = async () => {
    const clean = topicName.trim();
    if (!clean || !isAdmin) return;
    const tRef = push(ref(rtdb, `chats/${chat.id}/topics`));
    await set(tRef, { name: clean, icon: topicIcon, createdAt: Date.now() });
    await update(ref(rtdb, `chats/${chat.id}`), { topicsEnabled: true });
    setTopicName('');
    triggerHaptic(12);
  };

  const toggleAdmin = async (uid: string) => {
    if (!isAdmin || uid === chat.owner) return;
    const next = adminsList.includes(uid)
      ? adminsList.filter((u) => u !== uid)
      : [...adminsList, uid];
    await update(ref(rtdb, `chats/${chat.id}`), { admins: next });
    triggerHaptic(10);
  };

  const saveAdminTitle = async (uid: string) => {
    if (!isAdmin) return;
    await update(ref(rtdb, `chats/${chat.id}/adminTitles`), {
      [uid]: titleInput.trim() || null,
    });
    setTitleUid(null);
    setTitleInput('');
    showToast('Титул сохранён 👑', undefined, 'success');
  };

  const toggleBanUser = async (uid: string) => {
    if (!isAdmin || uid === chat.owner) return;
    const isBanned = bannedList.includes(uid);
    const nextBanned = isBanned ? bannedList.filter((u) => u !== uid) : [...bannedList, uid];
    const nextMembers = isBanned
      ? Array.from(new Set([...(chat.members || []), uid]))
      : (chat.members || []).filter((u) => u !== uid);
    await update(ref(rtdb, `chats/${chat.id}`), {
      bannedUids: nextBanned,
      members: nextMembers,
    });
    triggerHaptic(14);
    showToast(isBanned ? 'Разбанен' : 'Заблокирован в группе 🚫', undefined, 'info');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassCard radius={28} strong style={styles.sheet}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: appTheme.text }]}>👑 Управление группой</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={appTheme.textSub} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            {[
              { k: 'topics', l: '# Темы' },
              { k: 'admins', l: '👑 Админы и ЧС' },
              { k: 'slow', l: '🐢 Слоумод' },
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

          <ScrollView style={{ maxHeight: 370 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
            {tab === 'topics' && (
              <>
                <View style={styles.switchRow}>
                  <Text style={{ color: appTheme.text, fontWeight: '700', flex: 1 }}>
                    Режим форума (Темы-разделы)
                  </Text>
                  <Switch
                    value={!!chat.topicsEnabled}
                    disabled={!isAdmin}
                    onValueChange={(val) => update(ref(rtdb, `chats/${chat.id}`), { topicsEnabled: val })}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: appTheme.accent }}
                    thumbColor="#fff"
                  />
                </View>

                {isAdmin && (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {['💬', '🔥', '📢', '😂', '🎮', '🛠️'].map((ic) => (
                        <TouchableOpacity
                          key={ic}
                          onPress={() => setTopicIcon(ic)}
                          style={[
                            styles.iconChip,
                            topicIcon === ic && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent },
                          ]}
                        >
                          <Text style={{ fontSize: 16 }}>{ic}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={topicName}
                        onChangeText={setTopicName}
                        placeholder="Новая тема (напр. Флуд)..."
                        placeholderTextColor={appTheme.textSub}
                        style={[styles.input, { color: appTheme.text, borderColor: appTheme.border, flex: 1 }]}
                      />
                      <TouchableOpacity
                        onPress={handleAddTopic}
                        style={[styles.addBtn, { backgroundColor: appTheme.accent }]}
                      >
                        <Text style={{ color: '#000', fontWeight: '900' }}>＋</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {topicsList.map((tp: any) => (
                  <View key={tp.id} style={[styles.memberRow, { borderColor: appTheme.border }]}>
                    <Text style={{ fontSize: 18 }}>{tp.icon || '#️⃣'}</Text>
                    <Text style={{ color: appTheme.text, fontWeight: '700', flex: 1 }}>{tp.name}</Text>
                    {isAdmin && (
                      <TouchableOpacity onPress={() => remove(ref(rtdb, `chats/${chat.id}/topics/${tp.id}`))}>
                        <Ionicons name="trash-outline" size={18} color="#f87171" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </>
            )}

            {tab === 'admins' && (
              <>
                {(chat.members || []).map((uid) => {
                  const u = usersMap[uid];
                  const nick = u?.nick || uid.slice(0, 8);
                  const memberIsAdmin = uid === chat.owner || adminsList.includes(uid);
                  const customTitle = adminTitles[uid] || (uid === chat.owner ? 'Владелец' : '');
                  return (
                    <View key={uid} style={[styles.memberRow, { borderColor: appTheme.border, flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <FramedAvatar uri={u?.avatar} name={nick} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: appTheme.text, fontWeight: '700' }}>
                            {nick} {memberIsAdmin ? '👑' : ''}
                          </Text>
                          {!!customTitle && (
                            <Text style={{ color: appTheme.accent, fontSize: 11.5, fontWeight: '700' }}>
                              Титул: {customTitle}
                            </Text>
                          )}
                        </View>
                        {isAdmin && uid !== chat.owner && (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              onPress={() => toggleAdmin(uid)}
                              style={[styles.miniBtn, { backgroundColor: appTheme.accentSoft }]}
                            >
                              <Text style={{ color: appTheme.accent, fontSize: 11, fontWeight: '800' }}>
                                {memberIsAdmin ? 'Снять' : '+Адм'}
                              </Text>
                            </TouchableOpacity>
                            {memberIsAdmin && (
                              <TouchableOpacity
                                onPress={() => {
                                  setTitleUid(uid);
                                  setTitleInput(adminTitles[uid] || '');
                                }}
                                style={[styles.miniBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                              >
                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Титул</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => toggleBanUser(uid)}
                              style={[styles.miniBtn, { backgroundColor: 'rgba(239,68,68,0.18)' }]}
                            >
                              <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '800' }}>Бан</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                      {titleUid === uid && (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                          <TextInput
                            value={titleInput}
                            onChangeText={setTitleInput}
                            placeholder="Кастомная должность (напр. Босс)"
                            placeholderTextColor={appTheme.textSub}
                            style={[styles.input, { color: appTheme.text, borderColor: appTheme.border, flex: 1, height: 36 }]}
                          />
                          <TouchableOpacity
                            onPress={() => saveAdminTitle(uid)}
                            style={[styles.addBtn, { backgroundColor: appTheme.accent, height: 36 }]}
                          >
                            <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>ОК</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}

                {bannedList.length > 0 && (
                  <>
                    <Text style={{ color: '#f87171', fontWeight: '800', fontSize: 12, marginTop: 8 }}>
                      ЗАБЛОКИРОВАННЫЕ ({bannedList.length})
                    </Text>
                    {bannedList.map((uid) => (
                      <View key={uid} style={[styles.memberRow, { borderColor: appTheme.border }]}>
                        <Text style={{ color: appTheme.text, flex: 1 }}>{usersMap[uid]?.nick || uid}</Text>
                        {isAdmin && (
                          <TouchableOpacity onPress={() => toggleBanUser(uid)}>
                            <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 12 }}>Разбанить</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            {tab === 'slow' && (
              <View style={{ gap: 10 }}>
                <Text style={{ color: appTheme.textSub, fontSize: 13 }}>
                  Ограничивает частоту отправки сообщений для обычных участников группы:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { sec: 0, label: 'Выкл' },
                    { sec: 10, label: '10 сек' },
                    { sec: 30, label: '30 сек' },
                    { sec: 60, label: '1 мин' },
                    { sec: 300, label: '5 мин' },
                  ].map((opt) => {
                    const act = slowSec === opt.sec;
                    return (
                      <TouchableOpacity
                        key={opt.sec}
                        disabled={!isAdmin}
                        onPress={() => {
                          update(ref(rtdb, `chats/${chat.id}`), { slowModeSec: opt.sec });
                          triggerHaptic(10);
                        }}
                        style={[
                          styles.slowChip,
                          {
                            backgroundColor: act ? appTheme.accent : 'rgba(255,255,255,0.07)',
                            borderColor: act ? appTheme.accent : appTheme.border,
                          },
                        ]}
                      >
                        <Text style={{ color: act ? '#000' : appTheme.text, fontWeight: '800' }}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-end', padding: 12 },
  sheet: { padding: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { height: 42, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.28)' },
  addBtn: { paddingHorizontal: 14, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  miniBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  slowChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
});
