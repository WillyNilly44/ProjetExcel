import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#222', padding: 20, borderRadius: 10,
        width: '90%', maxWidth: 700, maxHeight: '90%', overflowY: 'auto',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3>{title}</h3>
          <button onClick={onClose} style={{ fontSize: 18, cursor: 'pointer' }}>✖</button>
        </div>
        {children}
      </div>
    </div>
  );
}
