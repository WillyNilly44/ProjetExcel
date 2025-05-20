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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: 20 }}>
                {Object.keys(form).map((key) => (
                    <input
                        key={key}
                        type={
                            key.includes('date') ? 'date' :
                                key.includes('start') || key.includes('end') || key.includes('time') ? 'time' :
                                    'text'
                        }
                        step={
                            key.includes('start') || key.includes('end') || key.includes('time') ? '900' : undefined
                        }
                        placeholder={fieldLabels[key] || key}
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
