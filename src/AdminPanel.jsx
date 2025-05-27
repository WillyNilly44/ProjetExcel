
import React, { useEffect, useState } from 'react';
import FileUpload from './components/FileUpload';

export default function AdminPanel({ onLogout, adminNotes, setAdminNotes, thresholds, setThresholds, setExportColumns }) {
    const [form, setForm] = useState({
        incident: '', district: '', weekday: '', maint_event: '', incid_event: '',
        business_impact: '', rca: '', est_duration_hrs: '', start_duration_hrs: '',
        end_duration_hrs: '', real_time_duration_hrs: '', ticket_number: '',
        assigned: '', note: '', log_type: ''
    });

    const [exportColumnsLocal, setExportColumnsLocal] = useState([]);
    const allPossibleColumns = [
        "No", "Ticket #", "Assigned", "Note", "Date+Start", "Acc. time", "District",
        "Incident", "Event", "RCA", "Business impact ?", "Start", "End", "Status"
    ];

    const toggleColumn = (col) => {
        const updated = exportColumnsLocal.includes(col)
            ? exportColumnsLocal.filter(c => c !== col)
            : [...exportColumnsLocal, col];
        setExportColumnsLocal(updated);
        setExportColumns(updated);
    };


    useEffect(() => {
        const saveExportColumns = async () => {
            await fetch('/.netlify/functions/saveExportColumns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ columns: exportColumnsLocal })
            });
        };

        if (exportColumnsLocal.length > 0) {
            saveExportColumns();
        }
    }, [exportColumnsLocal]);


    useEffect(() => {
        const fetchExportColumns = async () => {
            const res = await fetch('/.netlify/functions/getExportColumns');
            const result = await res.json();
            if (res.ok && Array.isArray(result.columns)) {
                setExportColumns(result.columns);       
                setExportColumnsLocal(result.columns);   
            }

        };
        fetchExportColumns();
    }, []);


    const [localThresholds, setLocalThresholds] = useState(thresholds);

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
        if (!form.weekday && !form.note) return;

        const response = await fetch('/.netlify/functions/addNote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });

        const result = await response.json();

        if (response.ok) {
            setAdminNotes(prev => [...prev, ...result.data]);
            setForm({
                incident: '', district: '', weekday: '', maint_event: '', incid_event: '',
                business_impact: '', rca: '', est_duration_hrs: '', start_duration_hrs: '',
                end_duration_hrs: '', real_time_duration_hrs: '', ticket_number: '', assigned: '', note: '', log_type: ''
            });
        } else {
            console.error("Erreur backend :", result.error);
            alert("Erreur lors de l'ajout de la note");
        }
    };

    const removeNote = async (id) => {
        const res = await fetch('/.netlify/functions/deleteAdminNote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        const result = await res.json();
        if (res.ok) {
            setAdminNotes(prev => prev.filter(note => note.id !== id));
        } else {
            console.error("Erreur suppression :", result.error);
            alert("Échec de la suppression de la note.");
        }
    };

    return (
        <div className="admin-panel">
            <h2>Page de Gestion Admin</h2>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button className="danger-button" onClick={onLogout}>🔓 Retourner</button>
            </div>

            <div className="upload-box">
                <h3>📤 Upload d'un fichier Excel</h3>
                <FileUpload onDataLoaded={() => alert("File uploaded!")} />
            </div>

            <div className="export-columns-box">
                <h4>Colonnes à exporter :</h4>
                <div className="export-columns-grid">
                    {allPossibleColumns.map(col => (
                        <label key={col}>
                            <input
                                type="checkbox"
                                checked={exportColumnsLocal.includes(col)}
                                onChange={() => toggleColumn(col)}
                            />
                            {col}
                        </label>
                    ))}
                </div>
            </div>

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
                        <label>
                            Récurrence
                            <select value={form.weekday} onChange={handleChange('weekday')}>
                                <option value="">— Sélectionner —</option>
                                <option value="Monday">Lundi</option>
                                <option value="Tuesday">Mardi</option>
                                <option value="Wednesday">Mercredi</option>
                                <option value="Thursday">Jeudi</option>
                                <option value="Friday">Vendredi</option>
                                <option value="Saturday">Samedi</option>
                                <option value="Sunday">Dimanche</option>
                            </select>
                        </label>

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
                        <select
                            value={form.log_type}
                            onChange={(e) => setForm({ ...form, log_type: e.target.value })}
                        >
                            <option value="application">Application</option>
                            <option value="operational">Operational</option>
                        </select>
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
                        📌 <strong>{note.note}</strong> — {note.weekday} — {note.incident} — {note.district} — {note.assigned}
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
