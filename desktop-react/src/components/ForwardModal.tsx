import React, { useState } from 'react';
import { X, Search, Forward, Users } from 'lucide-react';
import { Avatar } from './Avatar';
import type { Chat, User, Message } from '@/types';

interface ForwardModalProps {
  message: Message;
  chats: Chat[];
  users: Record<string, User>;
  currentUser: User | null;
  onClose: () => void;
  onForward: (targetChatId: string, message: Message) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  message,
  chats,
  users,
  currentUser,
  onClose,
  onForward,
}) => {
  const [search, setSearch] = useState('');

  const getChatName = (c: Chat) => {
    if (c.type === 'dm') {
      const otherUid = c.members.find((m) => m !== currentUser?.uid);
      const u = otherUid ? users[otherUid] : undefined;
      return u?.displayName || u?.nick || 'Собеседник';
    }
    return c.name || 'Группа';
  };

  const filtered = chats.filter((c) => {
    const name = getChatName(c).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Forward size={18} color="var(--acc)" />
            <span className="modal-title">Переслать сообщение</span>
          </div>
          <button className="icon-btn sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px' }}>
          {/* Quote preview of forwarded message */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'var(--card)',
              borderLeft: '3px solid var(--acc)',
              marginBottom: '14px',
              fontSize: '13px',
              color: 'var(--text2)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--acc3)', fontSize: '12px' }}>
              {users[message.uid]?.displayName || users[message.uid]?.nick || 'Автор'}
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {message.text}
            </div>
          </div>

          <div className="search-bar" style={{ margin: '0 0 12px 0' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Поиск получателя..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filtered.map((c) => {
              const name = getChatName(c);
              const otherUid = c.type === 'dm' ? c.members.find((m) => m !== currentUser?.uid) : undefined;
              const otherUser = otherUid ? users[otherUid] : undefined;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onForward(c.id, message);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Avatar
                    name={name}
                    avatarUrl={c.type === 'dm' ? otherUser?.avatar : c.avatar}
                    online={c.type === 'dm' ? otherUser?.online : false}
                    size="sm"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text2)' }}>
                      {c.type === 'dm' ? 'Личный чат' : `${c.members.length} участников`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
