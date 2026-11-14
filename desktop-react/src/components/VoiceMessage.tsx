import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessageProps {
  audioUrl: string;
  duration?: number;
}

const NUM_BARS = 30;

// Keyframe style injected once
const WAVEFORM_STYLE_ID = 'voice-waveform-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(WAVEFORM_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = WAVEFORM_STYLE_ID;
  style.textContent = `
    @keyframes barBounce {
      0%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(1.45); }
    }
    @keyframes voiceShimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
  `;
  document.head.appendChild(style);
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({ audioUrl, duration = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fixed random bar heights, stable across renders
  const barHeights = useMemo(
    () => Array.from({ length: NUM_BARS }, () => 4 + Math.random() * 16),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audioUrl],
  );

  useEffect(() => {
    setIsLoaded(false);
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.oncanplay = () => setIsLoaded(true);
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = speed;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSpeedChange = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed as 1 | 1.5 | 2);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * audioRef.current.duration;
  };

  const formatSecs = (sec: number) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const remain = s % 60;
    return `${m}:${remain < 10 ? '0' : ''}${remain}`;
  };

  const activeBars = Math.round((progress / 100) * NUM_BARS);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 4px',
        minWidth: '220px',
      }}
    >
      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'var(--acc)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'transform 0.12s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {isPlaying ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: '2px' }} />}
      </button>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Waveform */}
        {!isLoaded ? (
          /* Loading shimmer */
          <div
            style={{
              height: '24px',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 75%)',
              backgroundSize: '200% 100%',
              animation: 'voiceShimmer 1.4s infinite linear',
            }}
          />
        ) : (
          <div
            onClick={handleWaveformClick}
            style={{
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              cursor: 'pointer',
              padding: '0 1px',
            }}
          >
            {barHeights.map((h, i) => {
              const isActive = i < activeBars;
              const isCurrent = i === activeBars && isPlaying;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}px`,
                    borderRadius: '2px',
                    backgroundColor: isActive ? 'var(--acc)' : 'rgba(255,255,255,0.2)',
                    transition: 'background-color 0.08s ease',
                    transformOrigin: 'center',
                    animation: isCurrent ? 'barBounce 0.5s ease-in-out infinite' : undefined,
                    willChange: isCurrent ? 'transform' : undefined,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Time & speed */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <span>{isPlaying ? formatSecs(currentTime) : formatSecs(duration || currentTime)}</span>
          <button
            onClick={handleSpeedChange}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text2)',
              fontSize: '10px',
              padding: '1px 4px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'background 0.2s ease, color 0.2s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
};
