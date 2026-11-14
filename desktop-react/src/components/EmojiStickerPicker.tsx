import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Smile, Image as ImageIcon, Film, X, Plus, Trash2, Check, ExternalLink, Package, Upload, Sparkles, FolderPlus } from 'lucide-react';
import { ED } from '@/lib/siteEmojis';
import { db, rtdb, auth } from '@/lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, get, set, update } from 'firebase/database';
import { fileToOptimizedDataUrl, isImageFile } from '@/lib/imageUtils';
import { DEFAULT_STICKER_PACKS } from '@/lib/defaultStickers';

export interface UserStickerItem {
  url: string;
  emoji?: string;
  vid?: boolean;
}

export interface UserStickerPack {
  id: string;
  title: string;
  slug?: string;
  kind?: 'sticker' | 'emoji';
  authorUid?: string;
  authorNick?: string;
  stickers: UserStickerItem[];
  createdAt?: unknown;
}

interface EmojiStickerPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (stickerUrl: string, packId?: string, emoji?: string) => void;
  onSelectGif?: (gifUrl: string) => void;
  onClose?: () => void;
}

const EMOJI_CATEGORIES = [
  { id: 'recent', name: 'Часто используемые', icon: '🕒' },
  { id: 'custom', name: 'Кастомные от пользователей', icon: '✨' },
  { id: 'smileys', name: 'Смайлы и люди', icon: '😀' },
  { id: 'animals', name: 'Животные и природа', icon: '🐱' },
  { id: 'food', name: 'Еда и напитки', icon: '🍕' },
  { id: 'activity', name: 'Спорт и активность', icon: '⚽' },
  { id: 'travel', name: 'Путешествия и транспорт', icon: '🚀' },
  { id: 'objects', name: 'Предметы', icon: '💡' },
  { id: 'symbols', name: 'Символы', icon: '❤️' },
  { id: 'flags', name: 'Флаги', icon: '🏁' },
];

export const EmojiStickerPicker: React.FC<EmojiStickerPickerProps> = ({
  onSelectEmoji,
  onSelectSticker,
  onSelectGif,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'stickers' | 'gifs'>('emoji');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('smileys');

  // Real user packs from Firestore, RTDB, and local cache
  const [userPacks, setUserPacks] = useState<UserStickerPack[]>(() => {
    try {
      const cached = localStorage.getItem('nc_sticker_packs_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_STICKER_PACKS as UserStickerPack[];
  });
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(() => {
    try {
      const cached = localStorage.getItem('nc_sticker_packs_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const first = Array.isArray(parsed) ? parsed.find((p: any) => p.kind !== 'emoji') : null;
        if (first) return first.id;
      }
    } catch {}
    return DEFAULT_STICKER_PACKS[0]?.id || null;
  });

  // Create pack modal & upload states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createKind, setCreateKind] = useState<'sticker' | 'emoji'>('sticker');
  const [newPackTitle, setNewPackTitle] = useState('');
  const [draftStickers, setDraftStickers] = useState<Array<{ url: string; emoji: string }>>([]);
  const [newStickerUrl, setNewStickerUrl] = useState('');
  const [newStickerEmoji, setNewStickerEmoji] = useState('😀');
  const [savingPack, setSavingPack] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const stickerFileInputRef = useRef<HTMLInputElement>(null);

  // Recent emojis from localStorage
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nc_recent_emojis');
      return saved ? JSON.parse(saved) : ['👍', '❤️', '🔥', '😂', '😍', '🎉', '😎', '🙏'];
    } catch {
      return ['👍', '❤️', '🔥', '😂', '😍', '🎉', '😎', '🙏'];
    }
  });

  // Load user packs from Firestore & RTDB with robust error handling and normalization
  useEffect(() => {
    const fetchPacks = async () => {
      setLoadingPacks(true);
      try {
        const packsMap = new Map<string, UserStickerPack>();

        // 1. Try Firestore (Fetch all documents from stickerPacks collection)
        try {
          const snap = await getDocs(collection(db, 'stickerPacks'));
          snap.forEach((doc) => {
            const d = doc.data();
            const rawStickers = Array.isArray(d.stickers)
              ? d.stickers
              : (d.stickers && typeof d.stickers === 'object' ? Object.values(d.stickers) : []);

            const stickers: UserStickerItem[] = rawStickers
              .map((s: any) => {
                if (typeof s === 'string') return { url: s, emoji: '😀' };
                return {
                  url: s.url || s.src || s.image || s.link || '',
                  emoji: s.emoji || '😀',
                  vid: !!s.vid,
                };
              })
              .filter((s: any) => Boolean(s.url));

            if (stickers.length > 0) {
              packsMap.set(doc.id, {
                id: doc.id,
                title: d.title || d.name || 'Стикерпак',
                slug: d.slug,
                kind: d.kind || 'sticker',
                authorUid: d.authorUid,
                authorNick: d.authorNick || 'Пользователь',
                stickers,
                createdAt: d.createdAt,
              });
            }
          });
        } catch (fsErr) {
          console.warn('Firestore stickerPacks warning:', fsErr);
        }

        // 2. Try RTDB (sync/fallback)
        try {
          const rSnap = await get(ref(rtdb, 'stickerPacks'));
          if (rSnap.exists()) {
            const val = rSnap.val() || {};
            Object.entries(val).forEach(([pId, d]: [string, any]) => {
              if (!packsMap.has(pId) && d) {
                const rawStickers = Array.isArray(d.stickers)
                  ? d.stickers
                  : (d.stickers && typeof d.stickers === 'object' ? Object.values(d.stickers) : []);

                const stickers: UserStickerItem[] = rawStickers
                  .map((s: any) => {
                    if (typeof s === 'string') return { url: s, emoji: '😀' };
                    return {
                      url: s.url || s.src || s.image || s.link || '',
                      emoji: s.emoji || '😀',
                      vid: !!s.vid,
                    };
                  })
                  .filter((s: any) => Boolean(s.url));

                if (stickers.length > 0) {
                  packsMap.set(pId, {
                    id: pId,
                    title: d.title || d.name || 'Стикерпак',
                    slug: d.slug,
                    kind: d.kind || 'sticker',
                    authorUid: d.authorUid,
                    authorNick: d.authorNick || 'Пользователь',
                    stickers,
                    createdAt: d.createdAt,
                  });
                }
              }
            });
          }
        } catch (rtErr) {
          console.warn('RTDB stickerPacks warning:', rtErr);
        }

        // 3. Fallback to default sticker packs so the user always has stickers
        DEFAULT_STICKER_PACKS.forEach((defPack) => {
          if (!packsMap.has(defPack.id)) {
            packsMap.set(defPack.id, defPack as UserStickerPack);
          }
        });

        const allPacks = Array.from(packsMap.values());
        allPacks.sort((a, b) => {
          const timeA = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : 0;
          const timeB = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : 0;
          return timeB - timeA;
        });

        setUserPacks(allPacks);
        try {
          localStorage.setItem('nc_sticker_packs_cache', JSON.stringify(allPacks));
        } catch {}

        if (allPacks.length > 0) {
          const firstStickerPack = allPacks.find((p) => p.kind !== 'emoji') || allPacks[0];
          if (firstStickerPack) {
            setSelectedPackId((prev) => prev || firstStickerPack.id);
          }
        }
      } catch (err) {
        console.warn('Failed to load user sticker packs:', err);
      } finally {
        setLoadingPacks(false);
      }
    };

    fetchPacks();
  }, []);

  const handlePickEmoji = (emoji: string) => {
    onSelectEmoji(emoji);
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 32);
      localStorage.setItem('nc_recent_emojis', JSON.stringify(next));
      return next;
    });
  };

  // User custom emoji packs
  const customEmojiPacks = useMemo(
    () => userPacks.filter((p) => p.kind === 'emoji'),
    [userPacks]
  );

  // User sticker packs
  const stickerPacks = useMemo(
    () => userPacks.filter((p) => p.kind !== 'emoji'),
    [userPacks]
  );

  const selectedStickerPack = useMemo(
    () => stickerPacks.find((p) => p.id === selectedPackId) || stickerPacks[0] || null,
    [stickerPacks, selectedPackId]
  );

  // Search filter for emojis
  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matched: string[] = [];
    Object.values(ED).forEach((arr) => {
      arr.forEach((em) => {
        if (em.includes(q)) matched.push(em);
      });
    });
    return matched;
  }, [searchQuery]);

  // Create Pack: File and URL Handlers
  const handleProcessFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return;

    setUploadingFiles(true);
    try {
      const sampleEmojis = ['😀', '😂', '🔥', '❤️', '👍', '😎', '🎉', '🤯', '😍', '👀', '💯', '✨', '🚀', '😺', '👌', '⚡', '🐱', '☕', '🥳', '🙌'];
      const newItems: Array<{ url: string; emoji: string }> = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        // Resize to max 512x512 with PNG to preserve sticker transparency
        const dataUrl = await fileToOptimizedDataUrl(file, 512, 0.9, true);
        const emoji = sampleEmojis[(draftStickers.length + i) % sampleEmojis.length];
        newItems.push({ url: dataUrl, emoji });
      }

      setDraftStickers((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error('Failed to process sticker files:', err);
      alert('Не удалось обработать некоторые изображения');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleAddDraftSticker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickerUrl.trim()) return;
    setDraftStickers((prev) => [
      ...prev,
      { url: newStickerUrl.trim(), emoji: newStickerEmoji.trim() || '😀' },
    ]);
    setNewStickerUrl('');
  };

  const handleRemoveDraftSticker = (index: number) => {
    setDraftStickers((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublishPack = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Для создания стикерпака необходимо авторизоваться');
      return;
    }
    if (!newPackTitle.trim()) {
      alert('Введите название набора');
      return;
    }
    if (draftStickers.length === 0) {
      alert('Добавьте хотя бы одно изображение');
      return;
    }

    setSavingPack(true);
    try {
      const packData = {
        title: newPackTitle.trim(),
        slug: newPackTitle.trim().toLowerCase().replace(/[^a-zа-я0-9]/gi, '_'),
        kind: createKind,
        authorUid: user.uid,
        authorNick: user.displayName || 'Пользователь',
        stickers: draftStickers,
        createdAt: serverTimestamp(),
      };

      // 1. Add to Firestore
      let packId = 'pack_' + Date.now();
      try {
        const docRef = await addDoc(collection(db, 'stickerPacks'), packData);
        packId = docRef.id;
      } catch (fsErr) {
        console.warn('Failed to save to Firestore, will save to RTDB:', fsErr);
      }

      // 2. Add to RTDB (mirror for guaranteed offline & cross-platform availability)
      try {
        await set(ref(rtdb, 'stickerPacks/' + packId), {
          title: packData.title,
          slug: packData.slug,
          kind: packData.kind,
          authorUid: packData.authorUid,
          authorNick: packData.authorNick,
          stickers: packData.stickers,
          createdAt: Date.now(),
        });
      } catch (rtdbErr) {
        console.warn('Failed to mirror sticker pack to RTDB:', rtdbErr);
      }

      const createdPack: UserStickerPack = {
        id: packId,
        ...packData,
      };

      setUserPacks((prev) => {
        const next = [createdPack, ...prev.filter((p) => p.id !== packId)];
        try {
          localStorage.setItem('nc_sticker_packs_cache', JSON.stringify(next));
        } catch {}
        return next;
      });

      if (createKind === 'sticker') {
        setSelectedPackId(packId);
        setActiveTab('stickers');
      } else {
        setActiveTab('emoji');
      }

      setShowCreateModal(false);
      setNewPackTitle('');
      setDraftStickers([]);
    } catch (err: unknown) {
      console.error('Failed to create sticker pack:', err);
      alert('Ошибка при создании набора: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingPack(false);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '380px',
        height: '450px',
        background: 'var(--side)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 500,
        overflow: 'hidden',
        animation: 'slideUp 0.18s ease-out',
        fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--side)',
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('emoji')}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'emoji' ? 'var(--card)' : 'transparent',
              color: activeTab === 'emoji' ? 'var(--acc)' : 'var(--text2)',
              transition: 'all 0.15s',
            }}
          >
            <Smile size={16} />
            <span>Эмодзи</span>
          </button>

          <button
            onClick={() => setActiveTab('stickers')}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'stickers' ? 'var(--card)' : 'transparent',
              color: activeTab === 'stickers' ? 'var(--acc)' : 'var(--text2)',
              transition: 'all 0.15s',
            }}
          >
            <ImageIcon size={16} />
            <span>Стикеры</span>
          </button>

          <button
            onClick={() => setActiveTab('gifs')}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'gifs' ? 'var(--card)' : 'transparent',
              color: activeTab === 'gifs' ? 'var(--acc)' : 'var(--text2)',
              transition: 'all 0.15s',
            }}
          >
            <Film size={16} />
            <span>GIF</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'rgba(91, 143, 185, 0.15)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--acc)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Создать свой стикерпак или набор эмодзи"
          >
            <Plus size={13} />
            <span>Создать пак</span>
          </button>

          {onClose && (
            <button className="icon-btn sm" onClick={onClose} title="Закрыть">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '6px 10px',
          }}
        >
          <Search size={14} style={{ color: 'var(--text2)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder={activeTab === 'emoji' ? 'Поиск эмодзи...' : 'Поиск...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: '13px',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer' }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: EMOJI TAB (Site Classic Emojis + User Custom Emojis) */}
      {activeTab === 'emoji' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Category Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderBottom: '1px solid var(--border)',
              overflowX: 'auto',
              flexShrink: 0,
            }}
          >
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveEmojiCategory(cat.id);
                  setSearchQuery('');
                }}
                style={{
                  background: activeEmojiCategory === cat.id ? 'var(--card2)' : 'transparent',
                  border: activeEmojiCategory === cat.id ? '1px solid var(--acc)' : '1px solid transparent',
                  borderRadius: '8px',
                  padding: '4px 6px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                title={cat.name}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {filteredEmojis ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px' }}>
                  РЕЗУЛЬТАТЫ ПОИСКА ({filteredEmojis.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                  {filteredEmojis.map((em, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePickEmoji(em)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '22px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        padding: '4px',
                        transition: 'transform 0.1s, background 0.1s',
                      }}
                      className="emoji-btn"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Recent Emojis */}
                {activeEmojiCategory === 'recent' && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px' }}>
                      НЕДАВНО ИСПОЛЬЗОВАННЫЕ
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                      {recentEmojis.map((em, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePickEmoji(em)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '22px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '4px',
                          }}
                          className="emoji-btn"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Custom Emojis Section */}
                {activeEmojiCategory === 'custom' && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--acc)', marginBottom: '8px' }}>
                      КАСТОМНЫЕ ЭМОДЗИ ПОЛЬЗОВАТЕЛЕЙ
                    </div>
                    {customEmojiPacks.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text2)' }}>
                        <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Пока нет кастомных наборов эмодзи</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          Нажмите «Создать пак», чтобы добавить свой набор кастомных эмодзи!
                        </div>
                      </div>
                    ) : (
                      customEmojiPacks.map((pack) => (
                        <div key={pack.id} style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                            {pack.title} • <span style={{ color: 'var(--text2)', fontWeight: 400 }}>@{pack.authorNick}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                            {pack.stickers.map((s, idx) => (
                              <button
                                key={idx}
                                onClick={() =>
                                  onSelectEmoji(
                                    `<img class="ce" data-ce="1" data-pack="${pack.id}" src="${s.url}" alt="${s.emoji || ''}">`
                                  )
                                }
                                style={{
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '8px',
                                  padding: '4px',
                                  cursor: 'pointer',
                                  aspectRatio: '1/1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title={s.emoji || pack.title}
                              >
                                <img
                                  src={s.url}
                                  alt={s.emoji || ''}
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.ce-fallback')) {
                                      const span = document.createElement('span');
                                      span.className = 'ce-fallback';
                                      span.style.fontSize = '18px';
                                      span.textContent = s.emoji || '✨';
                                      parent.appendChild(span);
                                    }
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Classic Standard Categories from Site (ED) */}
                {activeEmojiCategory !== 'recent' && activeEmojiCategory !== 'custom' && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px' }}>
                      {EMOJI_CATEGORIES.find((c) => c.id === activeEmojiCategory)?.name.toUpperCase()}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                      {(ED[activeEmojiCategory as keyof typeof ED] || []).map((em, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePickEmoji(em)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '22px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '4px',
                          }}
                          className="emoji-btn"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: STICKERS TAB (ONLY USER-CREATED STICKERS) */}
      {activeTab === 'stickers' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* User Packs Bar */}
          {stickerPacks.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderBottom: '1px solid var(--border)',
                overflowX: 'auto',
                background: 'var(--card)',
                flexShrink: 0,
              }}
            >
              {stickerPacks.map((pack) => {
                const isSelected = selectedStickerPack?.id === pack.id;
                const previewImg = pack.stickers[0]?.url;

                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPackId(pack.id)}
                    style={{
                      background: isSelected ? 'rgba(91, 143, 185, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected ? '2px solid var(--acc)' : '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                    title={`${pack.title} (@${pack.authorNick})`}
                  >
                    {previewImg ? (
                      <img
                        src={previewImg}
                        alt=""
                        style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '4px' }}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLElement;
                          target.style.display = 'none';
                          const fb = target.nextElementSibling as HTMLElement;
                          if (fb) fb.style.display = 'inline-block';
                        }}
                      />
                    ) : null}
                    <span
                      style={{
                        display: previewImg ? 'none' : 'inline-block',
                        fontSize: '13px',
                        lineHeight: 1,
                      }}
                    >
                      {pack.kind === 'emoji' ? '😎' : '📦'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'var(--acc)' : 'var(--text)' }}>
                      {pack.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sticker Grid (ONLY User Stickers) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {loadingPacks ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="spinner" style={{ width: '32px', height: '32px' }} />
              </div>
            ) : stickerPacks.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  color: 'var(--text2)',
                  gap: '12px',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--acc)',
                  }}
                >
                  <Package size={32} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>
                    Стикеры только от пользователей
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', maxWidth: '260px', lineHeight: 1.4 }}>
                    Здесь отображаются только паки, добавленные пользователями сообщества.
                  </div>
                </div>
                <button
                  className="btn primary"
                  style={{ width: 'auto', padding: '8px 18px', fontSize: '13px', borderRadius: '10px' }}
                  onClick={() => {
                    setCreateKind('sticker');
                    setShowCreateModal(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Создать свой стикерпак</span>
                </button>
              </div>
            ) : selectedStickerPack ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                    {selectedStickerPack.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                    Автор: @{selectedStickerPack.authorNick || 'Пользователь'} • {selectedStickerPack.stickers.length} шт.
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                  }}
                >
                  {selectedStickerPack.stickers.map((stk, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectSticker(stk.url, selectedStickerPack.id, stk.emoji)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid transparent',
                        borderRadius: '12px',
                        padding: '6px',
                        aspectRatio: '1/1',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.15s, background 0.15s',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                      title={stk.emoji || selectedStickerPack.title}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.08)';
                        e.currentTarget.style.background = 'var(--hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      }}
                    >
                      <img
                        src={stk.url}
                        alt={stk.emoji || ''}
                        loading="lazy"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.stk-fallback-icon')) {
                            const span = document.createElement('span');
                            span.className = 'stk-fallback-icon';
                            span.style.fontSize = '28px';
                            span.textContent = stk.emoji || '🖼️';
                            parent.appendChild(span);
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Tab 3: GIFS TAB */}
      {activeTab === 'gifs' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px' }}>
            ПОПУЛЯРНЫЕ GIF
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
              { id: 'g1', title: 'Party Cat', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif' },
              { id: 'g2', title: 'Vibe Dance', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
              { id: 'g3', title: 'Popcorn', url: 'https://media.giphy.com/media/GLbiGvv9RiNpdpAAax/giphy.gif' },
              { id: 'g4', title: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
              { id: 'g5', title: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
              { id: 'g6', title: 'Hacker typing', url: 'https://media.giphy.com/media/ule4akeXnY9A50FYME/giphy.gif' },
            ].map((gif) => (
              <div
                key={gif.id}
                onClick={() => onSelectGif?.(gif.url)}
                style={{
                  borderRadius: '10px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  aspectRatio: '16/10',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  position: 'relative',
                }}
              >
                <img src={gif.url} alt={gif.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CREATE USER STICKERPACK OR CUSTOM EMOJIS */}
      {showCreateModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--side)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
              Создать набор пользователей
            </div>
            <button className="icon-btn sm" onClick={() => setShowCreateModal(false)}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => setCreateKind('sticker')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: createKind === 'sticker' ? '1px solid var(--acc)' : '1px solid var(--border)',
                background: createKind === 'sticker' ? 'rgba(91,143,185,0.2)' : 'var(--card)',
                color: createKind === 'sticker' ? 'var(--acc)' : 'var(--text2)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Стикерпак
            </button>
            <button
              onClick={() => setCreateKind('emoji')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: createKind === 'emoji' ? '1px solid var(--acc)' : '1px solid var(--border)',
                background: createKind === 'emoji' ? 'rgba(91,143,185,0.2)' : 'var(--card)',
                color: createKind === 'emoji' ? 'var(--acc)' : 'var(--text2)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Набор эмодзи
            </button>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
              Название набора
            </label>
            <input
              type="text"
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              placeholder="Например: Мои стикеры"
              value={newPackTitle}
              onChange={(e) => setNewPackTitle(e.target.value)}
            />
          </div>

          {/* Hidden File Input for Stickers (Multi-file select) */}
          <input
            type="file"
            ref={stickerFileInputRef}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleProcessFiles(e.target.files);
              }
            }}
          />

          {/* Drag & Drop File Upload Area */}
          <div
            onClick={() => stickerFileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFiles(true);
            }}
            onDragLeave={() => setIsDraggingFiles(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFiles(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleProcessFiles(e.dataTransfer.files);
              }
            }}
            style={{
              border: isDraggingFiles ? '2px dashed var(--acc)' : '2px dashed var(--border)',
              borderRadius: '12px',
              padding: '14px 10px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDraggingFiles ? 'var(--hover)' : 'rgba(255, 255, 255, 0.03)',
              transition: 'all 0.2s',
              marginBottom: '10px',
            }}
          >
            {uploadingFiles ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--acc)', padding: '6px' }}>
                <div className="spinner" style={{ width: '18px', height: '18px' }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Оптимизация картинок...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(91,143,185,0.15)',
                    color: 'var(--acc)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <Upload size={18} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  Загрузить картинки с компьютера
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>
                  Нажмите или перетащите файлы (PNG с прозрачностью, WebP, JPG, GIF)
                </div>
              </div>
            )}
          </div>

          {/* Optional manual URL expander */}
          <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowManualUrl(!showManualUrl)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '11px',
                color: 'var(--acc)',
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              {showManualUrl ? '▲ Скрыть ввод по URL' : '▼ Вставить картинку по ссылке (URL)'}
            </button>
          </div>

          {showManualUrl && (
            <form onSubmit={handleAddDraftSticker} style={{ display: 'flex', gap: '6px', marginBottom: '10px', animation: 'fadeIn 0.15s' }}>
              <input
                type="url"
                className="form-input"
                style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                placeholder="https://example.com/sticker.png"
                value={newStickerUrl}
                onChange={(e) => setNewStickerUrl(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                style={{ width: '42px', textAlign: 'center', padding: '6px', fontSize: '13px' }}
                title="Связанный эмодзи"
                value={newStickerEmoji}
                onChange={(e) => setNewStickerEmoji(e.target.value)}
              />
              <button type="submit" className="btn primary sm" style={{ width: 'auto', padding: '6px 10px', fontSize: '11px' }}>
                <Plus size={13} />
              </button>
            </form>
          )}

          {/* Draft Items List */}
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', marginBottom: '12px', minHeight: '120px' }}>
            {draftStickers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text2)', fontSize: '12px' }}>
                <Package size={28} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                <div>Картинки пока не добавлены</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Выберите файлы с компьютера или перетащите их в область выше</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {draftStickers.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'relative',
                      aspectRatio: '1/1',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <img
                      src={item.url}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />

                    {/* Emoji Badge on Sticker */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '2px',
                        fontSize: '12px',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: '4px',
                        padding: '1px 3px',
                        lineHeight: 1,
                      }}
                      title="Эмодзи стикера"
                    >
                      {item.emoji}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDraftSticker(i)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: '#ff6b6b',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title="Удалить стикер"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn primary"
            disabled={savingPack || !newPackTitle.trim() || draftStickers.length === 0}
            onClick={handlePublishPack}
          >
            {savingPack ? 'Публикация...' : `Опубликовать ${createKind === 'sticker' ? 'стикерпак' : 'набор эмодзи'} (${draftStickers.length} шт.)`}
          </button>
        </div>
      )}
    </div>
  );
};
