import React, { useState, useRef } from 'react';
import { X, UserPlus, Users, MessageSquarePlus, Camera, Upload, Trash2 } from 'lucide-react';
import { fileToOptimizedDataUrl } from '@/lib/imageUtils';

interface NewChatModalProps {
  onClose: () => void;
  onCreateDirect: (nick: string) => Promise<string | null>;
  onCreateGroup: (name: string, members: string[], avatar?: string) => Promise<string | null>;
  onChatCreated: (chatId: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  onClose,
  onCreateDirect,
  onCreateGroup,
  onChatCreated,
}) => {
  const [mode, setMode] = useState<'dm' | 'group'>('dm');
  const [nick, setNick] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [memberNicks, setMemberNicks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await fileToOptimizedDataUrl(file, 256, 0.85, false);
      setGroupAvatar(dataUrl);
    } catch (e) {
      console.error('Failed to process group avatar:', e);
    }
  };

  const handleSubmitDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = nick.trim();
    if (!query) return;

    setError(null);
    setSubmitting(true);
    try {
      const chatId = await onCreateDirect(query);
      if (chatId) {
        onChatCreated(chatId);
        onClose();
      } else {
        setError(`Пользователь "${query}" не найден`);
      }
    } catch (_) {
      setError('Не удалось создать диалог');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setError(null);
    setSubmitting(true);
    try {
      const members = memberNicks
        .split(/[\s,]+/)
        .map((m) => m.replace(/^@/, '').trim().toLowerCase())
        .filter(Boolean);

      const chatId = await onCreateGroup(groupName.trim(), members, groupAvatar);
      if (chatId) {
        onChatCreated(chatId);
        onClose();
      } else {
        setError('Не удалось найти указанных участников');
      }
    } catch (_) {
      setError('Ошибка создания группы');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {mode === 'dm' ? 'Новое сообщение' : 'Создать группу'}
          </div>
          <button className="icon-btn sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="auth-tabs" style={{ marginBottom: '18px' }}>
            <button
              type="button"
              className={`auth-tab ${mode === 'dm' ? 'active' : ''}`}
              onClick={() => {
                setMode('dm');
                setError(null);
              }}
            >
              Личный диалог
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'group' ? 'active' : ''}`}
              onClick={() => {
                setMode('group');
                setError(null);
              }}
            >
              Группа
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {mode === 'dm' ? (
            <form onSubmit={handleSubmitDirect}>
              <div className="form-group">
                <label className="form-label">Никнейм или UID собеседника</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="alex_pro или UID пользователя"
                    value={nick}
                    onChange={(e) => setNick(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button
                className="btn primary"
                type="submit"
                disabled={submitting}
                style={{ marginTop: '16px' }}
              >
                {submitting ? (
                  <div className="spinner" style={{ width: '18px', height: '18px' }} />
                ) : (
                  <>
                    <MessageSquarePlus size={18} />
                    <span>Начать диалог</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitGroup}>
              {/* Group Avatar Upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarFile(f);
                  }}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'relative',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    background: 'var(--card)',
                    border: '2px dashed var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  title="Выбрать аватар группы"
                >
                  {groupAvatar ? (
                    <img src={groupAvatar} alt="Group" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={24} style={{ color: 'var(--text2)' }} />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>
                    Аватар группы
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn secondary sm"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={12} />
                      <span>{groupAvatar ? 'Изменить' : 'Загрузить фото'}</span>
                    </button>
                    {groupAvatar && (
                      <button
                        type="button"
                        className="btn secondary sm"
                        style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--red)' }}
                        onClick={() => setGroupAvatar('')}
                        title="Удалить аватар"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Название группы</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Любители мемов"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Никнеймы участников (через запятую)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="alex, victor, john"
                  value={memberNicks}
                  onChange={(e) => setMemberNicks(e.target.value)}
                />
              </div>

              <button
                className="btn primary"
                type="submit"
                disabled={submitting}
                style={{ marginTop: '16px' }}
              >
                {submitting ? (
                  <div className="spinner" style={{ width: '18px', height: '18px' }} />
                ) : (
                  <>
                    <Users size={18} />
                    <span>Создать группу</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
