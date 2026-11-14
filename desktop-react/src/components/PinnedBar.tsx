import React from 'react';
import { Pin, X, ChevronRight, ChevronLeft } from 'lucide-react';

export interface PinnedMessage {
  id: string;
  text: string;
  author?: string;
}

interface PinnedBarProps {
  pinnedMsgs: PinnedMessage[];
  currentIndex: number;
  onSelectIndex: (idx: number) => void;
  onGoToMessage: (id: string) => void;
  onUnpin: (idx: number) => void;
}

export const PinnedBar: React.FC<PinnedBarProps> = ({
  pinnedMsgs,
  currentIndex,
  onSelectIndex,
  onGoToMessage,
  onUnpin,
}) => {
  if (!pinnedMsgs || pinnedMsgs.length === 0) return null;

  const current = pinnedMsgs[currentIndex] || pinnedMsgs[0];
  if (!current) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px',
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        gap: '10px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={() => onGoToMessage(current.id)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <Pin size={16} color="var(--acc)" style={{ transform: 'rotate(45deg)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--acc3)' }}>
              Закреплённое сообщение
            </span>
            {pinnedMsgs.length > 1 && (
              <span style={{ fontSize: '10px', color: 'var(--text2)', fontWeight: 600 }}>
                {currentIndex + 1}/{pinnedMsgs.length}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: '12.5px',
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {current.author ? `@${current.author}: ` : ''}
            {current.text}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
        {pinnedMsgs.length > 1 && (
          <>
            <button
              className="icon-btn sm"
              title="Предыдущее"
              onClick={() => onSelectIndex((currentIndex - 1 + pinnedMsgs.length) % pinnedMsgs.length)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="icon-btn sm"
              title="Следующее"
              onClick={() => onSelectIndex((currentIndex + 1) % pinnedMsgs.length)}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
        <button
          className="icon-btn sm"
          title="Открепить"
          onClick={() => onUnpin(currentIndex)}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
