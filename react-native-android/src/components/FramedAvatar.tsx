import React, { useEffect, useRef } from 'react';
import { View, Image, Text, Animated, StyleSheet } from 'react-native';
import { PROFILE_FRAMES_CATALOG } from '../constants/catalogs';

interface FramedAvatarProps {
  uri?: string;
  name?: string;
  frameId?: string;
  size?: number;
  online?: boolean;
  square?: boolean;
}

export const FramedAvatar: React.FC<FramedAvatarProps> = ({
  uri,
  name = '?',
  frameId = 'none',
  size = 48,
  online = false,
  square = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const frame = PROFILE_FRAMES_CATALOG.find((f) => f.id === frameId) || PROFILE_FRAMES_CATALOG[0];
  const hasFrame = frameId && frameId !== 'none';

  useEffect(() => {
    if (!hasFrame) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1100, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hasFrame, pulseAnim]);

  const animatedBorderColor = hasFrame
    ? pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [frame.borderColor, frame.secondaryColor !== 'transparent' ? frame.secondaryColor : frame.borderColor],
      })
    : 'transparent';

  const pad = hasFrame ? (size >= 80 ? 3 : 2) : 0;
  const innerSize = size - pad * 2;
  const radius = square ? Math.max(8, size * 0.16) : size / 2;
  const innerRadius = square ? Math.max(6, innerSize * 0.14) : innerSize / 2;
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Animated.View
        style={[
          styles.frameOuter,
          {
            width: size,
            height: size,
            borderRadius: radius,
            padding: pad,
            borderWidth: hasFrame ? (size >= 80 ? 2.5 : 2) : 0,
            borderColor: animatedBorderColor,
            backgroundColor: hasFrame ? 'rgba(0,0,0,0.35)' : 'transparent',
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: innerSize, height: innerSize, borderRadius: innerRadius, backgroundColor: '#1b2838' }}
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              { width: innerSize, height: innerSize, borderRadius: innerRadius },
            ]}
          >
            <Text style={[styles.initial, { fontSize: Math.max(14, Math.floor(innerSize * 0.42)) }]}>
              {initial}
            </Text>
          </View>
        )}
      </Animated.View>

      {online && (
        <View
          style={[
            styles.onlineDot,
            {
              width: size >= 80 ? 18 : 13,
              height: size >= 80 ? 18 : 13,
              borderRadius: 99,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frameOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#1e2c3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#ffffff',
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#080C14',
  },
});
