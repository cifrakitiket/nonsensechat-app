import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StoryItem, useApp } from '../context/AppContext';
import { pickNativePhotoFromGallery, triggerHaptic } from '../services/firebase';
import { GlassCard } from './GlassCard';

interface StoriesBarProps {
  onReplyToStory?: (authorUid: string, caption: string) => void;
}

function formatRelTime(ts: number) {
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${diffMin} мин. назад`;
  const h = Math.floor(diffMin / 60);
  return `${h} ч. назад`;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({ onReplyToStory }) => {
  const insets = useSafeAreaInsets();
  const { me, stories, publishStory, markStoryViewed, appTheme, showToast } = useApp();

  const [viewerStories, setViewerStories] = useState<StoryItem[] | null>(null);
  const [viewerIdx, setViewerIdx] = useState(0);
  const [replyText, setReplyText] = useState('');

  const [composerUri, setComposerUri] = useState<string | null>(null);
  const [composerCaption, setComposerCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // Group stories by author
  const authorGroups = useMemo(() => {
    const map = new Map<string, StoryItem[]>();
    stories.forEach((s) => {
      const list = map.get(s.uid) || [];
      list.push(s);
      map.set(s.uid, list);
    });
    return Array.from(map.entries()).map(([uid, list]) => {
      const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
      const hasUnviewed = me ? sorted.some((s) => !s.views?.[me.uid]) : false;
      return {
        uid,
        nick: sorted[sorted.length - 1].nick,
        avatar: sorted[sorted.length - 1].avatar,
        items: sorted,
        hasUnviewed,
      };
    });
  }, [stories, me]);

  const currentStory = viewerStories ? viewerStories[viewerIdx] : null;

  useEffect(() => {
    if (!currentStory) return;
    markStoryViewed(currentStory.id);
    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished && viewerStories) {
        if (viewerIdx < viewerStories.length - 1) {
          setViewerIdx((i) => i + 1);
        } else {
          setViewerStories(null);
        }
      }
    });
    return () => anim.stop();
  }, [currentStory?.id, viewerIdx, viewerStories]);

  const handleAddStory = async () => {
    triggerHaptic(10);
    try {
      const picked = await pickNativePhotoFromGallery();
      if (picked?.dataUrl) {
        setComposerUri(picked.dataUrl);
        setComposerCaption('');
      }
    } catch (e: any) {
      if (!String(e?.code || '').includes('CANCELLED')) {
        showToast('Истории', e?.message || 'Не удалось выбрать фото', 'error');
      }
    }
  };

  const handlePublish = async () => {
    if (!composerUri || publishing) return;
    setPublishing(true);
    try {
      await publishStory(composerUri, composerCaption);
      setComposerUri(null);
      setComposerCaption('');
      showToast('История опубликована ✨', 'Видна друзьям 24 часа', 'success');
    } catch (e: any) {
      showToast('Ошибка', e?.message || 'Не удалось опубликовать', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const openGroup = (items: StoryItem[]) => {
    triggerHaptic(8);
    setViewerStories(items);
    setViewerIdx(0);
    setReplyText('');
  };

  return (
    <View style={styles.barWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.barContent}
      >
        {/* My Story Add Tile */}
        <TouchableOpacity activeOpacity={0.8} style={styles.storyTile} onPress={handleAddStory}>
          <View style={[styles.ring, { borderColor: appTheme.border }]}>
            {me?.avatar ? (
              <Image source={{ uri: me.avatar }} style={styles.ava} />
            ) : (
              <View style={[styles.ava, { backgroundColor: appTheme.accentSoft, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: appTheme.accent, fontWeight: '900', fontSize: 18 }}>
                  {(me?.nick || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.addBadge, { backgroundColor: appTheme.accent }]}>
              <Ionicons name="add" size={13} color="#000" />
            </View>
          </View>
          <Text style={[styles.tileNick, { color: appTheme.textSub }]} numberOfLines={1}>
            История
          </Text>
        </TouchableOpacity>

        {/* Active Stories */}
        {authorGroups.map((g) => (
          <TouchableOpacity
            key={g.uid}
            activeOpacity={0.8}
            style={styles.storyTile}
            onPress={() => openGroup(g.items)}
          >
            <View
              style={[
                styles.ring,
                {
                  borderColor: g.hasUnviewed ? appTheme.accent : 'rgba(255,255,255,0.24)',
                  borderWidth: g.hasUnviewed ? 2.5 : 1.5,
                },
              ]}
            >
              {g.avatar ? (
                <Image source={{ uri: g.avatar }} style={styles.ava} />
              ) : (
                <View style={[styles.ava, { backgroundColor: appTheme.glassStrong, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: appTheme.text, fontWeight: '800', fontSize: 17 }}>
                    {g.nick.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tileNick,
                { color: g.hasUnviewed ? appTheme.text : appTheme.textSub, fontWeight: g.hasUnviewed ? '700' : '500' },
              ]}
              numberOfLines={1}
            >
              {g.uid === me?.uid ? 'Вы' : g.nick}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Story Composer Modal */}
      <Modal visible={!!composerUri} transparent animationType="fade" onRequestClose={() => setComposerUri(null)}>
        <View style={styles.viewerBackdrop}>
          <View style={[styles.composerHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setComposerUri(null)} style={styles.closeCircle}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.composerTitle}>Новая история</Text>
            <View style={{ width: 38 }} />
          </View>
          {composerUri && (
            <Image source={{ uri: composerUri }} style={styles.viewerImage} resizeMode="contain" />
          )}
          <View style={[styles.composerBottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <TextInput
              style={styles.captionInput}
              placeholder="Подпись к истории..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={composerCaption}
              onChangeText={setComposerCaption}
            />
            <TouchableOpacity
              onPress={handlePublish}
              disabled={publishing}
              style={[styles.publishBtn, { backgroundColor: appTheme.accent }]}
            >
              {publishing ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#000" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Story Viewer Modal */}
      <Modal visible={!!currentStory} transparent animationType="fade" onRequestClose={() => setViewerStories(null)}>
        {currentStory && viewerStories && (
          <View style={styles.viewerBackdrop}>
            {/* Progress Bars */}
            <View style={[styles.progressRow, { paddingTop: insets.top + 8 }]}>
              {viewerStories.map((s, idx) => (
                <View key={s.id} style={styles.progressTrack}>
                  {idx < viewerIdx ? (
                    <View style={[styles.progressFill, { width: '100%' }]} />
                  ) : idx === viewerIdx ? (
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  ) : null}
                </View>
              ))}
            </View>

            {/* Author Header */}
            <View style={styles.viewerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {currentStory.avatar ? (
                  <Image source={{ uri: currentStory.avatar }} style={styles.viewerAva} />
                ) : (
                  <View style={[styles.viewerAva, { backgroundColor: appTheme.accentSoft, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>{currentStory.nick.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.viewerNick}>{currentStory.nick}</Text>
                  <Text style={styles.viewerTime}>
                    {formatRelTime(currentStory.createdAt)} · 👁️ {Object.keys(currentStory.views || {}).length}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setViewerStories(null)} style={styles.closeCircle}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Tap Left / Right Navigation */}
            <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
              <Image source={{ uri: currentStory.imageUrl }} style={styles.viewerImage} resizeMode="contain" />
              <View style={styles.tapZones}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (viewerIdx > 0) setViewerIdx((i) => i - 1);
                  }}
                />
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (viewerIdx < viewerStories.length - 1) setViewerIdx((i) => i + 1);
                    else setViewerStories(null);
                  }}
                />
              </View>
            </View>

            {!!currentStory.caption && (
              <GlassCard radius={16} style={styles.captionCard}>
                <Text style={styles.captionText}>{currentStory.caption}</Text>
              </GlassCard>
            )}

            {/* Quick Reply */}
            {currentStory.uid !== me?.uid && onReplyToStory && (
              <View style={[styles.composerBottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
                <TextInput
                  style={styles.captionInput}
                  placeholder={`Ответить ${currentStory.nick}...`}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={replyText}
                  onChangeText={setReplyText}
                />
                <TouchableOpacity
                  onPress={() => {
                    const txt = replyText.trim();
                    if (!txt) return;
                    const targetUid = currentStory.uid;
                    setViewerStories(null);
                    setReplyText('');
                    onReplyToStory(targetUid, `📷 Ответ на историю: ${txt}`);
                  }}
                  style={[styles.publishBtn, { backgroundColor: appTheme.accent }]}
                >
                  <Ionicons name="send" size={18} color="#000" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  barWrap: { marginBottom: 6 },
  barContent: { paddingHorizontal: 12, gap: 12 },
  storyTile: { width: 66, alignItems: 'center' },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ava: { width: 48, height: 48, borderRadius: 24 },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#080C14',
  },
  tileNick: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  viewerBackdrop: { flex: 1, backgroundColor: '#000' },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 12 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#fff' },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  viewerAva: { width: 36, height: 36, borderRadius: 18 },
  viewerNick: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
  viewerTime: { color: 'rgba(255,255,255,0.65)', fontSize: 11.5 },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '100%' },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  captionCard: { marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 10 },
  captionText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  composerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  composerBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 10 },
  captionInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 14.5,
  },
  publishBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
