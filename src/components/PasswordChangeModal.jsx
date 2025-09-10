import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PasswordChangeModal = ({ isOpen, onClose, isRequired = false }) => {
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  // Calculate password strength
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength('');
      return;
    }

    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[a-z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;

    if (strength <= 2) setPasswordStrength('weak');
    else if (strength === 3) setPasswordStrength('fair');
    else if (strength === 4) setPasswordStrength('good');
    else setPasswordStrength('strong');
  }, [newPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 25) {
      setError('Password must be 8-25 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setSuccess('Password changed successfully!');
        setTimeout(() => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setError('');
          setSuccess('');
          if (onClose && !isRequired) {
            onClose();
          }
        }, 2000);
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setError('Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isRequired && onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="password-modal-overlay">
      <div className="password-modal-content">
        {/* Header */}
        <div className="password-modal-header">
          <h3>
            🔐 Password Change {isRequired ? 'Required' : ''}
          </h3>
          {!isRequired && (
            <button 
              className="password-modal-close"
              onClick={handleClose}
              type="button"
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div className="password-modal-body">
          {/* Description */}
          <div className={`password-change-description ${isRequired ? 'required' : ''}`}>
            <strong>⚠️ {isRequired ? 'You must change your password before continuing.' : 'Update your password'}</strong>
            <br />
            Your current password is temporary and needs to be updated.
          </div>

          {/* Form */}
          <form className="password-change-form" onSubmit={handleSubmit}>
            {/* Current Password */}
            <div className="password-form-group">
              <label className="password-form-label">
                Current Password: *
              </label>
              <input
                type="password"
                className="password-form-input"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {/* New Password */}
            <div className="password-form-group">
              <label className="password-form-label">
                New Password: *
              </label>
              <input
                type="password"
                className={`password-form-input ${newPassword && passwordStrength === 'strong' ? 'success' : ''}`}
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              
              {/* Password Requirements */}
              <div className="password-requirements">
                <div className="password-requirements-title">Password Requirements:</div>
                <ul className="password-requirements-list">
                  <li className={`password-requirement-item ${newPassword.length >= 8 && newPassword.length <= 25 ? 'met' : ''}`}>
                    <span className="password-requirement-icon">
                      {newPassword.length >= 8 && newPassword.length <= 25 ? '✅' : '❌'}
                    </span>
                    8-25 characters long
                  </li>
                  <li className={`password-requirement-item ${/[A-Z]/.test(newPassword) ? 'met' : ''}`}>
                    <span className="password-requirement-icon">
                      {/[A-Z]/.test(newPassword) ? '✅' : '❌'}
                    </span>
                    At least one uppercase letter
                  </li>
                  <li className={`password-requirement-item ${/[a-z]/.test(newPassword) ? 'met' : ''}`}>
                    <span className="password-requirement-icon">
                      {/[a-z]/.test(newPassword) ? '✅' : '❌'}
                    </span>
                    At least one lowercase letter
                  </li>
                  <li className={`password-requirement-item ${/[0-9]/.test(newPassword) ? 'met' : ''}`}>
                    <span className="password-requirement-icon">
                      {/[0-9]/.test(newPassword) ? '✅' : '❌'}
                    </span>
                    At least one number
                  </li>
                </ul>
              </div>

              {/* Password Strength */}
              {newPassword && (
                <div className="password-strength">
                  <div className="password-strength-label">Password Strength:</div>
                  <div className="password-strength-bar">
                    <div className={`password-strength-fill ${passwordStrength}`}></div>
                  </div>
                  <div className={`password-strength-text ${passwordStrength}`}>
                    {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="password-form-group">
              <label className="password-form-label">
                Confirm New Password: *
              </label>
              <input
                type="password"
                className={`password-form-input ${
                  confirmPassword && newPassword === confirmPassword ? 'success' : 
                  confirmPassword && newPassword !== confirmPassword ? 'error' : ''
                }`}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="password-error">
                <span>❌</span>
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="password-success">
                <span>✅</span>
                {success}
              </div>
            )}

            {/* Footer */}
            <div className="password-modal-footer">
              {!isRequired && (
                <button
                  type="button"
                  className="password-btn password-btn-secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className={`password-btn password-btn-primary ${isLoading ? 'password-btn-loading' : ''}`}
                disabled={isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              >
                {isLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>

          {/* User Info */}
          {user && (
            <div style={{ 
              marginTop: '1rem', 
              fontSize: '0.75rem', 
              color: '#94a3b8', 
              textAlign: 'center' 
            }}>
              Logged in as: <strong>{user.name} ({user.username})</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordChangeModal;