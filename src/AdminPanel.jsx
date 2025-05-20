// === AdminPanel.jsx ===
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function AdminPanel({ onLogout, adminNotes, setAdminNotes }) {
    const [form, setForm] = useState({
        incident: '', district: '', date: '', maint_event: '', incid_event: '',
        business_impact: '', rca: '', est_duration_hrs: '', start_duration_hrs: '',
        end_duration_hrs: '', real_time_duration_hrs: '', ticket_number: '', assigned: '', note: ''
    });
    const fieldLabels = {
        incident: "Incident",
        district: "District",
        date: "Date",
        maint_event: "Maintenance (événement)",
        incid_event: "Incident (événement)",
        business_impact: "Impact business",
        rca: "RCA",
        est_duration_hrs: "Estimation durée (h)",
        start_duration_hrs: "Début (heure)",
        end_duration_hrs: "Fin (heure)",
        real_time_duration_hrs: "Durée réelle (h)",
        ticket_number: "Ticket #",
        assigned: "Assigné à",
        note: "Résumé / Note"
    };


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
        if (!form.date && !form.note) return;
        const { data, error } = await supabase.from('admin_notes').insert([{ ...form, type: 'AdminNote' }]).select();
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
            setAdminNotes(adminNotes.filter(note => note.id !== id));
        }
    };

    return (
        <div style={{ padding: 40 }}>
            <h2>Page de Gestion Admin</h2>

            <div style={{
                border: '1px solid #ccc',
                borderRadius: '10px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                maxWidth: 1000,
                marginBottom: 30
            }}>
                <h3>➕ Ajouter une entrée admin</h3>

                <div className="form-section">
                    <h4>Identification</h4>
                    <div className="form-grid">
                        <label>
                            Incident
                            <input type="text" value={form.incident} onChange={handleChange('incident')} />
                        </label>
                        <label>
                            District
                            <input type="text" value={form.district} onChange={handleChange('district')} />
                        </label>
                        <label>
                            Ticket #
                            <input type="text" value={form.ticket_number} onChange={handleChange('ticket_number')} />
                        </label>
                        <label>
                            Assigné à
                            <input type="text" value={form.assigned} onChange={handleChange('assigned')} />
                        </label>
                    </div>
                </div>
                <div className="form-section">
                    <h4>Horaire</h4>
                    <div className="form-grid">
                        <label>
                            Date
                            <input type="date" value={form.date} onChange={handleChange('date')} />
                        </label>
                        <label>
                            Début (heure)
                            <input type="time" step="900" value={form.start_duration_hrs} onChange={handleChange('start_duration_hrs')} />
                        </label>
                        <label>
                            Fin (heure)
                            <input type="time" step="900" value={form.end_duration_hrs} onChange={handleChange('end_duration_hrs')} />
                        </label>
                    </div>
                </div>
                <div className="form-section">
                    <h4>Durées</h4>
                    <div className="form-grid">
                        <label>
                            Estimée (h)
                            <input type="text" value={form.est_duration_hrs} onChange={handleChange('est_duration_hrs')} />
                        </label>
                        <label>
                            Réelle (h)
                            <input type="text" value={form.real_time_duration_hrs} onChange={handleChange('real_time_duration_hrs')} />
                        </label>
                    </div>
                </div>
                <div className="form-section">
                    <h4>Détails supplémentaires</h4>
                    <div className="form-grid">
                        <label>
                            Maintenance (événement)
                            <input type="text" value={form.maint_event} onChange={handleChange('maint_event')} />
                        </label>
                        <label>
                            Incident (événement)
                            <input type="text" value={form.incid_event} onChange={handleChange('incid_event')} />
                        </label>
                        <label>
                            Impact business
                            <input type="text" value={form.business_impact} onChange={handleChange('business_impact')} />
                        </label>
                        <label>
                            RCA
                            <input type="text" value={form.rca} onChange={handleChange('rca')} />
                        </label>
                    </div>
                </div>

                <div className="form-section">
                    <h4>Note</h4>
                    <div className="form-grid">
                        <label>
                            Résumé / Note
                            <input type="text" value={form.note} onChange={handleChange('note')} />
                        </label>
                    </div>
                </div>

                <button onClick={addNote} style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                }}>
                    ➕ Ajouter l'entrée
                </button>
            </div>



            <h3 style={{ marginTop: 20 }}>Entrées Admin</h3>
            <ul>
                {adminNotes.map((note, idx) => (
                    <li key={note.id || idx} style={{ marginBottom: 5 }}>
                        <span>
                            📌 <strong>{note.note}</strong> — {note.date} — {note.incident} — {note.district} — {note.assigned}
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
