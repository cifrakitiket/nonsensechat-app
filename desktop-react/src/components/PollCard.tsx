import React from 'react';
import { Check, CheckCircle2, BarChart2 } from 'lucide-react';

export interface PollData {
  question: string;
  options: string[];
  votes?: Record<string, number>;
  isQuiz?: boolean;
  anonymous?: boolean;
}

interface PollCardProps {
  poll: PollData;
  currentUid: string;
  onVote: (optIdx: number) => void;
}

export const PollCard: React.FC<PollCardProps> = ({ poll, currentUid, onVote }) => {
  const votes = poll.votes || {};
  const totalVotes = Object.keys(votes).length;
  const myVote = votes[currentUid];
  const isVoted = myVote !== undefined && myVote !== null;

  // Count votes per option
  const optCounts: Record<number, number> = {};
  Object.values(votes).forEach((v) => {
    optCounts[v] = (optCounts[v] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(optCounts), 0);

  function pluralVotes(n: number) {
    if (n % 10 === 1 && n % 100 !== 11) return 'голос';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'голоса';
    return 'голосов';
  }

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.22)',
        borderRadius: '14px',
        padding: '12px 14px',
        minWidth: '260px',
        maxWidth: '340px',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--acc3)',
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
          marginBottom: '6px',
        }}
      >
        <BarChart2 size={13} />
        <span>{poll.isQuiz ? 'Викторина' : 'Голосование'}</span>
      </div>

      <div style={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--text)', marginBottom: '12px', lineHeight: 1.35 }}>
        {poll.question}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {poll.options.map((opt, i) => {
          const count = optCounts[i] || 0;
          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = myVote === i;
          const isWinner = isVoted && count === maxCount && count > 0;

          return (
            <div
              key={i}
              onClick={() => onVote(i)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '10px',
                background: isSelected ? 'rgba(91,143,185,0.22)' : 'rgba(255, 255, 255, 0.05)',
                border: isSelected ? '1px solid var(--acc)' : '1px solid transparent',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Animated Progress Bar */}
              {isVoted && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    background: isWinner ? 'rgba(91,143,185,0.25)' : 'rgba(255, 255, 255, 0.07)',
                    transition: 'width 0.4s ease-out',
                    zIndex: 0,
                  }}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid var(--acc)' : '2px solid var(--text2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? 'var(--acc)' : 'transparent',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
                <span
                  style={{
                    fontSize: '13.5px',
                    color: isSelected ? 'var(--text)' : 'var(--text2)',
                    fontWeight: isSelected ? 600 : 400,
                    wordBreak: 'break-word',
                  }}
                >
                  {opt}
                </span>
              </div>

              {isVoted && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', zIndex: 1, marginLeft: '8px' }}>
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '10px',
          fontSize: '11.5px',
          color: 'var(--text2)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>
          {totalVotes} {pluralVotes(totalVotes)}
        </span>
        {isVoted && <span style={{ color: 'var(--acc3)', fontWeight: 500 }}>Вы проголосовали</span>}
      </div>
    </div>
  );
};
