import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { PROFILE_THEMES_CATALOG, PROFILE_FRAMES_CATALOG } from '../constants/catalogs';
import { FramedAvatar } from '../components/FramedAvatar';

export default function ProfileCustomizerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, buyThemeOrFrame, equipThemeAndFrame } = useApp();

  const [selectedTheme, setSelectedTheme] = useState(me?.steamTheme || 'classic');
  const [selectedFrame, setSelectedFrame] = useState(me?.steamFrame || 'none');

  const isThemeOwned = (id: string) =>
    id === 'classic' || me?.steamTheme === id || (me?.unlockedThemes || []).includes(id);
  const isFrameOwned = (id: string) =>
    id === 'none' || me?.steamFrame === id || (me?.unlockedFrames || []).includes(id);

  const themeItem = PROFILE_THEMES_CATALOG.find((t) => t.id === selectedTheme) || PROFILE_THEMES_CATALOG[0];
  const frameItem = PROFILE_FRAMES_CATALOG.find((f) => f.id === selectedFrame) || PROFILE_FRAMES_CATALOG[0];

  const needTheme = !isThemeOwned(selectedTheme);
  const needFrame = !isFrameOwned(selectedFrame);
  const totalCost = (needTheme ? themeItem.cost : 0) + (needFrame ? frameItem.cost : 0);

  const handleAction = async () => {
    if (!me) return;
    if (totalCost === 0) {
      await equipThemeAndFrame(selectedTheme, selectedFrame);
      Alert.alert('Готово ✓', 'Оформление профиля обновлено!');
      navigation.goBack();
      return;
    }

    Alert.alert('Покупка оформления', `Приобрести и применить за ${totalCost} 🥟?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: `Купить за ${totalCost} 🥟`,
        onPress: async () => {
          try {
            await buyThemeOrFrame(selectedTheme, selectedFrame, totalCost);
            Alert.alert('Поздравляем! 🎉', 'Новое оформление куплено навсегда и применено!');
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Недостаточно пирожков', e?.message, [
              { text: 'Отмена', style: 'cancel' },
              { text: 'Пополнить', onPress: () => navigation.navigate('PirozhkiStore', { initialTab: 'buy' }) },
            ]);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Оформление профиля</Text>
        <TouchableOpacity
          style={styles.balChip}
          onPress={() => navigation.navigate('PirozhkiStore', { initialTab: 'buy' })}
        >
          <Image
            source={require('../../android/app/src/main/assets/public/pirozhok.png')}
            style={{ width: 15, height: 15 }}
          />
          <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
            {(me?.pirozhki || 0).toLocaleString('ru-RU')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Live Preview */}
        <View style={[styles.previewCard, { backgroundColor: themeItem.card, borderColor: themeItem.border }]}>
          <FramedAvatar
            uri={me?.avatar}
            name={me?.nick || 'User'}
            frameId={selectedFrame}
            size={84}
            online
            square
          />
          <Text style={styles.previewNick}>{me?.nick || 'Пользователь'}</Text>
          <Text style={[styles.previewThemeLbl, { color: themeItem.accent }]}>
            {themeItem.name} • {frameItem.name}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>ВЫБЕРИТЕ ФОН ПРОФИЛЯ</Text>
        <View style={styles.grid2}>
          {PROFILE_THEMES_CATALOG.map((t) => {
            const act = selectedTheme === t.id;
            const owned = isThemeOwned(t.id);
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.optCard, act && styles.optCardAct]}
                onPress={() => setSelectedTheme(t.id)}
              >
                <View style={[styles.themeSwatch, { backgroundColor: t.card, borderColor: t.accent }]} />
                <Text style={styles.optName}>{t.name}</Text>
                <View style={[styles.pricePill, owned ? styles.pillOwned : styles.pillPrice]}>
                  <Text style={[styles.priceTxt, owned ? { color: '#4ade80' } : { color: '#fbbf24' }]}>
                    {t.cost === 0 ? 'Бесплатно' : owned ? '✓ Куплено' : `${t.cost} 🥟`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>ВЫБЕРИТЕ РАМКУ АВАТАРА</Text>
        <View style={styles.grid2}>
          {PROFILE_FRAMES_CATALOG.map((f) => {
            const act = selectedFrame === f.id;
            const owned = isFrameOwned(f.id);
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.optCard, act && styles.optCardGold]}
                onPress={() => setSelectedFrame(f.id)}
              >
                <FramedAvatar name={me?.nick || 'A'} frameId={f.id} size={46} square />
                <Text style={[styles.optName, { marginTop: 6 }]}>{f.name}</Text>
                <View style={[styles.pricePill, owned ? styles.pillOwned : styles.pillPrice]}>
                  <Text style={[styles.priceTxt, owned ? { color: '#4ade80' } : { color: '#fbbf24' }]}>
                    {f.cost === 0 ? 'Бесплатно' : owned ? '✓ Куплено' : `${f.cost} 🥟`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionBtn, totalCost > 0 && { backgroundColor: '#d97706' }]}
          onPress={handleAction}
        >
          <Text style={styles.actionBtnText}>
            {totalCost === 0 ? 'Сохранить оформление ✓' : `Купить и применить за ${totalCost} 🥟`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  balChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  scroll: { padding: 14, paddingBottom: 30 },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
  },
  previewNick: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 10 },
  previewThemeLbl: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#66c0f4', marginBottom: 10, letterSpacing: 0.7 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optCard: {
    width: '48%',
    backgroundColor: '#131c2a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optCardAct: { borderColor: '#66c0f4', backgroundColor: 'rgba(102, 192, 244, 0.12)' },
  optCardGold: { borderColor: '#ffd700', backgroundColor: 'rgba(255, 215, 0, 0.12)' },
  themeSwatch: { width: '100%', height: 42, borderRadius: 8, borderWidth: 1.5, marginBottom: 8 },
  optName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pricePill: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillOwned: { backgroundColor: 'rgba(34, 197, 94, 0.16)' },
  pillPrice: { backgroundColor: 'rgba(245, 158, 11, 0.16)' },
  priceTxt: { fontSize: 11, fontWeight: '800' },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0e1420',
  },
  actionBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
