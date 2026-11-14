import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { isElectron } from '@/lib/notifications';

interface TitleBarProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  title?: string;
  unreadCount?: number;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  soundEnabled,
  onToggleSound,
  notificationsEnabled,
  onToggleNotifications,
  title = 'Беспонтовый Чат',
  unreadCount,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isDesktop = isElectron();

  useEffect(() => {
    const w = window as unknown as {
      electronAPI?: {
        isMaximized?: () => boolean;
        onMaximizeChange?: (cb: (isMax: boolean) => void) => void;
      };
    };

    if (w.electronAPI?.isMaximized) {
      setIsMaximized(w.electronAPI.isMaximized());
    }

    if (w.electronAPI?.onMaximizeChange) {
      w.electronAPI.onMaximizeChange((isMax) => {
        setIsMaximized(isMax);
      });
    }
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const w = window as unknown as { electronAPI?: { minimize?: () => void } };
    w.electronAPI?.minimize?.();
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const w = window as unknown as { electronAPI?: { maximize?: () => void } };
    w.electronAPI?.maximize?.();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    const w = window as unknown as { electronAPI?: { close?: () => void } };
    if (w.electronAPI?.close) {
      w.electronAPI.close();
    } else {
      window.close();
    }
  };

  const handleDoubleClick = () => {
    const w = window as unknown as { electronAPI?: { maximize?: () => void } };
    w.electronAPI?.maximize?.();
  };

  // Shared window control button style
  const winBtnBase: React.CSSProperties = {
    width: '46px',
    height: '100%',
    background: 'transparent',
    border: 'none',
    color: 'var(--text2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.1s ease, color 0.1s ease',
  };

  return (
    <header
      className="custom-titlebar"
      onDoubleClick={handleDoubleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '36px',
        backgroundColor: '#0c131a',
        borderBottom: '1px solid var(--border)',
        padding: '0 0 0 12px',
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        fontSize: '12px',
        color: 'var(--text2)',
        zIndex: 9999,
        position: 'relative',
      } as React.CSSProperties}
    >
      {/* App branding & title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <img
          src="./logo.png"
          alt="Logo"
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '4px',
            objectFit: 'contain',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = './chatlogo.png';
          }}
        />
        <span style={{ fontWeight: 700, color: 'var(--text)', letterSpacing: '0.4px', fontSize: '12.5px' }}>
          {title}
        </span>
        <span
          style={{
            fontSize: '10px',
            padding: '1px 6px',
            borderRadius: '10px',
            background: 'rgba(91,143,185,0.18)',
            color: 'var(--acc)',
            fontWeight: 600,
          }}
        >
          Desktop
        </span>

        {/* Unread badge */}
        {unreadCount != null && unreadCount > 0 && (
          <span
            style={{
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              borderRadius: '8px',
              background: 'var(--acc)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              animation: 'unreadPulse 2s ease-in-out infinite',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Action buttons & window controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {/* Quick settings toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '6px' }}>
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Звуковые эффекты: Включены' : 'Звуковые эффекты: Выключены'}
            className="titlebar-icon-btn"
            style={{
              background: 'none',
              border: 'none',
              color: soundEnabled ? 'var(--acc)' : 'var(--text2)',
              cursor: 'pointer',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background 0.1s ease, color 0.1s ease',
            }}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          <button
            onClick={onToggleNotifications}
            title={notificationsEnabled ? 'Уведомления Windows: Включены' : 'Уведомления Windows: Выключены'}
            className="titlebar-icon-btn"
            style={{
              background: 'none',
              border: 'none',
              color: notificationsEnabled ? 'var(--acc)' : 'var(--text2)',
              cursor: 'pointer',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background 0.1s ease, color 0.1s ease',
            }}
          >
            {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
          </button>
        </div>

        {/* Custom Window Controls (Frameless Windows) */}
        {isDesktop && (
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {/* Minimize */}
            <button
              onClick={handleMinimize}
              title="Свернуть"
              className="window-control-btn minimize"
              style={winBtnBase}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text2)';
              }}
            >
              <svg width="10" height="1" viewBox="0 0 10 1">
                <rect width="10" height="1" fill="currentColor" />
              </svg>
            </button>

            {/* Maximize / Restore */}
            <button
              onClick={handleMaximize}
              title={isMaximized ? 'Восстановить' : 'Развернуть'}
              className="window-control-btn maximize"
              style={winBtnBase}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text2)';
              }}
            >
              {isMaximized ? (
                /* Restore icon — two overlapping squares */
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path d="M2.5 1.5h6v6h-1.5M1.5 3.5h6v6h-6z" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
              ) : (
                /* Maximize icon — single square */
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
              )}
            </button>

            {/* Close */}
            <button
              onClick={handleClose}
              title="Закрыть"
              className="window-control-btn close"
              style={winBtnBase}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e81123';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text2)';
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" />
                <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
