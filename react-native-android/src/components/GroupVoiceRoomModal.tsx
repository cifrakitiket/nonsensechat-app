import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { mediaDevices } from 'react-native-webrtc';
import { onValue, ref, remove, set, update } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { FramedAvatar } from './FramedAvatar';
import { GlassCard } from './GlassCard';

interface GroupVoiceRoomModalProps {
  visible: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
}

export const GroupVoiceRoomModal: React.FC<GroupVoiceRoomModalProps> = ({
  visible,
  onClose,
  chatId,
  chatName,
}) => {
  const { me, appTheme, showToast } = useApp();
  const [participants, setParticipants] = useState<any[]>([]);
  const [muted, setMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const streamRef = useRef<any | null>(null);

  useEffect(() => {
    if (!visible || !chatId || !me?.uid) return;

    const partRef = ref(rtdb, `voice_rooms/${chatId}/participants`);
    const myRef = ref(rtdb, `voice_rooms/${chatId}/participants/${me.uid}`);

    (async () => {
      try {
        const s = await mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = s;
      } catch (_) {}
      await set(myRef, {
        uid: me.uid,
        nick: me.nick,
        avatar: me.avatar || '',
        muted: false,
        handRaised: false,
        joinedAt: Date.now(),
      });
    })();

    const unsub = onValue(partRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.keys(val).map((k) => ({ uid: k, ...val[k] }));
      setParticipants(list);
    });

    return () => {
      unsub();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t: any) => t.stop());
        streamRef.current = null;
      }
      remove(myRef).catch(() => {});
    };
  }, [visible, chatId, me?.uid]);

  const toggleMic = () => {
    const next = !muted;
    setMuted(next);
    triggerHaptic(12);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t: any) => {
        t.enabled = !next;
      });
    }
    if (me?.uid) {
      update(ref(rtdb, `voice_rooms/${chatId}/participants/${me.uid}`), { muted: next }).catch(() => {});
    }
  };

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    triggerHaptic(12);
    if (me?.uid) {
      update(ref(rtdb, `voice_rooms/${chatId}/participants/${me.uid}`), { handRaised: next }).catch(() => {});
    }
    if (next) showToast('Рука поднята ✋', 'Участники видят ваш сигнал', 'info');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassCard radius={30} strong style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: appTheme.text }]}>🎙️ Голосовой чат</Text>
              <Text style={{ color: appTheme.accent, fontSize: 12.5, fontWeight: '700' }}>
                {chatName} · Участников: {participants.length}
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '900' }}>● LIVE</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {participants.map((p) => {
              const speaking = !p.muted;
              return (
                <View key={p.uid} style={styles.tile}>
                  <View
                    style={[
                      styles.ring,
                      {
                        borderColor: speaking ? '#22c55e' : 'rgba(255,255,255,0.16)',
                      },
                    ]}
                  >
                    <FramedAvatar uri={p.avatar} name={p.nick} size={62} />
                    {p.handRaised ? (
                      <View style={styles.handBadge}>
                        <Text style={{ fontSize: 14 }}>✋</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5, marginTop: 6 }} numberOfLines={1}>
                    {p.nick}
                  </Text>
                  <Text style={{ color: speaking ? '#4ade80' : '#94a3b8', fontSize: 11 }}>
                    {speaking ? 'говорит...' : 'микрофон выкл.'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={toggleHand}
              style={[
                styles.ctrlBtn,
                handRaised && { backgroundColor: 'rgba(245,158,11,0.28)', borderColor: '#f59e0b' },
              ]}
            >
              <Text style={{ fontSize: 20 }}>✋</Text>
              <Text style={styles.ctrlLbl}>{handRaised ? 'Опустить' : 'Рука'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleMic}
              style={[
                styles.micBig,
                { backgroundColor: muted ? 'rgba(239,68,68,0.25)' : '#22c55e' },
              ]}
            >
              <Ionicons name={muted ? 'mic-off' : 'mic'} size={26} color={muted ? '#f87171' : '#000'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.ctrlBtn, { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' }]}
            >
              <Ionicons name="exit-outline" size={20} color="#f87171" />
              <Text style={[styles.ctrlLbl, { color: '#fca5a5' }]}>Выйти</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  card: { padding: 20, maxHeight: '82%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '900' },
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  tile: { width: 92, alignItems: 'center' },
  ring: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 3,
    position: 'relative',
  },
  handBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 18,
  },
  ctrlBtn: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ctrlLbl: { color: '#e2e8f0', fontSize: 11, fontWeight: '700', marginTop: 2 },
  micBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
