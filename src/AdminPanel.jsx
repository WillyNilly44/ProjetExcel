import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function AdminPanel({ onLogout, adminNotes, setAdminNotes }) {
  const [form, setForm] = useState({
    "Incident": '', "District": '', "Date": '', "Maint.(event)": '', "Incid.(Event)": '',
    "Business impact": '', "RCA": '', "Est.(Duration (hrs))": '', "Start(Duration (hrs))": '',
    "End(Duration (hrs))": '', "Real time(Duration (hrs))": '', "Ticket #": '', "Assigned": '', "Note": ''
  });

  // Chargement initial depuis Supabase
  useEffect(() => {
    const fetchNotes = async () => {
      const { data, error } = await supabase.from('admin_notes').select('*');
      if (!error && data) setAdminNotes(data);
    };
    fetchNotes();
  }, [setAdminNotes]);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const addNote = async () => {
    if (!form["Date"] && !form["Note"]) return;
    const { data, error } = await supabase.from('admin_notes').insert([{ ...form, Type: 'AdminNote' }]).select();
    if (!error && data) {
      setAdminNotes(prev => [...prev, ...data]);
      setForm({
        "Incident": '', "District": '', "Date": '', "Maint.(event)": '', "Incid.(Event)": '',
        "Business impact": '', "RCA": '', "Est.(Duration (hrs))": '', "Start(Duration (hrs))": '',
        "End(Duration (hrs))": '', "Real time(Duration (hrs))": '', "Ticket #": '', "Assigned": '', "Note": ''
      });
    }
  };

  const removeNote = async (id) => {
    const { error } = await supabase.from('admin_notes').delete().eq('id', id);
    if (!error) {
      setAdminNotes(adminNotes.filter(note => note.id !== id));
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Page de Gestion Admin</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: 20 }}>
        {Object.keys(form).map((key) => (
          <input
            key={key}
            placeholder={key}
            value={form[key]}
            onChange={handleChange(key)}
            style={{ flex: '1 1 200px' }}
          />
        ))}
      </div>

      <button onClick={addNote}>Ajouter</button>

      <h3 style={{ marginTop: 20 }}>Entrées Admin</h3>
      <ul>
        {adminNotes.map((note, idx) => (
          <li key={note.id || idx} style={{ marginBottom: 5 }}>
            <span>
              📌 <strong>{note["Note"]}</strong> — {note["Date"]} — {note["Incident"]} — {note["District"]} — {note["Assigned"]}
            </span>
            <button
              onClick={() => removeNote(note.id)}
              style={{
                marginLeft: 10,
                color: 'white',
                backgroundColor: '#dc3545',
                border: 'none',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer'
              }}
            >
              Supprimer
            </button>
          </li>
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