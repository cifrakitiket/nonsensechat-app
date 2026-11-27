import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface MessageEffectsOverlayProps {
  triggerKey: number;
  emoji: string;
}

export const MessageEffectsOverlay: React.FC<MessageEffectsOverlayProps> = ({
  triggerKey,
  emoji,
}) => {
  const { powerSaveMode } = useApp();
  const anim = useRef(new Animated.Value(0)).current;

  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, idx) => ({
      id: idx,
      startX: (SCREEN_W * ((idx * 37) % 100)) / 100,
      driftX: ((idx % 2 === 0 ? 1 : -1) * (25 + (idx * 13) % 65)),
      startY: SCREEN_H * 0.72 + ((idx * 19) % 120),
      endY: -80 - ((idx * 29) % 160),
      size: 24 + (idx % 4) * 8,
      rot: (idx % 2 === 0 ? 1 : -1) * (45 + idx * 12),
    }));
  }, [triggerKey]);

  useEffect(() => {
    if (!triggerKey || !emoji || powerSaveMode) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 1650,
      useNativeDriver: true,
    }).start();
  }, [triggerKey, emoji, powerSaveMode]);

  if (!triggerKey || !emoji || powerSaveMode) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p) => {
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [p.startY, p.endY],
        });
        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [p.startX, p.startX + p.driftX],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.15, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.4, 1.25, 0.85],
        });
        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute',
              opacity,
              transform: [{ translateX }, { translateY }, { scale }],
            }}
          >
            <Text style={{ fontSize: p.size }}>{emoji}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};
