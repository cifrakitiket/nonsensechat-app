import React, { useState, useEffect, useRef } from 'react';
import { X, Reply, Send, MessageSquare } from 'lucide-react';
import { Avatar } from './Avatar';
import type { User } from '@/types';

export interface TelegramToastItem {
  id: string;
  chatId: string;
  senderName: string;
  senderAvatar?: string;
  chatTitle?: string;
  text: string;
  ts: number;
}

interface TelegramNotificationProps {
  notifications: TelegramToastItem[];
  position?: 'bottom-right' | 'top-right';
  onDismiss: (id: string) => void;
  onOpenChat: (chatId: string) => void;
  onQuickReply?: (chatId: string, text: string) => void;
}

export const TelegramNotificationContainer: React.FC<TelegramNotificationProps> = ({
  notifications,
  position = 'bottom-right',
  onDismiss,
  onOpenChat,
  onQuickReply,
}) => {
  if (notifications.length === 0) return null;

  const isTop = position === 'top-right';

  return (
    <div
      style={{
        position: 'fixed',
        top: isTop ? '44px' : undefined,
        bottom: !isTop ? '24px' : undefined,
        right: '24px',
        display: 'flex',
        flexDirection: isTop ? 'column' : 'column-reverse',
        gap: '10px',
        zIndex: 999999,
        pointerEvents: 'none',
        maxWidth: '360px',
        width: '100%',
      }}
    >
      {notifications.slice(-4).map((item) => (
        <TelegramToastCard
          key={item.id}
          item={item}
          onDismiss={() => onDismiss(item.id)}
          onOpenChat={() => {
            onOpenChat(item.chatId);
            onDismiss(item.id);
          }}
          onQuickReply={onQuickReply}
        />
      ))}
    </div>
  );
};

const TelegramToastCard: React.FC<{
  item: TelegramToastItem;
  onDismiss: () => void;
  onOpenChat: () => void;
  onQuickReply?: (chatId: string, text: string) => void;
}> = ({ item, onDismiss, onOpenChat, onQuickReply }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<number | null>(null);

  // Auto-dismiss after 5 seconds with progress bar
  useEffect(() => {
    if (isHovered || isReplying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    timerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timerRef.current!);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, isReplying, onDismiss]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!replyText.trim()) return;
    onQuickReply?.(item.chatId, replyText.trim());
    setReplyText('');
    setIsReplying(false);
    onDismiss();
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpenChat}
      style={{
        pointerEvents: 'auto',
        background: 'rgba(23, 33, 43, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(91, 143, 185, 0.28)',
        borderRadius: '14px',
        padding: '12px 14px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'transform 0.15s, box-shadow 0.15s',
        transform: isHovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Avatar
          name={item.senderName}
          avatarUrl={item.senderAvatar}
          size="sm"
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '13px',
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.senderName}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', color: 'var(--text2)' }}>
                {formatTime(item.ts)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="icon-btn sm"
                style={{ width: '20px', height: '20px', padding: 0 }}
                title="Закрыть"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {item.chatTitle && item.chatTitle !== item.senderName && (
            <div style={{ fontSize: '11px', color: 'var(--acc)', fontWeight: 600, marginTop: '1px' }}>
              {item.chatTitle}
            </div>
          )}
        </div>
      </div>

      {/* Message Preview */}
      <div
        style={{
          fontSize: '12.5px',
          color: 'var(--text)',
          lineHeight: '1.4',
          maxHeight: '38px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          paddingLeft: '2px',
        }}
      >
        {item.text || 'Новое сообщение'}
      </div>

      {/* Quick Reply Form or Action Bar */}
      {isReplying ? (
        <form
          onSubmit={handleSendReply}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '4px',
          }}
        >
          <input
            type="text"
            autoFocus
            placeholder="Быстрый ответ..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="icon-btn primary sm"
            style={{ borderRadius: '8px', width: '28px', height: '28px' }}
            title="Отправить"
          >
            <Send size={13} />
          </button>
          <button
            type="button"
            className="icon-btn sm"
            onClick={() => setIsReplying(false)}
            style={{ borderRadius: '8px', width: '28px', height: '28px' }}
            title="Отмена"
          >
            <X size={13} />
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
          {onQuickReply && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsReplying(true);
              }}
              style={{
                background: 'rgba(91, 143, 185, 0.12)',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--acc)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <Reply size={12} />
              <span>Ответить</span>
            </button>
          )}

          <div
            style={{
              fontSize: '11px',
              color: 'var(--text2)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <MessageSquare size={11} />
            <span>Нажмите, чтобы открыть</span>
          </div>
        </div>
      )}

      {/* Auto-dismiss progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2.5px',
          width: `${progress}%`,
          background: 'var(--grad)',
          transition: 'width 0.05s linear',
        }}
      />
    </div>
  );
};
