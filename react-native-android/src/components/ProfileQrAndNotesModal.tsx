import React, { useMemo } from 'react';
import {
  Image,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';

interface ProfileQrModalProps {
  visible: boolean;
  onClose: () => void;
  uid: string;
  nick: string;
  avatar?: string;
}

function buildQrMatrix(seedStr: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = border || inner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBotLeft = r >= size - 8 && c < 8;
      const inCenterLogo = r >= 8 && r <= 12 && c >= 8 && c <= 12;
      if (inTopLeft || inTopRight || inBotLeft || inCenterLogo) continue;
      if (r === 6 || c === 6) {
        grid[r][c] = (r + c) % 2 === 0;
        continue;
      }
      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      grid[r][c] = (hash >>> 3) % 2 === 0;
    }
  }
  return grid;
}

export const ProfileQrAndNotesModal: React.FC<ProfileQrModalProps> = ({
  visible,
  onClose,
  uid,
  nick,
  avatar,
}) => {
  const { appTheme } = useApp();
  const deepUrl = `https://nonsensechat.ru/?user=${encodeURIComponent(nick)}`;
  const matrix = useMemo(() => buildQrMatrix(`${uid}:${nick}`), [uid, nick]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <GlassCard radius={30} strong style={styles.card}>
          <Text style={[styles.title, { color: appTheme.text }]}>QR-визитка Telegram-стиля</Text>
          <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 15, marginBottom: 14 }}>
            @{nick}
          </Text>

          <View style={[styles.qrWrap, { borderColor: appTheme.accent }]}>
            {matrix.map((row, rIdx) => (
              <View key={rIdx} style={{ flexDirection: 'row' }}>
                {row.map((cell, cIdx) => (
                  <View
                    key={cIdx}
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2.5,
                      backgroundColor: cell ? appTheme.accent : 'transparent',
                    }}
                  />
                ))}
              </View>
            ))}
            <View style={[styles.centerAvaWrap, { borderColor: appTheme.accent }]}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.centerAva} />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
                  {(nick || '?').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: appTheme.accent }]}
            onPress={() =>
              Share.share({
                message: `Добавляй меня в Беспонтовом Чате: @${nick}\n${deepUrl}`,
              }).catch(() => {})
            }
          >
            <Ionicons name="share-social" size={18} color="#000" />
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 14 }}>Поделиться профилем</Text>
          </TouchableOpacity>
        </GlassCard>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 320, padding: 22, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  qrWrap: {
    padding: 14,
    borderRadius: 24,
    backgroundColor: '#070b14',
    borderWidth: 2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAvaWrap: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  centerAva: { width: '100%', height: '100%' },
  shareBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
  },
});
