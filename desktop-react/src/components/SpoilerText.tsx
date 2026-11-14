import React, { useState } from 'react';

interface SpoilerTextProps {
  text: string;
  onMentionClick?: (nick: string) => void;
}

export const SpoilerText: React.FC<SpoilerTextProps> = ({ text, onMentionClick }) => {
  // Regex to split text by ||spoiler|| markers
  const parts: Array<{ isSpoiler: boolean; content: string; key: number }> = [];
  const regex = /\|\|([^|]+?)\|\|/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let count = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        isSpoiler: false,
        content: text.slice(lastIndex, match.index),
        key: count++,
      });
    }
    parts.push({
      isSpoiler: true,
      content: match[1],
      key: count++,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      isSpoiler: false,
      content: text.slice(lastIndex),
      key: count++,
    });
  }

  if (parts.length === 0) {
    return <FormattedContent text={text} onMentionClick={onMentionClick} />;
  }

  return (
    <span>
      {parts.map((p) =>
        p.isSpoiler ? (
          <SpoilerSpan key={p.key} content={p.content} onMentionClick={onMentionClick} />
        ) : (
          <FormattedContent key={p.key} text={p.content} onMentionClick={onMentionClick} />
        )
      )}
    </span>
  );
};

const FormattedContent: React.FC<{ text: string; onMentionClick?: (nick: string) => void }> = ({
  text,
  onMentionClick,
}) => {
  // Parse HTML img tags (custom emoji / stickers), links, and @mentions
  const tokens = text.split(/(<img\s+[^>]*src=["'][^"']+["'][^>]*>|https?:\/\/[^\s]+|@[a-zA-Z0-9_]+)/gi);

  return (
    <span>
      {tokens.map((token, i) => {
        if (/^<img\s+[^>]*src=["'][^"']+["'][^>]*>/i.test(token)) {
          const srcMatch = token.match(/src=["']([^"']+)["']/i);
          const src = srcMatch ? srcMatch[1] : '';
          const isSolo = text.trim() === token.trim();
          return (
            <img
              key={i}
              src={src}
              alt=""
              className="ce"
              style={{
                width: isSolo ? '128px' : '22px',
                height: isSolo ? '128px' : '22px',
                verticalAlign: isSolo ? 'middle' : '-4px',
                objectFit: 'contain',
                margin: isSolo ? '4px 0' : '0 2px',
                display: isSolo ? 'block' : 'inline-block',
              }}
            />
          );
        }
        if (/^https?:\/\//.test(token)) {
          return (
            <a
              key={i}
              href={token}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'var(--acc3)', textDecoration: 'underline', wordBreak: 'break-all' }}
            >
              {token}
            </a>
          );
        }
        if (/^@[a-zA-Z0-9_]+$/.test(token)) {
          const nick = token.slice(1);
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onMentionClick?.(nick);
              }}
              style={{
                color: 'var(--acc)',
                fontWeight: 600,
                cursor: onMentionClick ? 'pointer' : 'inherit',
                borderRadius: '3px',
                padding: '0 2px',
                backgroundColor: 'rgba(91,143,185,0.12)',
              }}
            >
              {token}
            </span>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </span>
  );
};

const SpoilerSpan: React.FC<{ content: string; onMentionClick?: (nick: string) => void }> = ({
  content,
  onMentionClick,
}) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      className={`spoiler ${revealed ? 'vis' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(true);
      }}
      title={revealed ? '' : 'Нажмите, чтобы показать скрытый текст'}
      style={{
        display: 'inline-block',
        position: 'relative',
        cursor: revealed ? 'text' : 'pointer',
        filter: revealed ? 'none' : 'blur(4px)',
        backgroundColor: revealed ? 'transparent' : 'rgba(255, 255, 255, 0.12)',
        borderRadius: '4px',
        padding: '0 4px',
        transition: 'filter 0.25s ease, background-color 0.25s ease',
        userSelect: revealed ? 'auto' : 'none',
      }}
    >
      <FormattedContent text={content} onMentionClick={onMentionClick} />
    </span>
  );
};
