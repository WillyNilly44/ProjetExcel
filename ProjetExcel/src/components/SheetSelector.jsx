import React from 'react';

export default function SheetSelector({ sheetNames, selectedSheet, onSelect }) {
  return (
    <select
      value={selectedSheet}
      onChange={(e) => onSelect(e.target.value)}
      style={{ marginBottom: '20px' }}
    >
      {sheetNames.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );
}