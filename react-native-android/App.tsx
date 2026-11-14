import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  BackHandler,
  ToastAndroid,
  Platform,
  PermissionsAndroid,
  Image,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Linking,
  NativeModules,
  Vibration,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// Local bundled assets load instantly without network dependency or ISP blocks
const LOCAL_ASSET_URL = 'file:///android_asset/public/index.html';
const ONLINE_FALLBACK_URL = 'https://nonsensechat.ru';

function MainApp() {
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(LOCAL_ASSET_URL);
  const [isLoading, setIsLoading] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const lastBackPressTime = useRef(0);
  const [fcmToken, setFcmToken] = useState('');
  const fcmTokenRef = useRef('');

  const fetchAndInjectFcmToken = useCallback(() => {
    if (NativeModules.NotificationModule && NativeModules.NotificationModule.getFcmToken) {
      NativeModules.NotificationModule.getFcmToken()
        .then((tok: string) => {
          if (tok) {
            setFcmToken(tok);
            fcmTokenRef.current = tok;
            webViewRef.current?.injectJavaScript(`
              window.__FCM_TOKEN__ = '${tok}';
              if (window.onNativeFcmToken) window.onNativeFcmToken('${tok}');
              true;
            `);
          }
        })
        .catch((e: any) => console.log('[FCM] Token fetch:', e));
    }
  }, []);

  useEffect(() => {
    fetchAndInjectFcmToken();
    const t = setTimeout(fetchAndInjectFcmToken, 2500);
    return () => clearTimeout(t);
  }, [fetchAndInjectFcmToken]);

  const dismissSplash = useCallback(() => {
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsLoading(false);
    });
  }, [splashOpacity]);

  // Request Android runtime permissions for camera, audio recording, media and notifications
  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS === 'android') {
        try {
          const permissions = [
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ];

          if (Platform.Version >= 33) {
            permissions.push(
              (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS,
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
            );
          } else {
            permissions.push(
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            );
          }

          await PermissionsAndroid.requestMultiple(permissions);
        } catch (err) {
          console.warn('Permissions error:', err);
        }
      }
    }
    requestPermissions();

    // Deep linking: navigate to specific chat when opened from notification URL
    function handleOpenUrl(url: string | null) {
      if (!url) return;
      try {
        let chatId = '';
        if (url.includes('openChat=')) {
          const m = url.match(/[?&]openChat=([^&]+)/);
          if (m) chatId = decodeURIComponent(m[1]);
        } else if (url.includes('chat=')) {
          const m = url.match(/[?&]chat=([^&]+)/);
          if (m) chatId = decodeURIComponent(m[1]);
        }
        if (chatId && webViewRef.current) {
          const script = `
            (function() {
              if (typeof openChatById === 'function') {
                openChatById('${chatId}');
              }
            })();
            true;
          `;
          webViewRef.current.injectJavaScript(script);
        }
      } catch (_) {}
    }

    Linking.getInitialURL().then(handleOpenUrl).catch(() => {});
    const linkSub = Linking.addEventListener('url', (e) => handleOpenUrl(e.url));

    // SAFETY TIMER: Under no circumstance stay stuck on splash screen for more than 1.5 seconds!
    const timer = setTimeout(() => {
      dismissSplash();
    }, 1500);

    return () => {
      clearTimeout(timer);
      linkSub.remove();
    };
  }, [dismissSplash]);

  // Hardware back button handler for Android
  const onHardwareBack = useCallback(() => {
    if (!webViewRef.current) return false;

    // Send back command to the web app
    const script = `
      (function() {
        var handled = false;
        // 1. Close mobile chat view if open
        if (document.body && document.body.classList.contains('mobile-chat-open')) {
          if (typeof closeMobileChat === 'function') {
            closeMobileChat();
            handled = true;
          }
        }
        // 2. Close any open modal dialogs
        if (!handled) {
          var openModals = document.querySelectorAll('.modal:not(.hidden)');
          if (openModals.length > 0) {
            openModals.forEach(function(m) {
              if (typeof closeModal === 'function') closeModal(m.id);
            });
            handled = true;
          }
        }
        // 3. Close sticker / emoji / theme / lang pickers
        if (!handled) {
          if (window.tgpOpen) {
            if (typeof closeTgp === 'function') closeTgp();
            handled = true;
          }
          var tp = document.getElementById('themePicker');
          if (tp && tp.style.display !== 'none') {
            tp.style.display = 'none';
            handled = true;
          }
          var lp = document.getElementById('langPicker');
          if (lp && lp.style.display !== 'none') {
            lp.style.display = 'none';
            handled = true;
          }
        }
        // 4. Return to 'chats' tab from contacts/calls/profile
        if (!handled && typeof currentTgTab !== 'undefined' && currentTgTab !== 'chats') {
          if (typeof switchTgTab === 'function') {
            switchTgTab('chats');
            handled = true;
          }
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'BACK_RESULT', handled: handled }));
      })();
      true;
    `;

    webViewRef.current.injectJavaScript(script);
    return true;
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onHardwareBack();
      return true;
    });
    return () => sub.remove();
  }, [onHardwareBack]);

  // Handle messages posted from WebView
  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SHOW_NOTIFICATION') {
        const title = data.title || 'Беспонтовый Чат';
        const body = data.body || '';
        const chatId = data.chatId || '';
        if (NativeModules.NotificationModule && NativeModules.NotificationModule.showNotification) {
          NativeModules.NotificationModule.showNotification(title, body, chatId);
        } else {
          try {
            ToastAndroid.show(`${title}: ${body}`, ToastAndroid.SHORT);
            Vibration.vibrate([0, 180, 80, 180]);
          } catch (_) {}
        }
      } else if (data.type === 'REQUEST_FCM_TOKEN') {
        fetchAndInjectFcmToken();
      } else if (data.type === 'BACK_RESULT') {
        if (!data.handled) {
          // Double tap back to exit
          const now = Date.now();
          if (now - lastBackPressTime.current < 2000) {
            BackHandler.exitApp();
          } else {
            lastBackPressTime.current = now;
            ToastAndroid.show('Нажмите «Назад» ещё раз для выхода', ToastAndroid.SHORT);
          }
        }
      }
    } catch (_) {}
  };

  const onLoadProgress = ({ nativeEvent }: any) => {
    if (nativeEvent.progress >= 0.7) {
      dismissSplash();
    }
  };

  const onLoadEnd = () => {
    dismissSplash();
    fetchAndInjectFcmToken();
  };

  const onError = () => {
    // If local asset failed for any reason, switch to online domain
    if (currentUrl === LOCAL_ASSET_URL) {
      setCurrentUrl(ONLINE_FALLBACK_URL);
    }
    dismissSplash();
  };

  const injectedJs = `
    (function() {
      window.isReactNativeAndroid = true;
      window.isAndroidApp = true;
      window.AndroidBridge = {
        showLocalNotification: function(title, body, chatId) {
          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SHOW_NOTIFICATION',
                title: String(title || ''),
                body: String(body || ''),
                chatId: String(chatId || '')
              }));
            }
          } catch (e) {}
        },
        getFCMToken: function() {
          return window.__FCM_TOKEN__ || '';
        },
        getFCMtoken: function() {
          return window.__FCM_TOKEN__ || '';
        },
        requestFCMToken: function() {
          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_FCM_TOKEN' }));
            }
          } catch (_) {}
        },
        haptic: function() {
          try {
            if (navigator.vibrate) navigator.vibrate(10);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'HAPTIC', style: 'light' }));
            }
          } catch (e) {}
        },
        hapticMedium: function() {
          try {
            if (navigator.vibrate) navigator.vibrate(25);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'HAPTIC', style: 'medium' }));
            }
          } catch (e) {}
        },
        setStatusBarDark: function(dark) {
          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SET_STATUS_BAR', dark: !!dark }));
            }
          } catch (e) {}
        },
        logError: function(msg) {
          console.warn('[AndroidBridge logError]:', msg);
        },
        downloadFile: function(url, filename) {
          console.log('[AndroidBridge downloadFile]:', filename);
        }
      };

      try {
        window.Notification = function(title, options) {
          options = options || {};
          var body = options.body || '';
          var chatId = (options.data && options.data.chatId) || '';
          window.AndroidBridge.showLocalNotification(title, body, chatId);
        };
        window.Notification.permission = 'granted';
        window.Notification.requestPermission = function() {
          return Promise.resolve('granted');
        };
      } catch (e) {}
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#080C14"
        translucent={false}
      />

      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        databaseEnabled={true}
        cacheEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        onPermissionRequest={(request) => request.grant(request.resources)}
        geolocationEnabled={true}
        mixedContentMode="always"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        androidLayerType="hardware"
        userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 NonsenseChatAndroid/2.6.1"
        injectedJavaScriptBeforeContentLoaded={injectedJs}
        onLoadProgress={onLoadProgress}
        onLoadEnd={onLoadEnd}
        onError={onError}
        onMessage={onWebViewMessage}
      />

      {/* Branded Loading Splash with Failsafe Auto-Dismiss */}
      {isLoading && (
        <Animated.View style={[styles.splashOverlay, { opacity: splashOpacity }]} pointerEvents="none">
          <Image
            source={{ uri: 'https://nonsensechat.ru/logo.png' }}
            style={styles.splashLogo}
          />
          <Text style={styles.splashTitle}>Беспонтовый Чат</Text>
          <Text style={styles.splashSubtitle}>Android Edition</Text>
          <ActivityIndicator size="large" color="#5b8fb9" style={styles.splashSpinner} />
        </Animated.View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C14',
  },
  webview: {
    flex: 1,
    backgroundColor: '#080C14',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080C14',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  splashLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#5b8fb9',
    marginTop: 4,
    marginBottom: 24,
    fontWeight: '500',
  },
  splashSpinner: {
    marginTop: 8,
  },
});
