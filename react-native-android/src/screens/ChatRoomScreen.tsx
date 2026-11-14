import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatRoomScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { chatId, name } = route.params || {};
  const webViewRef = useRef<WebView>(null);

  // Full feature zero-loss URL
  const targetUrl = `https://nonsensechattm-e5d18.web.app/#chat=${chatId || ''}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Native Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.chatTitle} numberOfLines={1}>
          {name || 'Чат'}
        </Text>
      </View>

      {/* Embedded High-Performance Engine */}
      <WebView
        ref={webViewRef}
        source={{ uri: targetUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5b8fb9" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0e1420',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  backBtnText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  chatTitle: {
    fontSize: 16.5,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#080C14',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#080C14',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
