import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RTCView, mediaDevices } from 'react-native-webrtc';
import {
  cancelNativeVoiceRecording,
  startNativeVoiceRecording,
  stopNativeVoiceRecording,
  takeNativePhoto,
  triggerHaptic,
} from '../services/firebase';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';

interface VideoNoteRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onSendVideoNote: (coverDataUrl: string, audioDataUrl: string, durationSec: number) => Promise<void>;
}

export const VideoNoteRecorderModal: React.FC<VideoNoteRecorderModalProps> = ({
  visible,
  onClose,
  onSendVideoNote,
}) => {
  const { me, appTheme, showToast } = useApp();
  const [stream, setStream] = useState<any | null>(null);
  const [recording, setRecording] = useState(false);
  const [sec, setSec] = useState(0);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) {
      stopAll();
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const s = await mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 360, height: 360 },
          audio: false,
        });
        if (!mounted) {
          s.getTracks().forEach((t: any) => t.stop());
          return;
        }
        setStream(s);
        await startNativeVoiceRecording(30000);
        setRecording(true);
        setSec(0);
        timerRef.current = setInterval(() => {
          setSec((prev) => prev + 1);
        }, 1000);
      } catch (e: any) {
        showToast('Кружочек', e?.message || 'Разрешите камеру и микрофон', 'error');
        onClose();
      }
    })();
    return () => {
      mounted = false;
      stopAll();
    };
  }, [visible]);

  const stopAll = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    if (stream) {
      try {
        stream.getTracks().forEach((t: any) => t.stop());
      } catch (_) {}
      setStream(null);
    }
  };

  const handleCancel = () => {
    cancelNativeVoiceRecording();
    stopAll();
    setCoverUrl('');
    onClose();
  };

  const handleSnapCover = async () => {
    try {
      const snap = await takeNativePhoto();
      if (snap?.dataUrl) setCoverUrl(snap.dataUrl);
    } catch (_) {}
  };

  const handleSend = async () => {
    try {
      const dur = Math.max(1, sec);
      stopAll();
      const voiceRes = await stopNativeVoiceRecording();
      if (!voiceRes?.dataUrl) {
        onClose();
        return;
      }
      const finalCover = coverUrl || me?.avatar || '';
      setCoverUrl('');
      onClose();
      triggerHaptic(18);
      await onSendVideoNote(finalCover, voiceRes.dataUrl, voiceRes.duration || dur);
    } catch (e: any) {
      showToast('Кружочек', e?.message || 'Ошибка сохранения кружочка', 'error');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <GlassCard radius={32} strong style={styles.card}>
          <Text style={[styles.title, { color: appTheme.text }]}>⭕ Видеокружочек</Text>
          <View style={[styles.circleFrame, { borderColor: appTheme.accent }]}>
            {stream ? (
              <RTCView streamURL={stream.toURL()} style={styles.circleVideo} objectFit="cover" mirror />
            ) : (
              <View style={[styles.circleVideo, { backgroundColor: '#0f172a' }]} />
            )}
          </View>
          <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 16, marginTop: 12 }}>
            ● 0:{sec < 10 ? `0${sec}` : sec}
          </Text>
          <Text style={{ color: appTheme.textSub, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            {recording ? 'Идёт запись голоса и кружка...' : 'Подготовка камеры...'}
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Ionicons name="trash-outline" size={22} color="#f87171" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.snapBtn} onPress={handleSnapCover}>
              <Ionicons name="camera-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                {coverUrl ? 'Кадр ✓' : 'Кадр'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: appTheme.accent }]} onPress={handleSend}>
              <Ionicons name="send" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 340, padding: 22, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 14 },
  circleFrame: {
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 3.5,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  circleVideo: { width: '100%', height: '100%' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 18 },
  cancelBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239,68,68,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sendBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
