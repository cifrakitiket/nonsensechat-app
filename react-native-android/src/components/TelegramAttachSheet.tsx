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
  DeviceAudioItem,
  DeviceFileItem,
  DevicePhotoItem,
  encodeDeviceFile,
  encodeDeviceImage,
  getRecentDeviceAudio,
  getRecentDeviceFiles,
  getRecentDevicePhotos,
  pickNativePhotoFromGallery,
  takeNativePhoto,
  triggerHaptic,
} from '../services/firebase';
import { GlassCard } from './GlassCard';
import { PhotoEditorModal, PhotoEditsData } from './PhotoEditorModal';

type SheetTab = 'gallery' | 'file' | 'music' | 'poll' | 'checklist' | 'location' | 'pirozhki' | 'contact';

export interface EncodedPhotoResult {
  dataUrl: string;
  fileName: string;
  fileSize: number;
  edits?: PhotoEditsData | null;
}

export interface EncodedFileResult {
  dataUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface PhotoSendOptions {
  spoiler?: boolean;
  captionAbove?: boolean;
  asAlbum?: boolean;
  paidCost?: number;
  authorSig?: boolean;
}

interface TelegramAttachSheetProps {
  visible: boolean;
  mode?: 'chat' | 'avatar';
  onClose: () => void;
  onSendPhotos?: (
    photos: EncodedPhotoResult[],
    caption: string,
    selfDestructSec?: number,
    options?: PhotoSendOptions
  ) => Promise<void> | void;
  onSendFile?: (file: EncodedFileResult) => Promise<void> | void;
  onSendMusic?: (track: {
    dataUrl: string;
    title: string;
    artist: string;
    durationSec: number;
    fileSize: number;
  }) => Promise<void> | void;
  onSendPoll?: (
    question: string,
    options: string[],
    settings?: { anonymous?: boolean; multiple?: boolean; isQuiz?: boolean; correctIdx?: number }
  ) => Promise<void> | void;
  onSendChecklist?: (title: string, items: string[]) => Promise<void> | void;
  onSendLocation?: (title: string, lat: number, lng: number) => Promise<void> | void;
  onSendPirozhki?: (amount: number, note: string) => Promise<void> | void;
  onSendContact?: (user: UserProfile) => Promise<void> | void;
  onPickAvatar?: (dataUrl: string) => Promise<void> | void;
  onOpenVideoNote?: () => void;
  canGiftPirozhki?: boolean;
  isChannelPost?: boolean;
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
  onSendMusic,
  onSendPoll,
  onSendChecklist,
  onSendLocation,
  onSendPirozhki,
  onSendContact,
  onPickAvatar,
  onOpenVideoNote,
  canGiftPirozhki = true,
  isChannelPost = false,
}) => {
  const { appTheme, me, usersMap, chats, showToast } = useApp();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<SheetTab>('gallery');
  const [photos, setPhotos] = useState<DevicePhotoItem[]>([]);
  const [files, setFiles] = useState<DeviceFileItem[]>([]);
  const [audioTracks, setAudioTracks] = useState<DeviceAudioItem[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [photoPermDenied, setPhotoPermDenied] = useState(false);
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [selfDestructSec, setSelfDestructSec] = useState(0);
  const [photoSpoiler, setPhotoSpoiler] = useState(false);
  const [captionAbove, setCaptionAbove] = useState(false);
  const [sendAsAlbum, setSendAsAlbum] = useState(true);
  const [paidCost, setPaidCost] = useState(0);
  const [authorSig, setAuthorSig] = useState(false);
  const [editorUri, setEditorUri] = useState<string | null>(null);
  const [photoEditsMap, setPhotoEditsMap] = useState<Record<string, PhotoEditsData>>({});
  const [musicArtist, setMusicArtist] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Poll 2.0 state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAnonymous, setPollAnonymous] = useState(false);
  const [pollMultiple, setPollMultiple] = useState(false);
  const [pollQuiz, setPollQuiz] = useState(false);
  const [pollCorrectIdx, setPollCorrectIdx] = useState(0);

  // Checklist state
  const [checkTitle, setCheckTitle] = useState('');
  const [checkItems, setCheckItems] = useState<string[]>(['', '']);

  // Location state
  const [locLabel, setLocLabel] = useState('');

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
      setSelfDestructSec(0);
      setPhotoSpoiler(false);
      setCaptionAbove(false);
      setPaidCost(0);
      setPhotoEditsMap({});
      setEditorUri(null);
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
    const timer = setTimeout(() => {
      loadPhotos();
    }, 40);
    return () => clearTimeout(timer);
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
      const timer = setTimeout(() => {
        loadFiles();
      }, 40);
      return () => clearTimeout(timer);
    }
    if (activeTab === 'music' && audioTracks.length === 0 && !loadingAudio) {
      const timer = setTimeout(() => {
        loadAudio();
      }, 40);
      return () => clearTimeout(timer);
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

  const loadAudio = async () => {
    setLoadingAudio(true);
    try {
      const list = await getRecentDeviceAudio(40);
      setAudioTracks(list || []);
    } catch (_) {
      setAudioTracks([]);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handlePickAudioTrack = async (item: DeviceAudioItem) => {
    if (busy) return;
    if (item.size > 6 * 1024 * 1024) {
      showToast('Трек слишком большой', 'Максимум 6 МБ для MP3-трека', 'error');
      return;
    }
    try {
      setBusy(true);
      const enc = await encodeDeviceFile(item.uri, 6 * 1024 * 1024);
      const baseName = item.fileName.replace(/\.[^.]+$/, '');
      await onSendMusic?.({
        dataUrl: enc.dataUrl,
        title: musicTitle.trim() || baseName || 'Аудиозапись',
        artist: musicArtist.trim() || me?.nick || 'Nonsense Music',
        durationSec: Math.max(1, Math.round((item.duration || 30000) / 1000)),
        fileSize: enc.fileSize,
      });
      setMusicTitle('');
      setMusicArtist('');
      onClose();
    } catch (e: any) {
      showToast('Музыка', e?.message || 'Не удалось прикрепить трек', 'error');
    } finally {
      setBusy(false);
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

  const handleSystemGallery = async () => {
    try {
      setBusy(true);
      const res = await pickNativePhotoFromGallery();
      if (!res?.dataUrl) return;
      if (mode === 'avatar' && onPickAvatar) {
        await onPickAvatar(res.dataUrl);
        onClose();
      } else if (onSendPhotos) {
        await onSendPhotos([{ dataUrl: res.dataUrl, fileName: res.fileName, fileSize: res.fileSize }], caption.trim());
        onClose();
      }
    } catch (e: any) {
      if (!String(e?.code || '').includes('CANCELLED')) {
        showToast('Галерея', e?.message || 'Не удалось выбрать фото', 'error');
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
      if (prev.length >= 10) {
        showToast('Лимит', 'Можно выбрать до 10 фото в альбом', 'info');
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
          edits: photoEditsMap[uri] || null,
        });
      }
      await onSendPhotos?.(encodedList, caption.trim(), selfDestructSec, {
        spoiler: photoSpoiler,
        captionAbove,
        asAlbum: sendAsAlbum && encodedList.length >= 2 && selfDestructSec === 0,
        paidCost,
        authorSig,
      });
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
      await onSendPoll?.(q, opts, {
        anonymous: pollAnonymous,
        multiple: pollMultiple,
        isQuiz: pollQuiz,
        correctIdx: pollQuiz ? Math.min(pollCorrectIdx, opts.length - 1) : undefined,
      });
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollAnonymous(false);
      setPollMultiple(false);
      setPollQuiz(false);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleCreateChecklist = async () => {
    const t = checkTitle.trim() || 'Список задач';
    const items = checkItems.map((x) => x.trim()).filter(Boolean);
    if (items.length < 1) {
      showToast('Задачи', 'Добавьте хотя бы 1 пункт', 'error');
      return;
    }
    setBusy(true);
    try {
      await onSendChecklist?.(t, items);
      setCheckTitle('');
      setCheckItems(['', '']);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleSendGeo = async (title: string, lat: number, lng: number) => {
    setBusy(true);
    try {
      await onSendLocation?.(title, lat, lng);
      setLocLabel('');
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
    const friendUids = new Set<string>();
    chats.forEach((c) => {
      if (c.type === 'dm') {
        (c.members || []).forEach((uid) => {
          if (uid !== me?.uid) friendUids.add(uid);
        });
      }
    });
    return Object.values(usersMap)
      .filter((u) => u.uid !== me?.uid && friendUids.has(u.uid))
      .filter((u) => !q || u.nick.toLowerCase().includes(q) || (u.bio || '').toLowerCase().includes(q))
      .sort((a, b) => a.nick.localeCompare(b.nick));
  }, [usersMap, chats, me?.uid, searchQuery]);

  const tabTitle =
    activeTab === 'gallery'
      ? 'Недавние'
      : activeTab === 'file'
      ? 'Файл'
      : activeTab === 'music'
      ? 'Музыка 🎵'
      : activeTab === 'poll'
      ? 'Опрос 2.0'
      : activeTab === 'checklist'
      ? 'Чек-лист задач'
      : activeTab === 'location'
      ? 'Геолокация'
      : activeTab === 'pirozhki'
      ? 'Подарить пирожки'
      : 'Контакт';

  const tabs: Array<{ key: SheetTab; label: string; icon: string }> =
    mode === 'avatar'
      ? [{ key: 'gallery', label: 'Галерея', icon: 'images' }]
      : [
          { key: 'gallery', label: 'Фото', icon: 'images' },
          { key: 'file', label: 'Файл', icon: 'document' },
          { key: 'music', label: 'Музыка', icon: 'musical-notes' },
          { key: 'poll', label: 'Опрос', icon: 'stats-chart' },
          { key: 'checklist', label: 'Задачи', icon: 'checkbox' },
          { key: 'location', label: 'Гео', icon: 'location' },
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
                <View style={[styles.headerSideBtn, { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }]}>
                  {activeTab === 'gallery' ? (
                    <>
                      {mode === 'chat' && onOpenVideoNote ? (
                        <TouchableOpacity onPress={onOpenVideoNote} style={styles.iconBtn}>
                          <Ionicons name="videocam-outline" size={22} color={appTheme.accent} />
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity onPress={handleCamera} style={styles.iconBtn}>
                        <Ionicons name="camera-outline" size={22} color={appTheme.accent} />
                      </TouchableOpacity>
                    </>
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
                          Разрешите доступ к фото или выберите изображение через системную галерею
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 }}>
                          <TouchableOpacity
                            onPress={handleSystemGallery}
                            style={[styles.primaryPill, { backgroundColor: appTheme.accent }]}
                          >
                            <Text style={styles.primaryPillText}>Выбрать из галереи</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={requestPhotoPermission}
                            style={[styles.primaryPill, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                          >
                            <Text style={[styles.primaryPillText, { color: appTheme.text }]}>Разрешить</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => Linking.openSettings()}
                            style={[styles.primaryPill, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                          >
                            <Text style={[styles.primaryPillText, { color: appTheme.textSub }]}>Настройки</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : loadingPhotos && photos.length === 0 ? (
                      <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={appTheme.accent} />
                      </View>
                    ) : (
                      <FlatList
                        data={[
                          { id: '__camera__', isCamera: true } as any,
                          { id: '__gallery__', isGallery: true } as any,
                          ...photos,
                        ]}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        columnWrapperStyle={{ gap: GRID_GAP }}
                        contentContainerStyle={{ gap: GRID_GAP, paddingBottom: selectedUris.length > 0 ? 110 : 12 }}
                        ListFooterComponent={
                          !loadingPhotos && photos.length === 0 ? (
                            <GlassCard radius={18} style={{ padding: 14, marginTop: 12, alignItems: 'center', gap: 8 }}>
                              <Text style={{ color: appTheme.text, fontWeight: '700', textAlign: 'center' }}>
                                Доступ к фото ограничен или файлов нет
                              </Text>
                              <Text style={{ color: appTheme.textSub, fontSize: 12, textAlign: 'center' }}>
                                Вы можете выбрать любое фото через системную галерею устройства
                              </Text>
                              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                <TouchableOpacity
                                  onPress={handleSystemGallery}
                                  style={[styles.primaryPill, { backgroundColor: appTheme.accent, height: 38 }]}
                                >
                                  <Text style={[styles.primaryPillText, { fontSize: 13 }]}>Выбрать фото</Text>
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

                          if (item.isGallery) {
                            return (
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleSystemGallery}
                                style={[
                                  styles.photoTile,
                                  styles.cameraTile,
                                  { backgroundColor: appTheme.glass, borderColor: appTheme.border },
                                ]}
                              >
                                <Ionicons name="images" size={28} color={appTheme.accent} />
                                <Text style={[styles.cameraLabel, { color: appTheme.textSub }]}>Галерея</Text>
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

                    {/* Floating Telegram-style Caption + Photo Editor + Spoiler + Album Send bar */}
                    {mode === 'chat' && selectedUris.length > 0 && (
                      <GlassCard
                        radius={24}
                        strong
                        style={[styles.sendBar, { padding: 10, gap: 8, borderColor: appTheme.accent + '66' }]}
                      >
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => setEditorUri(selectedUris[0])}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 12,
                              backgroundColor: photoEditsMap[selectedUris[0]] ? appTheme.accentSoft : 'rgba(255,255,255,0.08)',
                              borderWidth: 1,
                              borderColor: photoEditsMap[selectedUris[0]] ? appTheme.accent : 'rgba(255,255,255,0.14)',
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800' }}>🎨 Редактор</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => setPhotoSpoiler((v) => !v)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 12,
                              backgroundColor: photoSpoiler ? appTheme.accentSoft : 'rgba(255,255,255,0.08)',
                              borderWidth: 1,
                              borderColor: photoSpoiler ? appTheme.accent : 'rgba(255,255,255,0.14)',
                            }}
                          >
                            <Text style={{ color: photoSpoiler ? appTheme.accent : '#cbd5e1', fontSize: 11.5, fontWeight: '800' }}>
                              ✨ Под спойлер
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => setCaptionAbove((v) => !v)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 12,
                              backgroundColor: captionAbove ? appTheme.accentSoft : 'rgba(255,255,255,0.08)',
                              borderWidth: 1,
                              borderColor: captionAbove ? appTheme.accent : 'rgba(255,255,255,0.14)',
                            }}
                          >
                            <Text style={{ color: captionAbove ? appTheme.accent : '#cbd5e1', fontSize: 11.5, fontWeight: '800' }}>
                              {captionAbove ? '⬆️ Текст сверху' : '⬇️ Текст снизу'}
                            </Text>
                          </TouchableOpacity>

                          {selectedUris.length >= 2 && (
                            <TouchableOpacity
                              onPress={() => setSendAsAlbum((v) => !v)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 12,
                                backgroundColor: sendAsAlbum ? appTheme.accentSoft : 'rgba(255,255,255,0.08)',
                                borderWidth: 1,
                                borderColor: sendAsAlbum ? appTheme.accent : 'rgba(255,255,255,0.14)',
                              }}
                            >
                              <Text style={{ color: sendAsAlbum ? appTheme.accent : '#cbd5e1', fontSize: 11.5, fontWeight: '800' }}>
                                🖼️ {sendAsAlbum ? 'Альбомом' : 'По одной'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {isChannelPost && (
                            <>
                              <TouchableOpacity
                                onPress={() => setPaidCost((c) => (c === 0 ? 15 : c === 15 ? 50 : c === 50 ? 100 : 0))}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 12,
                                  backgroundColor: paidCost > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)',
                                  borderWidth: 1,
                                  borderColor: paidCost > 0 ? '#f59e0b' : 'rgba(255,255,255,0.14)',
                                }}
                              >
                                <Text style={{ color: paidCost > 0 ? '#fbbf24' : '#cbd5e1', fontSize: 11.5, fontWeight: '800' }}>
                                  🥟 {paidCost > 0 ? `${paidCost} пирожк.` : 'Платный пост'}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => setAuthorSig((v) => !v)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 12,
                                  backgroundColor: authorSig ? appTheme.accentSoft : 'rgba(255,255,255,0.08)',
                                  borderWidth: 1,
                                  borderColor: authorSig ? appTheme.accent : 'rgba(255,255,255,0.14)',
                                }}
                              >
                                <Text style={{ color: authorSig ? appTheme.accent : '#cbd5e1', fontSize: 11.5, fontWeight: '800' }}>
                                  ✍️ Подпись автора
                                </Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TextInput
                            value={caption}
                            onChangeText={setCaption}
                            placeholder="Добавить подпись..."
                            placeholderTextColor={appTheme.textSub}
                            style={[styles.captionInput, { color: appTheme.text }]}
                          />
                          <TouchableOpacity
                            onPress={() => {
                              triggerHaptic(8);
                              setSelfDestructSec((cur) => (cur === 0 ? 5 : cur === 5 ? 10 : cur === 10 ? 30 : 0));
                            }}
                            style={{
                              paddingHorizontal: 10,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: selfDestructSec > 0 ? 'rgba(249,115,22,0.28)' : 'rgba(255,255,255,0.08)',
                              borderWidth: 1,
                              borderColor: selfDestructSec > 0 ? '#f97316' : 'rgba(255,255,255,0.14)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ color: selfDestructSec > 0 ? '#fb923c' : appTheme.textSub, fontSize: 12, fontWeight: '800' }}>
                              {selfDestructSec > 0 ? `🔥 ${selfDestructSec}с` : '🔥'}
                            </Text>
                          </TouchableOpacity>
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
                        </View>
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

                {activeTab === 'music' && (
                  <FlatList
                    data={audioTracks}
                    keyExtractor={(a) => a.uri}
                    contentContainerStyle={{ paddingBottom: 20, gap: 8 }}
                    ListHeaderComponent={
                      <View style={{ gap: 8, marginBottom: 8 }}>
                        <Text style={[styles.sectionLabel, { color: appTheme.textSub }]}>
                          ОБЛОЖКА И МЕТАДАННЫЕ ТРЕКА (НЕОБЯЗАТЕЛЬНО)
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TextInput
                            value={musicArtist}
                            onChangeText={setMusicArtist}
                            placeholder="Исполнитель..."
                            placeholderTextColor={appTheme.textSub}
                            style={[styles.inputBox, { flex: 1, color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border }]}
                          />
                          <TextInput
                            value={musicTitle}
                            onChangeText={setMusicTitle}
                            placeholder="Название трека..."
                            placeholderTextColor={appTheme.textSub}
                            style={[styles.inputBox, { flex: 1, color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border }]}
                          />
                        </View>
                        <Text style={[styles.sectionLabel, { color: appTheme.textSub, marginTop: 4 }]}>
                          АУДИОФАЙЛЫ НА УСТРОЙСТВЕ ({audioTracks.length})
                        </Text>
                        {loadingAudio && <ActivityIndicator color={appTheme.accent} />}
                      </View>
                    }
                    ListEmptyComponent={
                      !loadingAudio ? (
                        <Text style={[styles.emptySub, { color: appTheme.textSub, marginTop: 18 }]}>
                          MP3 / аудиофайлы на устройстве не найдены
                        </Text>
                      ) : null
                    }
                    renderItem={({ item: tr }) => (
                      <TouchableOpacity
                        style={[
                          styles.fileRow,
                          {
                            backgroundColor: appTheme.glass,
                            borderColor: appTheme.border,
                            borderWidth: 1,
                            borderRadius: 16,
                          },
                        ]}
                        onPress={() => handlePickAudioTrack(tr)}
                      >
                        <View style={[styles.fileBadge, { backgroundColor: 'rgba(236,72,153,0.22)' }]}>
                          <Text style={{ fontSize: 18 }}>🎵</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fileName, { color: appTheme.text }]} numberOfLines={1}>
                            {tr.fileName}
                          </Text>
                          <Text style={[styles.fileSize, { color: appTheme.textSub }]}>
                            {formatBytes(tr.size)} · {Math.max(1, Math.round((tr.duration || 0) / 1000))}с
                          </Text>
                        </View>
                        <Ionicons name="musical-note" size={18} color={appTheme.accent} />
                      </TouchableOpacity>
                    )}
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

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[
                        { active: pollAnonymous, label: '🕵️ Анонимно', toggle: () => setPollAnonymous((v) => !v) },
                        { active: pollMultiple, label: '☑️ Несколько', toggle: () => { setPollMultiple((v) => !v); if (!pollMultiple) setPollQuiz(false); } },
                        { active: pollQuiz, label: '🏆 Викторина', toggle: () => { setPollQuiz((v) => !v); if (!pollQuiz) setPollMultiple(false); } },
                      ].map((chip, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={chip.toggle}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 14,
                            borderWidth: 1,
                            backgroundColor: chip.active ? appTheme.accentSoft : 'rgba(255,255,255,0.05)',
                            borderColor: chip.active ? appTheme.accent : appTheme.border,
                          }}
                        >
                          <Text style={{ color: chip.active ? appTheme.accent : appTheme.textSub, fontSize: 12, fontWeight: '800' }}>
                            {chip.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.sectionLabel, { color: appTheme.textSub, marginTop: 4 }]}>
                      {pollQuiz ? 'ВАРИАНТЫ (отметьте правильный ✓)' : 'ВАРИАНТЫ'}
                    </Text>
                    {pollOptions.map((opt, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {pollQuiz && (
                          <TouchableOpacity
                            onPress={() => setPollCorrectIdx(idx)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              borderWidth: 2,
                              borderColor: pollCorrectIdx === idx ? '#22c55e' : appTheme.border,
                              backgroundColor: pollCorrectIdx === idx ? 'rgba(34,197,94,0.2)' : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {pollCorrectIdx === idx && <Text style={{ color: '#22c55e', fontWeight: '900' }}>✓</Text>}
                          </TouchableOpacity>
                        )}
                        <TextInput
                          value={opt}
                          onChangeText={(txt) =>
                            setPollOptions((prev) => prev.map((v, i) => (i === idx ? txt : v)))
                          }
                          placeholder={`Вариант ${idx + 1}`}
                          placeholderTextColor={appTheme.textSub}
                          style={[
                            styles.inputBox,
                            { flex: 1, color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border },
                          ]}
                        />
                      </View>
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

                {activeTab === 'checklist' && (
                  <ScrollView contentContainerStyle={{ paddingBottom: 20, gap: 10 }}>
                    <Text style={[styles.sectionLabel, { color: appTheme.textSub }]}>ЗАГОЛОВОК СПИСКА ЗАДАЧ</Text>
                    <TextInput
                      value={checkTitle}
                      onChangeText={setCheckTitle}
                      placeholder="Например: Покупки / План на день..."
                      placeholderTextColor={appTheme.textSub}
                      style={[
                        styles.inputBox,
                        { color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border },
                      ]}
                    />
                    <Text style={[styles.sectionLabel, { color: appTheme.textSub }]}>ПУНКТЫ</Text>
                    {checkItems.map((it, idx) => (
                      <TextInput
                        key={idx}
                        value={it}
                        onChangeText={(txt) => setCheckItems((prev) => prev.map((v, i) => (i === idx ? txt : v)))}
                        placeholder={`Задача ${idx + 1}`}
                        placeholderTextColor={appTheme.textSub}
                        style={[
                          styles.inputBox,
                          { color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border },
                        ]}
                      />
                    ))}
                    {checkItems.length < 10 && (
                      <TouchableOpacity
                        onPress={() => setCheckItems((prev) => [...prev, ''])}
                        style={[styles.addOptBtn, { borderColor: appTheme.border }]}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={appTheme.accent} />
                        <Text style={{ color: appTheme.accent, fontWeight: '700' }}>Добавить пункт</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={handleCreateChecklist}
                      disabled={busy}
                      style={[styles.primaryPill, { backgroundColor: appTheme.accent, marginTop: 6 }]}
                    >
                      <Text style={styles.primaryPillText}>Отправить чек-лист ✅</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}

                {activeTab === 'location' && (
                  <ScrollView contentContainerStyle={{ paddingBottom: 20, gap: 10 }}>
                    <Text style={[styles.sectionLabel, { color: appTheme.textSub }]}>БЫСТРАЯ ГЕОЛОКАЦИЯ</Text>
                    {[
                      { title: '📍 Москва, Центр', lat: 55.7558, lng: 37.6173 },
                      { title: '📍 Санкт-Петербург, Невский', lat: 59.9343, lng: 30.3351 },
                      { title: '📍 Екатеринбург, Плотинка', lat: 56.8389, lng: 60.6057 },
                      { title: '📍 Новосибирск, Центр', lat: 55.0084, lng: 82.9357 },
                    ].map((loc, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleSendGeo(loc.title, loc.lat, loc.lng)}
                        style={[
                          styles.fileRow,
                          { backgroundColor: appTheme.glass, borderColor: appTheme.border, borderWidth: 1, borderRadius: 16 },
                        ]}
                      >
                        <Text style={{ color: appTheme.text, fontWeight: '700', flex: 1 }}>{loc.title}</Text>
                        <Ionicons name="navigate" size={18} color={appTheme.accent} />
                      </TouchableOpacity>
                    ))}
                    <Text style={[styles.sectionLabel, { color: appTheme.textSub, marginTop: 6 }]}>СВОЁ МЕСТО / АДРЕС</Text>
                    <TextInput
                      value={locLabel}
                      onChangeText={setLocLabel}
                      placeholder="Введите адрес или название места..."
                      placeholderTextColor={appTheme.textSub}
                      style={[
                        styles.inputBox,
                        { color: appTheme.text, backgroundColor: appTheme.glass, borderColor: appTheme.border },
                      ]}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const clean = locLabel.trim();
                        if (!clean) {
                          showToast('Геолокация', 'Укажите название места или выберите из списка', 'error');
                          return;
                        }
                        handleSendGeo(`📍 ${clean}`, 55.7558, 37.6173);
                      }}
                      style={[styles.primaryPill, { backgroundColor: appTheme.accent }]}
                    >
                      <Text style={styles.primaryPillText}>Отправить точку 📍</Text>
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
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 10, gap: 6, flexGrow: 1, justifyContent: 'space-around' }}
                  >
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
                  </ScrollView>
                </View>
              )}

              {busy && (
                <View style={styles.busyOverlay}>
                  <ActivityIndicator size="large" color={appTheme.accent} />
                </View>
              )}

              {!!editorUri && (
                <PhotoEditorModal
                  visible={!!editorUri}
                  imageUri={editorUri}
                  initialEdits={photoEditsMap[editorUri] || null}
                  onClose={() => setEditorUri(null)}
                  onSaveEdits={(edits) => {
                    setPhotoEditsMap((prev) => ({ ...prev, [editorUri]: edits }));
                  }}
                />
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
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 2,
  },
  tabItem: {
    minWidth: 60,
    paddingHorizontal: 6,
    paddingVertical: 4,
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
