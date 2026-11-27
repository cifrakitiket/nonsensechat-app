import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';

interface FloatingAudioPlayerBarProps {
  onNavigateChat?: (chatId: string, chatName: string) => void;
}

export const FloatingAudioPlayerBar: React.FC<FloatingAudioPlayerBarProps> = ({
  onNavigateChat,
}) => {
  const insets = useSafeAreaInsets();
  const {
    appTheme,
    globalAudioTrack,
    globalAudioPlaying,
    globalAudioSpeed,
    globalAudioProgress,
    toggleGlobalAudioPause,
    closeGlobalAudio,
    cycleGlobalAudioSpeed,
  } = useApp();

  if (!globalAudioTrack) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: Math.max(insets.top, 8) + 52 }]}
    >
      <GlassCard radius={999} strong style={styles.bar}>
        <TouchableOpacity onPress={toggleGlobalAudioPause} style={[styles.playBtn, { backgroundColor: appTheme.accent }]}>
          <Ionicons name={globalAudioPlaying ? 'pause' : 'play'} size={15} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.8}
          onPress={() => onNavigateChat?.(globalAudioTrack.chatId, globalAudioTrack.chatName)}
        >
          <Text style={[styles.title, { color: appTheme.text }]} numberOfLines={1}>
            {globalAudioTrack.isMusic ? '🎵 ' : '🎧 '}
            {globalAudioTrack.title}
          </Text>
          <View style={styles.progTrack}>
            <View
              style={[
                styles.progFill,
                { width: `${Math.round(globalAudioProgress * 100)}%`, backgroundColor: appTheme.accent },
              ]}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={cycleGlobalAudioSpeed} style={styles.speedPill}>
          <Text style={{ color: appTheme.accent, fontSize: 11, fontWeight: '900' }}>
            {globalAudioSpeed}x
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={closeGlobalAudio} style={{ padding: 4 }}>
          <Ionicons name="close" size={18} color={appTheme.textSub} />
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 90,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 10,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 12.5, fontWeight: '800' },
  progTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginTop: 4,
    overflow: 'hidden',
  },
  progFill: { height: '100%', borderRadius: 2 },
  speedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
