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
    NativeModules.SoundPlayerModule?.playAudioSource?.(soundSource);
  } catch (_) {}
}

export function playVoiceMessage(soundSource?: string) {
  if (!soundSource) return;
  try {
    NativeModules.SoundPlayerModule?.playVoiceAudio?.(soundSource);
  } catch (_) {}
}

export function stopVoiceMessage() {
  try {
    NativeModules.SoundPlayerModule?.stopVoiceAudio?.();
  } catch (_) {}
}

export interface DevicePhotoItem {
  id: string;
  uri: string;
  fileName: string;
  size: number;
  width: number;
  height: number;
  dateAdded: number;
  mimeType: string;
}

export interface DeviceFileItem {
  id: string;
  uri: string;
  fileName: string;
  size: number;
  dateModified: number;
  mimeType: string;
}

export interface DeviceAudioItem {
  id: string;
  uri: string;
  fileName: string;
  size: number;
  duration: number;
  dateAdded: number;
  mimeType: string;
}

export async function getRecentDevicePhotos(limit = 60): Promise<DevicePhotoItem[]> {
  return NativeModules.MediaPickerModule.getRecentPhotos(limit);
}

export async function getRecentDeviceFiles(limit = 50): Promise<DeviceFileItem[]> {
  return NativeModules.MediaPickerModule.getRecentFiles(limit);
}

export async function getRecentDeviceAudio(limit = 50): Promise<DeviceAudioItem[]> {
  return NativeModules.MediaPickerModule.getRecentAudio(limit);
}

export async function encodeDeviceImage(
  uri: string,
  maxDim = 1280
): Promise<{ dataUrl: string; fileName: string; fileSize: number; width: number; height: number }> {
  return NativeModules.MediaPickerModule.encodeImageUri(uri, maxDim);
}

export async function encodeDeviceFile(
  uri: string,
  maxBytes = 4 * 1024 * 1024
): Promise<{ dataUrl: string; fileName: string; fileSize: number; mimeType: string }> {
  return NativeModules.MediaPickerModule.encodeFileUri(uri, maxBytes);
}

export async function takeNativePhoto(): Promise<{ dataUrl: string; fileName: string; fileSize: number }> {
  return NativeModules.MediaPickerModule.takePhoto();
}

export async function startNativeVoiceRecording(maxDurationMs = 120000): Promise<boolean> {
  return NativeModules.VoiceRecorderModule.startRecording(maxDurationMs);
}

export async function stopNativeVoiceRecording(): Promise<{ dataUrl: string; duration: number; fileSize: number }> {
  return NativeModules.VoiceRecorderModule.stopRecording();
}

export function cancelNativeVoiceRecording() {
  try {
    NativeModules.VoiceRecorderModule?.cancelRecording?.();
  } catch (_) {}
}

import { APP_VERSION, APP_VERSION_CODE } from '../constants/catalogs';

export function triggerHaptic(durationMs = 15) {
  try {
    Vibration.vibrate(durationMs);
  } catch (_) {}
}

export interface AppUpdateInfo {
  version: string;
  versionCode: number;
  apkUrl: string;
  fileSize?: number;
  publishedAt?: string;
  releaseNotes?: string;
}

const VK_UPDATE_JSON_URL = 'https://hb.vkcs.cloud/noname/apk-version.json';

function compareSemver(a: string, b: string): number {
  const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export async function checkVkCloudUpdate(): Promise<AppUpdateInfo | null> {
  const resp = await fetch(`${VK_UPDATE_JSON_URL}?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as AppUpdateInfo;
  if (!data || !data.apkUrl) return null;

  const remoteCode = Number(data.versionCode) || 0;
  const isNewer =
    remoteCode > APP_VERSION_CODE ||
    (remoteCode === 0 && compareSemver(data.version, APP_VERSION) > 0);

  return isNewer ? data : null;
}

export async function canInstallUpdates(): Promise<boolean> {
  if (!NativeModules.AppUpdaterModule?.canRequestPackageInstalls) return true;
  return NativeModules.AppUpdaterModule.canRequestPackageInstalls();
}

export async function openInstallSettings(): Promise<void> {
  if (NativeModules.AppUpdaterModule?.openInstallPermissionSettings) {
    await NativeModules.AppUpdaterModule.openInstallPermissionSettings();
  }
}

export async function downloadAndInstallUpdate(apkUrl: string): Promise<boolean> {
  return NativeModules.AppUpdaterModule.downloadAndInstallApk(apkUrl);
}

export function cancelUpdateDownload() {
  try {
    NativeModules.AppUpdaterModule?.cancelDownload?.();
  } catch (_) {}
}
