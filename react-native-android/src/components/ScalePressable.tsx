import React, { useRef } from 'react';
import { TouchableOpacity, Animated, ViewStyle } from 'react-native';
import { triggerHaptic } from '../services/firebase';

interface ScalePressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  haptic?: boolean;
  scaleTo?: number;
}

export const ScalePressable: React.FC<ScalePressableProps> = ({
  children,
  onPress,
  onLongPress,
  disabled = false,
  style,
  haptic = false,
  scaleTo = 0.96,
}) => {
  const anim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(anim, {
      toValue: scaleTo,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 240,
      friction: 16,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: anim }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          if (haptic) triggerHaptic(10);
          onPress?.();
        }}
        onLongPress={() => {
          triggerHaptic(18);
          onLongPress?.();
        }}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};
