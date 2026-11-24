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

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { loginWithNickOrEmail, registerAccount } = useApp();

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
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#080C14" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image
            source={require('../../android/app/src/main/assets/public/logo.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>{isReg ? 'Регистрация' : 'Вход в аккаунт'}</Text>
          <Text style={styles.subtitle}>Беспонтовый Чат · Нативный клиент Android</Text>

          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Text style={styles.label}>{isReg ? 'EMAIL' : 'ЛОГИН (@USERNAME) ИЛИ EMAIL'}</Text>
          <TextInput
            style={styles.input}
            placeholder={isReg ? 'you@example.com' : '@username или email'}
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType={isReg ? 'email-address' : 'default'}
            value={loginInput}
            onChangeText={setLoginInput}
          />

          {isReg && (
            <>
              <Text style={styles.label}>ЮЗЕРНЕЙМ (ЛАТИНИЦА)</Text>
              <TextInput
                style={styles.input}
                placeholder="например: alex_pro"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                value={nick}
                onChangeText={setNick}
              />
            </>
          )}

          <Text style={styles.label}>ПАРОЛЬ</Text>
          <TextInput
            style={styles.input}
            placeholder="Минимум 6 символов"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.65 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {isReg ? 'Создать аккаунт' : 'Войти'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => {
              setIsReg(!isReg);
              setErrorMsg('');
            }}
          >
            <Text style={styles.switchText}>
              {isReg ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C14',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#111927',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8aabb8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8aabb8',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0a0f18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: '#5b8fb9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '700',
  },
  switchBtn: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  switchText: {
    color: '#7ab3d9',
    fontSize: 13.5,
    fontWeight: '600',
  },
});
