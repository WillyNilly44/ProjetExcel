import React, { useState, useEffect } from 'react';

export default function AddEntryModal({ isOpen, onClose, onSave, columns = [], getExistingDistricts }) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [districtSuggestions, setDistrictSuggestions] = useState([]);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);

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
    
    const newErrors = {};
    
    columns.forEach(column => {
      const columnName = column.COLUMN_NAME;
      const value = formData[columnName];
      
      
      // Skip auto-generated columns
      if (['id', 'created_at', 'updated_at'].includes(columnName.toLowerCase())) {
        return;
      }
      
      // Check required fields - be more specific about empty values
      if (column.IS_NULLABLE === 'NO') {
        if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
          newErrors[columnName] = 'This field is required';
        } else {
        }
      }
      
      // ✅ NEW: District-specific validation
      if (columnName.toLowerCase().includes('district') && value) {
        if (value.length !== 3) {
          newErrors[columnName] = 'District must be exactly 3 characters';
        } else if (!/^[A-Z]{3}$/.test(value)) {
          newErrors[columnName] = 'District must contain only uppercase letters';
        }
      }
      
      // Email validation (if you have email fields)
      if (columnName.toLowerCase().includes('email') && value && !value.includes('@')) {
        newErrors[columnName] = 'Please enter a valid email address';
      }
    });
    
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    return isValid;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onSave(formData);
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

  // Add useEffect to get existing districts when form opens:
  useEffect(() => {
    if (isOpen && getExistingDistricts) { // ✅ Check if function exists
      try {
        const existingDistricts = getExistingDistricts();
        setDistrictSuggestions(existingDistricts || []);
      } catch (error) {
        console.warn('Could not load existing districts:', error);
        setDistrictSuggestions([]);
      }
    } else {
      setDistrictSuggestions([]); // ✅ Set empty array if no function
    }
  }, [isOpen, getExistingDistricts]); // ✅ Add getExistingDistricts to dependencies

  // Add function to filter district suggestions:
  const getFilteredDistrictSuggestions = (inputValue) => {
    if (!districtSuggestions || districtSuggestions.length === 0) {
      return []; // ✅ Return empty array if no suggestions
    }
    
    if (!inputValue || inputValue.length === 0) {
      return districtSuggestions;
    }
    
    return districtSuggestions.filter(district =>
      district && district.toLowerCase().startsWith(inputValue.toLowerCase())
    );
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

    // ✅ NEW: Special handling for district field
    if (columnName.toLowerCase().includes('district')) {
      const filteredSuggestions = getFilteredDistrictSuggestions(value);
      
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              let inputValue = e.target.value.toUpperCase(); // Convert to uppercase
              
              // Limit to 3 characters
              if (inputValue.length > 3) {
                inputValue = inputValue.slice(0, 3);
              }
              
              // Only allow letters
              inputValue = inputValue.replace(/[^A-Z]/g, '');
              
              handleInputChange(columnName, inputValue);
              setShowDistrictSuggestions(inputValue.length > 0 && filteredSuggestions.length > 0);
            }}
            onFocus={() => {
              const filteredSuggestions = getFilteredDistrictSuggestions(value);
              setShowDistrictSuggestions(value.length > 0 && filteredSuggestions.length > 0);
            }}
            onBlur={() => {
              // Delay hiding suggestions to allow clicks
              setTimeout(() => setShowDistrictSuggestions(false), 200);
            }}
            placeholder=""
            maxLength={3}
            style={{
              ...baseStyle,
              textTransform: 'uppercase',
              fontWeight: '500',
              letterSpacing: '1px'
            }}
          />
          
          {/* Autocomplete suggestions */}
          {showDistrictSuggestions && filteredSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '2px solid #e5e7eb',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {filteredSuggestions.slice(0, 5).map((district, index) => (
                <div
                  key={district}
                  onClick={() => {
                    handleInputChange(columnName, district);
                    setShowDistrictSuggestions(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                    backgroundColor: 'white',
                    transition: 'background-color 0.2s ease',
                    fontSize: '14px',
                    fontWeight: '500',
                    letterSpacing: '1px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white';
                  }}
                >
                  {district}
                </div>
              ))}
              
              {filteredSuggestions.length > 5 && (
                <div style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb'
                }}>
                  +{filteredSuggestions.length - 5} more...
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else if (dataType.includes('bit') || dataType.includes('boolean')) {
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
            padding: '24px',
            maxHeight: '60vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 300px))', // ✅ CHANGED: Reduced from 280px to 200px min, 300px max
              gap: '24px 32px', // ✅ REDUCED: Less spacing
              justifyContent: 'start' // ✅ NEW: Align items to the left instead of stretching
            }}>
              {filteredColumns.map(column => (
                <div key={column.COLUMN_NAME} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px', // ✅ REDUCED: Less space between label and input
                  maxWidth: '280px' // ✅ NEW: Maximum width constraint
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