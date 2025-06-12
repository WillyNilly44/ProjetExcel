import React, { useState } from 'react';

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/.netlify/functions/verifyAdminPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const result = await response.json();
      
      if (response.ok && result.valid) {
        sessionStorage.setItem('admin', 'true');
        onLogin();
      } else {
        setError('❌ Incorrect password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('❌ Connection error');
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-box">
        <h2>🔐 Admin Login</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="admin-login-input"
          />

          <div className="button-group">
            <button type="submit" className="admin-login-button">Login</button>
            <button type="button" className="admin-login-button secondary" onClick={() => window.location.reload()}>
              Back
            </button>
          </div>
        </form>

        {error && <p className="admin-login-error">{error}</p>}
      </div>
    </div>
  );
}