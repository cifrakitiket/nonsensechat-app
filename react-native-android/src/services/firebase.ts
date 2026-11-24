import { NativeModules, Vibration } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: 'AIzaSyCVH8_UhxO5hAj0ZBlA_lRw3B0hnN1zEOc',
  authDomain: 'nonsensechattm-e5d18.firebaseapp.com',
  databaseURL: 'https://nonsensechattm-e5d18-default-rtdb.firebaseio.com',
  projectId: 'nonsensechattm-e5d18',
  storageBucket: 'nonsensechattm-e5d18.firebasestorage.app',
  messagingSenderId: '497380539024',
  appId: '1:497380539024:web:cace5570f62f9e073af615',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const storageAdapter = NativeModules.NativeStorageModule
  ? {
      getItem: (key: string) => NativeModules.NativeStorageModule.getItem(key),
      setItem: (key: string, val: string) => NativeModules.NativeStorageModule.setItem(key, val),
      removeItem: (key: string) => NativeModules.NativeStorageModule.removeItem(key),
    }
  : null;

let authInstance: FirebaseAuth.Auth;
try {
  const getRnPersistence = (FirebaseAuth as any).getReactNativePersistence;
  if (storageAdapter && typeof getRnPersistence === 'function') {
    authInstance = FirebaseAuth.initializeAuth(app, {
      persistence: getRnPersistence(storageAdapter),
    });
  } else {
    authInstance = FirebaseAuth.getAuth(app);
  }
} catch (_) {
  authInstance = FirebaseAuth.getAuth(app);
}

export const auth = authInstance;
export const rtdb = getDatabase(app);

export function playPrefixSound(soundSource?: string) {
  if (!soundSource) return;
  try {
    Vibration.vibrate(12);
    if (NativeModules.SoundPlayerModule && NativeModules.SoundPlayerModule.playAudioSource) {
      NativeModules.SoundPlayerModule.playAudioSource(soundSource);
    }
  } catch (_) {}
}

export function triggerHaptic(durationMs = 15) {
  try {
    Vibration.vibrate(durationMs);
  } catch (_) {}
}
