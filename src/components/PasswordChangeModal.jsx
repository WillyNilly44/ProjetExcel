import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PasswordChangeModal = ({ isOpen, onClose, isRequired = false }) => {
  const { changePassword, user, setMustChangePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 4) {
      setError('New password must be at least 4 characters long');
      return;
    }

    if (formData.newPassword.length > 25) {
      setError('New password must be 25 characters or less');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const result = await changePassword(formData.currentPassword, formData.newPassword);
      
      if (result.success) {
        setSuccess('Password changed successfully!');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        
        // If this was a required password change, close the modal after a short delay
        if (isRequired) {
          setTimeout(() => {
            setMustChangePassword(false);
          }, 1500);
        } else if (onClose) {
          setTimeout(onClose, 1500);
        }
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isRequired) {
      // If password change is required, don't allow cancellation
      setError('You must change your password to continue');
      return;
    }
    
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError('');
    setSuccess('');
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isRequired ? 'required-modal' : ''}`}>
      <div className="modal-content password-change-modal">
        <div className="modal-header">
          <h3>
            🔐 {isRequired ? 'Password Change Required' : 'Change Password'}
          </h3>
          {!isRequired && (
            <button 
              onClick={handleCancel}
              className="modal-close"
              disabled={loading}
            >
              ✕
            </button>
          )}
        </div>

        {isRequired && (
          <div className="required-notice">
            <p>⚠️ You must change your password before continuing.</p>
            <p>Your current password is temporary and needs to be updated.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password: *</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              className="form-input"
              required
              autoComplete="current-password"
              placeholder="Enter your current password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password: *</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className="form-input"
              required
              autoComplete="new-password"
              placeholder="Enter your new password"
              minLength="8"
              maxLength="25"
              disabled={loading}
            />
            <small className="form-hint">
              Password must be 8-25 characters long
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password: *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="form-input"
              required
              autoComplete="new-password"
              placeholder="Confirm your new password"
              minLength="8"
              maxLength="25"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="alert alert-error">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              ✅ {success}
            </div>
          )}

          <div className="modal-footer">
            {!isRequired && (
              <button 
                type="button" 
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>

        <div className="user-info">
          <small>Logged in as: <strong>{user?.name} ({user?.username})</strong></small>
        </div>
      </div>
    </div>
  );
};

export default PasswordChangeModal;