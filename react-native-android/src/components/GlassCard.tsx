import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useApp } from '../context/AppContext';
import { RADII } from '../theme/liquidGlass';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  strong?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  radius = RADII.CARD,
  strong = false,
}) => {
  const { appTheme } = useApp();

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: radius,
          backgroundColor: strong ? appTheme.glassStrong : appTheme.glass,
          borderColor: appTheme.border,
          borderTopColor: appTheme.specular,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
