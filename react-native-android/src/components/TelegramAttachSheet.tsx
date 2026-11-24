import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  InteractionManager,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp, UserProfile } from '../context/AppContext';
import {
  DeviceFileItem,
  DevicePhotoItem,
  encodeDeviceFile,
  encodeDeviceImage,
  getRecentDeviceFiles,
  getRecentDevicePhotos,
  takeNativePhoto,
  triggerHaptic,
} from '../services/firebase';
import { GlassCard } from './GlassCard';

type SheetTab = 'gallery' | 'file' | 'poll' | 'pirozhki' | 'contact';

export interface EncodedPhotoResult {
  dataUrl: string;
  fileName: string;
  fileSize: number;
}

export interface EncodedFileResult {
  dataUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface TelegramAttachSheetProps {
  visible: boolean;
  mode?: 'chat' | 'avatar';
  onClose: () => void;
  onSendPhotos?: (photos: EncodedPhotoResult[], caption: string) => Promise<void> | void;
  onSendFile?: (file: EncodedFileResult) => Promise<void> | void;
  onSendPoll?: (question: string, options: string[]) => Promise<void> | void;
  onSendPirozhki?: (amount: number, note: string) => Promise<void> | void;
  onSendContact?: (user: UserProfile) => Promise<void> | void;
  onPickAvatar?: (dataUrl: string) => Promise<void> | void;
  canGiftPirozhki?: boolean;
}

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 3;
const TILE_SIZE = Math.floor((SCREEN_W - 24 - GRID_GAP * 2) / 3);

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 Б';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

export const TelegramAttachSheet: React.FC<TelegramAttachSheetProps> = ({
  visible,
  mode = 'chat',
  onClose,
  onSendPhotos,
  onSendFile,
  onSendPoll,
  onSendPirozhki,
  onSendContact,
  onPickAvatar,
  canGiftPirozhki = true,
}) => {
  const { appTheme, me, usersMap, showToast } = useApp();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<SheetTab>('gallery');
  const [photos, setPhotos] = useState<DevicePhotoItem[]>([]);
  const [files, setFiles] = useState<DeviceFileItem[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [photoPermDenied, setPhotoPermDenied] = useState(false);
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Pirozhki state
  const [giftAmount, setGiftAmount] = useState('25');
  const [giftNote, setGiftNote] = useState('');

  // Smooth spring animations
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const tabFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      sheetAnim.setValue(0);
      setSelectedUris([]);
      setCaption('');
      setSearchOpen(false);
      setSearchQuery('');
      setBusy(false);
      return;
    }
    setActiveTab('gallery');
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 5,
    }).start();
    const task = InteractionManager.runAfterInteractions(() => {
      loadPhotos();
    });
    return () => task.cancel();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    tabFadeAnim.setValue(0.35);
    Animated.timing(tabFadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    if (activeTab === 'file' && files.length === 0 && !loadingFiles) {
      const task = InteractionManager.runAfterInteractions(() => {
        loadFiles();
      });
      return () => task.cancel();
    }
  }, [activeTab, visible]);

  const loadPhotos = async () => {
    setLoadingPhotos(true);
    setPhotoPermDenied(false);
    try {
      const list = await getRecentDevicePhotos(60);
      setPhotos(list || []);
    } catch (e: any) {
      if (String(e?.code || '').includes('PERMISSION') || String(e?.message || '').includes('доступ')) {
        setPhotoPermDenied(true);
      } else {
        showToast('Ошибка галереи', e?.message || 'Не удалось загрузить фото', 'error');
      }
    } finally {
      setLoadingPhotos(false);
    }
  };

  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const list = await getRecentDeviceFiles(50);
      setFiles(list || []);
    } catch (e: any) {
      showToast('Ошибка файлов', e?.message || 'Не удалось прочитать файлы', 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  const requestPhotoPermission = async () => {
    if (Platform.OS !== 'android') return;
    try {
      if (Platform.Version >= 34) {
        const res = await PermissionsAndroid.requestMultiple([
          (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES,
          'android.permission.READ_MEDIA_VISUAL_USER_SELECTED' as any,
        ]);
        const granted =
          res[(PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED ||
          res['android.permission.READ_MEDIA_VISUAL_USER_SELECTED'] === PermissionsAndroid.RESULTS.GRANTED;
        if (granted) {
          loadPhotos();
        } else {
          showToast('Нет доступа', 'Откройте настройки и разрешите «Фото и видео» → «Разрешить всегда»', 'error');
        }
      } else {
        const perm =
          Platform.Version >= 33
            ? (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const res = await PermissionsAndroid.request(perm);
        if (res === PermissionsAndroid.RESULTS.GRANTED) {
          loadPhotos();
        } else {
          showToast('Нет доступа', 'Откройте настройки и разрешите доступ к фото', 'error');
        }
      }
    } catch (_) {}
  };

  const handleCamera = async () => {
    try {
      setBusy(true);
      const res = await takeNativePhoto();
      if (mode === 'avatar' && onPickAvatar) {
        await onPickAvatar(res.dataUrl);
        onClose();
      } else if (onSendPhotos) {
        await onSendPhotos([{ dataUrl: res.dataUrl, fileName: res.fileName, fileSize: res.fileSize }], caption.trim());
        onClose();
      }
    } catch (e: any) {
      if (!String(e?.code || '').includes('CANCELLED')) {
        showToast('Камера', e?.message || 'Не удалось сделать фото', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const togglePhoto = async (item: DevicePhotoItem) => {
    triggerHaptic(8);
    if (mode === 'avatar') {
      try {
        setBusy(true);
        const encoded = await encodeDeviceImage(item.uri, 512);
        await onPickAvatar?.(encoded.dataUrl);
        onClose();
      } catch (e: any) {
        showToast('Ошибка фото', e?.message || 'Не удалось обработать фото', 'error');
      } finally {
        setBusy(false);
      }
      return;
    }

    setSelectedUris((prev) => {
      if (prev.includes(item.uri)) {
        return prev.filter((u) => u !== item.uri);
      }
      if (prev.length >= 6) {
        showToast('Лимит', 'Можно выбрать до 6 фото за раз', 'info');
        return prev;
      }
      return [...prev, item.uri];
    });
  };

  const handleSendSelectedPhotos = async () => {
    if (selectedUris.length === 0 || busy) return;
    try {
      setBusy(true);
      const encodedList: EncodedPhotoResult[] = [];
      for (const uri of selectedUris) {
        const enc = await encodeDeviceImage(uri, 1280);
        encodedList.push({
          dataUrl: enc.dataUrl,
          fileName: enc.fileName,
          fileSize: enc.fileSize,
        });
      }
      await onSendPhotos?.(encodedList, caption.trim());
      onClose();
    } catch (e: any) {
      showToast('Ошибка отправки', e?.message || 'Не удалось сжать фото', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePickFile = async (item: DeviceFileItem) => {
    if (busy) return;
    if (item.size > 4 * 1024 * 1024) {
      showToast('Слишком большой файл', 'Максимальный размер файла — 4 МБ', 'error');
      return;
    }
    try {
      setBusy(true);
      const encoded = await encodeDeviceFile(item.uri, 4 * 1024 * 1024);
      await onSendFile?.(encoded);
      onClose();
    } catch (e: any) {
      showToast('Ошибка файла', e?.message || 'Не удалось прочитать файл', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCreatePoll = async () => {
    const q = pollQuestion.trim();
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!q) {
      showToast('Опрос', 'Введите вопрос опроса', 'error');
      return;
    }
    if (opts.length < 2) {
      showToast('Опрос', 'Добавьте минимум 2 варианта ответа', 'error');
      return;
    }
    setBusy(true);
    try {
      await onSendPoll?.(q, opts);
      setPollQuestion('');
      setPollOptions(['', '']);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleSendGift = async () => {
    const amt = parseInt(giftAmount, 10) || 0;
    if (amt <= 0) {
      showToast('Пирожки', 'Укажите сумму больше 0', 'error');
      return;
    }
    if ((me?.pirozhki || 0) < amt) {
      showToast('Недостаточно пирожков', `На балансе: ${me?.pirozhki || 0} 🥧`, 'error');
      return;
    }
    setBusy(true);
    try {
      await onSendPirozhki?.(amt, giftNote.trim());
      setGiftNote('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.fileName.toLowerCase().includes(q));
  }, [files, searchQuery]);

  const contacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return Object.values(usersMap)
      .filter((u) => u.uid !== me?.uid)
      .filter((u) => !q || u.nick.toLowerCase().includes(q) || (u.bio || '').toLowerCase().includes(q))
      .sort((a, b) => a.nick.localeCompare(b.nick));
  }, [usersMap, me?.uid, searchQuery]);

  const tabTitle =
    activeTab === 'gallery'
      ? 'Недавние'
      : activeTab === 'file'
      ? 'Файл'
      : activeTab === 'poll'
      ? 'Опрос'
      : activeTab === 'pirozhki'
      ? 'Подарить пирожки'
      : 'Контакт';

  const tabs: Array<{ key: SheetTab; label: string; icon: string }> =
    mode === 'avatar'
      ? [{ key: 'gallery', label: 'Галерея', icon: 'images' }]
      : [
          { key: 'gallery', label: 'Галерея', icon: 'images' },
          { key: 'file', label: 'Файл', icon: 'document' },
          { key: 'poll', label: 'Опрос', icon: 'stats-chart' },
          ...(canGiftPirozhki ? [{ key: 'pirozhki' as SheetTab, label: 'Пирожки', icon: 'gift' }] : []),
          { key: 'contact', label: 'Контакт', icon: 'person-circle' },
        ];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: appTheme.glassStrong,
                  borderColor: appTheme.specular,
                  paddingBottom: Math.max(insets.bottom, 10),
                  transform: [
                    {
                      translateY: sheetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [420, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerSideBtn}>
                  <Text style={[styles.cancelText, { color: appTheme.accent }]}>Отмена</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: appTheme.text }]}>{tabTitle}</Text>
                <View style={[styles.headerSideBtn, { alignItems: 'flex-end' }]}>
                  {activeTab === 'gallery' ? (
                    <TouchableOpacity onPress={handleCamera} style={styles.iconBtn}>
                      <Ionicons name="camera-outline" size={22} color={appTheme.accent} />
                    </TouchableOpacity>
                  ) : activeTab === 'file' || activeTab === 'contact' ? (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchOpen((v) => !v);
                        setSearchQuery('');
                      }}
                      style={styles.iconBtn}
                    >
                      <Ionicons name={searchOpen ? 'close' : 'search'} size={21} color={appTheme.accent} />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 28 }} />
                  )}
                </View>
              </View>

              {searchOpen && (activeTab === 'file' || activeTab === 'contact') ? (
                <View style={[styles.searchBar, { backgroundColor: appTheme.glass, borderColor: appTheme.border }]}>
                  <Ionicons name="search" size={16} color={appTheme.textSub} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={activeTab === 'file' ? 'Поиск по файлам...' : 'Поиск контакта...'}
                    placeholderTextColor={appTheme.textSub}
                    style={[styles.searchInput, { color: appTheme.text }]}
                    autoFocus
                  />
                </View>
              ) : null}

              {/* Content Body */}
              <Animated.View style={[styles.body, { opacity: tabFadeAnim }]}>
                {activeTab === 'gallery' && (
                  <>
                    {photoPermDenied ? (
                      <View style={styles.centerBox}>
                        <Ionicons name="images-outline" size={44} color={appTheme.accent} />
                        <Text style={[styles.emptyTitle, { color: appTheme.text }]}>
                          Нужен доступ к галерее
                        </Text>
                        <Text style={[styles.emptySub, { color: appTheme.textSub }]}>
                          Чтобы выбирать фото прямо внутри чата без сторонних приложений
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                          <TouchableOpacity
                            onPress={requestPhotoPermission}
                            style={[styles.primaryPill, { backgroundColor: appTheme.accent }]}
                          >
                            <Text style={styles.primaryPillText}>Разрешить</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => Linking.openSettings()}
                            style={[styles.primaryPill, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                          >
                            <Text style={[styles.primaryPillText, { color: appTheme.text }]}>Настройки</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : loadingPhotos && photos.length === 0 ? (
                      <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={appTheme.accent} />
                      </View>
                    ) : (
                      <FlatList
                        data={[{ id: '__camera__', isCamera: true } as any, ...photos]}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        columnWrapperStyle={{ gap: GRID_GAP }}
                        contentContainerStyle={{ gap: GRID_GAP, paddingBottom: selectedUris.length > 0 ? 110 : 12 }}
                        ListFooterComponent={
                          !loadingPhotos && photos.length === 0 ? (
                            <GlassCard radius={18} style={{ padding: 14, marginTop: 12, alignItems: 'center', gap: 8 }}>
                              <Text style={{ color: appTheme.text, fontWeight: '700', textAlign: 'center' }}>
                                Фото не найдены или доступ ограничен системой
                              </Text>
                              <Text style={{ color: appTheme.textSub, fontSize: 12, textAlign: 'center' }}>
                                Разрешите «Фото и видео → Разрешить всегда» в настройках приложения
                              </Text>
                              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                <TouchableOpacity
                                  onPress={requestPhotoPermission}
                                  style={[styles.primaryPill, { backgroundColor: appTheme.accent, height: 38 }]}
                                >
                                  <Text style={[styles.primaryPillText, { fontSize: 13 }]}>Обновить</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => Linking.openSettings()}
                                  style={[styles.primaryPill, { backgroundColor: 'rgba(255,255,255,0.12)', height: 38 }]}
                                >
                                  <Text style={[styles.primaryPillText, { color: appTheme.text, fontSize: 13 }]}>Настройки</Text>
                                </TouchableOpacity>
                              </View>
                            </GlassCard>
                          ) : null
                        }
                        renderItem={({ item }) => {
                          if (item.isCamera) {
                            return (
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleCamera}
                                style={[
                                  styles.photoTile,
                                  styles.cameraTile,
                                  { backgroundColor: appTheme.glass, borderColor: appTheme.border },
                                ]}
                              >
                                <Ionicons name="camera" size={28} color={appTheme.accent} />
                                <Text style={[styles.cameraLabel, { color: appTheme.textSub }]}>Камера</Text>
                              </TouchableOpacity>
                            );
                          }

                          const selIdx = selectedUris.indexOf(item.uri);
                          const isSelected = selIdx >= 0;

                          return (
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => togglePhoto(item)}
                              style={[styles.photoTile, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                            >
                              <Image source={{ uri: item.thumbDataUrl || item.uri }} style={styles.photoImg} />
                              {mode === 'chat' && (
                                <View
                                  style={[
                                    styles.selectCircle,
                                    isSelected
                                      ? { backgroundColor: appTheme.accent, borderColor: '#FFFFFF' }
                                      : { backgroundColor: 'rgba(0,0,0,0.38)', borderColor: '#FFFFFF' },
                                  ]}
                                >
                                  {isSelected ? (
                                    <Text style={styles.selectNum}>{selIdx + 1}</Text>
                                  ) : null}
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        }}
                      />
                    )}

                    {/* Floating Telegram-style Caption + Send bar */}
                    {mode === 'chat' && selectedUris.length > 0 && (
                      <GlassCard
                        radius={24}
                        strong
                        style={[styles.sendBar, styles.sendBarInner, { borderColor: appTheme.accent + '66' }]}
                      >
                        <TextInput
                          value={caption}
                          onChangeText={setCaption}
                          placeholder="Добавить подпись..."
                          placeholderTextColor={appTheme.textSub}
                          style={[styles.captionInput, { color: appTheme.text }]}
                        />
                        <TouchableOpacity
                          onPress={handleSendSelectedPhotos}
                          disabled={busy}
                          style={[styles.sendCircleBtn, { backgroundColor: appTheme.accent }]}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <View style={styles.sendBtnRow}>
                              <Ionicons name="arrow-up" size={18} color="#FFF" />
                              <Text style={styles.sendCountText}>{selectedUris.length}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </GlassCard>
                    )}
                  </>
                )}

                {activeTab === 'file' && (
                  <FlatList
                    data={filteredFiles}
                    keyExtractor={(f) => f.uri}
                    initialNumToRender={12}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews
                    contentContainerStyle={{ paddingBottom: 16 }}
                    ListHeaderComponent={
                      <>
                        <GlassCard radius={20} style={{ marginBottom: 14, paddingVertical: 4 }}>
                          <TouchableOpacity
                            style={styles.quickActionRow}
                            onPress={() => setActiveTab('gallery')}
                          >
                            <Ionicons name="images-outline" size={20} color={appTheme.accent} />
                            <Text style={[styles.quickActionText, { color: appTheme.accent }]}>
                              Выбрать из Галереи
                            </Text>
                          </TouchableOpacity>
                          <View style={[styles.sep, { backgroundColor: appTheme.border }]} />
                          <TouchableOpacity style={styles.quickActionRow} onPress={loadFiles}>
                            <Ionicons name="refresh-outline" size={20} color={appTheme.accent} />
                            <Text style={[styles.quickActionText, { color: appTheme.accent }]}>
                              Обновить список файлов
                            </Text>
                          </TouchableOpacity>
                        </GlassCard>

                        <Text style={[styles.sectionLabel, { color: appTheme.textSub }]}>
                          НЕДАВНИЕ ФАЙЛЫ ({filteredFiles.length})
                        </Text>

                        {loadingFiles ? (
                          <ActivityIndicator size="small" color={appTheme.accent} style={{ marginVertical: 20 }} />
                        ) : null}
                      </>
                    }
                    ListEmptyComponent={
                      !loadingFiles ? (
                        <Text style={[styles.emptySub, { color: appTheme.textSub, marginTop: 18 }]}>
                          Файлы не найдены
                        </Text>
                      ) : null
                    }
                    renderItem={({ item: f }) => {
                      const ext = (f.fileName.split('.').pop() || 'FILE').slice(0, 4).toUpperCase();
                      return (
                        <TouchableOpacity
                          style={[
                            styles.fileRow,
                            {
                              backgroundColor: appTheme.glass,
                              borderColor: appTheme.border,
                              borderWidth: 1,
                              borderRadius: 16,
                              marginBottom: 8,
                            },
                          ]}
                          onPress={() => handlePickFile(f)}
                          disabled={busy}
                        >
                          <View style={[styles.fileBadge, { backgroundColor: appTheme.accent + '28' }]}>
                            <Text style={[styles.fileExt, { color: appTheme.accent }]}>{ext}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.fileName, { color: appTheme.text }]} numberOfLines={1}>
                              {f.fileName}
                            </Text>
                            <Text style={[styles.fileSize, { color: appTheme.textSub }]}>
                              {formatBytes(f.size)}
                            </Text>
                          </View>
                          <Ionicons name="send" size={16} color={appTheme.textSub} />
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}

                {activeTab === 'poll' && (
                  <ScrollView contentContainerStyle={{ paddingBottom: 20, gap: 10 }}>
                    <Text style={[styles.sectionLabel, { color: appTheme.textSub }]}>ВОПРОС ОПРОСА</Text>
                    <TextInput
                      value={pollQuestion}
                      onChangeText={setPollQuestion}
                      placeholder="Задайте вопрос..."
                      placeholderTextColor={appTheme.textSub}
                      style={[
                        styles.inputBox,
                        { color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border },
                      ]}
                    />

                    <Text style={[styles.sectionLabel, { color: appTheme.textSub, marginTop: 6 }]}>ВАРИАНТЫ</Text>
                    {pollOptions.map((opt, idx) => (
                      <TextInput
                        key={idx}
                        value={opt}
                        onChangeText={(txt) =>
                          setPollOptions((prev) => prev.map((v, i) => (i === idx ? txt : v)))
                        }
                        placeholder={`Вариант ${idx + 1}`}
                        placeholderTextColor={appTheme.textSub}
                        style={[
                          styles.inputBox,
                          { color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border },
                        ]}
                      />
                    ))}

                    {pollOptions.length < 6 && (
                      <TouchableOpacity
                        onPress={() => setPollOptions((prev) => [...prev, ''])}
                        style={[styles.addOptBtn, { borderColor: appTheme.border }]}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={appTheme.accent} />
                        <Text style={{ color: appTheme.accent, fontWeight: '700' }}>Добавить вариант</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={handleCreatePoll}
                      disabled={busy}
                      style={[styles.primaryPill, { backgroundColor: appTheme.accent, marginTop: 8 }]}
                    >
                      <Text style={styles.primaryPillText}>Отправить опрос</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}

                {activeTab === 'pirozhki' && (
                  <ScrollView contentContainerStyle={{ paddingBottom: 20, gap: 12 }}>
                    <GlassCard
                      radius={20}
                      style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Text style={{ color: appTheme.textSub, fontWeight: '600' }}>Ваш баланс</Text>
                      <Text style={{ color: appTheme.accent, fontWeight: '800', fontSize: 16 }}>
                        🥧 {me?.pirozhki || 0}
                      </Text>
                    </GlassCard>

                    <View style={styles.presetRow}>
                      {['10', '25', '50', '100', '250'].map((amt) => {
                        const active = giftAmount === amt;
                        return (
                          <TouchableOpacity
                            key={amt}
                            onPress={() => setGiftAmount(amt)}
                            style={[
                              styles.presetChip,
                              {
                                backgroundColor: active ? appTheme.accent : appTheme.glass,
                                borderColor: active ? appTheme.accentSoft : appTheme.border,
                              },
                            ]}
                          >
                            <Text style={{ color: active ? '#FFF' : appTheme.text, fontWeight: '700' }}>
                              {amt}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      value={giftAmount}
                      onChangeText={setGiftAmount}
                      keyboardType="number-pad"
                      placeholder="Количество пирожков"
                      placeholderTextColor={appTheme.textSub}
                      style={[
                        styles.inputBox,
                        { color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border },
                      ]}
                    />

                    <TextInput
                      value={giftNote}
                      onChangeText={setGiftNote}
                      placeholder="Сообщение к подарку (необязательно)"
                      placeholderTextColor={appTheme.textSub}
                      style={[
                        styles.inputBox,
                        { color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border },
                      ]}
                    />

                    <TouchableOpacity
                      onPress={handleSendGift}
                      disabled={busy}
                      style={[styles.primaryPill, { backgroundColor: appTheme.accent }]}
                    >
                      <Text style={styles.primaryPillText}>Подарить 🥧 {giftAmount || '0'}</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}

                {activeTab === 'contact' && (
                  <FlatList
                    data={contacts}
                    keyExtractor={(item) => item.uid}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.contactRow, { borderBottomColor: appTheme.border }]}
                        onPress={async () => {
                          await onSendContact?.(item);
                          onClose();
                        }}
                      >
                        <View style={[styles.contactAvatar, { backgroundColor: appTheme.accent + '28' }]}>
                          {item.avatar ? (
                            <Image source={{ uri: item.avatar }} style={styles.contactAvatarImg} />
                          ) : (
                            <Text style={{ color: appTheme.accent, fontWeight: '800' }}>
                              {item.nick.slice(0, 1).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: appTheme.text, fontWeight: '700', fontSize: 15 }}>{item.nick}</Text>
                          <Text style={{ color: appTheme.textSub, fontSize: 12 }} numberOfLines={1}>
                            {item.online ? 'в сети' : item.bio || 'Пользователь NonsenseChat'}
                          </Text>
                        </View>
                        <Ionicons name="share-outline" size={18} color={appTheme.accent} />
                      </TouchableOpacity>
                    )}
                  />
                )}
              </Animated.View>

              {/* Bottom Tabs */}
              {tabs.length > 1 && (
                <View style={[styles.tabBar, { borderTopColor: appTheme.border }]}>
                  {tabs.map((t) => {
                    const active = activeTab === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => {
                          triggerHaptic(8);
                          setActiveTab(t.key);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        style={styles.tabItem}
                      >
                        <Ionicons
                          name={t.icon}
                          size={21}
                          color={active ? appTheme.accent : appTheme.textSub}
                        />
                        <Text
                          style={[
                            styles.tabLabel,
                            { color: active ? appTheme.accent : appTheme.textSub },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {busy && (
                <View style={styles.busyOverlay}>
                  <ActivityIndicator size="large" color={appTheme.accent} />
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 14, 0.58)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '78%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 4,
  },
  headerSideBtn: {
    minWidth: 74,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  iconBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  body: {
    flex: 1,
    marginTop: 4,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
  photoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraTile: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cameraLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectNum: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sendBar: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  sendBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  captionInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 36,
  },
  sendCircleBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sendCountText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sep: {
    height: 1,
    marginHorizontal: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  fileBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileExt: {
    fontSize: 11,
    fontWeight: '800',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  addOptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 42,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPill: {
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  primaryPillText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contactAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,7,14,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
