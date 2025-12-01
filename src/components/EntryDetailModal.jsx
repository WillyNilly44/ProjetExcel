import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/components/EntryDetailModal.css';

const EntryDetailModal = ({ 
  isOpen, 
  onClose, 
  entry, 
  columns, 
  formatColumnName, 
  formatCellValue, 
  onSave,
  onDuplicate
}) => {
  const { hasPermission, user } = useAuth(); // Add 'user' here
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (entry) {
      // Deep copy the entry and preserve all data types
      const safeCopy = {};
      Object.keys(entry).forEach(key => {
        const value = entry[key];
        // Preserve the original value and data type
        if (value !== null && value !== undefined) {
          safeCopy[key] = value;
        } else {
          // Set default values for specific fields
          if (key.toLowerCase() === 'risk_level') {
            safeCopy[key] = 'Low';
          } else {
            safeCopy[key] = '';
          }
        }
      });
      
      // Ensure risk_level has a default value even if the field exists but is empty
      if (!safeCopy.risk_level || safeCopy.risk_level === '') {
        safeCopy.risk_level = 'Low';
      }
      
      setEditedEntry(safeCopy);
      setIsEditing(false);
      setSaveError('');
    
    }
  }, [entry]);

  if (!isOpen || !entry) return null;

  const canEdit = hasPermission('Administrator') && !entry.is_virtual;

  /**
 * Determine if a field should be excluded from updates
 * These fields should not be modified during edit operations
 */
const isSystemManagedField = (columnName) => {
  const name = columnName.toLowerCase();
  
  const systemFields = [
    'uploader',     // Should not change when editing
    'uploaded_by',  // Alternative uploader field name
    'created_by',   // Original creator should not change
    'user_id',      // User reference should not change
    'created_at',   // Creation timestamp should not change
    'updated_at'    // Update timestamp is managed by server
  ];
  
  return systemFields.some(field => name.includes(field));
};

const getColumnGroups = () => {
  const groups = {
    basic: [],
    dates: [],
    status: [],
    technical: [],
    notes: []
  };

  // Filter out system-managed fields including uploader
  const visibleColumns = columns.filter(column => 
    !isSystemManagedField(column.COLUMN_NAME)
  );

  visibleColumns.forEach(column => {
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
      // Create a clean copy of editedEntry, excluding system-managed fields
      const cleanedEntry = {};
      
      Object.keys(editedEntry).forEach(key => {
        // Only include fields that are not system-managed
        if (!isSystemManagedField(key)) {
          cleanedEntry[key] = editedEntry[key];
        }
      });
      
      // Always include the ID for the update operation
      cleanedEntry.id = editedEntry.id || entry.id;
      
      // UPDATE: Add current user as uploader when editing
      // This ensures the uploader field reflects who last modified the entry
      if (hasPermission('Administrator')) {
        // Find the uploader field name (could be different variations)
        const uploaderField = columns.find(col => {
          const name = col.COLUMN_NAME.toLowerCase();
          return name.includes('uploader') || 
                 name.includes('uploaded_by') || 
                 name.includes('modified_by');
        });
        
        if (uploaderField && user && user.username) {
          cleanedEntry[uploaderField.COLUMN_NAME] = user.username;
        }
      }
      
      
      const success = await onSave(cleanedEntry);
      if (success) {
        setIsEditing(false);
      } else {
        setSaveError('Failed to save entry');
      }
    } catch (error) {
      console.error('Error in handleSave:', error); // Add error logging
      setSaveError('Error saving entry: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original entry values
    const safeCopy = {};
    Object.keys(entry).forEach(key => {
      const value = entry[key];
      if (value !== null && value !== undefined) {
        safeCopy[key] = value;
      } else {
        safeCopy[key] = '';
      }
    });
    
    setEditedEntry(safeCopy);
    setIsEditing(false);
    setSaveError('');
  };

  const handleDuplicate = () => {
    if (onDuplicate && typeof onDuplicate === 'function') {
      onDuplicate(entry);
    }
  };

  const renderFieldInput = (column, value) => {
    const columnName = column.COLUMN_NAME;
    const dataType = column.DATA_TYPE.toLowerCase();
    const lowerColumnName = columnName.toLowerCase();

    // Read-only fields
    if (lowerColumnName.includes('id') || 
        lowerColumnName.includes('created') || 
        lowerColumnName.includes('updated') ||
        entry.is_virtual) {
      return (
        <div className="detail-value readonly">
          {value !== null && value !== undefined && value !== '' ? 
            formatCellValue(value, columnName, column.DATA_TYPE) : 
            <span className="empty-value">-</span>
          }
          {(lowerColumnName.includes('id') || lowerColumnName.includes('created') || lowerColumnName.includes('updated')) && 
            <span className="readonly-indicator">Read-only</span>
          }
        </div>
      );
    }

    // Boolean/bit fields
    if (dataType === 'bit' || typeof value === 'boolean') {
      const boolValue = value === true || value === 1 || value === '1' || value === 'true';
      return (
        <select
          value={boolValue ? '1' : '0'}
          onChange={(e) => handleInputChange(columnName, e.target.value === '1')}
          className="detail-select"
        >
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      );
    }

    // Status fields
    if (lowerColumnName.includes('status') || lowerColumnName.includes('completion')) {
      return (
        <select
          value={value || ''}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          className="detail-select"
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

    // Log type fields
    if (lowerColumnName.includes('log_type')) {
      return (
        <select
          value={value || ''}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          className="detail-select"
        >
          <option value="">Select type...</option>
          <option value="Operational">Operational</option>
          <option value="Application">Application</option>
        </select>
      );
    }

    // Risk level fields
    if (lowerColumnName.includes('risk_level')) {
      return (
        <select
          value={value || 'Low'}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          className="detail-select"
        >
          <option value="Low">🟢 Low</option>
          <option value="Moderate">🟡 Moderate</option>
          <option value="High">🔴 High</option>
        </select>
      );
    }

    // Duration fields (estimated/actual time in hours) - CHECK THIS FIRST!
    if (lowerColumnName.includes('estimated_time') || 
        lowerColumnName.includes('duration') || 
        lowerColumnName.includes('expected_down_time')) {
    
      // Ensure we have a number value
      let numericValue = '';
      if (value !== null && value !== undefined && value !== '') {
        numericValue = parseFloat(value) || 0;
      }
      
      return (
        <input
          type="number"
          step="0.01"
          min="0"
          value={numericValue}
          onChange={(e) => handleInputChange(columnName, parseFloat(e.target.value) || 0)}
          className="detail-input"
          placeholder="Hours (e.g., 2.5)"
        />
      );
    }

    // Date fields
    if (dataType.includes('date')) {
      let dateValue = '';
      if (value) {
        try {
          // Handle different date formats
          if (typeof value === 'string' && value.includes('T')) {
            // ISO format
            dateValue = value.split('T')[0];
          } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Already in YYYY-MM-DD format
            dateValue = value;
          } else {
            // Try to parse as date
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              dateValue = date.toISOString().split('T')[0];
            }
          }
        } catch (e) {
          dateValue = '';
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

    if (dataType.includes('time') || 
        (lowerColumnName.includes('time') && 
         !lowerColumnName.includes('estimated') && 
         !lowerColumnName.includes('actual') && 
         !lowerColumnName.includes('expected') &&
         !lowerColumnName.includes('down'))) {
      
      let timeValue = '';
      
      
      if (value !== null && value !== undefined && value !== '') {
        const valueStr = String(value);
        
        // If it's already in HH:MM or HH:MM:SS format
        if (valueStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
          timeValue = valueStr.substring(0, 5); // Take only HH:MM part
        }
        // If it's a full datetime string, extract time part
        else if (valueStr.includes('T')) {
          try {
            const date = new Date(valueStr);
            if (!isNaN(date.getTime())) {
              timeValue = date.toTimeString().substring(0, 5);
            }
          } catch (e) {
          }
        }
        // If it's just a time string like "14:30:00" 
        else if (valueStr.includes(':')) {
          timeValue = valueStr.substring(0, 5);
        }
        // Try to parse as a date and extract time
        else {
          try {
            const date = new Date(`1970-01-01T${valueStr}`);
            if (!isNaN(date.getTime())) {
              timeValue = date.toTimeString().substring(0, 5);
            }
          } catch (e) {
            timeValue = valueStr;
          }
        }
      }
      
      
      return (
        <input
          type="time"
          value={timeValue}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          className="detail-input"
        />
      );
    }

    // Numeric fields
    if (dataType.includes('int') || dataType.includes('decimal') || dataType.includes('float')) {
      let numericValue = '';
      if (value !== null && value !== undefined && value !== '') {
        numericValue = value;
      }
      
      return (
        <input
          type="number"
          value={numericValue}
          onChange={(e) => handleInputChange(columnName, e.target.value ? parseFloat(e.target.value) : '')}
          className="detail-input"
        />
      );
    }

    // Text area for notes/descriptions
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

    // Default text input
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

  const renderFieldGroup = (title, columns) => {
    if (columns.length === 0) return null;

    return (
      <div className="detail-group">
        <h4 className="detail-group-title">
          {title}
        </h4>
        <div className="detail-fields">
          {columns.map(column => {
            const columnName = column.COLUMN_NAME;
            const value = isEditing ? editedEntry[columnName] : entry[columnName];
            const isVirtualField = entry.is_virtual && (
              columnName.toLowerCase().includes('id') ||
              columnName.toLowerCase().includes('created') ||
              columnName.toLowerCase().includes('updated') ||
              columnName.toLowerCase().includes('uploader')
            );

            return (
              <div key={columnName} className="detail-field">
                <div className="detail-label">
                  {formatColumnName(columnName)}
                  {column.IS_NULLABLE === 'NO' && <span className="required">*</span>}
                  {isVirtualField && <span className="virtual-indicator">(Recurring)</span>}
                </div>
                
                {isEditing && canEdit ? (
                  renderFieldInput(column, value)
                ) : (
                  <div className={`detail-value ${getValueType(columnName, column.DATA_TYPE)}`}>
                    {value !== null && value !== undefined && value !== '' ? 
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

  // Add this function inside your EntryDetailModal component
const renderApplicationFields = () => {
  // Check if this entry has application fields
  const hasAppFields = entry.app_company || entry.app_ticket_number || entry.app_project_name || 
                      entry.identified_user_impact || entry.post_maintenance_testing || 
                      entry.rollback_plan || entry.communication_to_user ||
                      entry.wiki_diagram_updated !== null || entry.s3_support_ready !== null;

  if (!hasAppFields) return null;

  return (
    <div className="application-fields-section">
      <div className="section-header">
        <h3 className="section-title">📋 Application Change Request Details</h3>
      </div>
      
      <div className="detail-fields">
        {/* Company */}
        {entry.app_company && (
          <div className="detail-field">
            <div className="detail-label">🏢 Company</div>
            <div className="detail-value company-name">{entry.app_company}</div>
          </div>
        )}
        
        {/* Application Ticket Number */}
        {entry.app_ticket_number && (
          <div className="detail-field">
            <div className="detail-label">🎫 App Ticket #</div>
            <div className="detail-value ticket-number">{entry.app_ticket_number}</div>
          </div>
        )}

        {/* Project Name */}
        {entry.app_project_name && (
          <div className="detail-field">
            <div className="detail-label">📂 Project Name</div>
            <div className="detail-value project-name">{entry.app_project_name}</div>
          </div>
        )}

        {/* Wiki/Diagram Updated */}
        {entry.wiki_diagram_updated !== null && entry.wiki_diagram_updated !== undefined && (
          <div className="detail-field">
            <div className="detail-label">📚 Wiki/Diagram Updated</div>
            <div className={`detail-value status-indicator ${entry.wiki_diagram_updated ? 'status-yes' : 'status-no'}`}>
              {entry.wiki_diagram_updated ? '✅ Yes' : '❌ No'}
            </div>
          </div>
        )}

        {/* S3 Support Ready */}
        {entry.s3_support_ready !== null && entry.s3_support_ready !== undefined && (
          <div className="detail-field">
            <div className="detail-label">☁️ S3 Support Ready</div>
            <div className={`detail-value status-indicator ${entry.s3_support_ready ? 'status-yes' : 'status-no'}`}>
              {entry.s3_support_ready ? '✅ Yes' : '❌ No'}
            </div>
          </div>
        )}
      </div>

      {/* Long text fields */}
      {entry.identified_user_impact && (
        <div className="text-field">
          <div className="detail-label">👥 Identified User Impact</div>
          <div className="detail-text">{entry.identified_user_impact}</div>
        </div>
      )}

      {entry.post_maintenance_testing && (
        <div className="text-field">
          <div className="detail-label">🧪 Post-Maintenance Testing</div>
          <div className="detail-text">{entry.post_maintenance_testing}</div>
        </div>
      )}

      {entry.rollback_plan && (
        <div className="text-field">
          <div className="detail-label">🔄 Rollback Plan</div>
          <div className="detail-text">{entry.rollback_plan}</div>
        </div>
      )}

      {entry.communication_to_user && (
        <div className="text-field">
          <div className="detail-label">📢 Communication to Users</div>
          <div className="detail-text">{entry.communication_to_user}</div>
        </div>
      )}
    </div>
  );
};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="entry-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="entry-detail-header">
          <h3 className="entry-detail-title">
            {isEditing ? 'Edit Entry' : 'Entry Details'}
          </h3>
          <button onClick={onClose} className="entry-detail-close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="entry-detail-content">
          {/* Admin Status Indicator */}
          {hasPermission('Administrator') && (
            <div className="admin-status-indicator">
              Administrator session active
            </div>
          )}

          {/* Save Error */}
          {saveError && (
            <div className="save-error">
              Error: {saveError}
            </div>
          )}

          {/* Virtual Entry Info */}
          {entry.is_virtual && (
            <div className="virtual-info-panel">
              <h4>Recurring Entry Information</h4>
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
            {renderFieldGroup('Basic Information', columnGroups.basic)}
            {renderFieldGroup('Technical Details', columnGroups.technical)}
            {renderFieldGroup('Status & Completion', columnGroups.status)}
            {renderFieldGroup('Dates & Times', columnGroups.dates)}
            {renderFieldGroup('Notes & Comments', columnGroups.notes)}
            {renderApplicationFields()}
          </div>
        </div>

        {/* Footer */}
        <div className="entry-detail-footer">
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
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="detail-btn secondary"
                >
                  Cancel
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
                {hasPermission('Operator') && !entry.is_virtual && (
                  <button
                    onClick={handleDuplicate}
                    className="detail-btn duplicate-btn"
                    title="Create a duplicate of this entry"
                  >
                    Duplicate
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