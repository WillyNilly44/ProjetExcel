import React, { useEffect, useState, useCallback, useMemo } from 'react';
import FileUpload from './components/FileUpload';
import Modal from './components/Modal';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const INITIAL_FORM_STATE = {
  incident: '', district: '', weekday: '', maint_event: '', incid_event: '',
  business_impact: '', rca: '', est_duration_hrs: '', start_duration_hrs: '',
  end_duration_hrs: '', real_time_duration_hrs: '', ticket_number: '',
  assigned: '', note: '', log_type: 'application'
};

const WEEKDAY_OPTIONS = [
  { value: '', label: '— Sélectionner —' },
  { value: 'Monday', label: 'Lundi' },
  { value: 'Tuesday', label: 'Mardi' },
  { value: 'Wednesday', label: 'Mercredi' },
  { value: 'Thursday', label: 'Jeudi' },
  { value: 'Friday', label: 'Vendredi' },
  { value: 'Saturday', label: 'Samedi' },
  { value: 'Sunday', label: 'Dimanche' }
];

const THRESHOLD_FIELDS = [
  ['maintenance_yellow', 'Maintenance (jaune)'],
  ['maintenance_red', 'Maintenance (rouge)'],
  ['incident_yellow', 'Incident (jaune)'],
  ['incident_red', 'Incident (rouge)'],
  ['impact', 'Impact (seuil)']
];


const SortableItem = React.memo(({ id, label, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '8px 12px',
    backgroundColor: '#333',
    borderRadius: '8px',
    color: 'white',
    margin: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'grab'
  }), [transform, transition]);

  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    onRemove(id);
  }, [id, onRemove]);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <span {...listeners} style={{ cursor: 'grab' }}>{label}</span>
      <button
        onClick={handleRemove}
        style={{
          marginLeft: 8,
          background: 'transparent',
          color: 'white',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        ❌
      </button>
    </div>
  );
});

