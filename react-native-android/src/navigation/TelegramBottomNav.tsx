import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

import ChatsScreen from '../screens/ChatsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import CallsScreen from '../screens/CallsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TelegramTabBar({ state, descriptors, navigation, userAvatar, unreadCount }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let label = 'Чаты';
        let iconChar = '💬';
        let badgeCount = 0;

        if (route.name === 'Contacts') {
          label = 'Контакты';
          iconChar = '👤';
        } else if (route.name === 'Calls') {
          label = 'Звонки';
          iconChar = '📞';
        } else if (route.name === 'Chats') {
          label = 'Чаты';
          iconChar = '💬';
          badgeCount = unreadCount || 0;
        } else if (route.name === 'Profile') {
          label = 'Профиль';
          iconChar = '⚙️';
        }

        const isProfile = route.name === 'Profile';

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabItem}
          >
            <View style={[styles.pillContainer, isFocused && styles.pillActive]}>
              {isProfile && userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={[styles.profileAvatar, isFocused && styles.profileAvatarActive]}
                />
              ) : (
                <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>{iconChar}</Text>
              )}

              {badgeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TelegramBottomNav() {
  const { me, chats } = useApp();
  const unreadCount = chats.reduce((acc, c) => acc + (Number(c.unread) || 0), 0);

  return (
    <Tab.Navigator
      initialRouteName="Chats"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TelegramTabBar
          {...props}
          userAvatar={me?.avatar}
          unreadCount={unreadCount}
        />
      )}
    >
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#0e1420',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    elevation: 8,
    paddingTop: 4,
    height: Platform.OS === 'android' ? 62 : 56,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  pillContainer: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pillActive: { backgroundColor: 'rgba(91,143,185,0.22)' },
  tabIcon: { fontSize: 18, color: '#8e9aa8' },
  tabIconActive: { color: '#5b8fb9' },
  profileAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  profileAvatarActive: { borderColor: '#5b8fb9' },
  tabLabel: { fontSize: 11, color: '#8e9aa8', marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: '#5b8fb9', fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -2,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
