import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { RADII } from '../theme/liquidGlass';

import ChatsScreen from '../screens/ChatsScreen';
import CallsScreen from '../screens/CallsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function AnimatedTabPill({
  route,
  isFocused,
  onPress,
  onLongPress,
  label,
  iconChar,
  badgeCount,
  isProfile,
  userAvatar,
  appTheme,
}: any) {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1.04 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.04 : 1,
      useNativeDriver: true,
      tension: 260,
      friction: 18,
    }).start();
  }, [isFocused]);

  return (
    <TouchableOpacity
      key={route.key}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          styles.pillInner,
          { transform: [{ scale: scaleAnim }] },
          isFocused && { backgroundColor: appTheme.accentSoft, borderColor: appTheme.specular, borderWidth: 1 },
        ]}
      >
        <View style={{ position: 'relative' }}>
          {isProfile && userAvatar ? (
            <Image
              source={{ uri: userAvatar }}
              style={[
                styles.profileAvatar,
                isFocused && { borderColor: appTheme.accent },
              ]}
            />
          ) : (
            <Text style={styles.tabIcon}>{iconChar}</Text>
          )}

          {badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? appTheme.accent : appTheme.textSub },
            isFocused && { fontWeight: '800' },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function TelegramTabBar({ state, navigation, userAvatar, unreadCount, reqsCount }: any) {
  const insets = useSafeAreaInsets();
  const { appTheme, markAllChatsRead, showToast } = useApp();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatingOuter,
        { bottom: Math.max(insets.bottom, 10) + 6 },
      ]}
    >
      <View
        style={[
          styles.capsule,
          {
            backgroundColor: appTheme.glassStrong,
            borderColor: appTheme.border,
            borderTopColor: appTheme.specular,
          },
        ]}
      >
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

          if (route.name === 'Calls') {
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
            <AnimatedTabPill
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={
                route.name === 'Chats'
                  ? () => {
                      markAllChatsRead();
                      showToast('Все чаты прочитаны ✓✓', undefined, 'success');
                    }
                  : undefined
              }
              label={label}
              iconChar={iconChar}
              badgeCount={badgeCount}
              isProfile={isProfile}
              userAvatar={userAvatar}
              appTheme={appTheme}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TelegramBottomNav() {
  const { me, chats, incomingRequests } = useApp();
  const unreadCount = chats.reduce((acc, c) => acc + (Number(c.unread) || 0), 0);
  const reqsCount = incomingRequests.length;

  return (
    <Tab.Navigator
      initialRouteName="Chats"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TelegramTabBar
          {...props}
          userAvatar={me?.avatar}
          unreadCount={unreadCount}
          reqsCount={reqsCount}
        />
      )}
    >
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingOuter: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  capsule: {
    width: '100%',
    maxWidth: 440,
    height: 64,
    borderRadius: RADII.PILL,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  tabItem: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInner: {
    width: '94%',
    height: '100%',
    borderRadius: RADII.PILL,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIcon: { fontSize: 18 },
  profileAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 9.5, fontWeight: '900' },
});
