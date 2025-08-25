import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AddColumnModal = ({ isOpen, onClose, onColumnAdded }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [columnData, setColumnData] = useState({
    name: '',
    dataType: 'nvarchar',
    maxLength: 255,
    isNullable: true,
    defaultValue: '',
    description: ''
  });

  const dataTypes = [
    { value: 'nvarchar', label: 'Text (NVARCHAR)', hasLength: true, defaultLength: 255 },
    { value: 'int', label: 'Integer (INT)', hasLength: false },
    { value: 'decimal', label: 'Decimal (DECIMAL)', hasLength: true, defaultLength: '10,2' },
    { value: 'datetime', label: 'Date/Time (DATETIME)', hasLength: false },
    { value: 'date', label: 'Date (DATE)', hasLength: false },
    { value: 'time', label: 'Time (TIME)', hasLength: false },
    { value: 'bit', label: 'Yes/No (BIT)', hasLength: false },
    { value: 'text', label: 'Long Text (TEXT)', hasLength: false }
  ];

  const handleInputChange = (field, value) => {
    setColumnData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDataTypeChange = (dataType) => {
    const typeInfo = dataTypes.find(t => t.value === dataType);
    setColumnData(prev => ({
      ...prev,
      dataType: dataType,
      maxLength: typeInfo?.hasLength ? (typeInfo.defaultLength || 255) : null
    }));
  };

  const validateColumnData = () => {
    if (!columnData.name.trim()) {
      alert('❌ Column name is required');
      return false;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnData.name)) {
      alert('❌ Column name must start with a letter or underscore and contain only letters, numbers, and underscores');
      return false;
    }

    if (columnData.name.length > 50) {
      alert('❌ Column name must be 50 characters or less');
      return false;
    }

    const typeInfo = dataTypes.find(t => t.value === columnData.dataType);
    if (typeInfo?.hasLength && !columnData.maxLength) {
      alert('❌ Max length is required for this data type');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateColumnData()) {
      return;
    }

    setIsLoading(true);

    try {

      const response = await fetch('/api/add-column', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          columnData,
          user: {
            id: user?.id,
            email: user?.email,
            name: user?.name
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success) {
        alert(`✅ Column "${columnData.name}" added successfully!`);
        
        // Reset form
        setColumnData({
          name: '',
          dataType: 'nvarchar',
          maxLength: 255,
          isNullable: true,
          defaultValue: '',
          description: ''
        });

        // Close modal and refresh data
        onClose();
        onColumnAdded();
      } else {
        throw new Error(result.error || 'Failed to add column');
      }

    } catch (error) {
      alert('Failed to add column: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setColumnData({
      name: '',
      dataType: 'nvarchar',
      maxLength: 255,
      isNullable: true,
      defaultValue: '',
      description: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  const selectedType = dataTypes.find(t => t.value === columnData.dataType);

  return (
    <div className="modal-overlay">
      <div className="modal-content add-column-modal">
        <div className="modal-header">
          <h3>🔧 Add New Column</h3>
          <button 
            onClick={handleCancel}
            className="modal-close"
            disabled={isLoading}
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
              value={columnData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., new_field_name"
              className="form-input"
              disabled={isLoading}
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
              value={columnData.dataType}
              onChange={(e) => handleDataTypeChange(e.target.value)}
              className="form-select"
              disabled={isLoading}
            >
              {dataTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max Length (for applicable types) */}
          {selectedType?.hasLength && (
            <div className="form-group">
              <label htmlFor="maxLength">
                {columnData.dataType === 'decimal' ? 'Precision,Scale' : 'Max Length'} <span className="required">*</span>
              </label>
              <input
                id="maxLength"
                type={columnData.dataType === 'decimal' ? 'text' : 'number'}
                value={columnData.maxLength}
                onChange={(e) => handleInputChange('maxLength', e.target.value)}
                placeholder={columnData.dataType === 'decimal' ? 'e.g., 10,2' : 'e.g., 255'}
                className="form-input"
                disabled={isLoading}
              />
              <small className="form-help">
                {columnData.dataType === 'decimal' 
                  ? 'Format: precision,scale (e.g., 10,2 for numbers up to 10 digits with 2 decimal places)'
                  : 'Maximum number of characters'
                }
              </small>
            </div>
          )}

          {/* Nullable */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={columnData.isNullable}
                onChange={(e) => handleInputChange('isNullable', e.target.checked)}
                disabled={isLoading}
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
              value={columnData.defaultValue}
              onChange={(e) => handleInputChange('defaultValue', e.target.value)}
              placeholder="Optional default value"
              className="form-input"
              disabled={isLoading}
            />
            <small className="form-help">
              Default value for new entries (leave blank for none)
            </small>
          </div>
        </form>

        <div className="modal-footer">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-cancel"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? '⏳ Adding Column...' : '✅ Add Column'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddColumnModal;