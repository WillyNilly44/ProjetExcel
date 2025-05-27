import React, { useState } from 'react';

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
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

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="admin-login-input"
          />

          <div className="button-group">
            <button type="submit" className="admin-login-button">Connexion</button>
            <button type="button" className="admin-login-button secondary" onClick={() => window.location.reload()}>
              Retourner
            </button>
          </div>
        </form>


        {error && <p className="admin-login-error">{error}</p>}
      </div>
    </div>
  );
}