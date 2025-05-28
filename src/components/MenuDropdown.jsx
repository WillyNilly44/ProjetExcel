import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function MenuDropdown({ onAdminClick }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

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
          <Link to="/">🏠 Logs</Link>
          <Link to="/dashboard">📊 Dashboard</Link>
          <button onClick={onAdminClick}>🔒 Admin</button>
        </div>
      )}
    </div>
  );
}
