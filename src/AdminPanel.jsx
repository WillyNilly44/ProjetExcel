import React from 'react';

export default function AdminPanel({ onLogout }) {
  return (
    <div style={{ padding: 40 }}>
      <h2>Page de Gestion Admin</h2>
      <button
        style={{
          marginTop: 20,
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer'
        }}
        onClick={onLogout}
      >
        🔓 Se déconnecter et retourner au menu principal
      </button>

      <div style={{ marginTop: 30 }}>
        <p>🔧 (À venir) Modifier colonnes visibles, préférences, etc.</p>
      </div>
    </div>
  );
}
