import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  Share,
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
  const [tab, setTab] = useState<'topics' | 'admins' | 'slow' | 'invites' | 'logs'>('topics');
  const [topicName, setTopicName] = useState('');
  const [topicIcon, setTopicIcon] = useState('💬');
  const [titleUid, setTitleUid] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [invMaxUses, setInvMaxUses] = useState<number>(0);
  const [invExpireHours, setInvExpireHours] = useState<number>(0);
  const [invApproval, setInvApproval] = useState<boolean>(false);

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
  const invitesList = chat.invites && typeof chat.invites === 'object'
    ? Object.keys(chat.invites).map((k) => ({ code: k, ...chat.invites[k] }))
    : [];
  const joinRequestsList = chat.joinRequests && typeof chat.joinRequests === 'object'
    ? Object.keys(chat.joinRequests).map((k) => ({ uid: k, ...chat.joinRequests[k] }))
    : [];
  const adminLogsList = chat.adminLogs && typeof chat.adminLogs === 'object'
    ? Object.keys(chat.adminLogs)
        .map((k) => ({ id: k, ...chat.adminLogs[k] }))
        .sort((a, b) => (b.at || 0) - (a.at || 0))
    : [];

  const logAction = async (text: string) => {
    const lRef = push(ref(rtdb, `chats/${chat.id}/adminLogs`));
    await set(lRef, {
      actor: me?.nick || 'Админ',
      text,
      at: Date.now(),
    }).catch(() => {});
  };

  const handleCreateInvite = async () => {
    if (!isAdmin) return;
    const code = `nc_${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      code,
      chatId: chat.id,
      chatName: chat.name || 'Сообщество',
      maxUses: invMaxUses,
      usedCount: 0,
      expiresAt: invExpireHours > 0 ? Date.now() + invExpireHours * 3600 * 1000 : 0,
      requireApproval: invApproval,
      createdBy: me?.nick || 'Админ',
      createdAt: Date.now(),
    };
    await set(ref(rtdb, `chat_invites/${code}`), payload);
    await set(ref(rtdb, `chats/${chat.id}/invites/${code}`), payload);
    await logAction(`Создал инвайт-ссылку ${code}${invApproval ? ' (по заявкам)' : ''}`);
    triggerHaptic(14);
    showToast('Инвайт создан 🔗', `Код: ${code}`, 'success');
  };

  const handleApproveJoin = async (reqUid: string, approve: boolean) => {
    if (!isAdmin) return;
    if (approve) {
      const nextMembers = Array.from(new Set([...(chat.members || []), reqUid]));
      await update(ref(rtdb, `chats/${chat.id}`), { members: nextMembers });
      await logAction(`Одобрил заявку @${usersMap[reqUid]?.nick || reqUid.slice(0, 6)}`);
    } else {
      await logAction(`Отклонил заявку @${usersMap[reqUid]?.nick || reqUid.slice(0, 6)}`);
    }
    await remove(ref(rtdb, `chats/${chat.id}/joinRequests/${reqUid}`));
    triggerHaptic(12);
  };

  const handleAddTopic = async () => {
    const clean = topicName.trim();
    if (!clean || !isAdmin) return;
    const tRef = push(ref(rtdb, `chats/${chat.id}/topics`));
    await set(tRef, { name: clean, icon: topicIcon, createdAt: Date.now() });
    await update(ref(rtdb, `chats/${chat.id}`), { topicsEnabled: true });
    await logAction(`Создал тему «${topicIcon} ${clean}»`);
    setTopicName('');
    triggerHaptic(12);
  };

  const toggleAdmin = async (uid: string) => {
    if (!isAdmin || uid === chat.owner) return;
    const next = adminsList.includes(uid)
      ? adminsList.filter((u) => u !== uid)
      : [...adminsList, uid];
    await update(ref(rtdb, `chats/${chat.id}`), { admins: next });
    await logAction(`${adminsList.includes(uid) ? 'Снял админку с' : 'Назначил админом'} @${usersMap[uid]?.nick || uid.slice(0, 6)}`);
    triggerHaptic(10);
  };

  const saveAdminTitle = async (uid: string) => {
    if (!isAdmin) return;
    await update(ref(rtdb, `chats/${chat.id}/adminTitles`), {
      [uid]: titleInput.trim() || null,
    });
    await logAction(`Изменил титул @${usersMap[uid]?.nick || uid.slice(0, 6)} → «${titleInput.trim() || 'без титула'}»`);
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
    await logAction(`${isBanned ? 'Разбанил' : 'Забанил'} @${usersMap[uid]?.nick || uid.slice(0, 6)}`);
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {[
              { k: 'topics', l: '# Темы' },
              { k: 'admins', l: '👑 Админы' },
              { k: 'invites', l: `🔗 Инвайты${joinRequestsList.length ? ` (${joinRequestsList.length})` : ''}` },
              { k: 'slow', l: '🐢 Слоумод' },
              { k: 'logs', l: '📋 Журнал' },
            ].map((t) => {
              const act = tab === t.k;
              return (
                <TouchableOpacity
                  key={t.k}
                  onPress={() => setTab(t.k as any)}
                  style={[
                    styles.tabBtn,
                    {
                      paddingHorizontal: 12,
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
          </ScrollView>

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
                          logAction(`Установил медленный режим: ${opt.label}`);
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

            {tab === 'invites' && (
              <View style={{ gap: 10 }}>
                {isAdmin && (
                  <View style={[styles.memberRow, { borderColor: appTheme.border, flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                    <Text style={{ color: appTheme.text, fontWeight: '800', fontSize: 13.5 }}>
                      🔗 Создать пригласительную ссылку
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        { v: 0, l: 'Без лимита' },
                        { v: 5, l: 'До 5 чел.' },
                        { v: 25, l: 'До 25 чел.' },
                      ].map((m) => (
                        <TouchableOpacity
                          key={m.v}
                          onPress={() => setInvMaxUses(m.v)}
                          style={[
                            styles.miniBtn,
                            { backgroundColor: invMaxUses === m.v ? appTheme.accentSoft : 'rgba(255,255,255,0.06)' },
                          ]}
                        >
                          <Text style={{ color: invMaxUses === m.v ? appTheme.accent : appTheme.textSub, fontSize: 11.5, fontWeight: '800' }}>
                            {m.l}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {[
                        { v: 0, l: 'Бессрочно' },
                        { v: 24, l: '24 часа' },
                        { v: 168, l: '7 дней' },
                      ].map((e) => (
                        <TouchableOpacity
                          key={e.v}
                          onPress={() => setInvExpireHours(e.v)}
                          style={[
                            styles.miniBtn,
                            { backgroundColor: invExpireHours === e.v ? appTheme.accentSoft : 'rgba(255,255,255,0.06)' },
                          ]}
                        >
                          <Text style={{ color: invExpireHours === e.v ? appTheme.accent : appTheme.textSub, fontSize: 11.5, fontWeight: '800' }}>
                            {e.l}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.switchRow}>
                      <Text style={{ color: appTheme.textSub, fontSize: 12.5, flex: 1 }}>
                        Вход только после одобрения заявки админом
                      </Text>
                      <Switch
                        value={invApproval}
                        onValueChange={setInvApproval}
                        trackColor={{ false: 'rgba(255,255,255,0.1)', true: appTheme.accent }}
                        thumbColor="#fff"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handleCreateInvite}
                      style={[styles.addBtn, { backgroundColor: appTheme.accent }]}
                    >
                      <Text style={{ color: '#000', fontWeight: '900' }}>＋ Сгенерировать ссылку</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {joinRequestsList.length > 0 && (
                  <>
                    <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                      ЗАЯВКИ НА ВСТУПЛЕНИЕ ({joinRequestsList.length})
                    </Text>
                    {joinRequestsList.map((jr: any) => (
                      <View key={jr.uid} style={[styles.memberRow, { borderColor: appTheme.border }]}>
                        <FramedAvatar uri={jr.avatar} name={jr.nick || '?'} size={34} />
                        <Text style={{ color: '#fff', fontWeight: '700', flex: 1 }}>@{jr.nick || jr.uid.slice(0, 6)}</Text>
                        {isAdmin && (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              onPress={() => handleApproveJoin(jr.uid, true)}
                              style={[styles.miniBtn, { backgroundColor: '#22c55e' }]}
                            >
                              <Text style={{ color: '#000', fontWeight: '900', fontSize: 11.5 }}>Принять</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleApproveJoin(jr.uid, false)}
                              style={[styles.miniBtn, { backgroundColor: 'rgba(239,68,68,0.2)' }]}
                            >
                              <Text style={{ color: '#f87171', fontWeight: '800', fontSize: 11.5 }}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </>
                )}

                {invitesList.map((inv: any) => (
                  <TouchableOpacity
                    key={inv.code}
                    onPress={() =>
                      Share.share({
                        message: `Присоединяйся в «${chat.name || 'Сообщество'}» в NonsenseChat! Код инвайта: ${inv.code} (nonsensechat://join/${inv.code})`,
                      }).catch(() => {})
                    }
                    style={[styles.memberRow, { borderColor: appTheme.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: appTheme.accent, fontWeight: '900', fontSize: 13.5 }}>
                        🔗 {inv.code}
                      </Text>
                      <Text style={{ color: appTheme.textSub, fontSize: 11.5 }}>
                        Вступлений: {inv.usedCount || 0}
                        {inv.maxUses ? `/${inv.maxUses}` : ''} · {inv.requireApproval ? 'По заявкам' : 'Свободный вход'}
                      </Text>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Поделиться ↗</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {tab === 'logs' && (
              <View style={{ gap: 8 }}>
                {adminLogsList.length === 0 ? (
                  <Text style={{ color: appTheme.textSub, textAlign: 'center', marginTop: 18 }}>
                    Журнал недавних действий пока пуст
                  </Text>
                ) : (
                  adminLogsList.map((lg: any) => (
                    <View key={lg.id} style={[styles.memberRow, { borderColor: appTheme.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 12 }}>
                          👑 {lg.actor}
                        </Text>
                        <Text style={{ color: '#e2e8f0', fontSize: 13, marginTop: 2 }}>{lg.text}</Text>
                      </View>
                      <Text style={{ color: appTheme.textSub, fontSize: 11 }}>
                        {lg.at ? new Date(lg.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                  ))
                )}
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
