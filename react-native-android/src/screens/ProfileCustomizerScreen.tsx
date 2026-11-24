import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { PROFILE_THEMES_CATALOG, PROFILE_FRAMES_CATALOG } from '../constants/catalogs';
import { FramedAvatar } from '../components/FramedAvatar';
import { LiquidBackground } from '../components/LiquidBackground';
import { GlassCard } from '../components/GlassCard';
import { ScalePressable } from '../components/ScalePressable';
import { RADII } from '../theme/liquidGlass';

export default function ProfileCustomizerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { me, buyThemeOrFrame, equipThemeAndFrame, appTheme, showToast, showDialog } = useApp();

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
      showToast('Готово ✓', 'Оформление профиля обновлено!', 'success');
      navigation.goBack();
      return;
    }

    showDialog({
      title: 'Покупка оформления',
      message: `Приобрести и применить за ${totalCost} 🥟?`,
      buttons: [
        { text: 'Отмена', style: 'cancel' },
        {
          text: `Купить за ${totalCost} 🥟`,
          onPress: async () => {
            try {
              await buyThemeOrFrame(selectedTheme, selectedFrame, totalCost);
              showToast('Поздравляем! 🎉', 'Новое оформление куплено навсегда и применено!', 'success');
              navigation.goBack();
            } catch (e: any) {
              showDialog({
                title: 'Недостаточно пирожков',
                message: e?.message,
                buttons: [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Пополнить', onPress: () => navigation.navigate('PirozhkiStore', { initialTab: 'buy' }) },
                ],
              });
            }
          },
        },
      ],
    });
  };

  return (
    <LiquidBackground>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
          <GlassCard radius={RADII.PILL} strong style={styles.headerPill}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
              <Text style={{ fontSize: 20, color: '#fff', fontWeight: '800' }}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: appTheme.text }]}>Оформление</Text>
            <ScalePressable
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
            </ScalePressable>
          </GlassCard>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <GlassCard
            radius={RADII.CARD}
            style={[styles.previewCard, { backgroundColor: themeItem.card, borderColor: themeItem.border }]}
          >
            <FramedAvatar
              uri={me?.avatar}
              name={me?.nick || 'User'}
              frameId={selectedFrame}
              size={88}
              online
            />
            <Text style={styles.previewNick}>{me?.nick || 'Пользователь'}</Text>
            <Text style={[styles.previewThemeLbl, { color: themeItem.accent }]}>
              {themeItem.name} • {frameItem.name}
            </Text>
          </GlassCard>

          <Text style={styles.sectionTitle}>ВЫБЕРИТЕ ФОН ПРОФИЛЯ</Text>
          <View style={styles.grid2}>
            {PROFILE_THEMES_CATALOG.map((t) => {
              const act = selectedTheme === t.id;
              const owned = isThemeOwned(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.optCard,
                    { backgroundColor: appTheme.glass, borderColor: act ? '#66c0f4' : appTheme.border },
                  ]}
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
                  style={[
                    styles.optCard,
                    { backgroundColor: appTheme.glass, borderColor: act ? '#ffd700' : appTheme.border },
                  ]}
                  onPress={() => setSelectedFrame(f.id)}
                >
                  <FramedAvatar name={me?.nick || 'A'} frameId={f.id} size={48} />
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
          <ScalePressable
            haptic
            style={[styles.actionBtn, { backgroundColor: totalCost > 0 ? '#f59e0b' : appTheme.accent }]}
            onPress={handleAction}
          >
            <Text style={styles.actionBtnText}>
              {totalCost === 0 ? 'Сохранить оформление ✓' : `Купить и применить за ${totalCost} 🥟`}
            </Text>
          </ScalePressable>
        </View>
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  headerPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 7 },
  backCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16.5, fontWeight: '800' },
  balChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  scroll: { padding: 14, paddingBottom: 30 },
  previewCard: { padding: 20, alignItems: 'center', marginBottom: 18 },
  previewNick: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 10 },
  previewThemeLbl: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#66c0f4', marginBottom: 10, letterSpacing: 0.7 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optCard: {
    width: '48%',
    borderRadius: 24,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  themeSwatch: { width: '100%', height: 42, borderRadius: 14, borderWidth: 1.5, marginBottom: 8 },
  optName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pricePill: { marginTop: 6, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  pillOwned: { backgroundColor: 'rgba(34, 197, 94, 0.16)' },
  pillPrice: { backgroundColor: 'rgba(245, 158, 11, 0.16)' },
  priceTxt: { fontSize: 11, fontWeight: '800' },
  footer: { padding: 14 },
  actionBtn: { borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { color: '#000', fontSize: 15, fontWeight: '900' },
});
