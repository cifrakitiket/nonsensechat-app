import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Image,
  Modal,
  ScrollView,
  Linking,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import {
  rtdb,
  triggerHaptic,
  startNativeVoiceRecording,
  stopNativeVoiceRecording,
  cancelNativeVoiceRecording,
  playVoiceMessage,
  stopVoiceMessage,
} from '../services/firebase';
import { useApp, UserProfile } from '../context/AppContext';
import {
  TelegramAttachSheet,
  EncodedFileResult,
  EncodedPhotoResult,
} from '../components/TelegramAttachSheet';
import { EmojiStickerDrawer } from '../components/EmojiStickerDrawer';
import { FramedAvatar } from '../components/FramedAvatar';
import { PrefixBadge } from '../components/PrefixBadge';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '👍', '😮', '🥟'];
const QUICK_EMOJIS = ['😀', '😂', '🥰', '😎', '🤔', '😭', '😡', '🔥', '❤️', '🥟', '🎉', '💯', '👍', '🙏', '✨', '🚀'];

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
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof ts === 'object') {
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    if (typeof ts.__ts__ === 'string') {
      const parsed = Date.parse(ts.__ts__);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }
  return 0;
}

function formatDateBadge(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((today - target) / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatDuration(sec = 0) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

function formatBytes(bytes = 0) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ChatRoomScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { chatId, name: paramName } = route.params || {};
  const { me, chats, usersMap, appTheme, showToast, showDialog, giftPirozhki, setActiveChatId } = useApp();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; text: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; text: string } | null>(null);

  // Interactive UI sheets & modals
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [actionMsg, setActionMsg] = useState<any | null>(null);
  const [forwardMsg, setForwardMsg] = useState<any | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  // Voice recording & playback state
  const [isRecording, setIsRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const recTimerRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const chat = chats.find((c) => c.id === chatId);
  const isSaved = chat?.type === 'saved' || String(chatId || '').startsWith('fav_');
  const partnerUid =
    !isSaved && chat?.type === 'dm' && me
      ? (chat.members || []).find((m) => m !== me.uid)
      : undefined;
  const partner = partnerUid ? usersMap[partnerUid] : undefined;
  const displayName = isSaved ? 'Избранное' : partner?.nick || chat?.name || paramName || 'Чат';

  useEffect(() => {
    if (!chatId) return;
    setActiveChatId(chatId);
    const msgsRef = ref(rtdb, `messages/${chatId}`);
    const unsub = onValue(msgsRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.keys(val)
        .filter((k) => val[k] && typeof val[k] === 'object')
        .map((k) => ({
          id: k,
          ...val[k],
          _atMs: toMs(val[k]?.at || val[k]?.timestamp || val[k]?.createdAt),
        }))
        .sort((a, b) => (a._atMs - b._atMs) || a.id.localeCompare(b.id));
      setMessages(list);
    });
    return () => {
      setActiveChatId(null);
      unsub();
      stopVoiceMessage();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, [chatId]);

  const invertedFeed = useMemo(() => {
    const items: any[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      items.push(m);
      const prev = i > 0 ? messages[i - 1] : null;
      const curDay = m._atMs ? new Date(m._atMs).toDateString() : '';
      const prevDay = prev?._atMs ? new Date(prev._atMs).toDateString() : '';
      if (curDay && curDay !== prevDay) {
        items.push({
          id: `__date_${m.id}`,
          type: '__date__',
          label: formatDateBadge(m._atMs),
        });
      }
    }
    return items;
  }, [messages]);

  const buildBasePayload = () => {
    const base: any = {
      uid: me!.uid,
      author: chat?.type === 'channel' ? displayName : me!.nick,
      at: Date.now(),
    };
    if (me?.prefix) {
      base.prefix = me.prefix;
      base.prefixStyle = me.prefixStyle || 'gold';
      if (me.prefixSound) {
        base.prefixSound = me.prefixSound;
        base.prefixSoundName = me.prefixSoundName || '';
      }
    }
    if (replyTo) {
      base.replyTo = replyTo;
      setReplyTo(null);
    }
    return base;
  };

  const pushChatMessage = async (payload: any, previewText: string) => {
    const newRef = push(ref(rtdb, `messages/${chatId}`));
    await set(newRef, payload);
    await update(ref(rtdb, `chats/${chatId}`), {
      lastMsg: previewText,
      lastMsgAt: Date.now(),
      lastMsgUid: me?.uid || '',
    });
  };

  const sendTextOrSaveEdit = async () => {
    const clean = text.trim();
    if (!clean || !me || !chatId) return;
    triggerHaptic(10);

    if (editingMsg) {
      setText('');
      const targetId = editingMsg.id;
      setEditingMsg(null);
      await update(ref(rtdb, `messages/${chatId}/${targetId}`), {
        text: clean,
        edited: true,
        editedAt: Date.now(),
      });
      return;
    }

    const payload = {
      ...buildBasePayload(),
      text: clean,
      type: 'text',
    };
    setText('');
    setShowEmojiDrawer(false);
    await pushChatMessage(payload, clean);
  };

  const handleSendPhotos = async (photos: EncodedPhotoResult[], caption: string) => {
    if (!me || photos.length === 0) return;
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const cap = i === photos.length - 1 ? caption : '';
      const payload = {
        ...buildBasePayload(),
        type: 'photo',
        photoUrl: p.dataUrl,
        fileName: p.fileName || 'photo.jpg',
        fileSize: p.fileSize || 0,
        caption: cap,
        text: cap,
      };
      await pushChatMessage(payload, cap ? `📷 ${cap}` : '📷 Фото');
    }
    triggerHaptic(15);
  };

  const handleSendFile = async (res: EncodedFileResult) => {
    if (!res?.dataUrl || !me) return;
    const payload = {
      ...buildBasePayload(),
      type: 'file',
      fileUrl: res.dataUrl,
      fileName: res.fileName || 'document',
      fileSize: res.fileSize || 0,
      mimeType: res.mimeType || 'application/octet-stream',
      text: '',
    };
    await pushChatMessage(payload, `📎 ${res.fileName || 'Файл'}`);
    triggerHaptic(15);
  };

  const handleCreatePoll = async (question: string, opts: string[]) => {
    const payload = {
      ...buildBasePayload(),
      type: 'poll',
      text: `📊 Опрос: ${question}`,
      pollQuestion: question,
      pollOptions: opts.map((label, idx) => ({ id: String(idx), text: label, votes: {} })),
    };
    await pushChatMessage(payload, `📊 ${question}`);
    triggerHaptic(15);
  };

  const handleSendPirozhki = async (amount: number, note: string) => {
    if (!partnerUid) {
      showToast('Подарок', 'Пирожки можно дарить только в личном чате', 'info');
      return;
    }
    try {
      await giftPirozhki(partnerUid, amount, note);
      const payload = {
        ...buildBasePayload(),
        type: 'text',
        text: `🥧 Подарено ${amount} пирожков!${note ? `\n💬 ${note}` : ''}`,
      };
      await pushChatMessage(payload, `🥧 Подарок: ${amount} пирожков`);
      showToast('Отправлено ✓', `Вы подарили 🥧 ${amount}`, 'success');
    } catch (e: any) {
      showToast('Ошибка', e?.message || 'Не удалось подарить пирожки', 'error');
    }
  };

  const handleSendContact = async (user: UserProfile) => {
    const payload = {
      ...buildBasePayload(),
      type: 'text',
      text: `👤 Контакт: ${user.nick}${user.phone ? `\n📞 ${user.phone}` : ''}${user.bio ? `\nℹ️ ${user.bio}` : ''}`,
    };
    await pushChatMessage(payload, `👤 Контакт: ${user.nick}`);
    triggerHaptic(12);
  };

  const handleSendSticker = async (stickerUrl: string, emoji?: string) => {
    if (!me || !stickerUrl) return;
    const payload = {
      ...buildBasePayload(),
      type: 'sticker',
      stickerUrl,
      text: emoji || '✨ Стикер',
    };
    setShowEmojiDrawer(false);
    await pushChatMessage(payload, emoji ? `${emoji} Стикер` : '✨ Стикер');
    triggerHaptic(12);
  };

  const togglePollVote = async (msg: any, optIdx: number) => {
    if (!me || !chatId) return;
    triggerHaptic(10);
    const options = Array.isArray(msg.pollOptions) ? [...msg.pollOptions] : [];
    const targetOpt = options[optIdx];
    if (!targetOpt) return;
    const votes = { ...(targetOpt.votes || {}) };
    if (votes[me.uid]) {
      delete votes[me.uid];
    } else {
      votes[me.uid] = true;
    }
    options[optIdx] = { ...targetOpt, votes };
    await update(ref(rtdb, `messages/${chatId}/${msg.id}`), {
      pollOptions: options,
    });
  };

  const startVoiceRec = async () => {
    try {
      await startNativeVoiceRecording(120000);
      setIsRecording(true);
      setRecSec(0);
      triggerHaptic(20);
      recTimerRef.current = setInterval(() => {
        setRecSec((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      showToast('Микрофон', e?.message || 'Разрешите доступ к микрофону в настройках', 'error');
    }
  };

  const finishVoiceRec = async () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setIsRecording(false);
    try {
      const res = await stopNativeVoiceRecording();
      if (!res?.dataUrl || !me) return;
      const payload = {
        ...buildBasePayload(),
        type: 'voice',
        audioUrl: res.dataUrl,
        voiceUrl: res.dataUrl,
        duration: res.duration || recSec || 1,
        text: '',
      };
      await pushChatMessage(payload, `🎤 Голосовое (${formatDuration(res.duration)})`);
      triggerHaptic(15);
    } catch (e: any) {
      showToast('Ошибка записи', e?.message || 'Не удалось сохранить голосовое', 'error');
    }
  };

  const cancelVoiceRec = () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setIsRecording(false);
    setRecSec(0);
    cancelNativeVoiceRecording();
    triggerHaptic(10);
  };

  const toggleReaction = async (msg: any, emoji: string) => {
    if (!me || !chatId) return;
    triggerHaptic(10);
    const reactions = { ...(msg.reactions || {}) };
    const usersForEmoji = { ...(reactions[emoji] || {}) };
    if (usersForEmoji[me.uid]) {
      delete usersForEmoji[me.uid];
    } else {
      usersForEmoji[me.uid] = true;
    }
    if (Object.keys(usersForEmoji).length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = usersForEmoji;
    }
    await update(ref(rtdb, `messages/${chatId}/${msg.id}`), { reactions });
  };

  const handleForwardToChat = async (targetChatId: string) => {
    if (!forwardMsg || !me) return;
    const orig = forwardMsg;
    setForwardMsg(null);
    const fwdPayload: any = {
      uid: me.uid,
      author: me.nick,
      at: Date.now(),
      type: orig.type || 'text',
      text: orig.text || '',
      forwardedFrom: orig.author || 'Пользователь',
    };
    if (orig.photoUrl) fwdPayload.photoUrl = orig.photoUrl;
    if (orig.audioUrl) fwdPayload.audioUrl = orig.audioUrl;
    if (orig.voiceUrl) fwdPayload.voiceUrl = orig.voiceUrl;
    if (orig.fileUrl) fwdPayload.fileUrl = orig.fileUrl;
    if (orig.fileName) fwdPayload.fileName = orig.fileName;
    if (orig.duration) fwdPayload.duration = orig.duration;

    const newRef = push(ref(rtdb, `messages/${targetChatId}`));
    await set(newRef, fwdPayload);
    await update(ref(rtdb, `chats/${targetChatId}`), {
      lastMsg: `↪ ${decodeMsgText(orig.text) || 'Пересланное сообщение'}`,
      lastMsgAt: Date.now(),
      lastMsgUid: me.uid,
    });
    triggerHaptic(20);
    showToast('Переслано ✓', 'Сообщение отправлено', 'success');
  };

  const renderMessage = ({ item }: any) => {
    if (item.type === '__date__') {
      return (
        <View style={[styles.sysWrap, { backgroundColor: appTheme.glass, borderColor: appTheme.border }]}>
          <Text style={[styles.sysText, { color: appTheme.textSub }]}>{item.label}</Text>
        </View>
      );
    }

    if (item.type === 'system') {
      return (
        <View style={[styles.sysWrap, { backgroundColor: appTheme.glass, borderColor: appTheme.border }]}>
          <Text style={[styles.sysText, { color: appTheme.textSub }]}>{decodeMsgText(item.text)}</Text>
        </View>
      );
    }

    const isSticker = item.type === 'sticker' || !!item.stickerUrl;
    if (isSticker && item.stickerUrl) {
      const isMineS = item.uid === me?.uid;
      return (
        <ScalePressable
          scaleTo={0.96}
          onLongPress={() => setActionMsg(item)}
          style={[styles.msgRow, isMineS ? styles.msgRowOut : styles.msgRowIn]}
        >
          <Image source={{ uri: item.stickerUrl }} style={{ width: 156, height: 156 }} resizeMode="contain" />
        </ScalePressable>
      );
    }

    const isMine = item.uid === me?.uid;
    const sender = item.uid ? usersMap[item.uid] : undefined;
    const authorName = sender?.nick || item.author || 'Пользователь';
    const prefix = sender?.prefix || item.prefix;
    const prefixStyle = sender?.prefixStyle || item.prefixStyle || 'gold';
    const prefixSound = sender?.prefixSound || item.prefixSound;
    const photoUri = item.photoUrl || item.imageUrl || item.url;
    const audioUri = item.audioUrl || item.voiceUrl;
    const isVoice = item.type === 'voice' || item.type === 'audio' || !!audioUri;
    const isFile = item.type === 'file' || (item.fileUrl && !photoUri && !audioUri);
    const isPoll = item.type === 'poll' && Array.isArray(item.pollOptions);
    const isPlaying = playingMsgId === item.id;
    const timeStr = item._atMs
      ? new Date(item._atMs).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : '';

    const reactionEntries = item.reactions ? Object.entries(item.reactions) : [];

    return (
      <ScalePressable
        scaleTo={0.985}
        onLongPress={() => setActionMsg(item)}
        style={[styles.msgRow, isMine ? styles.msgRowOut : styles.msgRowIn]}
      >
        <View
          style={[
            styles.bubble,
            isMine
              ? {
                  backgroundColor: appTheme.bubbleOut,
                  borderColor: appTheme.specular,
                  borderBottomRightRadius: 8,
                }
              : {
                  backgroundColor: appTheme.bubbleIn,
                  borderColor: appTheme.border,
                  borderBottomLeftRadius: 8,
                },
          ]}
        >
          {item.forwardedFrom ? (
            <Text style={[styles.fwdLabel, { color: appTheme.accent }]}>
              ↪ Переслано от {item.forwardedFrom}
            </Text>
          ) : null}

          {(!isMine || prefix) && (
            <View style={styles.bubbleAuthorRow}>
              {!isMine && (
                <TouchableOpacity
                  onPress={() => item.uid && navigation.navigate('UserProfile', { uid: item.uid })}
                >
                  <Text style={[styles.bubbleAuthor, { color: appTheme.accent }]}>{authorName}</Text>
                </TouchableOpacity>
              )}
              {prefix ? (
                <PrefixBadge prefix={prefix} prefixStyle={prefixStyle} prefixSound={prefixSound} />
              ) : null}
            </View>
          )}

          {item.replyTo ? (
            <View style={[styles.replyBox, { borderLeftColor: appTheme.accent }]}>
              <Text style={[styles.replyAuthor, { color: appTheme.accent }]}>{item.replyTo.author}</Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {decodeMsgText(item.replyTo.text)}
              </Text>
            </View>
          ) : null}

          {/* Photo Preview -> Lightbox */}
          {photoUri ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setLightboxUri(photoUri)}>
              <Image source={{ uri: photoUri }} style={styles.msgImage} resizeMode="cover" />
            </TouchableOpacity>
          ) : null}

          {/* Voice Capsule */}
          {isVoice && audioUri ? (
            <TouchableOpacity
              style={styles.voicePill}
              activeOpacity={0.75}
              onPress={() => {
                if (isPlaying) {
                  stopVoiceMessage();
                  setPlayingMsgId(null);
                } else {
                  setPlayingMsgId(item.id);
                  playVoiceMessage(audioUri);
                  const durMs = ((item.duration || 3) + 0.5) * 1000;
                  setTimeout(() => setPlayingMsgId((cur) => (cur === item.id ? null : cur)), durMs);
                }
              }}
            >
              <View style={[styles.voicePlayCircle, { backgroundColor: appTheme.accent }]}>
                <Text style={{ color: '#000', fontSize: 13, fontWeight: '900' }}>
                  {isPlaying ? '■' : '▶'}
                </Text>
              </View>
              <View style={styles.waveBars}>
                {[10, 18, 14, 22, 16, 20, 12, 19, 13, 15, 9].map((h, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.waveBar,
                      { height: h, backgroundColor: isPlaying ? appTheme.accent : 'rgba(255,255,255,0.45)' },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.voiceDur}>{formatDuration(item.duration || 2)}</Text>
            </TouchableOpacity>
          ) : null}

          {/* File Card */}
          {isFile && item.fileUrl ? (
            <TouchableOpacity
              style={styles.fileCard}
              onPress={() => {
                if (String(item.fileUrl).startsWith('http')) Linking.openURL(item.fileUrl).catch(() => {});
                else showToast('Файл', `${item.fileName || 'Файл'} (${formatBytes(item.fileSize)})`, 'info');
              }}
            >
              <View style={[styles.fileIconCircle, { backgroundColor: appTheme.accentSoft }]}>
                <Text style={{ fontSize: 18 }}>📄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.fileName || 'Документ'}
                </Text>
                <Text style={styles.fileSize}>{formatBytes(item.fileSize) || 'Файл'}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Interactive Poll */}
          {isPoll ? (
            <View style={styles.pollBox}>
              <Text style={styles.pollQ}>📊 {item.pollQuestion}</Text>
              {(() => {
                const totalVotes = item.pollOptions.reduce(
                  (acc: number, o: any) => acc + Object.keys(o.votes || {}).length,
                  0
                );
                return item.pollOptions.map((opt: any, idx: number) => {
                  const cnt = Object.keys(opt.votes || {}).length;
                  const pct = totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0;
                  const voted = !!(me && opt.votes && opt.votes[me.uid]);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.pollOpt,
                        voted && { borderColor: appTheme.accent, backgroundColor: appTheme.accentSoft },
                      ]}
                      onPress={() => togglePollVote(item, idx)}
                    >
                      <Text style={styles.pollOptText}>
                        {voted ? '✓ ' : ''}
                        {opt.text}
                      </Text>
                      <Text style={[styles.pollPct, { color: appTheme.accent }]}>
                        {pct}% ({cnt})
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
          ) : null}

          {/* Text */}
          {!isPoll && decodeMsgText(item.text) ? (
            <Text style={[styles.msgText, { color: appTheme.text }]}>{decodeMsgText(item.text)}</Text>
          ) : null}

          {/* Reactions Chips */}
          {reactionEntries.length > 0 && (
            <View style={styles.reactionsRow}>
              {reactionEntries.map(([emoji, usersObj]: any) => {
                const count = Object.keys(usersObj || {}).length;
                const mine = !!(me && usersObj && usersObj[me.uid]);
                if (!count) return null;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionChip,
                      mine && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent },
                    ]}
                    onPress={() => toggleReaction(item, emoji)}
                  >
                    <Text style={styles.reactionTxt}>
                      {emoji} {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={styles.msgTime}>
            {item.edited ? 'изм. · ' : ''}
            {timeStr}
          </Text>
        </View>
      </ScalePressable>
    );
  };

  return (
    <LiquidBackground>
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Floating Liquid Glass Header */}
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
            <ScalePressable style={styles.circleBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>←</Text>
            </ScalePressable>

            <TouchableOpacity
              style={styles.headerProfileTouch}
              activeOpacity={0.75}
              onPress={() => partnerUid && navigation.navigate('UserProfile', { uid: partnerUid })}
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
                  <Text style={[styles.chatTitle, { color: appTheme.text }]} numberOfLines={1}>
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
                <Text style={[styles.chatSub, { color: partner?.online ? '#4ade80' : appTheme.textSub }]}>
                  {isSaved ? 'Облачное хранилище' : partner?.online ? 'в сети' : 'нажмите для профиля'}
                </Text>
              </View>
            </TouchableOpacity>

            {partnerUid ? (
              <ScalePressable
                style={styles.giftBtn}
                onPress={() =>
                  navigation.navigate('PirozhkiStore', { initialTab: 'gift', targetUid: partnerUid })
                }
              >
                <Image
                  source={require('../../android/app/src/main/assets/public/pirozhok.png')}
                  style={{ width: 20, height: 20 }}
                />
              </ScalePressable>
            ) : null}
          </GlassCard>
        </View>

        {/* Pinned Message Pill */}
        {chat?.pinnedMsg ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
            <GlassCard radius={18} style={styles.pinnedCard}>
              <Text style={[styles.pinnedLabel, { color: appTheme.accent }]}>📌 Закреплено:</Text>
              <Text style={[styles.pinnedText, { color: appTheme.text }]} numberOfLines={1}>
                {decodeMsgText(chat.pinnedMsg.text) || 'Медиа-сообщение'}
              </Text>
              <TouchableOpacity onPress={() => update(ref(rtdb, `chats/${chatId}`), { pinnedMsg: null })}>
                <Text style={{ color: appTheme.textSub, paddingHorizontal: 6 }}>✕</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        ) : null}

        {/* Messages Feed (Inverted: newest at bottom, loads all messages) */}
        <FlatList
          ref={flatListRef}
          data={invertedFeed}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          initialNumToRender={20}
          maxToRenderPerBatch={15}
          windowSize={11}
          contentContainerStyle={styles.feedContent}
        />

        {/* Reply / Edit Banner */}
        {(replyTo || editingMsg) && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
            <GlassCard radius={20} strong style={styles.replyBanner}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.replyBannerTitle, { color: appTheme.accent }]}>
                  {editingMsg ? '✏️ Редактирование' : `Ответ для ${replyTo?.author}`}
                </Text>
                <Text style={[styles.replyBannerSub, { color: appTheme.textSub }]} numberOfLines={1}>
                  {editingMsg ? editingMsg.text : replyTo?.text}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setReplyTo(null);
                  setEditingMsg(null);
                  if (editingMsg) setText('');
                }}
              >
                <Text style={{ color: appTheme.textSub, fontSize: 18, paddingHorizontal: 8 }}>✕</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}

        {/* Full Emoji & Sticker Drawer */}
        {showEmojiDrawer && (
          <EmojiStickerDrawer
            onSelectEmoji={(em) => setText((prev) => prev + em)}
            onBackspace={() =>
              setText((prev) => {
                const chars = Array.from(prev);
                chars.pop();
                return chars.join('');
              })
            }
            onSelectSticker={handleSendSticker}
          />
        )}

        {/* Floating Liquid Glass Pill Composer */}
        <View style={styles.composerWrap}>
          {isRecording ? (
            <GlassCard radius={RADII.PILL} strong style={styles.recPill}>
              <TouchableOpacity style={styles.recCancelBtn} onPress={cancelVoiceRec}>
                <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
                <View style={styles.recDot} />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                  Запись {formatDuration(recSec)}
                </Text>
              </View>
              <ScalePressable style={[styles.sendCircle, { backgroundColor: '#ef4444' }]} onPress={finishVoiceRec}>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>➤</Text>
              </ScalePressable>
            </GlassCard>
          ) : (
            <GlassCard radius={RADII.PILL} strong style={styles.composerPill}>
              <ScalePressable style={styles.composerIconBtn} onPress={() => setShowAttachSheet(true)}>
                <Text style={{ color: appTheme.accent, fontSize: 21, fontWeight: '700' }}>＋</Text>
              </ScalePressable>

              <TextInput
                style={[styles.input, { color: appTheme.text }]}
                placeholder="Сообщение..."
                placeholderTextColor={appTheme.textSub}
                multiline
                value={text}
                onChangeText={setText}
              />

              <ScalePressable
                style={styles.composerIconBtn}
                onPress={() => setShowEmojiDrawer((prev) => !prev)}
              >
                <Text style={{ fontSize: 19 }}>😊</Text>
              </ScalePressable>

              {text.trim() ? (
                <ScalePressable
                  style={[styles.sendCircle, { backgroundColor: appTheme.accent }]}
                  onPress={sendTextOrSaveEdit}
                >
                  <Text style={{ color: '#000', fontSize: 16, fontWeight: '900' }}>➤</Text>
                </ScalePressable>
              ) : (
                <ScalePressable
                  style={[styles.sendCircle, { backgroundColor: appTheme.accentSoft }]}
                  onPress={startVoiceRec}
                >
                  <Text style={{ fontSize: 18 }}>🎤</Text>
                </ScalePressable>
              )}
            </GlassCard>
          )}
        </View>

        {/* Telegram-Style In-App Attachment Sheet */}
        <TelegramAttachSheet
          visible={showAttachSheet}
          mode="chat"
          onClose={() => setShowAttachSheet(false)}
          onSendPhotos={handleSendPhotos}
          onSendFile={handleSendFile}
          onSendPoll={handleCreatePoll}
          onSendPirozhki={handleSendPirozhki}
          onSendContact={handleSendContact}
          canGiftPirozhki={!!partnerUid}
        />

        {/* Message Action & Reactions Sheet */}
        <Modal visible={!!actionMsg} transparent animationType="fade" onRequestClose={() => setActionMsg(null)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActionMsg(null)}>
            <GlassCard radius={28} strong style={styles.sheetCard}>
              <View style={styles.quickReactRow}>
                {QUICK_REACTIONS.map((em) => (
                  <TouchableOpacity
                    key={em}
                    style={styles.quickReactBtn}
                    onPress={() => {
                      const m = actionMsg;
                      setActionMsg(null);
                      if (m) toggleReaction(m, em);
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  const m = actionMsg;
                  setActionMsg(null);
                  if (m) {
                    setReplyTo({
                      id: m.id,
                      author: m.author || 'Пользователь',
                      text: decodeMsgText(m.text) || 'Медиа',
                    });
                  }
                }}
              >
                <Text style={styles.sheetRowText}>↩️ Ответить</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  const m = actionMsg;
                  setActionMsg(null);
                  setForwardMsg(m);
                }}
              >
                <Text style={styles.sheetRowText}>↪️ Переслать</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={async () => {
                  const m = actionMsg;
                  setActionMsg(null);
                  const txt = decodeMsgText(m?.text);
                  if (txt) {
                    Share.share({ message: txt }).catch(() => {});
                  } else {
                    showToast('Сообщение', 'Нет текста для отправки', 'info');
                  }
                }}
              >
                <Text style={styles.sheetRowText}>📋 Поделиться / Скопировать</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetRow}
                onPress={async () => {
                  const m = actionMsg;
                  setActionMsg(null);
                  if (m) {
                    await update(ref(rtdb, `chats/${chatId}`), {
                      pinnedMsg: { id: m.id, text: decodeMsgText(m.text) || 'Медиа', author: m.author || '' },
                    });
                  }
                }}
              >
                <Text style={styles.sheetRowText}>📌 Закрепить</Text>
              </TouchableOpacity>

              {actionMsg?.uid === me?.uid && actionMsg?.type === 'text' && (
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={() => {
                    const m = actionMsg;
                    setActionMsg(null);
                    setEditingMsg({ id: m.id, text: decodeMsgText(m.text) });
                    setText(decodeMsgText(m.text));
                  }}
                >
                  <Text style={styles.sheetRowText}>✏️ Редактировать</Text>
                </TouchableOpacity>
              )}

              {actionMsg?.uid === me?.uid && (
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={() => {
                    const m = actionMsg;
                    setActionMsg(null);
                    if (m) remove(ref(rtdb, `messages/${chatId}/${m.id}`));
                  }}
                >
                  <Text style={[styles.sheetRowText, { color: '#ef4444' }]}>🗑️ Удалить</Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          </TouchableOpacity>
        </Modal>

        {/* Forward Chat Picker */}
        <Modal visible={!!forwardMsg} transparent animationType="fade" onRequestClose={() => setForwardMsg(null)}>
          <View style={styles.modalBackdrop}>
            <GlassCard radius={28} strong style={styles.sheetCard}>
              <Text style={[styles.sheetTitle, { color: appTheme.text }]}>Переслать в чат</Text>
              <ScrollView style={{ maxHeight: 260 }}>
                {chats.map((c) => {
                  const otherId = c.type === 'dm' && me ? c.members.find((x) => x !== me.uid) : undefined;
                  const title =
                    c.type === 'saved'
                      ? 'Избранное'
                      : otherId
                      ? usersMap[otherId]?.nick || c.name || 'Диалог'
                      : c.name || 'Чат';
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.sheetRow}
                      onPress={() => handleForwardToChat(c.id)}
                    >
                      <Text style={styles.sheetRowText}>💬 {title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setForwardMsg(null)}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Отмена</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>

        {/* Fullscreen Lightbox Image Viewer */}
        <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
          <View style={styles.lightboxBackdrop}>
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>✕</Text>
            </TouchableOpacity>
            {lightboxUri && (
              <Image source={{ uri: lightboxUri }} style={styles.lightboxImg} resizeMode="contain" />
            )}
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 20, color: '#fff', fontWeight: '800' },
  headerProfileTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerMeta: { flex: 1 },
  chatTitle: { fontSize: 15.5, fontWeight: '800', flexShrink: 1 },
  chatSub: { fontSize: 11.5, marginTop: 1 },
  giftBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  pinnedLabel: { fontSize: 11.5, fontWeight: '800' },
  pinnedText: { flex: 1, fontSize: 12.5 },
  feedContent: { padding: 12, paddingBottom: 16, gap: 6 },
  sysWrap: {
    alignSelf: 'center',
    marginVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  sysText: { fontSize: 12, fontWeight: '600' },
  msgRow: { width: '100%', flexDirection: 'row', marginVertical: 2 },
  msgRowOut: { justifyContent: 'flex-end' },
  msgRowIn: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '83%',
    borderRadius: RADII.BUBBLE,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fwdLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bubbleAuthorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  bubbleAuthor: { fontSize: 12.5, fontWeight: '800' },
  replyBox: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 8,
    paddingVertical: 4,
  },
  replyAuthor: { fontSize: 11, fontWeight: '800' },
  replyText: { fontSize: 12, color: '#cbd5e1' },
  msgImage: { width: 225, height: 185, borderRadius: 18, marginBottom: 4 },
  voicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    minWidth: 185,
  },
  voicePlayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBars: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  waveBar: { width: 3, borderRadius: 99 },
  voiceDur: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 16,
    padding: 8,
    minWidth: 190,
  },
  fileIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fileName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  fileSize: { color: '#94a3b8', fontSize: 11 },
  pollBox: { minWidth: 215, gap: 6 },
  pollQ: { color: '#fff', fontSize: 14.5, fontWeight: '800', marginBottom: 4 },
  pollOpt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.26)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pollOptText: { color: '#f1f5f9', fontSize: 13, fontWeight: '600', flex: 1, marginRight: 6 },
  pollPct: { fontSize: 12, fontWeight: '800' },
  msgText: { fontSize: 15, lineHeight: 20 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  reactionChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reactionTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  msgTime: { fontSize: 10.5, color: 'rgba(255,255,255,0.48)', alignSelf: 'flex-end', marginTop: 4 },
  replyBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  replyBannerTitle: { fontSize: 12, fontWeight: '800' },
  replyBannerSub: { fontSize: 12 },
  emojiDrawer: { paddingVertical: 8, paddingHorizontal: 10 },
  emojiItem: { paddingHorizontal: 8, paddingVertical: 4 },
  composerWrap: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  composerPill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderColor: 'rgba(239,68,68,0.55)',
  },
  recCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  composerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 15,
  },
  sendCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  sheetCard: { padding: 18 },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  attachGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  attachItem: { alignItems: 'center', gap: 8 },
  attachCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  attachLbl: { color: '#e2e8f0', fontSize: 12.5, fontWeight: '700' },
  quickReactRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  quickReactBtn: { padding: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  sheetRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  sheetRowText: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  cancelModalBtn: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  pollInput: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#fff',
    marginBottom: 8,
    fontSize: 14,
  },
  createPollBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImg: { width: '100%', height: '82%' },
});
