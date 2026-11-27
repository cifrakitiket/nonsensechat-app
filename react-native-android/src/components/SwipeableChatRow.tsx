import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { triggerHaptic } from '../services/firebase';

interface SwipeableChatRowProps {
  children: React.ReactNode;
  disabled?: boolean;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onToggleArchive: () => void;
}

export const SwipeableChatRow: React.FC<SwipeableChatRowProps> = ({
  children,
  disabled = false,
  isPinned,
  isMuted,
  isArchived,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);

  const closeRow = () => {
    openRef.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 220,
      friction: 22,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) => {
        if (disabled) return false;
        return Math.abs(gs.dx) > 14 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.6;
      },
      onPanResponderMove: (_e, gs) => {
        const base = openRef.current ? -174 : 0;
        const next = Math.max(-184, Math.min(0, base + gs.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_e, gs) => {
        if (gs.dx < -48) {
          openRef.current = true;
          triggerHaptic(10);
          Animated.spring(translateX, {
            toValue: -174,
            useNativeDriver: true,
            tension: 220,
            friction: 22,
          }).start();
        } else {
          closeRow();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={[styles.actBtn, { backgroundColor: '#3b82f6' }]}
          onPress={() => {
            closeRow();
            onTogglePin();
          }}
        >
          <Text style={styles.actIcon}>📌</Text>
          <Text style={styles.actLbl}>{isPinned ? 'Откреп' : 'Закреп'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actBtn, { backgroundColor: '#f59e0b' }]}
          onPress={() => {
            closeRow();
            onToggleMute();
          }}
        >
          <Text style={styles.actIcon}>{isMuted ? '🔔' : '🔇'}</Text>
          <Text style={styles.actLbl}>{isMuted ? 'Звук' : 'Мут'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actBtn, { backgroundColor: '#64748b' }]}
          onPress={() => {
            closeRow();
            onToggleArchive();
          }}
        >
          <Text style={styles.actIcon}>📦</Text>
          <Text style={styles.actLbl}>{isArchived ? 'Вернуть' : 'Архив'}</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative', justifyContent: 'center' },
  actionsWrap: {
    position: 'absolute',
    right: 14,
    top: 6,
    bottom: 6,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actBtn: {
    width: 52,
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actIcon: { fontSize: 15 },
  actLbl: { color: '#fff', fontSize: 9.5, fontWeight: '800', marginTop: 2 },
});
