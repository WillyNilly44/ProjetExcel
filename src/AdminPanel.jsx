import React, { useState } from 'react';

export default function AdminPanel({ onLogout, adminNotes, setAdminNotes, thresholds, setThresholds }) {
  const [noteInput, setNoteInput] = useState('');
  const [localThresholds, setLocalThresholds] = useState(thresholds);

  const addNote = () => {
    if (noteInput.trim()) {
      setAdminNotes(prev => [...prev, noteInput.trim()]);
      setNoteInput('');
    }
  };

  const removeNote = (noteToRemove) => {
    setAdminNotes(prev => prev.filter(note => note !== noteToRemove));
  };

  const updateThresholds = () => {
    setThresholds(localThresholds);
    alert("Seuils mis à jour !");
  };

  const handleThresholdChange = (field, value) => {
    setLocalThresholds(prev => ({
      ...prev,
      [field]: Number(value)
    }));
  };

  return (
    <div style={{
      padding: 40,
      maxWidth: 800,
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Page de Gestion Admin</h2>

      {/* --- Notes --- */}
      <div style={{ marginBottom: 30 }}>
        <h3>Notes Admin</h3>
        <input
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Ajouter une note"
          style={{ padding: 5 }}
        />
        <button onClick={addNote} style={{ marginLeft: 10, padding: '5px 10px' }}>Ajouter</button>

        <ul>
          {adminNotes.map((note, idx) => (
            <li key={idx} style={{ marginTop: 5 }}>
              <span>{typeof note === 'object' ? note.note : note}</span>
              <button onClick={() => removeNote(note)} style={{
                marginLeft: 10,
                color: 'white',
                backgroundColor: '#dc3545',
                border: 'none',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer'
              }}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* --- Seuils Dashboard --- */}
      <div style={{
        border: '1px solid #ccc',
        borderRadius: 8,
        padding: 20,
        background: '#f9f9f9'
      }}>
        <h3>Seuils pour le Dashboard</h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <label>
            Maintenance (jaune) :
            <input
              type="number"
              value={localThresholds.maintenanceYellow}
              onChange={(e) => handleThresholdChange('maintenanceYellow', e.target.value)}
              style={{ marginLeft: 10 }}
            />
          </label>

          <label>
            Maintenance (rouge) :
            <input
              type="number"
              value={localThresholds.maintenanceRed}
              onChange={(e) => handleThresholdChange('maintenanceRed', e.target.value)}
              style={{ marginLeft: 10 }}
            />
          </label>

          <label>
            Incident (jaune) :
            <input
              type="number"
              value={localThresholds.incidentYellow}
              onChange={(e) => handleThresholdChange('incidentYellow', e.target.value)}
              style={{ marginLeft: 10 }}
            />
          </label>

          <label>
            Incident (rouge) :
            <input
              type="number"
              value={localThresholds.incidentRed}
              onChange={(e) => handleThresholdChange('incidentRed', e.target.value)}
              style={{ marginLeft: 10 }}
            />
          </label>

          <label>
            Impact :
            <input
              type="number"
              value={localThresholds.impact}
              onChange={(e) => handleThresholdChange('impact', e.target.value)}
              style={{ marginLeft: 10 }}
            />
          </label>
        </div>

        <button
          onClick={updateThresholds}
          style={{
            marginTop: 20,
            backgroundColor: '#007bff',
            color: 'white',
            padding: '6px 12px',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Enregistrer les seuils
        </button>
      </div>

      {/* --- Retour --- */}
      <button
        onClick={onLogout}
        style={{
          marginTop: 30,
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer'
        }}
      >
        🔓 Retourner
      </button>
    </div>
  );
}
