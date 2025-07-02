import React, { useState, useEffect } from 'react';

export default function AddEntryModal({ isOpen, onClose, onSave, columns = [] }) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && columns.length > 0) {
      const initialData = {};
      columns.forEach(column => {
        if (!['id', 'created_at', 'updated_at'].includes(column.COLUMN_NAME.toLowerCase())) {
          let defaultValue = getDefaultValue(column);
          
          // ✅ NEW: Convert stored minutes to hours for display
          if ((column.COLUMN_NAME.toLowerCase().includes('estimated_time') || 
               column.COLUMN_NAME.toLowerCase().includes('actual_time')) && 
              defaultValue && typeof defaultValue === 'number') {
            defaultValue = (defaultValue / 60).toString(); // Convert minutes to hours
          }
          
          initialData[column.COLUMN_NAME] = defaultValue;
        }
      });
      setFormData(initialData);
      setErrors({});
    }
  }, [isOpen, columns]);

  // Get default value based on column type
  const getDefaultValue = (column) => {
    const dataType = column.DATA_TYPE.toLowerCase();
    
    if (dataType.includes('bit') || dataType.includes('boolean')) {
      return false;
    } else if (dataType.includes('int') || dataType.includes('decimal') || dataType.includes('float')) {
      return '';
    } else if (dataType.includes('date')) {
      return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    } else {
      return '';
    }
  };

  // Handle form input changes
  const handleInputChange = (columnName, value) => {
    setFormData(prev => ({
      ...prev,
      [columnName]: value
    }));
    
    // Clear error for this field
    if (errors[columnName]) {
      setErrors(prev => ({
        ...prev,
        [columnName]: null
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    console.log('🔍 Starting validation...'); // ✅ Debug log
    console.log('📊 Current form data:', formData); // ✅ Debug log
    console.log('📋 Columns to check:', columns); // ✅ Debug log
    
    const newErrors = {};
    
    columns.forEach(column => {
      const columnName = column.COLUMN_NAME;
      const value = formData[columnName];
      
      console.log(`🔎 Checking ${columnName}:`, {
        value,
        nullable: column.IS_NULLABLE,
        dataType: column.DATA_TYPE
      }); // ✅ Debug log
      
      // Skip auto-generated columns
      if (['id', 'created_at', 'updated_at'].includes(columnName.toLowerCase())) {
        console.log(`⏭ Skipping auto-generated column: ${columnName}`);
        return;
      }
      
      // Check required fields - be more specific about empty values
      if (column.IS_NULLABLE === 'NO') {
        if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
          newErrors[columnName] = 'This field is required';
          console.log(`❌ Required field missing: ${columnName}`); // ✅ Debug log
        } else {
          console.log(`✅ Required field OK: ${columnName} = ${value}`); // ✅ Debug log
        }
      }
    });
    
    console.log('📝 Validation errors found:', newErrors); // ✅ Debug log
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log(`🎯 Form is ${isValid ? 'VALID' : 'INVALID'}`); // ✅ Debug log
    return isValid;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔄 Form submitted with data:', formData); // ✅ Debug log
    
    if (!validateForm()) {
      console.log('❌ Form validation failed:', errors); // ✅ Debug log
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('📤 Calling onSave with:', formData); // ✅ Debug log
      await onSave(formData);
      console.log('✅ onSave completed successfully'); // ✅ Debug log
      onClose();
    } catch (error) {
      console.error('❌ Failed to save entry:', error);
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Format column name for display
  const formatColumnName = (columnName) => {
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Render input field based on column type
  const renderInput = (column) => {
    const columnName = column.COLUMN_NAME;
    const dataType = column.DATA_TYPE.toLowerCase();
    const value = formData[columnName] || '';
    const hasError = errors[columnName];

    const baseStyle = {
      width: '100%',
      padding: '12px 16px', // ✅ INCREASED: More padding
      border: `2px solid ${hasError ? '#ef4444' : '#e5e7eb'}`, // ✅ INCREASED: Thicker border
      borderRadius: '8px', // ✅ INCREASED: More rounded corners
      fontSize: '14px',
      backgroundColor: hasError ? '#fef2f2' : 'white',
      transition: 'border-color 0.2s ease', // ✅ NEW: Smooth transitions
      outline: 'none'
    };

    // ✅ NEW: Focus styles
    const focusStyle = {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    };

    if (dataType.includes('bit') || dataType.includes('boolean')) {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleInputChange(columnName, e.target.checked)}
            style={{ 
              margin: 0, 
              width: '18px', 
              height: '18px',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: '14px', color: '#374151' }}>Yes</span>
        </label>
      );
    } else if (dataType.includes('text') || columnName.toLowerCase().includes('note')) {
      return (
        <textarea
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          placeholder={`Enter ${formatColumnName(columnName).toLowerCase()}`}
          rows={4} // ✅ INCREASED: More rows for better readability
          style={{
            ...baseStyle,
            resize: 'vertical',
            minHeight: '100px'
          }}
          onFocus={(e) => Object.assign(e.target.style, focusStyle)}
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#e5e7eb', boxShadow: 'none' })}
        />
      );
    } else if (dataType.includes('date') && !columnName.toLowerCase().includes('time')) {
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={baseStyle}
          onFocus={(e) => Object.assign(e.target.style, focusStyle)}
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#e5e7eb', boxShadow: 'none' })}
        />
      );
    } 
    // ✅ FIXED: Specific detection for start_time and end_time fields
    else if (columnName.toLowerCase().includes('start_time') || columnName.toLowerCase().includes('end_time')) {
      // Convert any existing datetime value to just time format
      let timeValue = value;
      if (value && typeof value === 'string') {
        if (value.includes('T')) {
          // If it's a datetime string, extract just the time part
          timeValue = value.split('T')[1]?.substring(0, 5) || '';
        } else if (value.includes(' ')) {
          // If it's a datetime with space, extract time part
          timeValue = value.split(' ')[1]?.substring(0, 5) || '';
        } else if (value.length > 5 && value.includes(':')) {
          // If it's some other long format, try to extract time
          timeValue = value.substring(0, 5);
        }
      }
      
      return (
        <input
          type="time"
          value={timeValue}
          onChange={(e) => {
            // Store only the time value (HH:MM format)
            handleInputChange(columnName, e.target.value);
          }}
          style={baseStyle}
          onFocus={(e) => Object.assign(e.target.style, focusStyle)}
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#e5e7eb', boxShadow: 'none' })}
        />
      );
    }
    // ✅ FIXED: Handle estimated_time and actual_time fields in hours
    else if (columnName.toLowerCase().includes('estimated_time') || columnName.toLowerCase().includes('actual_time')) {
      // Convert stored minutes to hours for display
      const displayValue = value ? (parseFloat(value) / 60).toString() : '';
      
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            value={displayValue}
            onChange={(e) => {
              const hours = parseFloat(e.target.value);
              // Convert hours to minutes for storage
              const minutes = hours ? Math.round(hours * 60) : '';
              handleInputChange(columnName, minutes);
            }}
            placeholder="Enter hours (e.g., 2.5)"
            step="0.25" // Allow quarter-hour increments
            min="0"
            style={baseStyle}
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#e5e7eb', boxShadow: 'none' })}
          />
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px',
            fontStyle: 'italic'
          }}>
            Enter in hours (e.g., 2.5 = 2 hours 30 minutes)
            {displayValue && ` = ${Math.round(parseFloat(displayValue) * 60)} minutes`}
          </div>
        </div>
      );
    }
    
    // ✅ Handle other time fields (generic)
    else if (dataType.includes('time') || columnName.toLowerCase().includes('time') && !columnName.toLowerCase().includes('expected_down_time')) {
      return (
        <input
          type="time"
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={baseStyle}
          onFocus={(e) => Object.assign(e.target.style, focusStyle)}
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#e5e7eb', boxShadow: 'none' })}
        />
      );
    } else if (dataType.includes('int') || dataType.includes('decimal') || dataType.includes('float')) {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          placeholder={`Enter ${formatColumnName(columnName).toLowerCase()}`}
          style={baseStyle}
          onFocus={(e) => Object.assign(e.target.style, focusStyle)}
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#e5e7eb', boxShadow: 'none' })}
        />
      );
    } else {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          placeholder={`Enter ${formatColumnName(columnName).toLowerCase()}`}
          style={baseStyle}
          onFocus={(e) => Object.assign(e.target.style, focusStyle)}
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#e5e7eb', boxShadow: 'none' })}
        />
      );
    }
  };

  if (!isOpen) return null;

  const filteredColumns = columns.filter(column => 
    !['id', 'created_at', 'updated_at'].includes(column.COLUMN_NAME.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px' // ✅ NEW: Padding for mobile
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '700px', // ✅ INCREASED: Wider modal
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '24px', // ✅ INCREASED: More padding
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px' }}>📝 Add New Log Entry</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px', // ✅ INCREASED: Larger close button
              cursor: 'pointer',
              color: '#6b7280',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div style={{
            padding: '24px', // ✅ INCREASED: More padding
            maxHeight: '60vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '32px 40px', // ✅ FIXED: First value = vertical gap, Second value = horizontal gap
              // Alternative: columnGap: '40px', rowGap: '32px'
            }}>
              {filteredColumns.map(column => (
                <div key={column.COLUMN_NAME} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px' // ✅ Space between label and input
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    {formatColumnName(column.COLUMN_NAME)}
                    {column.IS_NULLABLE === 'NO' && (
                      <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                    )}
                  </label>
                  {renderInput(column)}
                  {errors[column.COLUMN_NAME] && (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '13px',
                      color: '#ef4444',
                      padding: '4px 8px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '4px',
                      border: '1px solid #fecaca'
                    }}>
                      {errors[column.COLUMN_NAME]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {errors.submit && (
              <div style={{
                marginTop: '24px', // ✅ INCREASED: More space above submit error
                padding: '16px', // ✅ INCREASED: More padding
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px', // ✅ INCREASED: More rounded
                color: '#dc2626',
                fontSize: '14px'
              }}>
                <strong>Error:</strong> {errors.submit}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '24px', // ✅ INCREASED: More padding
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '16px', // ✅ INCREASED: More space between buttons
            justifyContent: 'flex-end',
            backgroundColor: '#f8fafc'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '12px 24px', // ✅ INCREASED: Bigger buttons
                border: '2px solid #d1d5db', // ✅ INCREASED: Thicker border
                borderRadius: '8px', // ✅ INCREASED: More rounded
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#9ca3af';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = '#d1d5db';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px 24px', // ✅ INCREASED: Bigger buttons
                border: 'none',
                borderRadius: '8px', // ✅ INCREASED: More rounded
                backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {isLoading ? '⏳ Saving...' : '💾 Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}