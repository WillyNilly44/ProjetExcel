import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../style.css';

const EntryDetailModal = ({ isOpen, onClose, entry, columns, formatColumnName, formatCellValue, onSave }) => {
  const { hasPermission } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (entry) {
      setEditedEntry({ ...entry });
      setIsEditing(false);
      setSaveError('');
    }
  }, [entry]);

  if (!isOpen || !entry) return null;

  const canEdit = hasPermission('Administrator') && !entry.is_virtual;

  const getColumnGroups = () => {
    const groups = {
      basic: [],
      dates: [],
      status: [],
      technical: [],
      notes: []
    };

    columns.forEach(column => {
      const name = column.COLUMN_NAME.toLowerCase();
      
      if (name.includes('date') || name.includes('time') || name.includes('created') || name.includes('updated')) {
        groups.dates.push(column);
      } else if (name.includes('status') || name.includes('completion')) {
        groups.status.push(column);
      } else if (name.includes('note') || name.includes('description') || name.includes('comment')) {
        groups.notes.push(column);
      } else if (name.includes('ticket') || name.includes('incident') || name.includes('log_type') || name.includes('priority')) {
        groups.technical.push(column);
      } else {
        groups.basic.push(column);
      }
    });

    return groups;
  };

  const columnGroups = getColumnGroups();

  const handleInputChange = (columnName, value) => {
    setEditedEntry(prev => ({
      ...prev,
      [columnName]: value
    }));
  };

  const handleSave = async () => {
    if (entry.is_virtual) {
      setSaveError('Virtual entries cannot be modified');
      return;
    }

    if (!hasPermission('Administrator')) {
      setSaveError('Administrator permission required to edit entries');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const success = await onSave(editedEntry);
      if (success) {
        setIsEditing(false);
      } else {
        setSaveError('Failed to save entry');
      }
    } catch (error) {
      setSaveError('Error saving entry: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedEntry({ ...entry });
    setIsEditing(false);
    setSaveError('');
  };

  const renderFieldInput = (column, value) => {
    const columnName = column.COLUMN_NAME;
    const dataType = column.DATA_TYPE.toLowerCase();
    const lowerColumnName = columnName.toLowerCase();

    if (lowerColumnName.includes('id') || 
        lowerColumnName.includes('created') || 
        lowerColumnName.includes('updated') ||
        entry.is_virtual) {
      return (
        <div className="detail-value readonly">
          {value !== null && value !== undefined ? 
            formatCellValue(value, columnName, column.DATA_TYPE) : 
            <span className="empty-value">-</span>
          }
          {(lowerColumnName.includes('id') || lowerColumnName.includes('created') || lowerColumnName.includes('updated')) && 
            <span className="readonly-indicator">🔒</span>
          }
        </div>
      );
    }

    if (dataType === 'bit' || typeof value === 'boolean') {
      return (
        <select
          value={value ? '1' : '0'}
          onChange={(e) => handleInputChange(columnName, e.target.value === '1')}
          className="detail-input"
        >
          <option value="0"> No</option>
          <option value="1"> Yes</option>
        </select>
      );
    }

    if (lowerColumnName.includes('status') || lowerColumnName.includes('completion')) {
      return (
        <select
          value={value || ''}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          className="detail-input"
        >
          <option value="">Select status...</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Not Completed">Not Completed</option>
          <option value="On Hold">On Hold</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      );
    }

    if (lowerColumnName.includes('log_type')) {
      return (
        <select
          value={value || ''}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          className="detail-input"
        >
          <option value="">Select type...</option>
          <option value="Operational">Operational</option>
          <option value="Application">Application</option>
        </select>
      );
    }

    if (dataType.includes('date') || dataType.includes('datetime') || lowerColumnName.includes('date')) {
      let dateValue = '';
      if (value) {
        try {
          const date = new Date(value);
          dateValue = date.toISOString().split('T')[0];
        } catch (e) {
          dateValue = value;
        }
      }
      
      return (
        <input
          type="date"
          value={dateValue}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          className="detail-input"
        />
      );
    }

    if (lowerColumnName.includes('time') && !lowerColumnName.includes('estimated') && !lowerColumnName.includes('actual')) {
      return (
        <input
          type="time"
          value={value || ''}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          className="detail-input"
        />
      );
    }

    if ((lowerColumnName.includes('estimated_time') || lowerColumnName.includes('actual_time')) && dataType.includes('decimal')) {
      return (
        <input
          type="number"
          step="0.01"
          min="0"
          value={value || ''}
          onChange={(e) => handleInputChange(columnName, parseFloat(e.target.value) || 0)}
          className="detail-input"
          placeholder="Hours (e.g., 2.5)"
        />
      );
    }

    if (dataType.includes('int') || dataType.includes('decimal') || dataType.includes('float')) {
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => handleInputChange(columnName, parseFloat(e.target.value) || 0)}
          className="detail-input"
        />
      );
    }

    if (lowerColumnName.includes('note') || lowerColumnName.includes('description') || lowerColumnName.includes('comment')) {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          className="detail-textarea"
          rows="4"
          maxLength={column.CHARACTER_MAXIMUM_LENGTH || 1000}
          placeholder={`Enter ${formatColumnName(columnName).toLowerCase()}...`}
        />
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => handleInputChange(columnName, e.target.value)}
        className="detail-input"
        maxLength={column.CHARACTER_MAXIMUM_LENGTH || 255}
        placeholder={`Enter ${formatColumnName(columnName).toLowerCase()}...`}
      />
    );
  };

  const renderFieldGroup = (title, columns, icon) => {
    if (columns.length === 0) return null;

    return (
      <div className="detail-group">
        <h4 className="detail-group-title">
          <span className="detail-icon">{icon}</span>
          {title}
        </h4>
        <div className="detail-fields">
          {columns.map(column => {
            const columnName = column.COLUMN_NAME;
            const value = isEditing ? editedEntry[columnName] : entry[columnName];
            const isVirtualField = entry.is_virtual && (
              columnName.toLowerCase().includes('id') ||
              columnName.toLowerCase().includes('created') ||
              columnName.toLowerCase().includes('updated')
            );

            return (
              <div key={columnName} className="detail-field">
                <div className="detail-label">
                  {formatColumnName(columnName)}
                  {column.IS_NULLABLE === 'NO' && <span className="required">*</span>}
                  {isVirtualField && <span className="virtual-indicator">🔄</span>}
                </div>
                
                {isEditing && canEdit ? (
                  renderFieldInput(column, value)
                ) : (
                  <div className={`detail-value ${getValueType(columnName, column.DATA_TYPE)}`}>
                    {value !== null && value !== undefined ? 
                      formatCellValue(value, columnName, column.DATA_TYPE) : 
                      <span className="empty-value">-</span>
                    }
                    {isVirtualField && <span className="virtual-note">(Virtual Entry)</span>}
                  </div>
                )}
                
                <div className="detail-meta">
                  <span className="field-type">{column.DATA_TYPE}</span>
                  {column.CHARACTER_MAXIMUM_LENGTH && (
                    <span className="field-length">Max: {column.CHARACTER_MAXIMUM_LENGTH}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getValueType = (columnName, dataType) => {
    const name = columnName.toLowerCase();
    if (dataType === 'bit' || typeof dataType === 'boolean') return 'boolean';
    if (name.includes('status')) return 'status';
    if (name.includes('note') || name.includes('description')) return 'note';
    if (name.includes('date') || name.includes('time')) return 'date';
    if (name.includes('ticket') || name.includes('id')) return 'code';
    return 'text';
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="entry-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-main">
            
            <div className="detail-title">
              <h3>{isEditing ? 'Edit Entry' : 'Entry Details'}</h3>
              
            </div>
          </div>
          <button onClick={onClose} className="detail-close-btn">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="detail-content">
          {/* Admin status indicator */}
          {hasPermission('Administrator') && (
            <div className="admin-status-indicator">
              🔐 Administrator session active
            </div>
          )}

          {/* Save Error */}
          {saveError && (
            <div className="save-error">
              ❌ {saveError}
            </div>
          )}

          {/* Virtual Entry Info */}
          {entry.is_virtual && (
            <div className="virtual-info-panel">
              <h4>🔄 Recurring Entry Information</h4>
              <div className="virtual-details">
                <div className="virtual-detail">
                  <strong>Original Entry ID:</strong> {entry.original_id}
                </div>
                <div className="virtual-detail">
                  <strong>Recurrence Day:</strong> {entry.target_day}
                </div>
                <div className="virtual-detail">
                  <strong>Week Offset:</strong> {entry.week_offset > 0 ? `+${entry.week_offset}` : entry.week_offset} weeks
                </div>
                <div className="virtual-detail">
                  <strong>Generated On:</strong> {entry.generated_on}
                </div>
              </div>
            </div>
          )}

          {/* Field Groups */}
          <div className="detail-groups">
            {renderFieldGroup('Basic Information', columnGroups.basic, '')}
            {renderFieldGroup('Technical Details', columnGroups.technical, '')}
            {renderFieldGroup('Status & Completion', columnGroups.status, '')}
            {renderFieldGroup('Dates & Times', columnGroups.dates, '')}
            {renderFieldGroup('Notes & Comments', columnGroups.notes, '')}
          </div>
        </div>

        {/* Footer */}
        <div className="detail-footer">
          <div className="detail-footer-info">
            <span className="entry-id">ID: {entry.id}</span>
            {entry.is_virtual && (
              <span className="virtual-warning">
                Virtual entries cannot be edited
              </span>
            )}
            {!hasPermission('Administrator') && !entry.is_virtual && (
              <span className="admin-required">
                 Administrator permission required to edit
              </span>
            )}
          </div>
          <div className="detail-footer-actions">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="detail-btn primary"
                >
                  {isSaving ? '💾 Saving...' : '💾 Save Changes'}
                </button>
                <button 
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="detail-btn secondary"
                >
                  ❌ Cancel
                </button>
              </>
            ) : (
              <>
                {canEdit && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="detail-btn edit"
                  >
                    Edit Entry
                  </button>
                )}
                <button onClick={onClose} className="detail-btn secondary">
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryDetailModal;