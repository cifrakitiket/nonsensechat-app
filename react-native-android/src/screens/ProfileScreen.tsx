import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Профиль</Text>
      </View>

      {/* User Hero */}
      <View style={styles.heroSection}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>A</Text>
          </View>
          <View style={styles.cameraBadge}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        </View>

        <Text style={styles.userName}>Александр</Text>
        <Text style={styles.userUsername}>@alex</Text>
        <Text style={styles.userBio}>Разработчик Беспонтового Чата</Text>
      </View>

      {/* Settings Groups */}
      <View style={styles.settingsGroup}>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🎨</Text>
          <Text style={styles.settingText}>Оформление и темы</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>📁</Text>
          <Text style={styles.settingText}>Папки с чатами</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🔔</Text>
          <Text style={styles.settingText}>Уведомления и звуки</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🌐</Text>
          <Text style={styles.settingText}>Язык интерфейса</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsGroup}>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🚪</Text>
          <Text style={[styles.settingText, styles.logoutText]}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C14',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1b2838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5b8fb9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 14,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  userUsername: {
    fontSize: 14,
    color: '#5b8fb9',
    marginTop: 2,
  },
  userBio: {
    fontSize: 13,
    color: '#8e9aa8',
    marginTop: 6,
    textAlign: 'center',
  },
  settingsGroup: {
    backgroundColor: '#101724',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  settingIcon: {
    fontSize: 18,
    marginRight: 14,
  },
  settingText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  settingArrow: {
    fontSize: 18,
    color: '#6c7a89',
  },
  logoutText: {
    color: '#ef4444',
  },
});
