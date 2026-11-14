import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';
import type { PollData } from './PollCard';

interface CreatePollModalProps {
  onClose: () => void;
  onSubmit: (poll: PollData) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({ onClose, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isQuiz, setIsQuiz] = useState(false);
  const [anonymous, setAnonymous] = useState(true);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOpts.length < 2) return;

    onSubmit({
      question: question.trim(),
      options: cleanOpts,
      isQuiz,
      anonymous,
      votes: {},
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--acc)" />
            <span className="modal-title">Создать опрос</span>
          </div>
          <button className="icon-btn sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Вопрос</label>
            <input
              className="form-input"
              type="text"
              placeholder="Задайте ваш вопрос..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="form-label">Варианты ответа</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder={`Вариант ${i + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      className="icon-btn sm"
                      onClick={() => handleRemoveOption(i)}
                      style={{ color: 'var(--red)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--acc)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  marginTop: '10px',
                  padding: '4px 0',
                }}
              >
                <Plus size={16} />
                <span>Добавить вариант</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                style={{ accentColor: 'var(--acc)', width: '16px', height: '16px' }}
              />
              <span>Анонимное голосование</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isQuiz}
                onChange={(e) => setIsQuiz(e.target.checked)}
                style={{ accentColor: 'var(--acc)', width: '16px', height: '16px' }}
              />
              <span>Режим викторины</span>
            </label>
          </div>

          <button
            className="btn primary"
            type="submit"
            style={{ marginTop: '10px' }}
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
          >
            <span>Опубликовать опрос</span>
          </button>
        </form>
      </div>
    </div>
  );
};
