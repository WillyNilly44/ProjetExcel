import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    const result = await login(username.trim(), password);
    
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">🔐 Log Entries System</h1>
          <p className="login-subtitle">Please sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              👤 Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="form-input"
              disabled={isLoading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              🔑 Password
            </label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input password-input"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                disabled={isLoading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !username.trim() || !password.trim()}
            className="login-button"
          >
            {isLoading ? '⏳ Signing in...' : '🚀 Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <div className="demo-accounts">
            <h4>Demo Accounts:</h4>
            <div className="demo-grid">
              <div className="demo-account">
                <strong>Administrator:</strong> william / admin123
              </div>
              <div className="demo-account">
                <strong>Manager:</strong> sarah / manager456
              </div>
              <div className="demo-account">
                <strong>Operator:</strong> mike / operator789
              </div>
              <div className="demo-account">
                <strong>Viewer:</strong> lisa / viewer321
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;