import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from 'react-native-webrtc';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { rtdb, triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';
import { FramedAvatar } from './FramedAvatar';
import { LiquidBackground } from './LiquidBackground';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function fmtCallSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const WebRTCCallOverlay: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    me,
    activeCallPeer,
    endActiveCallTrigger,
    appTheme,
    showToast,
    clearVoiceConfig,
    setClearVoiceConfig,
  } = useApp();

  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [callState, setCallState] = useState<'idle' | 'ringing_in' | 'calling_out' | 'connected'>('idle');
  const [peerInfo, setPeerInfo] = useState<{ uid: string; nick: string; avatar?: string; isVideo: boolean; chatId?: string } | null>(null);
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [remoteStream, setRemoteStream] = useState<any | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [showClearVoice, setShowClearVoice] = useState(false);

  const pcRef = useRef<any | null>(null);
  const callIdRef = useRef<string | null>(null);
  const isCallerRef = useRef<boolean>(false);
  const unsubSignalingRef = useRef<Array<() => void>>([]);
  const timerRef = useRef<any>(null);
  const connectedRef = useRef<boolean>(false);
  const durationRef = useRef<number>(0);

  // Listen for incoming calls
  useEffect(() => {
    if (!me?.uid) return;
    const inRef = ref(rtdb, `incoming_call/${me.uid}`);
    const unsub = onValue(inRef, (snap) => {
      const val = snap.val();
      if (!val || !val.callId) {
        if (callState === 'ringing_in') {
          cleanupCall(false);
        }
        return;
      }
      if (Date.now() - (val.at || 0) > 45000) return;
      if (callState === 'idle') {
        triggerHaptic(40);
        setIncomingCall(val);
        setPeerInfo({
          uid: val.callerUid,
          nick: val.callerNick || 'Собеседник',
          avatar: val.callerAva || '',
          isVideo: !!val.isVideo,
          chatId: val.chatId || '',
        });
        setCallState('ringing_in');
      }
    });
    return () => unsub();
  }, [me?.uid, callState]);

  // Watch outgoing call trigger
  useEffect(() => {
    if (!activeCallPeer || !me?.uid) return;
    if (callState !== 'idle') return;
    initiateOutgoingCall(activeCallPeer);
  }, [activeCallPeer, me?.uid]);

  // Duration timer while connected
  useEffect(() => {
    if (callState === 'connected') {
      connectedRef.current = true;
      durationRef.current = 0;
      setDurationSec(0);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDurationSec((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const cleanupCall = async (recordHistory = true) => {
    unsubSignalingRef.current.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
    unsubSignalingRef.current = [];

    if (localStream) {
      try {
        localStream.getTracks().forEach((t: any) => t.stop());
      } catch (_) {}
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (_) {}
      pcRef.current = null;
    }

    const cid = callIdRef.current;
    const peer = peerInfo;
    const wasCaller = isCallerRef.current;
    const wasConnected = connectedRef.current;
    const dur = durationRef.current;

    callIdRef.current = null;
    isCallerRef.current = false;
    connectedRef.current = false;
    durationRef.current = 0;

    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setPeerInfo(null);
    setMicMuted(false);
    setCamOff(false);
    setDurationSec(0);
    setCallState('idle');
    endActiveCallTrigger();

    if (me?.uid) {
      remove(ref(rtdb, `incoming_call/${me.uid}`)).catch(() => {});
    }
    if (peer?.uid) {
      remove(ref(rtdb, `incoming_call/${peer.uid}`)).catch(() => {});
    }
    if (cid) {
      update(ref(rtdb, `webrtc_calls/${cid}`), { ended: true }).catch(() => {});
    }

    if (recordHistory && wasCaller && me && peer) {
      const now = Date.now();
      push(ref(rtdb, `call_history/${me.uid}`), {
        peerUid: peer.uid,
        peerName: peer.nick,
        peerAva: peer.avatar || '',
        outgoing: true,
        missed: !wasConnected,
        isVideo: peer.isVideo,
        durationSec: dur,
        timestamp: now,
      }).catch(() => {});
      push(ref(rtdb, `call_history/${peer.uid}`), {
        peerUid: me.uid,
        peerName: me.nick,
        peerAva: me.avatar || '',
        outgoing: false,
        missed: !wasConnected,
        isVideo: peer.isVideo,
        durationSec: dur,
        timestamp: now,
      }).catch(() => {});

      if (peer.chatId) {
        const msgRef = push(ref(rtdb, `messages/${peer.chatId}`));
        const label = !wasConnected
          ? `📞 Отменённый ${peer.isVideo ? 'видеозвонок' : 'звонок'}`
          : `${peer.isVideo ? '📹 Видеозвонок' : '📞 Аудиозвонок'} (${fmtCallSec(dur)})`;
        set(msgRef, {
          uid: me.uid,
          author: me.nick,
          at: now,
          type: 'call_log',
          isVideo: peer.isVideo,
          durationSec: dur,
          missed: !wasConnected,
          text: label,
        }).catch(() => {});
        update(ref(rtdb, `chats/${peer.chatId}`), {
          lastMsg: label,
          lastMsgAt: now,
          lastMsgUid: me.uid,
        }).catch(() => {});
      }
    }
  };

  const setupPeerConnection = (stream: any, callId: string, role: 'caller' | 'callee') => {
    const pc: any = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach((track: any) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event: any) => {
      if (event?.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    const myCandPath = role === 'caller' ? 'callerCandidates' : 'calleeCandidates';
    const remoteCandPath = role === 'caller' ? 'calleeCandidates' : 'callerCandidates';

    pc.onicecandidate = (event: any) => {
      if (event?.candidate) {
        const cRef = push(ref(rtdb, `webrtc_calls/${callId}/${myCandPath}`));
        set(cRef, event.candidate.toJSON ? event.candidate.toJSON() : event.candidate).catch(() => {});
      }
    };

    const seenCands = new Set<string>();
    const unsubCands = onValue(ref(rtdb, `webrtc_calls/${callId}/${remoteCandPath}`), (snap) => {
      const val = snap.val() || {};
      Object.keys(val).forEach((k) => {
        if (seenCands.has(k)) return;
        seenCands.add(k);
        const c = val[k];
        if (c && pcRef.current) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
      });
    });

    const unsubEnd = onValue(ref(rtdb, `webrtc_calls/${callId}/ended`), (snap) => {
      if (snap.val() === true) {
        cleanupCall(true);
      }
    });

    unsubSignalingRef.current.push(unsubCands, unsubEnd);
    return pc;
  };

  const initiateOutgoingCall = async (peer: { uid: string; nick: string; avatar?: string; isVideo: boolean; chatId?: string }) => {
    if (!me) return;
    try {
      setPeerInfo(peer);
      setCallState('calling_out');
      isCallerRef.current = true;

      const stream = await mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: clearVoiceConfig.enabled,
          echoCancellation: clearVoiceConfig.echoCancel,
          autoGainControl: clearVoiceConfig.autoGain,
        } as any,
        video: peer.isVideo ? { facingMode: 'user', width: 640, height: 480 } : false,
      });
      setLocalStream(stream);

      const callNode = push(ref(rtdb, 'webrtc_calls'));
      const callId = callNode.key!;
      callIdRef.current = callId;

      const pc = setupPeerConnection(stream, callId, 'caller');
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: peer.isVideo });
      await pc.setLocalDescription(offer);

      await set(callNode, {
        callerUid: me.uid,
        calleeUid: peer.uid,
        isVideo: peer.isVideo,
        offer: { type: offer.type, sdp: offer.sdp },
        at: Date.now(),
      });

      await set(ref(rtdb, `incoming_call/${peer.uid}`), {
        callId,
        callerUid: me.uid,
        callerNick: me.nick,
        callerAva: me.avatar || '',
        isVideo: peer.isVideo,
        chatId: peer.chatId || '',
        at: Date.now(),
      });

      const unsubAns = onValue(ref(rtdb, `webrtc_calls/${callId}/answer`), async (snap) => {
        const ans = snap.val();
        if (ans && pcRef.current && !pcRef.current.currentRemoteDescription) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(ans)).catch(() => {});
          setCallState('connected');
        }
      });
      unsubSignalingRef.current.push(unsubAns);
    } catch (e: any) {
      showToast('Звонок', e?.message || 'Проверьте доступ к микрофону и камере', 'error');
      cleanupCall(false);
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall || !me) return;
    try {
      triggerHaptic(20);
      const callId = incomingCall.callId;
      callIdRef.current = callId;
      isCallerRef.current = false;

      const stream = await mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: clearVoiceConfig.enabled,
          echoCancellation: clearVoiceConfig.echoCancel,
          autoGainControl: clearVoiceConfig.autoGain,
        } as any,
        video: incomingCall.isVideo ? { facingMode: 'user', width: 640, height: 480 } : false,
      });
      setLocalStream(stream);

      const pc = setupPeerConnection(stream, callId, 'callee');

      const unsubOffer = onValue(ref(rtdb, `webrtc_calls/${callId}/offer`), async (snap) => {
        const offer = snap.val();
        if (offer && pcRef.current && !pcRef.current.currentRemoteDescription) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          await update(ref(rtdb, `webrtc_calls/${callId}`), {
            answer: { type: answer.type, sdp: answer.sdp },
          });
          setCallState('connected');
        }
      });
      unsubSignalingRef.current.push(unsubOffer);
      remove(ref(rtdb, `incoming_call/${me.uid}`)).catch(() => {});
    } catch (e: any) {
      showToast('Ошибка звонка', e?.message || 'Нет доступа к микрофону', 'error');
      cleanupCall(false);
    }
  };

  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t: any) => {
      t.enabled = micMuted;
    });
    setMicMuted((v) => !v);
    triggerHaptic(8);
  };

  const toggleCam = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t: any) => {
      t.enabled = camOff;
    });
    setCamOff((v) => !v);
    triggerHaptic(8);
  };

  const switchCam = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t: any) => {
      t._switchCamera?.();
    });
    triggerHaptic(10);
  };

  if (callState === 'idle' || !peerInfo) return null;

  if (minimized && callState !== 'ringing_in') {
    return (
      <View
        style={[
          styles.miniCallBar,
          { top: Math.max(insets.top, 8) + 6 },
        ]}
      >
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => setMinimized(false)}
        >
          <View style={styles.miniPulseDot} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
              {peerInfo.nick}
            </Text>
            <Text style={{ color: '#bbf7d0', fontSize: 11, fontWeight: '700' }}>
              {callState === 'calling_out' ? 'Вызов...' : `${fmtCallSec(durationSec)} · Нажмите, чтобы вернуть`}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleMic}
          style={[styles.miniBtn, micMuted && { backgroundColor: 'rgba(239,68,68,0.45)' }]}
        >
          <Ionicons name={micMuted ? 'mic-off' : 'mic'} size={17} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMinimized(false)} style={styles.miniBtn}>
          <Ionicons name="expand-outline" size={17} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setMinimized(false);
            cleanupCall(true);
          }}
          style={[styles.miniBtn, { backgroundColor: '#ef4444' }]}
        >
          <Ionicons name="call" size={16} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setMinimized(true)}>
      <LiquidBackground>
        <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) }]}>
          {peerInfo.isVideo && remoteStream ? (
            <RTCView streamURL={remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" />
          ) : null}

          {callState !== 'ringing_in' && (
            <View style={[styles.topActionBar, { top: insets.top + 12 }]}>
              <TouchableOpacity style={styles.topPillBtn} onPress={() => setMinimized(true)}>
                <Ionicons name="contract-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Свернуть</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.topPillBtn, clearVoiceConfig.enabled && { borderColor: '#22c55e', borderWidth: 1 }]}
                onPress={() => setShowClearVoice((v) => !v)}
              >
                <Text style={{ color: clearVoiceConfig.enabled ? '#4ade80' : '#fff', fontSize: 12, fontWeight: '800' }}>
                  🎙️ ClearVoice AI™
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {showClearVoice && (
            <View style={[styles.cvPanel, { top: insets.top + 62 }]}>
              <View style={styles.cvRow}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Шумоподавление (Krisp)</Text>
                <Switch
                  value={clearVoiceConfig.enabled}
                  onValueChange={(v) => setClearVoiceConfig({ ...clearVoiceConfig, enabled: v })}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#22c55e' }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.cvRow}>
                <Text style={{ color: '#cbd5e1', fontSize: 12.5 }}>Эхоподавление (AEC)</Text>
                <Switch
                  value={clearVoiceConfig.echoCancel}
                  onValueChange={(v) => setClearVoiceConfig({ ...clearVoiceConfig, echoCancel: v })}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#22c55e' }}
                  thumbColor="#fff"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {[
                  { k: 'voice', l: '🗣️ Голос' },
                  { k: 'studio', l: '🎙️ Студия' },
                  { k: 'music', l: '🎵 Музыка' },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.k}
                    onPress={() => setClearVoiceConfig({ ...clearVoiceConfig, mode: m.k as any })}
                    style={[
                      styles.cvModeChip,
                      clearVoiceConfig.mode === m.k && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent },
                    ]}
                  >
                    <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700' }}>{m.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.topInfo}>
            <FramedAvatar uri={peerInfo.avatar} name={peerInfo.nick} size={108} />
            <Text style={styles.peerName}>{peerInfo.nick}</Text>
            <Text style={[styles.statusTxt, { color: appTheme.accent }]}>
              {callState === 'ringing_in'
                ? peerInfo.isVideo
                  ? '📹 Входящий видеозвонок...'
                  : '📞 Входящий аудиозвонок...'
                : callState === 'calling_out'
                ? 'Вызов собеседника...'
                : fmtCallSec(durationSec)}
            </Text>
          </View>

          {peerInfo.isVideo && localStream && !camOff ? (
            <View style={[styles.pipBox, { top: insets.top + 18 }]}>
              <RTCView streamURL={localStream.toURL()} style={styles.pipVideo} objectFit="cover" mirror />
            </View>
          ) : null}

          {callState === 'ringing_in' ? (
            <View style={styles.controlsRow}>
              <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#ef4444' }]} onPress={() => cleanupCall(true)}>
                <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#22c55e' }]} onPress={acceptIncomingCall}>
                <Ionicons name="call" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.ctrlBtn, micMuted && { backgroundColor: 'rgba(239,68,68,0.35)' }]}
                onPress={toggleMic}
              >
                <Ionicons name={micMuted ? 'mic-off' : 'mic'} size={22} color="#fff" />
              </TouchableOpacity>

              {peerInfo.isVideo && (
                <>
                  <TouchableOpacity
                    style={[styles.ctrlBtn, camOff && { backgroundColor: 'rgba(239,68,68,0.35)' }]}
                    onPress={toggleCam}
                  >
                    <Ionicons name={camOff ? 'videocam-off' : 'videocam'} size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ctrlBtn} onPress={switchCam}>
                    <Ionicons name="camera-reverse" size={22} color="#fff" />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#ef4444' }]} onPress={() => cleanupCall(true)}>
                <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LiquidBackground>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  topInfo: { alignItems: 'center', marginTop: 36, backgroundColor: 'rgba(0,0,0,0.35)', padding: 20, borderRadius: 28 },
  peerName: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 14 },
  statusTxt: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  pipBox: {
    position: 'absolute',
    right: 16,
    width: 106,
    height: 146,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: '#000',
  },
  pipVideo: { width: '100%', height: '100%' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 18 },
  ctrlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigBtn: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  miniCallBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 95,
    backgroundColor: 'rgba(21, 128, 61, 0.96)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    elevation: 10,
  },
  miniPulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80' },
  miniBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  cvPanel: {
    position: 'absolute',
    right: 16,
    left: 16,
    zIndex: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.4)',
    gap: 8,
  },
  cvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cvModeChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
});
