import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  NativeEventEmitter,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import {
  canInstallUpdates,
  cancelUpdateDownload,
  downloadAndInstallUpdate,
  openInstallSettings,
} from '../services/firebase';
import { APP_VERSION } from '../constants/catalogs';
import { GlassCard } from './GlassCard';

export const UpdateModalHost: React.FC = () => {
  const { appTheme, updateInfo, dismissUpdate, showToast } = useApp();

  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedMb, setDownloadedMb] = useState('0.0');
  const [totalMb, setTotalMb] = useState('0.0');
  const [needPermission, setNeedPermission] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (updateInfo) {
      setDownloading(false);
      setProgress(0);
      setNeedPermission(false);
      scaleAnim.setValue(0.92);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 240,
        friction: 18,
      }).start();
    }
  }, [updateInfo?.versionCode]);

  useEffect(() => {
    if (!NativeModules.AppUpdaterModule) return;
    const emitter = new NativeEventEmitter(NativeModules.AppUpdaterModule);
    const sub = emitter.addListener('AppUpdateProgress', (ev: any) => {
      const pct = Number(ev?.progress) || 0;
      const dl = Number(ev?.downloadedBytes) || 0;
      const tot = Number(ev?.totalBytes) || 0;
      setProgress(pct);
      setDownloadedMb((dl / (1024 * 1024)).toFixed(1));
      if (tot > 0) {
        setTotalMb((tot / (1024 * 1024)).toFixed(1));
      }
    });
    return () => sub.remove();
  }, []);

  if (!updateInfo) return null;

  const sizeLabel = updateInfo.fileSize
    ? `${(updateInfo.fileSize / (1024 * 1024)).toFixed(1)} МБ`
    : totalMb !== '0.0'
    ? `${totalMb} МБ`
    : '';

  const handleInstallPress = async () => {
    try {
      const allowed = await canInstallUpdates();
      if (!allowed) {
        setNeedPermission(true);
        await openInstallSettings();
        showToast('Разрешение', 'Включите «Установка из этого источника» и нажмите «Установить» снова', 'info');
        return;
      }
      setNeedPermission(false);
      setDownloading(true);
      setProgress(0);
      await downloadAndInstallUpdate(updateInfo.apkUrl);
      setDownloading(false);
    } catch (e: any) {
      setDownloading(false);
      if (!String(e?.code || '').includes('CANCELLED')) {
        showToast('Ошибка обновления', e?.message || 'Не удалось скачать APK', 'error');
      }
    }
  };

  const handleClose = () => {
    if (downloading) {
      cancelUpdateDownload();
      setDownloading(false);
    }
    dismissUpdate();
  };

  return (
    <Modal visible={!!updateInfo} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.outer, { transform: [{ scale: scaleAnim }] }]}>
          <GlassCard radius={28} strong style={styles.card}>
            <View style={[styles.iconBadge, { backgroundColor: appTheme.accent + '28' }]}>
              <Ionicons name="cloud-download" size={28} color={appTheme.accent} />
            </View>

            <Text style={[styles.title, { color: appTheme.text }]}>
              Доступно обновление v{updateInfo.version}
            </Text>
            <Text style={[styles.sub, { color: appTheme.textSub }]}>
              Текущая: v{APP_VERSION} {sizeLabel ? `· ${sizeLabel}` : ''} · VK Cloud
            </Text>

            {!!updateInfo.releaseNotes && (
              <ScrollView style={[styles.notesBox, { backgroundColor: appTheme.glass, borderColor: appTheme.border }]}>
                <Text style={[styles.notesText, { color: appTheme.text }]}>
                  {updateInfo.releaseNotes}
                </Text>
              </ScrollView>
            )}

            {downloading ? (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: appTheme.glass }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: appTheme.accent, width: `${Math.max(4, progress)}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: appTheme.textSub }]}>
                  Загрузка: {progress}% ({downloadedMb}
                  {totalMb !== '0.0' ? ` / ${totalMb}` : ''} МБ)
                </Text>
              </View>
            ) : null}

            {needPermission && !downloading ? (
              <Text style={styles.permHint}>
                Разрешите установку приложений из этого источника в настройках, затем нажмите «Установить».
              </Text>
            ) : null}

            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.btn, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: appTheme.border }]}
              >
                <Text style={[styles.btnText, { color: appTheme.textSub }]}>
                  {downloading ? 'Отменить' : 'Позже'}
                </Text>
              </TouchableOpacity>

              {!downloading && (
                <TouchableOpacity
                  onPress={handleInstallPress}
                  style={[styles.btn, { backgroundColor: appTheme.accent, borderColor: appTheme.accentSoft }]}
                >
                  <Text style={[styles.btnText, { color: '#000', fontWeight: '900' }]}>
                    {needPermission ? 'Повторить' : 'Установить'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 14, 0.74)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  outer: {
    width: '100%',
    maxWidth: 350,
  },
  card: {
    padding: 22,
    alignItems: 'center',
  },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  sub: {
    fontSize: 12.5,
    marginTop: 4,
    textAlign: 'center',
  },
  notesBox: {
    width: '100%',
    maxHeight: 150,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  notesText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  progressWrap: {
    width: '100%',
    marginTop: 16,
    gap: 6,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
  permHint: {
    color: '#fbbf24',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
