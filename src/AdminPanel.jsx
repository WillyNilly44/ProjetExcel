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
  assigned: '', note: '', log_type: 'application',
  isRecurrence: false
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
  
  // ✅ User access level
  const adminLevel = sessionStorage.getItem('adminLevel') || '';
  const hasThresholdAccess = adminLevel === 'threshold' || adminLevel === 'full';
  const hasFullAccess = adminLevel === 'full';

  // ✅ State variables
  const [awsConnected, setAwsConnected] = useState(false);
  const [awsData, setAwsData] = useState([]);
  const [isLoadingAws, setIsLoadingAws] = useState(false);
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

  // ✅ Memoized values
  const allPossibleColumns = useMemo(() => allColumns || [], [allColumns]);
  const sensors = useSensors(useSensor(PointerSensor));
  const availableColumns = useMemo(() =>
    allPossibleColumns.filter(c => !exportColumnsLocal.includes(c.key)),
    [allPossibleColumns, exportColumnsLocal]
  );

  // ✅ Helper functions
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
    const newValue = e.target.value;
    
    setForm(prev => {
      const updated = { ...prev, [field]: newValue };
      
      if (field === 'isRecurrence' && !e.target.checked) {
        updated.weekday = '';
      }
      
      return updated;
    });
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

  // ✅ AWS Database functions
  const loadAwsData = useCallback(async () => {
    if (!awsConnected) return;

    try {
      console.log('📊 Loading AWS database records...');
      
      const response = await fetch('/.netlify/functions/awsDBConnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'READ',
          query: {} // Empty query to get all records
        })
      });

      console.log('📡 Load response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 Load result:', result);

      // ✅ Check if result has the expected structure
      if (result.success && Array.isArray(result.data)) {
        setAwsData(result.data);
        console.log(`✅ Loaded ${result.data.length} records from database`);
      } else {
        console.warn('⚠️ Unexpected response format:', result);
        setAwsData([]); // Set empty array as fallback
        
        if (result.error) {
          console.error('❌ Database error:', result.error);
        }
      }
    } catch (error) {
      console.error('🚨 Error loading database records:', error);
      setAwsData([]); // Set empty array on error
      
      // Don't disconnect on data loading error, just log it
      console.warn('⚠️ Database connection maintained, but data loading failed');
    }
  }, [awsConnected]);

  const addNote = useCallback(async () => {
    if (!form.note) {
      alert('Please enter a note/description');
      return;
    }
    
    if (form.isRecurrence && !form.weekday) {
      alert('Please select a day of the week for recurring events');
      return;
    }

    try {
      if (awsConnected && hasFullAccess) {
        const awsResponse = await fetch('/.netlify/functions/awsDBConnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CREATE',
            data: {
              incident: form.incident || 'General',
              district: form.district || 'N/A',
              log_date: new Date().toISOString().split('T')[0],
              event_main: form.maint_event ? parseInt(form.maint_event) : null,
              event_incid: form.incid_event ? parseInt(form.incid_event) : null,
              business_impact: form.business_impact ? 1 : 0,
              rca: form.rca ? parseInt(form.rca) : null,
              log_start: form.start_duration_hrs || '00:00:00',
              log_end: form.end_duration_hrs || '23:59:59',
              estimated_time: form.est_duration_hrs ? parseInt(form.est_duration_hrs) : null,
              actual_time: form.real_time_duration_hrs ? parseInt(form.real_time_duration_hrs) : null,
              ticket_number: form.ticket_number ? parseInt(form.ticket_number) : null,
              assigned: form.assigned || null,
              log_status: 'ACTIVE',
              note: form.note,
              log_type: form.log_type || 'application',
              uploader: 'admin',
              weekday: form.isRecurrence ? form.weekday : null
            }
          })
        });

        const awsResult = await awsResponse.json();

        if (awsResponse.ok && awsResult.success) {
          setAwsData(prev => [...prev, awsResult.data]);
          alert('✅ Entry saved to database successfully!');
          setForm(INITIAL_FORM_STATE);
          toggleModal('form');
          return;
        } else {
          throw new Error(awsResult.error || 'Failed to save to database');
        }
      }

      // Fallback to original system
      const response = await fetch('/.netlify/functions/addNote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          weekday: form.isRecurrence ? form.weekday : ''
        })
      });
      const result = await response.json();

      if (response.ok) {
        setAdminNotes(prev => [...prev, ...result.data]);
        setForm(INITIAL_FORM_STATE);
        toggleModal('form');
        alert(form.isRecurrence ? 'Recurring event added!' : 'One-time event added!');
      } else {
        console.error("Backend error:", result.error);
        alert("Error adding note");
      }
    } catch (error) {
      console.error("Database error:", error);
      alert(`❌ Error: ${error.message}`);
    }
  }, [form, setAdminNotes, toggleModal, awsConnected, hasFullAccess]);

  const deleteAwsEntry = useCallback(async (id) => {
    if (!awsConnected) return;

    if (!confirm('Are you sure you want to delete this entry from the database?')) return;

    try {
      const response = await fetch('/.netlify/functions/awsDBConnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE',
          id: id
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setAwsData(prev => prev.filter(item => item.id !== id));
        alert('✅ Entry deleted from database');
      } else {
        throw new Error(result.error || 'Failed to delete entry');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(`❌ Failed to delete: ${error.message}`);
    }
  }, [awsConnected]);

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

  // ✅ Auto-connect to AWS on mount
  useEffect(() => {
    const autoConnectToAws = async () => {
      if (!hasFullAccess) return;

      setIsLoadingAws(true);
      try {
        const response = await fetch('/.netlify/functions/awsDBConnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'TEST_CONNECTION'
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setAwsConnected(true);
          console.log('✅ Auto-connected to SQL Server');
          await loadAwsData();
        } else {
          console.warn('❌ Database auto-connection failed:', result.error);
          setAwsConnected(false);
        }
      } catch (error) {
        console.error('Database auto-connection error:', error);
        setAwsConnected(false);
      } finally {
        setIsLoadingAws(false);
      }
    };

    autoConnectToAws();
  }, [hasFullAccess, loadAwsData]);

  // ✅ Other useEffects
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
          .filter(value => value !== '') 
      )].sort(); 

      const options = [
        { value: '', label: '— Select District —' },
        ...uniqueDistricts.map(name => ({ value: name, label: name }))
      ];
      setDistrictOptions(options);
    }
  }, [excelData]);

  // ✅ Render form input helper
  const renderFormInput = useCallback((label, field, type = 'text', options = null) => (
    <label key={field}>
      {label}
      {type === 'select' ? (
        <select value={form[field]} onChange={handleChange(field)}>
          {options.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={form[field]}
          onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.checked }))}
          style={{ width: 'auto', marginLeft: '10px' }}
        />
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
      <h2>
        Admin Page 
        <span style={{ 
          marginLeft: '10px', 
          fontSize: '14px',
          color: hasFullAccess ? '#10b981' : '#f59e0b'
        }}>
          ({hasFullAccess ? '🔓 Full Access' : '🔒 Threshold Only'})
        </span>
        {hasFullAccess && (
          <span style={{ 
            marginLeft: '10px', 
            fontSize: '12px',
            color: isLoadingAws ? '#f59e0b' : awsConnected ? '#10b981' : '#ef4444'
          }}>
            {isLoadingAws ? '⏳ Connecting...' : awsConnected ? '🔗 DB Connected' : '⚠️ DB Offline'}
          </span>
        )}
      </h2>

      <div className="top-buttons">
        {hasFullAccess && (
          <>
            <button className="primary-button" onClick={() => toggleModal('upload')}>
              📤 Upload Excel File
            </button>
            <button className="primary-button" onClick={() => toggleModal('export')}>
              🧩 Column Display
            </button>
            <button className="primary-button" onClick={() => toggleModal('form')}>
              ➕ Add Entry
            </button>
          </>
        )}
        
        {hasThresholdAccess && (
          <button className="primary-button" onClick={() => toggleModal('thresholds')}>
            🎛 Edit Thresholds
          </button>
        )}
      </div>

      {/* Modals */}
      {hasFullAccess && (
        <Modal isOpen={modals.upload} onClose={() => toggleModal('upload')} title="📤 Upload Excel">
          <FileUpload onDataLoaded={() => alert("File uploaded!")} />
        </Modal>
      )}

      {hasFullAccess && (
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
      )}

      {hasThresholdAccess && (
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
      )}

      {hasFullAccess && (
        <Modal 
          isOpen={modals.form} 
          onClose={() => toggleModal('form')} 
          title={
            awsConnected 
              ? (form.isRecurrence ? "➕ Add Recurring DB Entry" : "➕ Add DB Entry")
              : (form.isRecurrence ? "➕ Add Recurring Event" : "➕ Add Event")
          }
        >
          <div style={{ 
            padding: '10px', 
            marginBottom: '15px',
            backgroundColor: awsConnected ? '#d1fae5' : '#fef3c7',
            border: `1px solid ${awsConnected ? '#10b981' : '#f59e0b'}`,
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            {awsConnected 
              ? '🔗 Connected to database - entries will be saved to SQL Server'
              : '⚠️ Database offline - entries will be saved locally'
            }
          </div>

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
              <label style={{ display: 'flex', alignItems: 'center' }}>
                Is this a recurring event?
                <input
                  type="checkbox"
                  checked={form.isRecurrence}
                  onChange={(e) => setForm(prev => ({ 
                    ...prev, 
                    isRecurrence: e.target.checked,
                    weekday: e.target.checked ? prev.weekday : ''
                  }))}
                  style={{ width: 'auto', marginLeft: '10px' }}
                />
              </label>
              
              {form.isRecurrence && renderFormInput('Day of Week', 'weekday', 'select', WEEKDAY_OPTIONS)}
              
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

          <button className="primary-button" onClick={addNote}>
            ➕ {awsConnected ? 'Save to Database' : 'Add Entry'}
          </button>
        </Modal>
      )}

      {hasFullAccess && awsConnected && (
        <>
          <h3>Database Entries ({awsData.length})</h3>
          <div className="aws-data-list">
            {awsData.map((entry, idx) => (
              <div key={entry.id || idx} className="admin-note-item">
                <div>
                  <div className="admin-note-title">
                    {entry.note || entry.incident || 'Untitled Entry'}
                  </div>
                  <div className="admin-note-meta">
                    📅 {entry.log_date} — 🏷 {entry.incident} — 🏢 {entry.district} — 👤 {entry.assigned}
                    {entry.day_of_the_week && ` — 🔄 ${entry.day_of_the_week}`}
                  </div>
                </div>
                <button
                  className="danger-button"
                  onClick={() => deleteAwsEntry(entry.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="logout-wrapper">
        <button className="danger-button" onClick={onLogout}>🔓 Back</button>
      </div>

      {hasFullAccess && (
        <>
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
        </>
      )}
    </div>
  );
}
