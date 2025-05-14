import React, { useState } from 'react';

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (password === 'tonMotDePasseSecret') {
      localStorage.setItem('admin', 'true');
      onLogin();
    } else {
      alert('Mot de passe incorrect');
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Connexion Admin</h2>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
      />
      <button onClick={handleLogin}>Connexion</button>
    </div>
  );
}
