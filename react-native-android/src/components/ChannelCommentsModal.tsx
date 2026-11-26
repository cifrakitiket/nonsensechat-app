import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { onValue, push, ref, set } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { FramedAvatar } from './FramedAvatar';
import { GlassCard } from './GlassCard';

interface ChannelCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  chatId: string;
  message: any | null;
}

export const ChannelCommentsModal: React.FC<ChannelCommentsModalProps> = ({
  visible,
  onClose,
  chatId,
  message,
}) => {
  const insets = useSafeAreaInsets();
  const { me, usersMap, appTheme } = useApp();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!visible || !chatId || !message?.id) {
      setComments([]);
      return;
    }
    const cRef = ref(rtdb, `messages/${chatId}/${message.id}/comments`);
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.keys(val)
        .map((k) => ({ id: k, ...val[k] }))
        .sort((a, b) => (a.at || 0) - (b.at || 0));
      setComments(list);
    });
    return () => unsub();
  }, [visible, chatId, message?.id]);

  const sendComment = async () => {
    const clean = text.trim();
    if (!clean || !me || !chatId || !message?.id) return;
    setText('');
    triggerHaptic(10);
    const cRef = push(ref(rtdb, `messages/${chatId}/${message.id}/comments`));
    await set(cRef, {
      uid: me.uid,
      author: me.nick,
      text: clean,
      at: Date.now(),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: appTheme.glassStrong,
              borderColor: appTheme.specular,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: appTheme.text }]}>
              💬 Комментарии ({comments.length})
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={appTheme.textSub} />
            </TouchableOpacity>
          </View>

          {message?.text ? (
            <GlassCard radius={14} style={styles.postPreview}>
              <Text style={{ color: appTheme.textSub, fontSize: 12.5 }} numberOfLines={2}>
                {message.text}
              </Text>
            </GlassCard>
          ) : null}

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 8, gap: 10 }}
            ListEmptyComponent={
              <Text style={{ color: appTheme.textSub, textAlign: 'center', marginTop: 32 }}>
                Комментариев пока нет. Будьте первым!
              </Text>
            }
            renderItem={({ item }) => {
              const user = item.uid ? usersMap[item.uid] : undefined;
              const nick = user?.nick || item.author || 'Участник';
              const time = item.at
                ? new Date(item.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <View style={styles.commentRow}>
                  <FramedAvatar
                    uri={user?.avatar}
                    name={nick}
                    frameId={user?.steamFrame || 'none'}
                    size={36}
                  />
                  <View style={[styles.commentBubble, { backgroundColor: appTheme.glass, borderColor: appTheme.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 12.5 }}>{nick}</Text>
                      <Text style={{ color: appTheme.textSub, fontSize: 10.5 }}>{time}</Text>
                    </View>
                    <Text style={{ color: appTheme.text, fontSize: 14 }}>{item.text}</Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: appTheme.text, backgroundColor: appTheme.glassInput, borderColor: appTheme.border }]}
              placeholder="Написать комментарий..."
              placeholderTextColor={appTheme.textSub}
              value={text}
              onChangeText={setText}
            />
            <TouchableOpacity
              onPress={sendComment}
              style={[styles.sendBtn, { backgroundColor: appTheme.accent }]}
            >
              <Ionicons name="send" size={17} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    height: '72%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '800' },
  closeBtn: { padding: 4 },
  postPreview: { marginHorizontal: 14, marginBottom: 6, padding: 10 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentBubble: { flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8 },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
