import React, { useState } from 'react';

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (password === 'admin') {
      sessionStorage.setItem('admin', 'true');
      onLogin();
    } else {
      setError('❌ Mot de passe incorrect');
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-box">
        <h2>🔐 Connexion Admin</h2>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="admin-login-input"
        />

        <button onClick={handleLogin} className="admin-login-button">
          Connexion
        </button>

        <button onClick={() => window.location.reload()} className="admin-login-button">
          Retourner
        </button>

        {error && (
          <p className="admin-login-error">{error}</p>
        )}
      </div>
    </div>
  );
}
