import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';

function decodeMsgText(raw?: string) {
  if (!raw) return '';
  return String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function toMs(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

export default function ChatRoomScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { chatId, name: paramName } = route.params || {};
  const { me, chats, usersMap } = useApp();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; text: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const chat = chats.find((c) => c.id === chatId);
  const isSaved = chat?.type === 'saved' || String(chatId || '').startsWith('fav_');
  const partnerUid =
    !isSaved && chat?.type === 'dm' && me
      ? (chat.members || []).find((m) => m !== me.uid)
      : undefined;
  const partner = partnerUid ? usersMap[partnerUid] : undefined;
  const displayName = isSaved
    ? 'Избранное'
    : partner?.nick || chat?.name || paramName || 'Чат';

  useEffect(() => {
    if (!chatId) return;
    const msgsRef = ref(rtdb, `chats/${chatId}/messages`);
    const unsub = onValue(msgsRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.keys(val)
        .map((k) => ({ id: k, ...val[k], _atMs: toMs(val[k]?.at) }))
        .sort((a, b) => a._atMs - b._atMs);
      setMessages(list);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
    });
    return () => unsub();
  }, [chatId]);

  const sendMessage = async () => {
    const clean = text.trim();
    if (!clean || !me || !chatId) return;

    const msgPayload: any = {
      text: clean,
      uid: me.uid,
      author: chat?.type === 'channel' ? displayName : me.nick,
      at: Date.now(),
      type: 'text',
    };
    if (me.prefix) {
      msgPayload.prefix = me.prefix;
      msgPayload.prefixStyle = me.prefixStyle || 'gold';
      if (me.prefixSound) {
        msgPayload.prefixSound = me.prefixSound;
        msgPayload.prefixSoundName = me.prefixSoundName || '';
      }
    }
    if (replyTo) {
      msgPayload.replyTo = replyTo;
      setReplyTo(null);
    }

    setText('');
    triggerHaptic(10);

    try {
      const newMsgRef = push(ref(rtdb, `chats/${chatId}/messages`));
      await set(newMsgRef, msgPayload);
      await update(ref(rtdb, `chats/${chatId}`), {
        lastMsg: clean,
        lastMsgAt: Date.now(),
      });
    } catch (e: any) {
      Alert.alert('Ошибка отправки', e?.message || 'Не удалось отправить сообщение');
    }
  };

  const handleLongPressMsg = (msg: any) => {
    const isMine = msg.uid === me?.uid;
    const buttons: any[] = [
      {
        text: 'Ответить',
        onPress: () =>
          setReplyTo({
            id: msg.id,
            author: msg.author || 'Пользователь',
            text: decodeMsgText(msg.text).slice(0, 80),
          }),
      },
    ];
    if (isMine) {
      buttons.push({
        text: 'Удалить',
        style: 'destructive',
        onPress: () => remove(ref(rtdb, `chats/${chatId}/messages/${msg.id}`)),
      });
    }
    buttons.push({ text: 'Отмена', style: 'cancel' });
    Alert.alert('Сообщение', decodeMsgText(msg.text).slice(0, 60) || 'Действие', buttons);
  };

  const renderMessage = ({ item }: any) => {
    if (item.type === 'system') {
      return (
        <View style={styles.sysWrap}>
          <Text style={styles.sysText}>{decodeMsgText(item.text)}</Text>
        </View>
      );
    }

    const isMine = item.uid === me?.uid;
    const sender = item.uid ? usersMap[item.uid] : undefined;
    const authorName = sender?.nick || item.author || 'Пользователь';
    const prefix = sender?.prefix || item.prefix;
    const prefixStyle = sender?.prefixStyle || item.prefixStyle || 'gold';
    const prefixSound = sender?.prefixSound || item.prefixSound;
    const imgUri = item.imageUrl || item.url || (item.type === 'image' ? item.fileUrl : '');
    const timeStr = item._atMs
      ? new Date(item._atMs).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => handleLongPressMsg(item)}
        style={[styles.msgRow, isMine ? styles.msgRowOut : styles.msgRowIn]}
      >
        <View style={[styles.bubble, isMine ? styles.bubbleOut : styles.bubbleIn]}>
          {(!isMine || prefix) && (
            <View style={styles.bubbleAuthorRow}>
              {!isMine && (
                <TouchableOpacity
                  onPress={() => item.uid && navigation.navigate('UserProfile', { uid: item.uid })}
                >
                  <Text style={styles.bubbleAuthor}>{authorName}</Text>
                </TouchableOpacity>
              )}
              {prefix ? (
                <PrefixBadge
                  prefix={prefix}
                  prefixStyle={prefixStyle}
                  prefixSound={prefixSound}
                />
              ) : null}
            </View>
          )}

          {item.replyTo ? (
            <View style={styles.replyBox}>
              <Text style={styles.replyAuthor}>{item.replyTo.author}</Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {decodeMsgText(item.replyTo.text)}
              </Text>
            </View>
          ) : null}

          {imgUri ? (
            <Image
              source={{ uri: imgUri }}
              style={styles.msgImage}
              resizeMode="cover"
            />
          ) : null}

          {decodeMsgText(item.text) ? (
            <Text style={styles.msgText}>{decodeMsgText(item.text)}</Text>
          ) : null}

          <Text style={styles.msgTime}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Native Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerProfileTouch}
          activeOpacity={0.75}
          onPress={() => {
            if (partnerUid) navigation.navigate('UserProfile', { uid: partnerUid });
          }}
        >
          <FramedAvatar
            uri={partner?.avatar}
            name={displayName}
            frameId={partner?.steamFrame || 'none'}
            size={38}
            online={!!partner?.online}
          />
          <View style={styles.headerMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {displayName}
              </Text>
              {partner?.prefix ? (
                <PrefixBadge
                  prefix={partner.prefix}
                  prefixStyle={partner.prefixStyle}
                  prefixSound={partner.prefixSound}
                />
              ) : null}
            </View>
            <Text style={[styles.chatSub, partner?.online && { color: '#4ade80' }]}>
              {isSaved ? 'Облачное хранилище' : partner?.online ? 'в сети' : 'чат'}
            </Text>
          </View>
        </TouchableOpacity>

        {partnerUid ? (
          <TouchableOpacity
            style={styles.giftBtn}
            onPress={() =>
              navigation.navigate('PirozhkiStore', {
                initialTab: 'gift',
                targetUid: partnerUid,
              })
            }
          >
            <Image
              source={require('../../android/app/src/main/assets/public/pirozhok.png')}
              style={{ width: 20, height: 20 }}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.feedContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Reply Bar */}
      {replyTo && (
        <View style={styles.replyBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBannerTitle}>Ответ для {replyTo.author}</Text>
            <Text style={styles.replyBannerSub} numberOfLines={1}>
              {replyTo.text}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={{ color: '#94a3b8', fontSize: 18, paddingHorizontal: 8 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Сообщение..."
          placeholderTextColor="#64748b"
          multiline
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && { opacity: 0.45 }]}
          disabled={!text.trim()}
          onPress={sendMessage}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#0e1420',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { padding: 8, marginRight: 4 },
  backBtnText: { fontSize: 22, color: '#fff', fontWeight: '700' },
  headerProfileTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerMeta: { flex: 1 },
  chatTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flexShrink: 1 },
  chatSub: { fontSize: 12, color: '#8aabb8', marginTop: 1 },
  giftBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedContent: { padding: 12, paddingBottom: 16, gap: 6 },
  sysWrap: { alignSelf: 'center', marginVertical: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  sysText: { color: '#94a3b8', fontSize: 12 },
  msgRow: { width: '100%', flexDirection: 'row', marginVertical: 2 },
  msgRowOut: { justifyContent: 'flex-end' },
  msgRowIn: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOut: {
    backgroundColor: '#1e3a5f',
    borderBottomRightRadius: 4,
  },
  bubbleIn: {
    backgroundColor: '#17212b',
    borderBottomLeftRadius: 4,
  },
  bubbleAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  bubbleAuthor: { fontSize: 12.5, fontWeight: '700', color: '#7ab3d9' },
  replyBox: {
    borderLeftWidth: 2.5,
    borderLeftColor: '#60a5fa',
    paddingLeft: 8,
    marginBottom: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    paddingVertical: 3,
  },
  replyAuthor: { fontSize: 11, fontWeight: '700', color: '#60a5fa' },
  replyText: { fontSize: 12, color: '#cbd5e1' },
  msgImage: { width: 220, height: 180, borderRadius: 12, marginBottom: 4 },
  msgText: { color: '#f1f5f9', fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 10.5, color: 'rgba(255,255,255,0.48)', alignSelf: 'flex-end', marginTop: 3 },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131c2a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  replyBannerTitle: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },
  replyBannerSub: { color: '#94a3b8', fontSize: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#0e1420',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#17212b',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxHeight: 110,
    color: '#ffffff',
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#5b8fb9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
