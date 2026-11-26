import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../services/firebase';
import { LiquidBackground } from './LiquidBackground';

export const PinLockOverlay: React.FC = () => {
  const { pinCode, appTheme } = useApp();
  const [locked, setLocked] = useState(false);
  const [entered, setEntered] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const wasBgRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (pinCode && pinCode.length === 4 && !initializedRef.current) {
      initializedRef.current = true;
      setLocked(true);
    }
    if (!pinCode) {
      setLocked(false);
      setEntered('');
    }
  }, [pinCode]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        wasBgRef.current = true;
      } else if (state === 'active' && wasBgRef.current) {
        wasBgRef.current = false;
        if (pinCode && pinCode.length === 4) {
          setEntered('');
          setErrorMsg('');
          setLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, [pinCode]);

  if (!locked || !pinCode) return null;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (d: string) => {
    triggerHaptic(8);
    setErrorMsg('');
    const next = entered + d;
    setEntered(next);
    if (next.length === 4) {
      if (next === pinCode) {
        triggerHaptic(18);
        setLocked(false);
        setEntered('');
      } else {
        triggerHaptic(40);
        triggerShake();
        setErrorMsg('Неверный код-пароль');
        setTimeout(() => setEntered(''), 260);
      }
    }
  };

  const handleBackspace = () => {
    if (!entered.length) return;
    triggerHaptic(6);
    setEntered((prev) => prev.slice(0, -1));
  };

  return (
    <View style={styles.overlay}>
      <LiquidBackground>
        <View style={styles.center}>
          <View style={[styles.lockCircle, { backgroundColor: appTheme.accentSoft, borderColor: appTheme.accent }]}>
            <Ionicons name="lock-closed" size={32} color={appTheme.accent} />
          </View>
          <Text style={[styles.title, { color: appTheme.text }]}>Код-пароль</Text>
          <Text style={[styles.sub, { color: errorMsg ? '#f87171' : appTheme.textSub }]}>
            {errorMsg || 'Введите 4-значный PIN для входа в БЧ'}
          </Text>

          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {[0, 1, 2, 3].map((i) => {
              const filled = i < entered.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: filled ? appTheme.accent : 'rgba(255,255,255,0.12)',
                      borderColor: filled ? appTheme.accent : 'rgba(255,255,255,0.3)',
                    },
                  ]}
                />
              );
            })}
          </Animated.View>

          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, idx) => {
              if (!key) return <View key={idx} style={styles.keyEmpty} />;
              if (key === 'del') {
                return (
                  <TouchableOpacity key={idx} style={styles.keyBtn} onPress={handleBackspace}>
                    <Ionicons name="backspace-outline" size={24} color={appTheme.text} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  style={[styles.keyBtn, { backgroundColor: appTheme.glass, borderColor: appTheme.border }]}
                  onPress={() => handleDigit(key)}
                >
                  <Text style={[styles.keyText, { color: appTheme.text }]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </LiquidBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 99999, elevation: 99 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  lockCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { fontSize: 13.5, marginTop: 6, marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 34 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  keypad: { width: 264, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  keyEmpty: { width: 74, height: 74 },
  keyBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 26, fontWeight: '700' },
});
