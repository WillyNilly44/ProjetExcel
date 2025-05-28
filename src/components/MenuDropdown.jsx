import React, { useState, useEffect, useRef } from 'react';

export default function MenuDropdown({ onAdminClick }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Fermer quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="menu-dropdown" ref={menuRef}>
      <button onClick={() => setOpen(!open)}>📋 Menu</button>
      {open && (
        <div className="menu-dropdown-content">
          <a href="/">🏠 Logs</a>
          <a href="/DashboardPage">📊 Dashboard</a>
          <button onClick={onAdminClick}>🔒 Admin</button>
        </div>
      )}
    </div>
  );
}
