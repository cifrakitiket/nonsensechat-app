import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string;
  caption?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, caption, onClose }) => {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `nonsense_chat_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Top Controls */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '20px',
          display: 'flex',
          gap: '8px',
          zIndex: 10001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleDownload}
          className="icon-btn"
          title="Скачать изображение"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
          }}
        >
          <Download size={18} />
        </button>
        <button
          onClick={onClose}
          className="icon-btn"
          title="Закрыть (Esc)"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <img
          src={imageUrl}
          alt="Full preview"
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            userSelect: 'none',
          }}
        />
        {caption && (
          <div
            style={{
              marginTop: '12px',
              padding: '6px 16px',
              background: 'rgba(0, 0, 0, 0.6)',
              borderRadius: '16px',
              color: '#fff',
              fontSize: '13px',
              maxWidth: '80%',
              textAlign: 'center',
            }}
          >
            {caption}
          </div>
        )}
      </div>
    </div>
  );
};
