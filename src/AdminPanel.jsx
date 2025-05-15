import React, { useState } from 'react';

export default function AdminPanel({ onLogout, adminNotes, setAdminNotes }) {
    const [noteInput, setNoteInput] = useState('');


    const addNote = () => {
        if (noteInput.trim()) {
            setAdminNotes([...adminNotes, noteInput.trim()]);
            setNoteInput('');
        }
    };
    return (
        <div style={{ padding: 40 }}>
            <h2>Page de Gestion Admin</h2>

            <input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Ajouter une note" />
            <button onClick={addNote} style={{ marginLeft: 10 }}>Ajouter</button>

            <ul>
                {adminNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                ))}
            </ul>

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
                🔓 Retourner
            </button>
        </div>
    );
}

