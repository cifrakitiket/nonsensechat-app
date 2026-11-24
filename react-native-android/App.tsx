import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, PermissionsAndroid, Platform, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppProvider, useApp } from './src/context/AppContext';
import { GlassDialogHost } from './src/components/GlassDialogHost';
import TelegramBottomNav from './src/navigation/TelegramBottomNav';
import AuthScreen from './src/screens/AuthScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import PirozhkiStoreScreen from './src/screens/PirozhkiStoreScreen';
import ProfileCustomizerScreen from './src/screens/ProfileCustomizerScreen';
import PrefixSoundScreen from './src/screens/PrefixSoundScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { authUser, loadingAuth } = useApp();

  useEffect(() => {
    if (Platform.OS === 'android') {
      const perms: any[] = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];
      if (Platform.Version >= 33) {
        if ((PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS) {
          perms.push((PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS);
        }
        if ((PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES) {
          perms.push((PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES);
        }
        if ((PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_AUDIO) {
          perms.push((PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_AUDIO);
        }
      } else {
        perms.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      }
      PermissionsAndroid.requestMultiple(perms).catch(() => {});
    }
  }, []);

  if (loadingAuth) {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" backgroundColor="#080C14" />
        <ActivityIndicator size="large" color="#5b8fb9" />
        <Text style={styles.splashText}>Загрузка NonsenseChat...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#080C14" />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!authUser ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TelegramBottomNav} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="PirozhkiStore" component={PirozhkiStoreScreen} />
            <Stack.Screen name="ProfileCustomizer" component={ProfileCustomizerScreen} />
            <Stack.Screen name="PrefixSound" component={PrefixSoundScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
        <GlassDialogHost />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#080C14',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashText: {
    color: '#8aabb8',
    fontSize: 14,
    fontWeight: '600',
  },
});
