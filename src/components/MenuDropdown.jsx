import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function MenuDropdown({ onAdminClick }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '8px 12px',
          backgroundColor: '#0056b3',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        📋 Menu
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          marginTop: '5px',
          minWidth: '160px'
        }}>
          <Link to="/" style={linkStyle}>🏠 Logs</Link>
          <Link to="/dashboard" style={linkStyle}>📊 Dashboard</Link>
          <button onClick={onAdminClick} style={{ ...linkStyle, background: 'none', border: 'none' }}>
            🔒 Admin
          </button>
        </div>
      )}
    </div>
  );
}

const linkStyle = {
  display: 'block',
  width: '100%',
  padding: '10px',
  textAlign: 'left',
  textDecoration: 'none',
  color: '#003366',
  backgroundColor: 'white',
  cursor: 'pointer'
};
