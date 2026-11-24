import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { CREATOR_UID, PROFILE_THEMES_CATALOG } from '../constants/catalogs';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

export default function UserProfileScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { uid: targetUid } = route.params || {};
  const { me, usersMap, chats, openOrCreateDm, appTheme, showToast } = useApp();

  const resolvedUid = targetUid || me?.uid || '';
  const isSelf = resolvedUid === me?.uid;
  const user = isSelf ? me : usersMap[resolvedUid];

  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!resolvedUid) return;
    const cRef = ref(rtdb, `users/${resolvedUid}/steam_comments`);
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.keys(val)
        .map((k) => ({ id: k, ...val[k] }))
        .sort((a, b) => (b.at || 0) - (a.at || 0));
      setComments(list);
    });
    return () => unsub();
  }, [resolvedUid]);

  if (!user) {
    return (
      <LiquidBackground>
        <View style={{ flex: 1, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: appTheme.textSub }}>Профиль не найден</Text>
        </View>
      </LiquidBackground>
    );
  }

  const theme =
    PROFILE_THEMES_CATALOG.find((t) => t.id === (user.steamTheme || 'classic')) ||
    PROFILE_THEMES_CATALOG[0];
  const isDev = resolvedUid === CREATOR_UID;
  const daysRegistered = user.createdAt
    ? Math.max(1, Math.floor((Date.now() - user.createdAt) / 86400000))
    : 1;

  const postComment = async () => {
    const clean = commentText.trim();
    if (!clean || !me) return;
    setPosting(true);
    try {
      const cRef = push(ref(rtdb, `users/${resolvedUid}/steam_comments`));
      await set(cRef, {
        authorUid: me.uid,
        authorNick: me.nick,
        authorAva: me.avatar || '',
        authorPrefix: me.prefix || '',
        authorPrefixStyle: me.prefixStyle || 'gold',
        authorPrefixSound: me.prefixSound || '',
        text: clean,
        at: Date.now(),
      });
      setCommentText('');
    } catch (e: any) {
      showToast('Ошибка', e?.message || 'Не удалось оставить комментарий', 'error');
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (cid: string) => {
    await remove(ref(rtdb, `users/${resolvedUid}/steam_comments/${cid}`));
  };

  const handleWrite = async () => {
    const chat = await openOrCreateDm(resolvedUid);
    if (chat) {
      navigation.navigate('ChatRoom', { chatId: chat.id, name: user.nick });
    }
  };

  return (
    <LiquidBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.topBar}>
            <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle}>ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ</Text>
            <View style={{ width: 34 }} />
          </GlassCard>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <GlassCard
            radius={RADII.CARD}
            style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.heroCenter}>
              <FramedAvatar
                uri={user.avatar}
                name={user.nick}
                frameId={user.steamFrame || 'none'}
                size={104}
                online={!!user.online}
              />
              <View style={styles.nameRow}>
                <Text style={styles.nick}>{user.nick}</Text>
                {user.prefix ? (
                  <PrefixBadge
                    prefix={user.prefix}
                    prefixStyle={user.prefixStyle}
                    prefixSound={user.prefixSound}
                    large
                  />
                ) : null}
                {isDev && (
                  <View style={styles.devBadge}>
                    <Text style={styles.devBadgeText}>&lt;/&gt;</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.statusText, user.online && { color: '#4ade80' }]}>
                {user.online ? '● В сети' : 'Не в сети'} · @{user.nickLower || user.nick}
              </Text>
            </View>

            {!!user.bio && (
              <View style={styles.bioBox}>
                <Text style={[styles.bioLabel, { color: theme.accent }]}>СВОДКА</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              {isSelf ? (
                <>
                  <ScalePressable style={{ flex: 1 }} onPress={() => navigation.navigate('EditProfile')}>
                    <View style={styles.btnSec}>
                      <Text style={styles.btnSecText}>✏️ Редактировать</Text>
                    </View>
                  </ScalePressable>
                  <ScalePressable style={{ flex: 1 }} onPress={() => navigation.navigate('ProfileCustomizer')}>
                    <View style={[styles.btnGold, { backgroundColor: '#d97706' }]}>
                      <Text style={styles.btnPriText}>🎨 Оформить</Text>
                    </View>
                  </ScalePressable>
                </>
              ) : (
                <>
                  <ScalePressable style={{ flex: 1 }} onPress={handleWrite}>
                    <View style={[styles.btnPri, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.btnPriText, { color: '#000' }]}>💬 Написать</Text>
                    </View>
                  </ScalePressable>
                  <ScalePressable
                    style={{ flex: 1 }}
                    onPress={() =>
                      navigation.navigate('PirozhkiStore', {
                        initialTab: 'gift',
                        targetUid: resolvedUid,
                      })
                    }
                  >
                    <View style={[styles.btnGold, { backgroundColor: '#d97706' }]}>
                      <Text style={styles.btnPriText}>🥟 Угостить</Text>
                    </View>
                  </ScalePressable>
                </>
              )}
            </View>
          </GlassCard>

          <GlassCard radius={RADII.CARD} style={[styles.showcase, { borderColor: theme.border }]}>
            <Text style={[styles.showcaseTitle, { color: theme.accent }]}>📊 СТАТИСТИКА ПРОФИЛЯ</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={styles.statVal}>{(user.pirozhki || 0).toLocaleString('ru-RU')}</Text>
                  <Image
                    source={require('../../android/app/src/main/assets/public/pirozhok.png')}
                    style={{ width: 18, height: 18 }}
                  />
                </View>
                <Text style={styles.statLbl}>Пирожков</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{daysRegistered} дн.</Text>
                <Text style={styles.statLbl}>Стаж</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{isSelf ? chats.length : comments.length}</Text>
                <Text style={styles.statLbl}>{isSelf ? 'Чатов' : 'Отзывов'}</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard radius={RADII.CARD} style={[styles.showcase, { borderColor: theme.border }]}>
            <Text style={[styles.showcaseTitle, { color: theme.accent }]}>
              💬 КОММЕНТАРИИ ПРОФИЛЯ ({comments.length})
            </Text>
            <View style={styles.commentComposer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Оставить комментарий (+rep)..."
                placeholderTextColor="#64748b"
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!commentText.trim() || posting) && { opacity: 0.5 }]}
                disabled={!commentText.trim() || posting}
                onPress={postComment}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>ОК</Text>
              </TouchableOpacity>
            </View>

            {comments.length === 0 ? (
              <Text style={styles.emptyComments}>Пока нет комментариев. Будьте первым, кто оставит +rep!</Text>
            ) : (
              comments.map((c) => {
                const canDel = me && (me.uid === c.authorUid || isSelf || me.uid === CREATOR_UID);
                return (
                  <View key={c.id} style={styles.commentCard}>
                    <FramedAvatar uri={c.authorAva} name={c.authorNick} size={34} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.commentAuthor}>{c.authorNick || 'Пользователь'}</Text>
                        {c.authorPrefix ? (
                          <PrefixBadge
                            prefix={c.authorPrefix}
                            prefixStyle={c.authorPrefixStyle}
                            prefixSound={c.authorPrefixSound}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.commentBody}>{c.text}</Text>
                    </View>
                    {canDel && (
                      <TouchableOpacity onPress={() => deleteComment(c.id)}>
                        <Text style={{ color: '#ef4444', fontSize: 15, padding: 4 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </GlassCard>
        </ScrollView>
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 7 },
  backCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20, color: '#fff', fontWeight: '800' },
  topTitle: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, color: '#cbd5e1' },
  scrollContent: { padding: 12, gap: 12, paddingBottom: 34 },
  heroCard: { padding: 20 },
  heroCenter: { alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  nick: { fontSize: 22, fontWeight: '800', color: '#fff' },
  devBadge: { backgroundColor: 'rgba(139, 92, 246, 0.25)', borderWidth: 1, borderColor: '#8b5cf6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  devBadgeText: { color: '#c4b5fd', fontSize: 11, fontWeight: '800' },
  statusText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  bioBox: { marginTop: 14, padding: 14, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.32)' },
  bioLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4 },
  bioText: { color: '#e2e8f0', fontSize: 14, lineHeight: 19 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnPri: { paddingVertical: 11, borderRadius: 999, alignItems: 'center' },
  btnGold: { paddingVertical: 11, borderRadius: 999, alignItems: 'center' },
  btnSec: { paddingVertical: 11, borderRadius: 999, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  btnPriText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  btnSecText: { color: '#e2e8f0', fontWeight: '700', fontSize: 13.5 },
  showcase: { padding: 16 },
  showcaseTitle: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.7, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  statVal: { fontSize: 17, fontWeight: '900', color: '#fff' },
  statLbl: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  commentComposer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  commentInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', fontSize: 13.5 },
  commentSendBtn: { backgroundColor: '#3b82f6', borderRadius: 999, paddingHorizontal: 18, justifyContent: 'center' },
  emptyComments: { color: '#94a3b8', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  commentCard: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#fff' },
  commentBody: { fontSize: 13.5, color: '#cbd5e1', marginTop: 2 },
});
