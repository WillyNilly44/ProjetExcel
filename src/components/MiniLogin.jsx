import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MiniLogin = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password'); 
      return;
    }

    const result = await login(username.trim(), password);
    
    if (result.success) {
      setIsOpen(false);
      setUsername('');
      setPassword('');
      setError('');
    } else {
      setError(result.error);
    }
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (isAuthenticated) {
    // Show user info when logged in
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
                <div className="mini-user-username">@{user.username}</div>
                <div className="mini-user-level">{user.level_Name}</div>
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

  // Show login form when not authenticated
  return (
    <div className="mini-login">
      <button 
        className="mini-login-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mini-login-icon">🔓</span>
        <span className="mini-login-text">Login</span>
      </button>

      {isOpen && (
        <div className="mini-login-dropdown">
          <div className="mini-login-header">
            <h4>🔐 Staff Login</h4>
            <button 
              className="mini-login-close"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mini-login-form">
            {error && (
              <div className="mini-login-error">
                ⚠️ {error}
              </div>
            )}

            <div className="mini-form-group">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="mini-form-input"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="mini-form-group">
              <div className="mini-password-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="mini-form-input"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="mini-password-toggle"
                  disabled={isLoading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="mini-login-submit"
            >
              {isLoading ? '⏳' : '🚀'} Sign In
            </button>
          </form>

          <div className="mini-login-info">
            <small>Login to access advanced tools</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniLogin;