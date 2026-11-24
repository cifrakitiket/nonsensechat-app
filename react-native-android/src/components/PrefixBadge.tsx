import React, { useRef } from 'react';
import { TouchableOpacity, Text, Animated, StyleSheet } from 'react-native';
import { PREFIX_STYLES } from '../constants/catalogs';
import { playPrefixSound } from '../services/firebase';

interface PrefixBadgeProps {
  prefix?: string;
  prefixStyle?: string;
  prefixSound?: string;
  large?: boolean;
}

export const PrefixBadge: React.FC<PrefixBadgeProps> = ({
  prefix,
  prefixStyle = 'gold',
  prefixSound,
  large = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (!prefix || !prefix.trim()) return null;

  const styleCfg = PREFIX_STYLES[prefixStyle] || PREFIX_STYLES.gold;
  const hasSound = !!(prefixSound && prefixSound.trim());

  const handlePress = () => {
    if (!hasSound) return;
    playPrefixSound(prefixSound);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.12, duration: 90, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={hasSound ? 0.65 : 1}
        disabled={!hasSound}
        onPress={handlePress}
        style={[
          styles.badge,
          large && styles.badgeLg,
          {
            backgroundColor: styleCfg.bg,
            borderColor: styleCfg.border,
          },
        ]}
      >
        {hasSound && (
          <Text style={[styles.soundIcon, large && styles.soundIconLg, { color: styleCfg.text }]}>
            🔊
          </Text>
        )}
        <Text
          style={[styles.text, large && styles.textLg, { color: styleCfg.text }]}
          numberOfLines={1}
        >
          {prefix}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    gap: 3,
    alignSelf: 'flex-start',
  },
  badgeLg: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  soundIcon: {
    fontSize: 9,
  },
  soundIconLg: {
    fontSize: 11,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  textLg: {
    fontSize: 12,
  },
});
