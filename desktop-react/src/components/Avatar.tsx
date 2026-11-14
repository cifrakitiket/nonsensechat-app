import React, { useState } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  avatarUrl?: string;
  online?: boolean;
  size?: AvatarSize;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

const FONT_MAP: Record<AvatarSize, number> = {
  xs: 10,
  sm: 13,
  md: 16,
  lg: 22,
  xl: 28,
};

const DOT_MAP: Record<AvatarSize, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
};

export const Avatar: React.FC<AvatarProps> = ({
  name = '?',
  avatarUrl,
  online,
  size = 'md',
  className = '',
  onClick,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const px = SIZE_MAP[size] ?? SIZE_MAP.md;
  const fontSize = FONT_MAP[size] ?? FONT_MAP.md;
  const dotSize = DOT_MAP[size] ?? DOT_MAP.md;

  // Deterministic color gradient based on name string
  const getGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 45) % 360;
    return `linear-gradient(135deg, hsl(${hue1}, 65%, 45%), hsl(${hue2}, 70%, 35%))`;
  };

  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const showImage = !!avatarUrl && !hasError;
  const showFallback = !showImage;

  return (
    <div
      className={`avatar ${size} ${className}`}
      onClick={onClick}
      title={name}
      style={{
        position: 'relative',
        width: `${px}px`,
        height: `${px}px`,
        borderRadius: '50%',
        flexShrink: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: showFallback ? getGradient(name) : 'transparent',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'background 0.3s ease',
      }}
    >
      {/* Shimmer skeleton while image is loading */}
      {showImage && !isLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 75%)',
            backgroundSize: '200% 100%',
            animation: 'avatarShimmer 1.4s infinite linear',
          }}
        />
      )}

      {/* Avatar image */}
      {showImage && (
        <img
          src={avatarUrl}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.25s ease',
            display: 'block',
          }}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(false);
          }}
        />
      )}

      {/* Gradient fallback with initials (shown when no avatarUrl or on error) */}
      {showFallback && (
        <span
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            color: '#fff',
            userSelect: 'none',
            lineHeight: 1,
            transition: 'opacity 0.25s ease',
            opacity: 1,
          }}
        >
          {initial}
        </span>
      )}

      {/* Online indicator */}
      {online && (
        <div
          className="online-dot"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: '50%',
            background: '#4ade80',
            border: '2px solid var(--bg, #0c131a)',
          }}
        />
      )}
    </div>
  );
};
