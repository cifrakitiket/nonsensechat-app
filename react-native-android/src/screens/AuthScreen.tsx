import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { loginWithNickOrEmail, registerAccount, appTheme } = useApp();

  const [isReg, setIsReg] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!loginInput.trim() || !password) {
      setErrorMsg('Заполните логин и пароль');
      return;
    }
    if (isReg && !nick.trim()) {
      setErrorMsg('Введите желаемый @юзернейм');
      return;
    }

    setLoading(true);
    try {
      if (isReg) {
        await registerAccount(loginInput, nick, password);
      } else {
        await loginWithNickOrEmail(loginInput, password);
      }
    } catch (e: any) {
      const code = e?.code || '';
      const map: Record<string, string> = {
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/invalid-credential': 'Неверный логин или пароль',
        'auth/email-already-in-use': 'Этот Email уже зарегистрирован',
        'auth/weak-password': 'Пароль должен быть не менее 6 символов',
      };
      setErrorMsg(map[code] || e?.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LiquidBackground>
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: insets.top }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" backgroundColor={appTheme.canvas} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <GlassCard radius={RADII.CARD} strong style={styles.card}>
            <Image
              source={require('../../android/app/src/main/assets/public/logo.png')}
              style={styles.logo}
            />
            <Text style={[styles.title, { color: appTheme.text }]}>
              {isReg ? 'Регистрация' : 'Вход в аккаунт'}
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.textSub }]}>
              Беспонтовый Чат · Liquid Glass Native
            </Text>

            {!!errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Text style={[styles.label, { color: appTheme.textSub }]}>
              {isReg ? 'EMAIL' : 'ЛОГИН (@USERNAME) ИЛИ EMAIL'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: appTheme.glassInput, color: appTheme.text }]}
              placeholder={isReg ? 'you@example.com' : '@username или email'}
              placeholderTextColor={appTheme.textSub}
              autoCapitalize="none"
              keyboardType={isReg ? 'email-address' : 'default'}
              value={loginInput}
              onChangeText={setLoginInput}
            />

            {isReg && (
              <>
                <Text style={[styles.label, { color: appTheme.textSub }]}>ЮЗЕРНЕЙМ (ЛАТИНИЦА)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: appTheme.glassInput, color: appTheme.text }]}
                  placeholder="например: alex_pro"
                  placeholderTextColor={appTheme.textSub}
                  autoCapitalize="none"
                  value={nick}
                  onChangeText={setNick}
                />
              </>
            )}

            <Text style={[styles.label, { color: appTheme.textSub }]}>ПАРОЛЬ</Text>
            <TextInput
              style={[styles.input, { backgroundColor: appTheme.glassInput, color: appTheme.text }]}
              placeholder="Минимум 6 символов"
              placeholderTextColor={appTheme.textSub}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <ScalePressable
              haptic
              style={[styles.submitBtn, { backgroundColor: appTheme.accent }, loading && { opacity: 0.65 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitText}>
                  {isReg ? 'Создать аккаунт' : 'Войти'}
                </Text>
              )}
            </ScalePressable>

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => {
                setIsReg(!isReg);
                setErrorMsg('');
              }}
            >
              <Text style={[styles.switchText, { color: appTheme.accent }]}>
                {isReg ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 18 },
  card: { padding: 24 },
  logo: { width: 72, height: 72, borderRadius: 24, alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6, marginTop: 10 },
  input: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  submitBtn: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  submitText: { color: '#000', fontSize: 15.5, fontWeight: '900' },
  switchBtn: { marginTop: 16, paddingVertical: 8, alignItems: 'center' },
  switchText: { fontSize: 13.5, fontWeight: '700' },
});
