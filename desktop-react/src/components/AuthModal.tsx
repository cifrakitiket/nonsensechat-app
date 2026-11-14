import React, { useState } from 'react';
import { MessageSquare, LogIn, UserPlus } from 'lucide-react';

interface AuthModalProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (email: string, pass: string, nick: string) => Promise<void>;
  error: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onRegister, error }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nick, setNick] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Заполните все обязательные поля');
      return;
    }

    if (tab === 'register' && !nick) {
      setLocalError('Укажите ваш никнейм');
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'login') {
        await onLogin(email.trim(), password);
      } else {
        await onRegister(email.trim(), password, nick.trim().toLowerCase());
      }
    } catch (err: unknown) {
      const e = err as Error;
      setLocalError(e.message || 'Произошла ошибка при аутентификации');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img
            src="./logo.png"
            alt="Nonsense Chat"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              objectFit: 'contain',
              boxShadow: '0 4px 20px rgba(91,143,185,0.4)',
              marginBottom: '10px',
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = './chatlogo.png';
            }}
          />
          <h1>Беспонтовый Чат</h1>
          <p>Десктопная версия • Быстро, красиво, свободно</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login');
              setLocalError(null);
            }}
          >
            Вход
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register');
              setLocalError(null);
            }}
          >
            Регистрация
          </button>
        </div>

        {(error || localError) && (
          <div className="auth-error">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Никнейм (@username)</label>
              <input
                className="form-input"
                type="text"
                placeholder="например, alex_pro"
                value={nick}
                onChange={(e) => setNick(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              className="form-input"
              type="password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            className="btn primary"
            type="submit"
            disabled={submitting}
            style={{ marginTop: '20px' }}
          >
            {submitting ? (
              <div className="spinner" style={{ width: '18px', height: '18px' }} />
            ) : tab === 'login' ? (
              <>
                <LogIn size={18} />
                <span>Войти</span>
              </>
            ) : (
              <>
                <UserPlus size={18} />
                <span>Создать аккаунт</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
