import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MiniLogin = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();

  const handleSSOLogin = async () => {
    setError('');
    
    try {
      const result = await login();
      
      if (result.success) {
        setIsOpen(false);
        setError('');
      } else {
        setError(result.error || 'SSO login failed');
      }
    } catch (error) {
      console.error('SSO Login error:', error);
      setError('SSO login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (isAuthenticated) {
    return (
      <div className="mini-login">
        <div 
          className="mini-login-trigger authenticated"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="mini-login-icon">👤</span>
          <span className="mini-login-text">{user.name}</span>
          <span className="mini-login-level">{user.level_Name}</span>
        </div>

        {isOpen && (
          <div className="mini-login-dropdown">
            <div className="mini-login-header">
              <div className="mini-user-info">
                <div className="mini-user-name">{user.name}</div>
                <div className="mini-user-username">{user.email}</div>
                <div className="mini-user-level">Level: {user.level_Name}</div>
                {user.department && (
                  <div className="mini-user-department" style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {user.department} • {user.jobTitle}
                  </div>
                )}
              </div>
            </div>
            <div className="mini-login-actions">
              <button onClick={handleLogout} className="mini-logout-btn">
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mini-login">
      <button 
        className="mini-login-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span className="mini-login-icon">{isLoading ? '⏳' : '🔓'}</span>
        <span className="mini-login-text">{isLoading ? 'Loading...' : 'Login'}</span>
      </button>

      {isOpen && (
        <div className="mini-login-dropdown">
          <div className="mini-login-header">
            <h4>🏢 Company Login</h4>
            <button 
              className="mini-login-close"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="mini-login-form">
            {error && (
              <div className="mini-login-error">
                ⚠️ {error}
              </div>
            )}

            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '16px',
                color: '#0078d4'
              }}>
                🚀
              </div>
              <p style={{ 
                marginBottom: '20px', 
                color: '#6b7280',
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
                Sign in with your company Microsoft account to access the dashboard.
              </p>
              
              <button
                onClick={handleSSOLogin}
                disabled={isLoading}
                className="mini-login-submit"
                style={{
                  width: '100%',
                  backgroundColor: '#0078d4',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {isLoading ? '⏳ Connecting...' : '🔐 Sign in with Microsoft'}
              </button>
            </div>
          </div>

          <div className="mini-login-info">
            <small>Secure authentication via Microsoft Azure AD</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniLogin;