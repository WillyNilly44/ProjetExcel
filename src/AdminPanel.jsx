import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function AdminPanel({ onLogout, adminNotes, setAdminNotes, thresholds, setThresholds }) {
  const [form, setForm] = useState({
    incident: '', district: '', date: '', maint_event: '', incid_event: '',
    business_impact: '', rca: '', est_duration_hrs: '', start_duration_hrs: '',
    end_duration_hrs: '', real_time_duration_hrs: '', ticket_number: '', assigned: '', note: ''
  });

  const [localThresholds, setLocalThresholds] = useState(thresholds);

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

  const handleThresholdChange = (field) => (e) => {
    setLocalThresholds(prev => ({
      ...prev,
      [field]: Number(e.target.value)
    }));
  };

  const updateThresholds = async () => {
    const { error } = await supabase.from('dashboard_thresholds').insert([{ ...localThresholds }]);
    if (!error) {
      setThresholds(localThresholds);
      alert("Seuils enregistrés dans Supabase !");
    } else {
      console.error("Erreur Supabase :", error.message);
      alert("Échec de l'enregistrement.");
    }
  };

  const addNote = async () => {
    if (!form.date && !form.note) return;

    const { data, error } = await supabase
      .from('admin_notes')
      .insert([{ ...form, type: 'AdminNote' }])
      .select();

    if (!error && data) {
      setAdminNotes(prev => [...prev, ...data]);
      setForm({
        incident: '', district: '', date: '', maint_event: '', incid_event: '',
        business_impact: '', rca: '', est_duration_hrs: '', start_duration_hrs: '',
        end_duration_hrs: '', real_time_duration_hrs: '', ticket_number: '', assigned: '', note: ''
      });
    }
  };

  const removeNote = async (id) => {
    const { error } = await supabase.from('admin_notes').delete().eq('id', id);
    if (!error) {
      setAdminNotes(prev => prev.filter(note => note.id !== id));
    }
  };

  return (
    <div className="admin-panel">
      <h2>Page de Gestion Admin</h2>

      <div className="thresholds-box">
        <h3>🎛 Modifier les seuils du Dashboard</h3>
        <div className="form-grid">
          {[
            ['maintenance_yellow', 'Maintenance (jaune)'],
            ['maintenance_red', 'Maintenance (rouge)'],
            ['incident_yellow', 'Incident (jaune)'],
            ['incident_red', 'Incident (rouge)'],
            ['impact', 'Impact (seuil)']
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                value={localThresholds[key]}
                onChange={handleThresholdChange(key)}
              />
            </label>
          ))}
        </div>
        <button className="primary-button" onClick={updateThresholds}>💾 Enregistrer les seuils</button>
      </div>

      <div className="admin-form-container">
        <h3>➕ Ajouter une entrée admin</h3>

        <div className="form-section">
          <h4>Identification</h4>
          <div className="form-grid">
            <label>Incident<input type="text" value={form.incident} onChange={handleChange('incident')} /></label>
            <label>District<input type="text" value={form.district} onChange={handleChange('district')} /></label>
            <label>Ticket #<input type="text" value={form.ticket_number} onChange={handleChange('ticket_number')} /></label>
            <label>Assigné à<input type="text" value={form.assigned} onChange={handleChange('assigned')} /></label>
          </div>
        </div>

        <div className="form-section">
          <h4>Horaire</h4>
          <div className="form-grid">
            <label>Date<input type="date" value={form.date} onChange={handleChange('date')} /></label>
            <label>Début<input type="time" value={form.start_duration_hrs} onChange={handleChange('start_duration_hrs')} /></label>
            <label>Fin<input type="time" value={form.end_duration_hrs} onChange={handleChange('end_duration_hrs')} /></label>
          </div>
        </div>

        <div className="form-section">
          <h4>Durées</h4>
          <div className="form-grid">
            <label>Estimée (h)<input type="text" value={form.est_duration_hrs} onChange={handleChange('est_duration_hrs')} /></label>
            <label>Réelle (h)<input type="text" value={form.real_time_duration_hrs} onChange={handleChange('real_time_duration_hrs')} /></label>
          </div>
        </div>

        <div className="form-section">
          <h4>Détails</h4>
          <div className="form-grid">
            <label>Maintenance<input type="text" value={form.maint_event} onChange={handleChange('maint_event')} /></label>
            <label>Incident<input type="text" value={form.incid_event} onChange={handleChange('incid_event')} /></label>
            <label>Impact business<input type="text" value={form.business_impact} onChange={handleChange('business_impact')} /></label>
            <label>RCA<input type="text" value={form.rca} onChange={handleChange('rca')} /></label>
          </div>
        </div>

        <div className="form-section">
          <h4>Résumé / Note</h4>
          <input type="text" value={form.note} onChange={handleChange('note')} className="admin-note-field" />
        </div>

        <button className="primary-button" onClick={addNote}>➕ Ajouter l'entrée</button>
      </div>

      <h3>Entrées Admin</h3>
      <ul className="admin-note-list">
        {adminNotes.map((note, idx) => (
          <li key={note.id || idx}>
            📌 <strong>{note.note}</strong> — {note.date} — {note.incident} — {note.district} — {note.assigned}
            <button className="danger-button" onClick={() => removeNote(note.id)}>Supprimer</button>
          </li>
        ))}
      </ul>

      <button className="danger-button" onClick={onLogout}>
        🔓 Retourner
      </button>
    </div>
  );
}
