import React from 'react';

export default function AdminPanel() {
    <button onClick={() => {
  localStorage.removeItem('admin');
  window.location.href = "/";
}}>Se déconnecter</button>

  return (
    <div style={{ padding: 40 }}>
      <h2>Page de Gestion</h2>
      <p>Ajoute ici des options admin : choix des colonnes à afficher, préférences, etc.</p>
    </div>
  );
}
