import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { triggerHaptic } from '../services/firebase';
import { useApp } from '../context/AppContext';

export interface DrawStroke {
  color: string;
  points: Array<{ x: number; y: number }>; // normalized 0..1
}

export interface PhotoEditsData {
  strokes: DrawStroke[];
  overlayText?: string;
  overlayColor?: string;
  overlaySticker?: string;
}

interface PhotoEditsLayerProps {
  edits?: PhotoEditsData | null;
  width: number;
  height: number;
}

export const PhotoEditsLayer: React.FC<PhotoEditsLayerProps> = ({ edits, width, height }) => {
  if (!edits) return null;
  const strokes = Array.isArray(edits.strokes) ? edits.strokes : [];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height, overflow: 'hidden' }]}>
      {strokes.map((st, sIdx) =>
        (st.points || []).map((pt, pIdx) => {
          if (pIdx === 0) return null;
          const prev = st.points[pIdx - 1];
          const x1 = prev.x * width;
          const y1 = prev.y * height;
          const x2 = pt.x * width;
          const y2 = pt.y * height;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.max(4, Math.hypot(dx, dy));
          const angle = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
          return (
            <View
              key={`${sIdx}_${pIdx}`}
              style={{
                position: 'absolute',
                left: (x1 + x2) / 2 - len / 2,
                top: (y1 + y2) / 2 - 2.5,
                width: len + 2,
                height: 5,
                borderRadius: 3,
                backgroundColor: st.color || '#ef4444',
                transform: [{ rotate: angle }],
              }}
            />
          );
        })
      )}
      {edits.overlaySticker ? (
        <View style={{ position: 'absolute', top: 12, right: 14 }}>
          <Text style={{ fontSize: Math.max(30, Math.round(width * 0.17)) }}>{edits.overlaySticker}</Text>
        </View>
      ) : null}
      {edits.overlayText ? (
        <View
          style={{
            position: 'absolute',
            bottom: 14,
            alignSelf: 'center',
            backgroundColor: 'rgba(0,0,0,0.68)',
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 12,
            maxWidth: '90%',
          }}
        >
          <Text
            style={{
              color: edits.overlayColor || '#fff',
              fontWeight: '900',
              fontSize: Math.max(13, Math.round(width * 0.06)),
              textAlign: 'center',
            }}
          >
            {edits.overlayText}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const BRUSH_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#ffffff'];
const STAMP_STICKERS = ['', '🔥', '❤️', '😂', '🥟', '👑', '💯', '🚀', '✨'];

interface PhotoEditorModalProps {
  visible: boolean;
  imageUri: string;
  initialEdits?: PhotoEditsData | null;
  onClose: () => void;
  onSaveEdits: (edits: PhotoEditsData) => void;
}

const CANVAS_SIZE = Math.min(Dimensions.get('window').width - 28, 360);

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  visible,
  imageUri,
  initialEdits,
  onClose,
  onSaveEdits,
}) => {
  const { appTheme } = useApp();
  const [strokes, setStrokes] = useState<DrawStroke[]>(initialEdits?.strokes || []);
  const [color, setColor] = useState<string>('#ef4444');
  const [overlayText, setOverlayText] = useState<string>(initialEdits?.overlayText || '');
  const [overlaySticker, setOverlaySticker] = useState<string>(initialEdits?.overlaySticker || '');
  const activeColorRef = useRef(color);
  activeColorRef.current = color;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = Math.max(0, Math.min(1, evt.nativeEvent.locationX / CANVAS_SIZE));
        const y = Math.max(0, Math.min(1, evt.nativeEvent.locationY / CANVAS_SIZE));
        setStrokes((prev) => [...prev, { color: activeColorRef.current, points: [{ x, y }] }]);
      },
      onPanResponderMove: (evt) => {
        const x = Math.max(0, Math.min(1, evt.nativeEvent.locationX / CANVAS_SIZE));
        const y = Math.max(0, Math.min(1, evt.nativeEvent.locationY / CANVAS_SIZE));
        setStrokes((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, points: [...last.points, { x, y }] };
          return next;
        });
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>🎨 Фоторедактор БЧ</Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic(8);
              setStrokes((prev) => prev.slice(0, -1));
            }}
            style={styles.iconBtn}
          >
            <Ionicons name="arrow-undo" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View
          style={[styles.canvasBox, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}
          {...panResponder.panHandlers}
        >
          {!!imageUri && (
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          )}
          <PhotoEditsLayer
            edits={{ strokes, overlayText, overlayColor: color, overlaySticker }}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
          />
        </View>

        <View style={styles.paletteRow}>
          {BRUSH_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
              ]}
            />
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 16, maxHeight: 44, alignItems: 'center' }}
        >
          {STAMP_STICKERS.map((st, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setOverlaySticker(st)}
              style={[
                styles.stickerChip,
                overlaySticker === st && { borderColor: appTheme.accent, backgroundColor: appTheme.accentSoft },
              ]}
            >
              <Text style={{ fontSize: 18, color: '#fff' }}>{st || '🚫'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ width: '100%', paddingHorizontal: 18, marginTop: 10 }}>
          <TextInput
            style={styles.textInput}
            placeholder="Текст поверх фото..."
            placeholderTextColor="#94a3b8"
            value={overlayText}
            onChangeText={setOverlayText}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: appTheme.accent }]}
          onPress={() => {
            triggerHaptic(15);
            onSaveEdits({
              strokes,
              overlayText: overlayText.trim(),
              overlayColor: color,
              overlaySticker,
            });
            onClose();
          }}
        >
          <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>✓ Применить к фото</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,9,20,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  canvasBox: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#000',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 14,
  },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  stickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
});
