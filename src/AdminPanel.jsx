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
  { value: '', label: '— Select —' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' }
];

const THRESHOLD_FIELDS = [
  ['maintenance_yellow', 'Maintenance (yellow)'],
  ['maintenance_red', 'Maintenance (red)'],
  ['incident_yellow', 'Incident (yellow)'],
  ['incident_red', 'Incident (red)'],
  ['impact', 'Impact (threshold)']
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

export default function AdminPanel({ onLogout, adminNotes, setAdminNotes, thresholds, setThresholds, setExportColumns, allColumns, excelData }) {

  
  if (excelData && excelData.length > 0) {
    const assignedValues = excelData.map(row => row.Assigned || row.assigned).filter(Boolean);
  }

  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [exportColumnsLocal, setExportColumnsLocal] = useState([]);
  const [localThresholds, setLocalThresholds] = useState(thresholds);
  const [assignedOptions, setAssignedOptions] = useState([
    { value: '', label: '— Select Assignee —' }
  ]);
  const [districtOptions, setDistrictOptions] = useState([
  { value: '', label: '— Select District —' }
]);

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
        alert("Thresholds saved!");
      } else {
        console.error("Backend error:", result);
        alert("Error: " + result.error);
      }
    } catch (e) {
      console.error("Network error:", e);
      alert("Server communication error.");
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
        console.error("Backend error:", result.error);
        alert("Error adding note");
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Server communication error.");
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
        console.error("Delete error:", result.error);
        alert("Failed to delete note.");
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Server communication error.");
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

  useEffect(() => {
    if (excelData && Array.isArray(excelData) && excelData.length > 0) {
      
      const uniqueAssigned = [...new Set(
        excelData
          .map(row => row.Assigned || row.assigned || row['Assigned'] || '')
          .filter(value => value && value.trim() !== '') 
          .map(value => value.trim()) 
      )].sort(); 

      
      const options = [
        { value: '', label: '— Select Assignee —' },
        ...uniqueAssigned.map(name => ({ value: name, label: name }))
      ];
      setAssignedOptions(options);
    }
  }, [excelData]);

  useEffect(() => {
    if (excelData && Array.isArray(excelData) && excelData.length > 0) {
      
      const uniqueDistricts = [...new Set(
        excelData
          .map(row => row.District)
          .filter(value => value!== '') 
      )].sort(); 

      const options = [
        { value: '', label: '— Select District —' },
        ...uniqueDistricts.map(name => ({ value: name, label: name }))
      ];
      setDistrictOptions(options);
    }
  }, [excelData]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    addNote();
  };

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
          📤 Upload Excel File
        </button>
        <button className="primary-button" onClick={() => toggleModal('export')}>
          🧩 Column Display
        </button>
        <button className="primary-button" onClick={() => toggleModal('thresholds')}>
          🎛 Edit Thresholds
        </button>
        <button className="primary-button" onClick={() => toggleModal('form')}>
          ➕ Add Recurrence
        </button>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={modals.upload} onClose={() => toggleModal('upload')} title="📤 Upload Excel">
        <FileUpload onDataLoaded={() => alert("File uploaded!")} />
      </Modal>

      {/* Export Columns Modal */}
      <Modal isOpen={modals.export} onClose={() => toggleModal('export')} title="🧩 Export Columns">
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

        <h4>Available columns:</h4>
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

      <Modal isOpen={modals.thresholds} onClose={() => toggleModal('thresholds')} title="🎛 Edit Thresholds">
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
        <button className="primary-button" onClick={updateThresholds}>💾 Save</button>
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={modals.form} onClose={() => toggleModal('form')} title="➕ Add Recurrence">
        <div className="form-section">
          <h4>Identification</h4>
          <div className="form-grid">
            {renderFormInput('Incident', 'incident')}
            {renderFormInput('District', 'district','select', districtOptions)}
            {renderFormInput('Ticket #', 'ticket_number')}
            {renderFormInput('Assigned to', 'assigned', 'select', assignedOptions)}
          </div>
        </div>

        <div className="form-section">
          <h4>Schedule</h4>
          <div className="form-grid">
            {renderFormInput('Recurrence', 'weekday', 'select', WEEKDAY_OPTIONS)}
            {renderFormInput('Start', 'start_duration_hrs', 'time')}
            {renderFormInput('End', 'end_duration_hrs', 'time')}
          </div>
        </div>

        <div className="form-section">
          <h4>Duration</h4>
          <div className="form-grid">
            {renderFormInput('Estimated (h)', 'est_duration_hrs')}
            {renderFormInput('Actual (h)', 'real_time_duration_hrs')}
          </div>
        </div>

        <div className="form-section">
          <h4>Details</h4>
          <div className="form-grid">
            {renderFormInput('Maintenance Event', 'maint_event')}
            {renderFormInput('Incident Event', 'incid_event')}
            {renderFormInput('Business impact', 'business_impact')}
            {renderFormInput('RCA', 'rca')}
            <label>
              Log type
              <select value={form.log_type} onChange={(e) => setForm(prev => ({ ...prev, log_type: e.target.value }))}>
                <option value="application">Application</option>
                <option value="operational">Operational</option>
              </select>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h4>Summary / Note</h4>
          {renderFormInput('Note', 'note')}
        </div>

        <button className="primary-button" onClick={addNote}>➕ Add</button>
      </Modal>

      <div className="logout-wrapper">
        <button className="danger-button" onClick={onLogout}>🔓 Back</button>
      </div>

      <h3>Admin Entries</h3>
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
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
