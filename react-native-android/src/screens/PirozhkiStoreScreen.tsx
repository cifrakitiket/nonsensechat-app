import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  CREATOR_UID,
  PIROZHKI_PACKS,
  PREFIX_STYLES,
  PRESET_PREFIXES,
} from '../constants/catalogs';
import { PrefixBadge } from '../components/PrefixBadge';

export default function PirozhkiStoreScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { initialTab = 'buy', targetUid = '' } = route.params || {};
  const { me, usersMap, grantSelfPirozhki, giftPirozhki, buyPrefix } = useApp();

  const [tab, setTab] = useState<'buy' | 'prefixes' | 'gift'>(initialTab);
  const [selectedPack, setSelectedPack] = useState(PIROZHKI_PACKS[1]);
  const [payLoading, setPayLoading] = useState(false);

  // Creator grant
  const [grantAmount, setGrantAmount] = useState('500');

  // Custom prefix builder
  const [customText, setCustomText] = useState('');
  const [customStyle, setCustomStyle] = useState('gold');

  // Gift state
  const [giftSearch, setGiftSearch] = useState('');
  const [giftTargetUid, setGiftTargetUid] = useState(targetUid);
  const [giftAmount, setGiftAmount] = useState('50');
  const [giftNote, setGiftNote] = useState('');

  const isCreator = me?.uid === CREATOR_UID;
  const bal = me?.pirozhki || 0;

  const handleYooKassaCheckout = async () => {
    if (!me) return;
    setPayLoading(true);
    try {
      const resp = await fetch('https://nonsensechat-web-5vve.vercel.app/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedPack.priceRub,
          pirozhki: selectedPack.count,
          uid: me.uid,
          email: me.email || '',
          returnUrl: 'https://nonsensechat.ru/',
          description: `Покупка ${selectedPack.count} пирожков в NonsenseChat (Android)`,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (data && data.confirmationUrl) {
        await Linking.openURL(data.confirmationUrl);
      } else {
        Alert.alert('Ошибка ЮKassa', 'Сервер оплаты не вернул ссылку.');
      }
    } catch (e: any) {
      Alert.alert('Ошибка сети', e?.message || 'Не удалось создать платёж');
    } finally {
      setPayLoading(false);
    }
  };

  const handleGrantSelf = async (amt: number) => {
    try {
      await grantSelfPirozhki(amt);
      Alert.alert('Готово 🥟', `Начислено +${amt} пирожков на ваш аккаунт!`);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message);
    }
  };

  const handleBuyPresetPrefix = (text: string, style: string, cost: number) => {
    Alert.alert('Покупка префикса', `Купить префикс "${text}" за ${cost} 🥟?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Купить',
        onPress: async () => {
          try {
            await buyPrefix(text, style, cost);
            Alert.alert('Успешно 🎉', `Префикс "${text}" установлен!`);
          } catch (e: any) {
            Alert.alert('Недостаточно пирожков', e?.message);
          }
        },
      },
    ]);
  };

  const handleBuyCustomPrefix = () => {
    const clean = customText.trim();
    if (!clean) {
      Alert.alert('Внимание', 'Введите текст префикса (до 12 символов)');
      return;
    }
    handleBuyPresetPrefix(clean, customStyle, 250);
  };

  const handleGiftSubmit = async () => {
    const amt = parseInt(giftAmount, 10) || 0;
    if (!giftTargetUid) {
      Alert.alert('Выберите получателя', 'Нажмите на пользователя из списка');
      return;
    }
    try {
      await giftPirozhki(giftTargetUid, amt, giftNote);
      Alert.alert('Угостили! 🥟', `Вы успешно подарили ${amt} пирожков!`);
      setGiftNote('');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message);
    }
  };

  const otherUsers = Object.values(usersMap)
    .filter((u) => u.uid !== me?.uid)
    .filter((u) => !giftSearch.trim() || u.nick.toLowerCase().includes(giftSearch.toLowerCase()));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Магазин Пирожков</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Balance Banner */}
      <View style={styles.balanceBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image
            source={require('../../android/app/src/main/assets/public/pirozhok.png')}
            style={{ width: 36, height: 36 }}
          />
          <View>
            <Text style={styles.balLabel}>ВАШ БАЛАНС</Text>
            <Text style={styles.balValue}>
              {bal.toLocaleString('ru-RU')} 🥟{' '}
              <Text style={styles.balRub}>(~{(bal * 0.42).toFixed(2)} ₽)</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Store Tabs */}
      <View style={styles.tabsRow}>
        {[
          { k: 'buy', l: '🥟 Купить' },
          { k: 'prefixes', l: '🏷️ Префиксы' },
          { k: 'gift', l: '🎁 Угостить' },
        ].map((t) => (
          <TouchableOpacity
            key={t.k}
            style={[styles.tabBtn, tab === t.k && styles.tabBtnAct]}
            onPress={() => setTab(t.k as any)}
          >
            <Text style={[styles.tabText, tab === t.k && styles.tabTextAct]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tab === 'buy' && (
          <>
            {isCreator && (
              <View style={styles.creatorCard}>
                <Text style={styles.creatorTitle}>⚡ ПАНЕЛЬ СОЗДАТЕЛЯ — ВЫДАТЬ СЕБЕ</Text>
                <View style={styles.creatorQuickRow}>
                  {[100, 500, 1000, 5000].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={styles.creatorQuickBtn}
                      onPress={() => handleGrantSelf(v)}
                    >
                      <Text style={styles.creatorQuickText}>+{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    keyboardType="numeric"
                    value={grantAmount}
                    onChangeText={setGrantAmount}
                  />
                  <TouchableOpacity
                    style={styles.creatorSubmitBtn}
                    onPress={() => handleGrantSelf(parseInt(grantAmount, 10) || 100)}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Выдать</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>ВЫБЕРИТЕ ПАКЕТ (1 шт. = 0.42 ₽)</Text>
            <View style={styles.packGrid}>
              {PIROZHKI_PACKS.map((p) => {
                const act = selectedPack.count === p.count;
                return (
                  <TouchableOpacity
                    key={p.count}
                    style={[styles.packCard, act && styles.packCardAct]}
                    onPress={() => setSelectedPack(p)}
                  >
                    {p.hot && (
                      <View style={styles.hotBadge}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>ХИТ 🔥</Text>
                      </View>
                    )}
                    <Image
                      source={require('../../android/app/src/main/assets/public/pirozhok.png')}
                      style={{ width: 28, height: 28, marginBottom: 4 }}
                    />
                    <Text style={styles.packCount}>{p.count} шт.</Text>
                    <Text style={styles.packPrice}>{p.priceRub}.00 ₽</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, payLoading && { opacity: 0.6 }]}
              disabled={payLoading}
              onPress={handleYooKassaCheckout}
            >
              {payLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.checkoutText}>
                  Оплатить {selectedPack.priceRub} ₽ через ЮKassa / СБП
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {tab === 'prefixes' && (
          <>
            {me?.prefix ? (
              <View style={styles.activePrefixCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Ваш префикс:</Text>
                  <PrefixBadge
                    prefix={me.prefix}
                    prefixStyle={me.prefixStyle}
                    prefixSound={me.prefixSound}
                    large
                  />
                </View>
                <TouchableOpacity
                  style={styles.soundConfigBtn}
                  onPress={() => navigation.navigate('PrefixSound')}
                >
                  <Text style={{ color: '#fbbf24', fontWeight: '700', fontSize: 12 }}>
                    🔊 Звук (до 2с)
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>ГОТОВЫЕ ПРЕФИКСЫ</Text>
            <View style={styles.prefixGrid}>
              {PRESET_PREFIXES.map((pr) => (
                <TouchableOpacity
                  key={pr.text}
                  style={styles.prefixCard}
                  onPress={() => handleBuyPresetPrefix(pr.text, pr.style, pr.cost)}
                >
                  <PrefixBadge prefix={pr.text} prefixStyle={pr.style} />
                  <Text style={styles.prefixCost}>{pr.cost} 🥟</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  🛠️ Свой уникальный префикс
                </Text>
                <Text style={{ color: '#fbbf24', fontWeight: '800' }}>250 🥟</Text>
              </View>
              <TextInput
                style={styles.input}
                maxLength={12}
                placeholder="Текст до 12 символов..."
                placeholderTextColor="#64748b"
                value={customText}
                onChangeText={setCustomText}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                {Object.keys(PREFIX_STYLES).map((sk) => (
                  <TouchableOpacity
                    key={sk}
                    style={[styles.stylePill, customStyle === sk && styles.stylePillAct]}
                    onPress={() => setCustomStyle(sk)}
                  >
                    <Text style={{ color: customStyle === sk ? '#fbbf24' : '#cbd5e1', fontSize: 12, fontWeight: '700' }}>
                      {PREFIX_STYLES[sk].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <PrefixBadge prefix={customText || 'ПРИМЕР'} prefixStyle={customStyle} large />
              </View>
              <TouchableOpacity style={styles.checkoutBtn} onPress={handleBuyCustomPrefix}>
                <Text style={styles.checkoutText}>Купить свой префикс за 250 🥟</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {tab === 'gift' && (
          <>
            <Text style={styles.sectionTitle}>ВЫБЕРИТЕ ДРУГА</Text>
            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              placeholder="Поиск пользователя..."
              placeholderTextColor="#64748b"
              value={giftSearch}
              onChangeText={setGiftSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {otherUsers.slice(0, 20).map((u) => {
                const act = giftTargetUid === u.uid;
                return (
                  <TouchableOpacity
                    key={u.uid}
                    style={[styles.giftUserChip, act && styles.giftUserChipAct]}
                    onPress={() => setGiftTargetUid(u.uid)}
                  >
                    <Text style={{ color: act ? '#fbbf24' : '#e2e8f0', fontWeight: '700' }}>
                      @{u.nick}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>КОЛИЧЕСТВО ПИРОЖКОВ</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {['25', '50', '100', '250'].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.giftAmtPill, giftAmount === v && styles.giftAmtPillAct]}
                  onPress={() => setGiftAmount(v)}
                >
                  <Text style={{ color: giftAmount === v ? '#000' : '#fff', fontWeight: '800' }}>{v} 🥟</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              keyboardType="numeric"
              value={giftAmount}
              onChangeText={setGiftAmount}
              placeholder="Другое количество"
              placeholderTextColor="#64748b"
            />
            <TextInput
              style={[styles.input, { marginBottom: 14 }]}
              value={giftNote}
              onChangeText={setGiftNote}
              placeholder="Комментарий к подарку (необязательно)"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleGiftSubmit}>
              <Text style={styles.checkoutText}>🎁 Отправить {giftAmount || 0} пирожков</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  backBtn: { padding: 4 },
  backText: { fontSize: 22, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  balanceBanner: {
    margin: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  balLabel: { fontSize: 10.5, fontWeight: '800', color: '#cbd5e1', letterSpacing: 0.6 },
  balValue: { fontSize: 20, fontWeight: '900', color: '#fbbf24', marginTop: 2 },
  balRub: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabBtnAct: { backgroundColor: '#f59e0b' },
  tabText: { color: '#94a3b8', fontSize: 12.5, fontWeight: '800' },
  tabTextAct: { color: '#000' },
  scrollContent: { padding: 14, paddingBottom: 40 },
  creatorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  creatorTitle: { color: '#fca5a5', fontSize: 11, fontWeight: '800', marginBottom: 8 },
  creatorQuickRow: { flexDirection: 'row', gap: 6 },
  creatorQuickBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  creatorQuickText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  creatorSubmitBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 8, letterSpacing: 0.5 },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  packCard: {
    width: '31%',
    backgroundColor: '#131c2a',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  packCardAct: { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.16)' },
  hotBadge: {
    position: 'absolute',
    top: -6,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  packCount: { color: '#fbbf24', fontWeight: '900', fontSize: 15 },
  packPrice: { color: '#fff', fontWeight: '700', fontSize: 12.5, marginTop: 2 },
  checkoutBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  checkoutText: { color: '#000', fontWeight: '900', fontSize: 14.5 },
  activePrefixCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131c2a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  soundConfigBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  prefixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  prefixCard: {
    width: '31%',
    backgroundColor: '#131c2a',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  prefixCost: { color: '#fbbf24', fontWeight: '800', fontSize: 12 },
  customBox: {
    backgroundColor: '#111927',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    backgroundColor: '#0a0f18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  stylePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 6,
  },
  stylePillAct: { backgroundColor: 'rgba(245, 158, 11, 0.22)', borderWidth: 1, borderColor: '#f59e0b' },
  giftUserChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#131c2a',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  giftUserChipAct: { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.16)' },
  giftAmtPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#131c2a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  giftAmtPillAct: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
});
