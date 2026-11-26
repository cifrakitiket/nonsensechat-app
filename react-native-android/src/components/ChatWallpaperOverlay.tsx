import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChatWallpaperKey } from '../context/AppContext';

interface ChatWallpaperOverlayProps {
  wallpaper: ChatWallpaperKey;
  accent: string;
}

const STAR_COORDS = [
  { top: '8%', left: '12%', size: 3 },
  { top: '14%', left: '78%', size: 4 },
  { top: '22%', left: '42%', size: 2.5 },
  { top: '29%', left: '88%', size: 3 },
  { top: '36%', left: '18%', size: 4 },
  { top: '44%', left: '65%', size: 2.5 },
  { top: '53%', left: '30%', size: 3.5 },
  { top: '61%', left: '82%', size: 3 },
  { top: '68%', left: '10%', size: 2.5 },
  { top: '76%', left: '54%', size: 4 },
  { top: '84%', left: '24%', size: 3 },
  { top: '90%', left: '72%', size: 3.5 },
];

export const ChatWallpaperOverlay: React.FC<ChatWallpaperOverlayProps> = ({
  wallpaper,
  accent,
}) => {
  if (!wallpaper || wallpaper === 'none') return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {wallpaper === 'stars' &&
        STAR_COORDS.map((s, idx) => (
          <View
            key={idx}
            style={{
              position: 'absolute',
              top: s.top as any,
              left: s.left as any,
              width: s.size,
              height: s.size,
              borderRadius: s.size,
              backgroundColor: idx % 3 === 0 ? accent : '#ffffff',
              opacity: idx % 2 === 0 ? 0.28 : 0.14,
            }}
          />
        ))}

      {wallpaper === 'bubbles' && (
        <>
          <View
            style={[
              styles.bubbleCircle,
              { top: '10%', left: '-12%', width: 180, height: 180, borderColor: accent, opacity: 0.1 },
            ]}
          />
          <View
            style={[
              styles.bubbleCircle,
              { top: '38%', right: '-10%', width: 220, height: 220, borderColor: '#ffffff', opacity: 0.06 },
            ]}
          />
          <View
            style={[
              styles.bubbleCircle,
              { bottom: '12%', left: '18%', width: 130, height: 130, borderColor: accent, opacity: 0.09 },
            ]}
          />
        </>
      )}

      {wallpaper === 'mesh' && (
        <>
          <View style={[styles.meshBlob, { top: '12%', right: '8%', backgroundColor: accent, opacity: 0.1 }]} />
          <View style={[styles.meshBlob, { bottom: '20%', left: '5%', backgroundColor: accent, opacity: 0.08 }]} />
        </>
      )}

      {wallpaper === 'grid' && (
        <View style={styles.gridWrap}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={`h_${i}`}
              style={{
                position: 'absolute',
                top: `${16 * (i + 1)}%`,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.035)',
              }}
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <View
              key={`v_${i}`}
              style={{
                position: 'absolute',
                left: `${22 * (i + 1)}%`,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: 'rgba(255,255,255,0.035)',
              }}
            />
          ))}
        </View>
      )}

      {wallpaper === 'aurora' && (
        <>
          <View
            style={{
              position: 'absolute',
              top: '18%',
              left: '-20%',
              right: '-20%',
              height: 180,
              borderRadius: 90,
              backgroundColor: accent,
              opacity: 0.08,
              transform: [{ rotate: '-14deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: '22%',
              left: '-15%',
              right: '-15%',
              height: 150,
              borderRadius: 75,
              backgroundColor: '#a855f7',
              opacity: 0.07,
              transform: [{ rotate: '12deg' }],
            }}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  meshBlob: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  gridWrap: {
    ...StyleSheet.absoluteFillObject,
  },
});