export default function AdminPanel({ onLogout, adminNotes, setAdminNotes, thresholds, setThresholds, setExportColumns, allColumns }) {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [exportColumnsLocal, setExportColumnsLocal] = useState([]);
  const [localThresholds, setLocalThresholds] = useState(thresholds);

  const [modals, setModals] = useState({
    form: false,
    thresholds: false,
    upload: false,
    export: false
  });

  const allPossibleColumns = useMemo(() => allColumns || [], [allColumns]);
  const sensors = useSensors(useSensor(PointerSensor));
  const availableColumns = useMemo(() => 
    allPossibleColumns.filter(c => !exportColumnsLocal.includes(c.key)),
    [allPossibleColumns, exportColumnsLocal]
  );

  const toggleModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: !prev[modalName] }));
  }, []);

  const addColumn = useCallback((key) => {
    if (!exportColumnsLocal.includes(key)) {
      const updated = [...exportColumnsLocal, key];
      setExportColumnsLocal(updated);
      setExportColumns(updated);
    }
  }, [exportColumnsLocal, setExportColumns]);

  const removeColumn = useCallback((key) => {
    const updated = exportColumnsLocal.filter(k => k !== key);
    setExportColumnsLocal(updated);
    setExportColumns(updated);
  }, [exportColumnsLocal, setExportColumns]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = exportColumnsLocal.indexOf(active.id);
      const newIndex = exportColumnsLocal.indexOf(over.id);
      const newOrder = arrayMove(exportColumnsLocal, oldIndex, newIndex);
      setExportColumnsLocal(newOrder);
      setExportColumns(newOrder);
    }
  }, [exportColumnsLocal, setExportColumns]);

  const handleChange = useCallback((field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleThresholdChange = useCallback((field) => (e) => {
    setLocalThresholds(prev => ({ ...prev, [field]: Number(e.target.value) }));
  }, []);

  const saveExportColumns = useCallback(async (columns) => {
    try {
      await fetch('/.netlify/functions/saveExportColumns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns })
      });
    } catch (error) {
      console.error('Error saving export columns:', error);
    }
  }, []);

  const updateThresholds = useCallback(async () => {
    try {
      const res = await fetch('/.netlify/functions/updateThresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localThresholds)
      });
      const result = await res.json();
      if (res.ok) {
        setThresholds(localThresholds);
        alert("Seuils enregistrés !");
      } else {
        console.error("Erreur backend :", result);
        alert("Erreur : " + result.error);
      }
    } catch (e) {
      console.error("Erreur réseau :", e);
      alert("Erreur de communication avec le serveur.");
    }
  }, [localThresholds, setThresholds]);

  const addNote = useCallback(async () => {
    if (!form.weekday && !form.note) return;
    
    try {
      const response = await fetch('/.netlify/functions/addNote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      
      if (response.ok) {
        setAdminNotes(prev => [...prev, ...result.data]);
        setForm(INITIAL_FORM_STATE);
        toggleModal('form');
      } else {
        console.error("Erreur backend :", result.error);
        alert("Erreur lors de l'ajout de la note");
      }
    } catch (error) {
      console.error("Erreur réseau :", error);
      alert("Erreur de communication avec le serveur.");
    }
  }, [form, setAdminNotes, toggleModal]);

  const removeNote = useCallback(async (id) => {
    try {
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
    } catch (error) {
      console.error("Erreur réseau :", error);
      alert("Erreur de communication avec le serveur.");
    }
  }, [setAdminNotes]);

  useEffect(() => {
    if (exportColumnsLocal.length > 0) {
      saveExportColumns(exportColumnsLocal);
    }
  }, [exportColumnsLocal, saveExportColumns]);

  useEffect(() => {
    const fetchExportColumns = async () => {
      try {
        const res = await fetch('/.netlify/functions/getExportColumns');
        const result = await res.json();
        if (res.ok && Array.isArray(result.columns)) {
          setExportColumns(result.columns);
          setExportColumnsLocal(result.columns);
        }
      } catch (error) {
        console.error('Error fetching export columns:', error);
      }
    };
    fetchExportColumns();
  }, [setExportColumns]);

  const renderFormInput = useCallback((label, field, type = 'text', options = null) => (
    <label key={field}>
      {label}
      {type === 'select' ? (
        <select value={form[field]} onChange={handleChange(field)}>
          {options.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={form[field]}
          onChange={handleChange(field)}
          className={field === 'note' ? 'admin-note-field' : ''}
        />
      )}
    </label>
  ), [form, handleChange]);

  return (
    <div className="admin-panel">
      <h2>Admin Page</h2>
      <div className="top-buttons">
        <button className="primary-button" onClick={() => toggleModal('upload')}>
          📤 Upload fichier Excel
        </button>
        <button className="primary-button" onClick={() => toggleModal('export')}>
          🧩 Affichage des Colonnes
        </button>
        <button className="primary-button" onClick={() => toggleModal('thresholds')}>
          🎛 Modifier les seuils
        </button>
        <button className="primary-button" onClick={() => toggleModal('form')}>
          ➕ Ajouter récurrence
        </button>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={modals.upload} onClose={() => toggleModal('upload')} title="📤 Upload Excel">
        <FileUpload onDataLoaded={() => alert("File uploaded!")} />
      </Modal>

      {/* Export Columns Modal */}
      <Modal isOpen={modals.export} onClose={() => toggleModal('export')} title="🧩 Colonnes à exporter">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={exportColumnsLocal} strategy={horizontalListSortingStrategy}>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {exportColumnsLocal.map(key => {
                const col = allPossibleColumns.find(c => c.key === key);
                return (
                  <SortableItem 
                    key={key} 
                    id={key} 
                    label={col?.label || key} 
                    onRemove={removeColumn} 
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <h4>Colonnes disponibles :</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {availableColumns.map(col => (
            <button
              key={col.key}
              onClick={() => addColumn(col.key)}
              style={{ 
                margin: 4, 
                padding: '6px 10px', 
                backgroundColor: '#ddd', 
                borderRadius: '6px', 
                cursor: 'pointer' 
              }}
            >
              ➕ {col.label}
            </button>
          ))}
        </div>
      </Modal>

      {/* Thresholds Modal */}
      <Modal isOpen={modals.thresholds} onClose={() => toggleModal('thresholds')} title="🎛 Modifier les seuils">
        <div className="form-grid">
          {THRESHOLD_FIELDS.map(([key, label]) => (
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
        <button className="primary-button" onClick={updateThresholds}>💾 Enregistrer</button>
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={modals.form} onClose={() => toggleModal('form')} title="➕ Ajouter récurrence">
        <div className="form-section">
          <h4>Identification</h4>
          <div className="form-grid">
            {renderFormInput('Incident', 'incident')}
            {renderFormInput('District', 'district')}
            {renderFormInput('Ticket #', 'ticket_number')}
            {renderFormInput('Assigné à', 'assigned')}
          </div>
        </div>

        <div className="form-section">
          <h4>Horaire</h4>
          <div className="form-grid">
            {renderFormInput('Récurrence', 'weekday', 'select', WEEKDAY_OPTIONS)}
            {renderFormInput('Début', 'start_duration_hrs', 'time')}
            {renderFormInput('Fin', 'end_duration_hrs', 'time')}
          </div>
        </div>

        <div className="form-section">
          <h4>Durées</h4>
          <div className="form-grid">
            {renderFormInput('Estimée (h)', 'est_duration_hrs')}
            {renderFormInput('Réelle (h)', 'real_time_duration_hrs')}
          </div>
        </div>

        <div className="form-section">
          <h4>Détails</h4>
          <div className="form-grid">
            {renderFormInput('Maintenance', 'maint_event')}
            {renderFormInput('Incident', 'incid_event')}
            {renderFormInput('Impact business', 'business_impact')}
            {renderFormInput('RCA', 'rca')}
            <label>
              Type de log
              <select value={form.log_type} onChange={(e) => setForm(prev => ({ ...prev, log_type: e.target.value }))}>
                <option value="application">Application</option>
                <option value="operational">Operational</option>
              </select>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h4>Résumé / Note</h4>
          {renderFormInput('Note', 'note')}
        </div>

        <button className="primary-button" onClick={addNote}>➕ Ajouter</button>
      </Modal>

      <div className="logout-wrapper">
        <button className="danger-button" onClick={onLogout}>🔓 Retourner</button>
      </div>

      <h3>Entrées Admin</h3>
      <div className="admin-note-list">
        {adminNotes.map((note, idx) => (
          <div key={note.id || idx} className="admin-note-item">
            <div>
              <div className="admin-note-title">{note.note}</div>
              <div className="admin-note-meta">
                📅 {note.weekday} — 🏷 {note.incident} — 🏢 {note.district} — 👤 {note.assigned}
              </div>
            </div>
            <button
              className="danger-button"
              onClick={() => removeNote(note.id)}
            >
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
