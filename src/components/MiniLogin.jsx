import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MiniLogin = () => {
  const { user, login, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginStatus, setLoginStatus] = useState('');
  const dropdownRef = useRef(null);

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add session restoration message
  useEffect(() => {
    if (user && !isOpen) {
      // Check if this is a restored session
      const storedTimestamp = localStorage.getItem('logViewerUserTimestamp');
      if (storedTimestamp) {
        const sessionAge = Date.now() - parseInt(storedTimestamp);
        const minutesAgo = Math.floor(sessionAge / (1000 * 60));
        
        if (minutesAgo > 1) {
          setTimeout(() => setLoginStatus(''), 5000);
        }
      }
    }
  }, [user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await login(username.trim(), password);
      
      if (result.success) {
        setUsername('');
        setPassword('');
        setIsOpen(false);
        setTimeout(() => setLoginStatus(''), 3000);
      } else {
        setError(result.error || 'Login failed');
        setTimeout(() => setError(''), 5000);
      }
    } catch (error) {
      setError(`Login failed: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    setTimeout(() => setLoginStatus(''), 3000);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setUsername('');
    setPassword('');
    setError('');
  };

  if (isAuthenticated) {
    return (
      <div className="mini-login" ref={dropdownRef}>
        <div 
          className="mini-login-trigger authenticated"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="mini-login-icon">👤</span>
          <span className="mini-login-text">{user.name}</span>
          <span className="mini-login-level">{user.level_Name}</span>
          <span className="session-info" title="Session will expire in 24 hours">
            💾 Active
          </span>
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
        
        {loginStatus && (
          <div className={`login-status ${loginStatus.includes('restored') ? 'session-restored' : ''}`}>
            {loginStatus}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mini-login" ref={dropdownRef}>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="mini-form-input"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <div className="mini-login-actions">
              <button 
                type="submit" 
                className="mini-login-btn"
                disabled={isLoading}
              >
                {isLoading ? '⏳ Signing in...' : '🔑 Sign In'}
              </button>
              <button
                type="button"
                className="login-cancel"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loginStatus && (
        <div className={`login-status ${loginStatus.includes('restored') ? 'session-restored' : ''}`}>
          {loginStatus}
        </div>
      )}
    </div>
  );
};

export default MiniLogin;