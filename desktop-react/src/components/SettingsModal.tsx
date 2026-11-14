import React, { useState, useRef } from 'react';
import {
  X,
  Palette,
  Bell,
  Volume2,
  User as UserIcon,
  LogOut,
  Info,
  Check,
  Camera,
  Upload,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { sendDesktopNotification } from '@/lib/notifications';
import { soundFX } from '@/lib/sounds';
import { rtdb } from '@/lib/firebase';
import { ref, update } from 'firebase/database';
import { fileToOptimizedDataUrl } from '@/lib/imageUtils';
import type { User, Theme } from '@/types';

interface SettingsModalProps {
  currentUser: User | null;
  currentTheme: string;
  onChangeTheme: (theme: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  tgNotifEnabled: boolean;
  onToggleTgNotif: () => void;
  tgNotifSound: boolean;
  onToggleTgSound: () => void;
  tgNotifPos: 'bottom-right' | 'top-right';
  onChangeTgPos: (pos: 'bottom-right' | 'top-right') => void;
  tgNotifPreview: boolean;
  onToggleTgPreview: () => void;
  onTestTgNotification: () => void;
  onClose: () => void;
  onLogout: () => void;
}

const THEMES = [
  { id: 'dark', name: 'Оригинальная тёмная', color: '#0f1923', acc: '#5b8fb9' },
  { id: 'light', name: 'Светлая кофейная', color: '#f5f0eb', acc: '#9b6b3a' },
  { id: 'coffee-dark', name: 'Кофейный нуар', color: '#1a0e06', acc: '#c8906a' },
  { id: 'moss', name: 'Лесной мох', color: '#0e1611', acc: '#6b9e5f' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  currentTheme,
  onChangeTheme,
  soundEnabled,
  onToggleSound,
  notificationsEnabled,
  onToggleNotifications,
  tgNotifEnabled,
  onToggleTgNotif,
  tgNotifSound,
  onToggleTgSound,
  tgNotifPos,
  onChangeTgPos,
  tgNotifPreview,
  onToggleTgPreview,
  onTestTgNotification,
  onClose,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'notifications' | 'profile'>('general');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await fileToOptimizedDataUrl(file, 512, 0.85, false);
      setAvatar(dataUrl);
    } catch (err) {
      console.error('Failed to process avatar file:', err);
    }
  };
  const [trayEnabled, setTrayEnabled] = useState<boolean>(() => {
    const w = window as unknown as { electronAPI?: { getTrayEnabled?: () => boolean } };
    if (w.electronAPI?.getTrayEnabled) {
      return w.electronAPI.getTrayEnabled();
    }
    return localStorage.getItem('nc_tray') !== 'false';
  });

  const handleToggleTray = () => {
    const nextVal = !trayEnabled;
    setTrayEnabled(nextVal);
    localStorage.setItem('nc_tray', String(nextVal));
    const w = window as unknown as { electronAPI?: { setTrayEnabled?: (val: boolean) => void } };
    w.electronAPI?.setTrayEnabled?.(nextVal);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await update(ref(rtdb, 'users/' + currentUser.uid), {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (e) {
      console.error('Failed to update profile:', e);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTestNotification = () => {
    soundFX.playReceived();
    sendDesktopNotification(
      'Беспонтовый Чат — Тест',
      'Системные уведомления Windows работают отлично! 🚀'
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Настройки</div>
          <button className="icon-btn sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'general' ? 'var(--acc)' : 'var(--text2)',
              borderBottom: activeTab === 'general' ? '2px solid var(--acc)' : '2px solid transparent',
            }}
          >
            Общие
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'profile' ? 'var(--acc)' : 'var(--text2)',
              borderBottom: activeTab === 'profile' ? '2px solid var(--acc)' : '2px solid transparent',
            }}
          >
            Мой профиль
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'theme' ? 'var(--acc)' : 'var(--text2)',
              borderBottom: activeTab === 'theme' ? '2px solid var(--acc)' : '2px solid transparent',
            }}
          >
            Тема
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'notifications' ? 'var(--acc)' : 'var(--text2)',
              borderBottom: activeTab === 'notifications' ? '2px solid var(--acc)' : '2px solid transparent',
            }}
          >
            Система
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--card)',
                  borderRadius: '12px',
                }}
              >
                <Avatar
                  name={currentUser?.displayName || currentUser?.nick}
                  avatarUrl={currentUser?.avatar}
                  online={true}
                  size="lg"
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>
                    {currentUser?.displayName || currentUser?.nick}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                    @{currentUser?.nick}
                  </div>
                </div>
              </div>

              {/* Tray Option */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--card)',
                  borderRadius: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Сворачивать в трей Windows</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                    При закрытии окна мессенджер продолжает работать в трее
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={trayEnabled}
                  onChange={handleToggleTray}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--acc)' }}
                />
              </div>

              {/* About with real logo */}
              <div style={{ padding: '14px', background: 'var(--card)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src="./logo.png"
                  alt="Nonsense Chat"
                  style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'contain' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = './chatlogo.png';
                  }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                    Беспонтовый Чат Desktop
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', lineHeight: 1.5 }}>
                    Платформа: Windows Frameless Native • Realtime DB
                  </div>
                </div>
              </div>

              <button
                className="btn secondary"
                onClick={onLogout}
                style={{
                  color: 'var(--red)',
                  borderColor: 'rgba(229,57,53,0.3)',
                  marginTop: '8px',
                }}
              >
                <LogOut size={16} />
                <span>Выйти из аккаунта</span>
              </button>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Avatar Section: Visual Preview & Direct Upload */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  padding: '16px',
                  background: 'var(--card)',
                  borderRadius: '14px',
                  border: isDraggingAvatar ? '2px dashed var(--acc)' : '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingAvatar(true);
                }}
                onDragLeave={() => setIsDraggingAvatar(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingAvatar(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleAvatarFile(f);
                }}
              >
                <input
                  type="file"
                  ref={avatarFileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarFile(f);
                  }}
                />

                {/* Avatar Circle with Hover Edit Badge */}
                <div
                  onClick={() => avatarFileInputRef.current?.click()}
                  style={{
                    position: 'relative',
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '3px solid rgba(91,143,185,0.4)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    background: 'var(--card2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Нажмите для выбора фото или перетащите файл сюда"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Аватар"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => setAvatar('')}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: '32px',
                        fontWeight: 700,
                        color: 'var(--acc)',
                      }}
                    >
                      {(displayName || currentUser?.nick || 'U')[0]?.toUpperCase()}
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: '#fff',
                    }}
                    className="avatar-hover-overlay"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  >
                    <Camera size={22} />
                    <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>Изменить</span>
                  </div>
                </div>

                {/* Avatar Actions */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    Фотография профиля
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px', lineHeight: 1.4 }}>
                    Выберите файл с компьютера (PNG, JPG, WebP) или перетащите его на круг
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => avatarFileInputRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>Загрузить фото</span>
                    </button>

                    {avatar && (
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', color: 'var(--red)', borderColor: 'rgba(229,57,53,0.3)' }}
                        onClick={() => setAvatar('')}
                      >
                        <Trash2 size={14} />
                        <span>Удалить</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn secondary"
                      style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      title="Указать ссылку вручную"
                    >
                      <LinkIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional URL input for power users */}
              {showUrlInput && (
                <div className="form-group" style={{ animation: 'fadeIn 0.15s' }}>
                  <label className="form-label">Ссылка на картинку (URL)</label>
                  <input
                    className="form-input"
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Отображаемое имя</label>
                <input
                  className="form-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ваше имя"
                />
              </div>

              <div className="form-group">
                <label className="form-label">О себе (Bio)</label>
                <input
                  className="form-input"
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Статус или пара слов о себе"
                />
              </div>

              {profileSaved && (
                <div style={{ color: 'var(--green)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} />
                  <span>Профиль успешно сохранён!</span>
                </div>
              )}

              <button className="btn primary" type="submit" disabled={savingProfile}>
                {savingProfile ? (
                  <div className="spinner" style={{ width: '18px', height: '18px' }} />
                ) : (
                  <span>Сохранить изменения</span>
                )}
              </button>
            </form>
          )}

          {activeTab === 'theme' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '4px' }}>
                Выберите цветовую схему приложения:
              </div>

              {THEMES.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onChangeTheme(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--card)',
                    border: currentTheme === t.id ? '2px solid var(--acc)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: t.color,
                        border: `2px solid ${t.acc}`,
                      }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{t.name}</span>
                  </div>
                  {currentTheme === t.id && <Check size={18} color="var(--acc)" />}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Telegram Custom In-App Notifications Section */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Кастомные уведомления Telegram
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--card)',
                  borderRadius: '12px',
                  border: tgNotifEnabled ? '1px solid rgba(91, 143, 185, 0.35)' : '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Уведомления Telegram на рабочем столе</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                    Плавающее окно в углу рабочего стола Windows с аватаром, таймером и быстрым ответом
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={tgNotifEnabled}
                  onChange={onToggleTgNotif}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--acc)' }}
                />
              </div>

              {tgNotifEnabled && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--card)',
                      borderRadius: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Звуковой сигнал Telegram</div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                        Фирменный мелодичный колокольчик при входящих сообщениях
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={tgNotifSound}
                      onChange={onToggleTgSound}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--acc)' }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--card)',
                      borderRadius: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Предпросмотр сообщения</div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                        Показывать текст входящего сообщения в уведомлении
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={tgNotifPreview}
                      onChange={onToggleTgPreview}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--acc)' }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--card)',
                      borderRadius: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Расположение на экране</div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                        Где отображать всплывающие уведомления
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => onChangeTgPos('bottom-right')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: tgNotifPos === 'bottom-right' ? '1px solid var(--acc)' : '1px solid var(--border)',
                          background: tgNotifPos === 'bottom-right' ? 'rgba(91,143,185,0.2)' : 'var(--card2)',
                          color: tgNotifPos === 'bottom-right' ? 'var(--acc)' : 'var(--text2)',
                        }}
                      >
                        Снизу справа
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeTgPos('top-right')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: tgNotifPos === 'top-right' ? '1px solid var(--acc)' : '1px solid var(--border)',
                          background: tgNotifPos === 'top-right' ? 'rgba(91,143,185,0.2)' : 'var(--card2)',
                          color: tgNotifPos === 'top-right' ? 'var(--acc)' : 'var(--text2)',
                        }}
                      >
                        Сверху справа
                      </button>
                    </div>
                  </div>

                  <button
                    className="btn primary"
                    type="button"
                    onClick={onTestTgNotification}
                    style={{ marginTop: '2px' }}
                  >
                    <Bell size={16} />
                    <span>Проверить уведомление Telegram (Тест)</span>
                  </button>
                </>
              )}

              {/* Windows Native Notifications Section */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '10px' }}>
                Системные уведомления Windows
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--card)',
                  borderRadius: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Уведомления Windows</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                    Стандартные баннеры в центре уведомлений Windows
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={onToggleNotifications}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--acc)' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--card)',
                  borderRadius: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Общие звуки приложения</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                    Звуки отправки сообщений и кликов
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={onToggleSound}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--acc)' }}
                />
              </div>

              <div>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={handleTestNotification}
                >
                  <Bell size={16} />
                  <span>Проверить уведомление Windows</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
