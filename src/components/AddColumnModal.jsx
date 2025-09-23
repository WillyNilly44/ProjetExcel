import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AddColumnModal = ({ isOpen, onClose, onColumnAdded }) => {
  const { user, token } = useAuth(); // Make sure we get the token
  const [formData, setFormData] = useState({
    columnName: '',
    dataType: 'VARCHAR(255)',
    isNullable: true,
    defaultValue: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous errors
    setError('');
    
    // Validate user authentication
    if (!user) {
      setError('Authentication required. Please log in again.');
      return;
    }


    if (!user.level_Name || user.level_Name !== 'Administrator') {
      setError('Administrator privileges required to add columns.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the request with authentication headers
      const requestHeaders = {
        'Content-Type': 'application/json'
      };

      // Add authentication token if available
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      // Add user information to request body for server-side validation
      const requestBody = {
        ...formData,
        user: {
          username: user.username,
          role: user.level_Name
        }
      };

      const response = await fetch('/api/addcolumn', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });

      // Check if response is OK
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        // Reset form
        setFormData({
          columnName: '',
          dataType: 'VARCHAR(255)',
          isNullable: true,
          defaultValue: ''
        });
        
        // Close modal and notify parent
        onClose();
        onColumnAdded();
        
        alert('✅ Column added successfully!');
      } else {
        throw new Error(result.error || 'Failed to add column');
      }

    } catch (error) {
      console.error('Add column error:', error);
      setError(`Failed to add column: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      columnName: '',
      dataType: 'VARCHAR(255)',
      isNullable: true,
      defaultValue: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content add-column-modal">
        <div className="modal-header">
          <h3>🔧 Add New Column</h3>
          <button 
            onClick={handleCancel}
            className="modal-close"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Column Name */}
          <div className="form-group">
            <label htmlFor="columnName">
              Column Name <span className="required">*</span>
            </label>
            <input
              id="columnName"
              type="text"
              value={formData.columnName}
              onChange={(e) => setFormData({ ...formData, columnName: e.target.value })}
              placeholder="e.g., new_field_name"
              className="form-input"
              disabled={isSubmitting}
              maxLength={50}
            />
            <small className="form-help">
              Must start with letter/underscore, contain only letters, numbers, underscores
            </small>
          </div>

          {/* Data Type */}
          <div className="form-group">
            <label htmlFor="dataType">
              Data Type <span className="required">*</span>
            </label>
            <select
              id="dataType"
              value={formData.dataType}
              onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
              className="form-select"
              disabled={isSubmitting}
            >
              <option value="VARCHAR(255)">Text (VARCHAR)</option>
              <option value="INT">Integer (INT)</option>
              <option value="DECIMAL">Decimal (DECIMAL)</option>
              <option value="DATETIME">Date/Time (DATETIME)</option>
              <option value="DATE">Date (DATE)</option>
              <option value="TIME">Time (TIME)</option>
              <option value="BIT">Yes/No (BIT)</option>
              <option value="TEXT">Long Text (TEXT)</option>
            </select>
          </div>

          {/* Nullable */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isNullable}
                onChange={(e) => setFormData({ ...formData, isNullable: e.target.checked })}
                disabled={isSubmitting}
              />
              Allow NULL values
            </label>
            <small className="form-help">
              If unchecked, this field will be required for all entries
            </small>
          </div>

          {/* Default Value */}
          <div className="form-group">
            <label htmlFor="defaultValue">Default Value</label>
            <input
              id="defaultValue"
              type="text"
              value={formData.defaultValue}
              onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
              placeholder="Optional default value"
              className="form-input"
              disabled={isSubmitting}
            />
            <small className="form-help">
              Default value for new entries (leave blank for none)
            </small>
          </div>
        </form>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-footer">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-cancel"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Adding Column...' : '✅ Add Column'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddColumnModal;