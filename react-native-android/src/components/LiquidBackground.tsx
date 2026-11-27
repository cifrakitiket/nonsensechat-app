import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useApp } from '../context/AppContext';

interface LiquidBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const LiquidBackground: React.FC<LiquidBackgroundProps> = ({ children, style }) => {
  const { appTheme, powerSaveMode } = useApp();

  return (
    <View style={[styles.root, { backgroundColor: appTheme.canvas }, style]}>
      {!powerSaveMode && (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.orb,
              {
                width: 310,
                height: 310,
                top: -80,
                left: -70,
                backgroundColor: appTheme.orb1,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.orb,
              {
                width: 280,
                height: 280,
                top: '36%',
                right: -95,
                backgroundColor: appTheme.orb2,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.orb,
              {
                width: 320,
                height: 320,
                bottom: -100,
                left: -40,
                backgroundColor: appTheme.orb3,
              },
            ]}
          />
        </>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
});
