import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  hasInput = false,
  inputPlaceholder = 'Enter details...',
  inputValue = '',
  onInputChange,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={loading ? undefined : onCancel} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {isDanger && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger)'
              }}>
                <AlertTriangle size={18} />
              </div>
            )}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {message}
          </p>

          {hasInput && (
            <div>
              <input
                type="text"
                className="form-input"
                placeholder={inputPlaceholder}
                value={inputValue}
                onChange={(e) => onInputChange && onInputChange(e.target.value)}
                autoFocus
                disabled={loading}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-secondary btn-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn btn-sm ${isDanger ? 'btn-danger-solid' : 'btn-primary'}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
