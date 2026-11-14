import React from 'react';
import { X, MessageSquare, AtSign, Info, Hash } from 'lucide-react';
import { Avatar } from './Avatar';
import type { User } from '@/types';
import { isFemaleUser } from '@/lib/badges';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onStartChat?: (user: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onStartChat }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '380px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Профиль пользователя</div>
          <button className="icon-btn sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="profile-top">
          <Avatar
            name={user.displayName || user.nick}
            avatarUrl={user.avatar}
            online={user.online}
            size="xl"
          />
          <div className="profile-name">
            {user.displayName || user.nick}
            {isFemaleUser(user, user.uid) && (
              <span className="female-badge female-badge-lg" title="Девушка" />
            )}
          </div>
          <div className="profile-nick">@{user.nick}</div>
          <div className={`profile-status ${user.online ? 'online' : 'offline'}`}>
            {user.online ? '● В сети' : 'Был(а) недавно'}
          </div>
        </div>

        <div className="modal-body" style={{ padding: '0 0 16px 0' }}>
          {user.bio && (
            <div className="profile-info-row">
              <Info size={18} />
              <div className="pir-content">
                <div className="pir-label">О себе</div>
                <div className="pir-value">{user.bio}</div>
              </div>
            </div>
          )}

          <div className="profile-info-row">
            <AtSign size={18} />
            <div className="pir-content">
              <div className="pir-label">Имя пользователя</div>
              <div className="pir-value">@{user.nick}</div>
            </div>
          </div>

          {user.uid && (
            <div
              className="profile-info-row"
              style={{ cursor: 'pointer' }}
              title="Нажмите, чтобы скопировать UID"
              onClick={() => {
                navigator.clipboard.writeText(user.uid);
              }}
            >
              <Hash size={18} />
              <div className="pir-content">
                <div className="pir-label">UID (нажмите для копирования)</div>
                <div className="pir-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{user.uid}</div>
              </div>
            </div>
          )}

          {onStartChat && (
            <div style={{ padding: '16px 20px 0' }}>
              <button
                className="btn primary"
                onClick={() => {
                  onStartChat(user);
                  onClose();
                }}
              >
                <MessageSquare size={16} />
                <span>Написать сообщение</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
