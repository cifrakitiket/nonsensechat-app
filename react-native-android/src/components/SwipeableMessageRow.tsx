import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { triggerHaptic } from '../services/firebase';

interface SwipeableMessageRowProps {
  children: React.ReactNode;
  accent: string;
  selectionMode?: boolean;
  onSwipeReply: () => void;
  onDoubleTapReact: () => void;
  onLongPress: () => void;
  onPressInSelection?: () => void;
}

export const SwipeableMessageRow: React.FC<SwipeableMessageRowProps> = ({
  children,
  accent,
  selectionMode = false,
  onSwipeReply,
  onDoubleTapReact,
  onLongPress,
  onPressInSelection,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const triggeredRef = useRef(false);
  const lastTapRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        if (selectionMode) return false;
        return (
          gestureState.dx < -10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (_evt, gestureState) => {
        const clamped = Math.max(-72, Math.min(0, gestureState.dx));
        translateX.setValue(clamped);
        if (clamped <= -42 && !triggeredRef.current) {
          triggeredRef.current = true;
          triggerHaptic(14);
        } else if (clamped > -36) {
          triggeredRef.current = false;
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const shouldReply = gestureState.dx <= -42;
        triggeredRef.current = false;
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 240,
          friction: 20,
        }).start();
        if (shouldReply) {
          onSwipeReply();
        }
      },
      onPanResponderTerminate: () => {
        triggeredRef.current = false;
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const replyOpacity = translateX.interpolate({
    inputRange: [-60, -18, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const replyScale = translateX.interpolate({
    inputRange: [-60, -40, 0],
    outputRange: [1.1, 0.95, 0.5],
    extrapolate: 'clamp',
  });

  const handlePress = () => {
    if (selectionMode) {
      onPressInSelection?.();
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      triggerHaptic(12);
      onDoubleTapReact();
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <View style={styles.wrap} {...panResponder.panHandlers}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.replyIndicator,
          {
            opacity: replyOpacity,
            transform: [{ scale: replyScale }],
            backgroundColor: 'rgba(255,255,255,0.12)',
          },
        ]}
      >
        <Ionicons name="arrow-undo" size={16} color={accent} />
      </Animated.View>

      <TouchableWithoutFeedback
        onPress={handlePress}
        onLongPress={() => {
          triggerHaptic(16);
          onLongPress();
        }}
        delayLongPress={320}
      >
        <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  replyIndicator: {
    position: 'absolute',
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
