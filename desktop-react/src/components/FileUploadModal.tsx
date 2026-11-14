import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Image as ImageIcon, Eye, EyeOff, Music } from 'lucide-react';

interface FileUploadModalProps {
  onClose: () => void;
  onUpload: (data: {
    type: 'photo' | 'file' | 'audio' | 'video';
    url: string;
    fileName: string;
    fileSize: number;
    caption: string;
    isSpoiler: boolean;
  }) => void;
  initialFiles?: FileList | File[] | null;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ onClose, onUpload, initialFiles }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(() => {
    if (initialFiles && initialFiles.length > 0) {
      return initialFiles[0];
    }
    return null;
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const file = initialFiles[0];
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }, [initialFiles]);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSend = () => {
    if (!selectedFile) return;

    const isImage = selectedFile.type.startsWith('image/');
    const isAudio = selectedFile.type.startsWith('audio/');
    const isVideo = selectedFile.type.startsWith('video/');

    const type = isImage ? 'photo' : isAudio ? 'audio' : isVideo ? 'video' : 'file';

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onUpload({
        type,
        url: dataUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        caption: caption.trim(),
        isSpoiler: isSpoiler && isImage,
      });
      onClose();
    };
    reader.readAsDataURL(selectedFile);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: '460px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">Отправить файл или фото</div>
          <button className="icon-btn sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '2px dashed var(--acc)' : '2px dashed var(--border)',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'var(--hover)' : 'rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(91,143,185,0.15)',
                  color: 'var(--acc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Upload size={24} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--text)' }}>
                Нажмите для выбора или перетащите сюда
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                Фотографии, видео, аудиозаписи или документы любого типа
              </div>
            </div>
          ) : (
            <div>
              {/* Image Preview or File Icon */}
              {previewUrl ? (
                <div style={{ position: 'relative', marginBottom: '14px', borderRadius: '12px', overflow: 'hidden' }}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{
                      width: '100%',
                      maxHeight: '260px',
                      objectFit: 'cover',
                      display: 'block',
                      filter: isSpoiler ? 'blur(16px)' : 'none',
                      transition: 'filter 0.2s',
                    }}
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'var(--card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      background: 'rgba(91,143,185,0.15)',
                      color: 'var(--acc)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedFile.type.startsWith('audio/') ? <Music size={20} /> : <FileText size={20} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>
                      {formatSize(selectedFile.size)}
                    </div>
                  </div>
                  <button
                    className="icon-btn sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Spoiler Option for Images */}
              {previewUrl && (
                <div
                  onClick={() => setIsSpoiler(!isSpoiler)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '14px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '13px',
                    color: isSpoiler ? 'var(--acc)' : 'var(--text2)',
                  }}
                >
                  {isSpoiler ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>Скрыть фото под спойлер</span>
                </div>
              )}

              {/* Caption */}
              <div className="form-group">
                <label className="form-label">Подпись к файлу (необязательно)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Добавьте комментарий к файлу..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary" disabled={!selectedFile} onClick={handleSend}>
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
};
