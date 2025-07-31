import React, { useState } from 'react';

const AdminPasswordModal = ({ isOpen, onClose, onAuthenticate, title = "Admin Authentication Required" }) => {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const success = await onAuthenticate(password);
      if (success) {
        setPassword('');
        onClose();
      } else {
        setError('Invalid admin password');
      }
    } catch (error) {
      setError('Authentication failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="admin-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-icon">🔐</div>
          <div className="admin-modal-title">
            <h3>{title}</h3>
            <p>Enter admin password to continue</p>
          </div>
          <button onClick={handleClose} className="admin-close-btn">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-form">
          <div className="admin-password-field">
            <label htmlFor="adminPassword" className="admin-label">
              Admin Password
            </label>
            <input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`admin-password-input ${error ? 'error' : ''}`}
              placeholder="Enter admin password"
              autoFocus
              disabled={isSubmitting}
            />
            {error && (
              <div className="admin-error">
                ❌ {error}
              </div>
            )}
          </div>

          <div className="admin-modal-actions">
            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="admin-btn primary"
            >
              {isSubmitting ? '🔐 Authenticating...' : '🔓 Authenticate'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="admin-btn secondary"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="admin-modal-footer">
          <div className="admin-security-note">
            🛡️ This action requires administrator privileges
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPasswordModal;