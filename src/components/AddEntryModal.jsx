import React, { useState, useEffect } from 'react';

export default function AddEntryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  columns = [], 
  getExistingDistricts, 
  getExistingIncidents,
  currentUser 
}) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [districtSuggestions, setDistrictSuggestions] = useState([]);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
  const [incidentSuggestions, setIncidentSuggestions] = useState([]); 
  const [showIncidentSuggestions, setShowIncidentSuggestions] = useState(false); 
  const [isRecurrence, setIsRecurrence] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly'); // 'weekly' or 'monthly'
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('');
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState('');

  useEffect(() => {
    if (isOpen && columns.length > 0) {
      const initialData = {};
      columns.forEach(column => {
        if (!['id', 'created_at', 'updated_at'].includes(column.COLUMN_NAME.toLowerCase())) {
          let defaultValue = getDefaultValue(column);
          
          initialData[column.COLUMN_NAME] = defaultValue;
        }
      });
      setFormData(initialData);
      setErrors({});
    }
  }, [isOpen, columns, currentUser]);

  const getDefaultValue = (column) => {
    const dataType = column.DATA_TYPE.toLowerCase();
    const columnName = column.COLUMN_NAME.toLowerCase();

    if (dataType.includes('bit') || dataType.includes('boolean')) {
      return false;
    } else if (dataType.includes('date')) {
      return new Date().toISOString().split('T')[0];
    } else if (dataType.includes('time')) {
      return '08:00'; 
    } else if (columnName === 'log_status') {
      return 'Scheduled'; 
    } else if (columnName === 'log_type') {
      return 'Operational'; 
    } else if (columnName === 'uploader') {
      return currentUser?.username || 'Unknown User';
    } else {
      return '';
    }
  };

  const handleInputChange = (columnName, value) => {
    setFormData(prev => ({
      ...prev,
      [columnName]: value
    }));
    
    if (errors[columnName]) {
      setErrors(prev => ({
        ...prev,
        [columnName]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const submissionData = {
        ...formData,
        uploader: currentUser?.username || 'Unknown User',
        isRecurrence,
        recurrence_type: isRecurrence ? recurrenceType : null,
        day_of_the_week: isRecurrence && recurrenceType === 'weekly' ? selectedDayOfWeek : null,
        day_of_the_month: isRecurrence && recurrenceType === 'monthly' ? selectedDayOfMonth : null
      };
      
      await onSave(submissionData);
      resetForm();
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const requiredFields = {
      'incident': 'Incident',
      'district': 'District', 
      'log_date': 'Log Date',
      'business_impact': 'Business Impact',
      'log_start': 'Log Start Time',
      'log_end': 'Log End Time', 
      'log_status': 'Log Status',
      'log_type': 'Log Type',
      'uploader': 'Uploader'
    };
    
    Object.entries(requiredFields).forEach(([fieldName, displayName]) => {
      const value = formData[fieldName];
      if (!value && value !== false && value !== 0) {
        newErrors[fieldName] = `${displayName} is required`;
      }
    });
  
    if (formData.log_start && formData.log_end) {
      if (formData.log_end <= formData.log_start) {
        newErrors.log_end = 'End time must be after start time';
      }
    }
    
    if (isRecurrence) {
      if (recurrenceType === 'weekly' && !selectedDayOfWeek) {
        newErrors.recurrence = 'Please select a day of the week for weekly recurrence';
      }
      if (recurrenceType === 'monthly' && !selectedDayOfMonth) {
        newErrors.recurrence = 'Please select a day of the month for monthly recurrence';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatColumnName = (columnName) => {
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  useEffect(() => {
    if (isOpen) {
      if (getExistingDistricts) {
        try {
          const existingDistricts = getExistingDistricts();
          setDistrictSuggestions(existingDistricts || []);
        } catch (error) {
          setDistrictSuggestions([]);
        }
      } else {
        setDistrictSuggestions([]);
      }

      if (getExistingIncidents) {
        try {
          const existingIncidents = getExistingIncidents();
          setIncidentSuggestions(existingIncidents || []);
        } catch (error) {
          setIncidentSuggestions([]);
        }
      } else {
        setIncidentSuggestions([]);
      }
    } else {
      setDistrictSuggestions([]);
      setIncidentSuggestions([]);
    }
  }, [isOpen, getExistingDistricts, getExistingIncidents]);

  const getFilteredDistrictSuggestions = (inputValue) => {
    if (!districtSuggestions || districtSuggestions.length === 0) {
      return [];
    }
    
    if (!inputValue || inputValue.length === 0) {
      return districtSuggestions;
    }
    
    return districtSuggestions.filter(district =>
      district && district.toLowerCase().startsWith(inputValue.toLowerCase())
    );
  };

  const getFilteredIncidentSuggestions = (inputValue) => {
    if (!incidentSuggestions || incidentSuggestions.length === 0) {
      return [];
    }
    
    if (!inputValue || inputValue.length === 0) {
      return incidentSuggestions;
    }
    
    return incidentSuggestions.filter(incident =>
      incident && incident.toLowerCase().includes(inputValue.toLowerCase())
    );
  };

  // Generate day of month options
  const getDayOfMonthOptions = () => {
    const options = [];
    for (let i = 1; i <= 31; i++) {
      options.push({
        value: i.toString(),
        label: `${i}${getOrdinalSuffix(i)} day of the month`
      });
    }
    // Add special options
    options.push({
      value: 'last',
      label: 'Last day of the month'
    });
    options.push({
      value: 'last-weekday',
      label: 'Last weekday of the month'
    });
    return options;
  };

  const getOrdinalSuffix = (num) => {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }
    
    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const renderInput = (column) => {
    const columnName = column.COLUMN_NAME;
    const dataType = column.DATA_TYPE.toLowerCase();
    const value = formData[columnName] || '';
    const hasError = errors[columnName];

    const baseStyle = {
      width: '100%',
      padding: '12px 16px',
      border: `2px solid ${hasError ? '#ef4444' : '#475569'}`,
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: hasError ? '#7f1d1d' : '#334155',
      color: '#e2e8f0',
      transition: 'border-color 0.2s ease',
      outline: 'none'
    };

    const focusStyle = {
      borderColor: '#60a5fa',
      boxShadow: '0 0 0 3px rgba(96, 165, 250, 0.1)'
    };

    if (columnName.toLowerCase().includes('uploader')) {
      const uploaderValue = currentUser?.username || 'Unknown User';
      
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={uploaderValue}
            readOnly
            style={{
              ...baseStyle,
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              cursor: 'not-allowed',
              fontWeight: '500'
            }}
          />
          <div style={{
            fontSize: '12px',
            color: '#94a3b8',
            marginTop: '4px',
            fontStyle: 'italic'
          }}>
            Automatically set to current user
          </div>
        </div>
      );
    }
    
    else if (columnName.toLowerCase().includes('incident')) {
      const filteredSuggestions = getFilteredIncidentSuggestions(value);
      
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const inputValue = e.target.value;
              handleInputChange(columnName, inputValue);
              setShowIncidentSuggestions(inputValue.length > 0 && filteredSuggestions.length > 0);
            }}
            onFocus={() => {
              const filteredSuggestions = getFilteredIncidentSuggestions(value);
              setShowIncidentSuggestions(filteredSuggestions.length > 0);
            }}
            onBlur={() => {
              setTimeout(() => setShowIncidentSuggestions(false), 200);
            }}
            style={{
              ...baseStyle,
              fontWeight: '500'
            }}
          />
          
          {/* Autocomplete suggestions for incidents */}
          {showIncidentSuggestions && filteredSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#1e293b',
              border: '2px solid #475569',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {filteredSuggestions.slice(0, 8).map((incident, index) => (
                <div
                  key={incident}
                  onClick={() => {
                    handleInputChange(columnName, incident);
                    setShowIncidentSuggestions(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #334155' : 'none',
                    backgroundColor: '#1e293b',
                    transition: 'background-color 0.2s ease',
                    fontSize: '14px',
                    fontWeight: '400',
                    color: '#e2e8f0'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#334155';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#1e293b';
                  }}
                >
                  {incident}
                </div>
              ))}
              
              {filteredSuggestions.length > 8 && (
                <div style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  backgroundColor: '#334155'
                }}>
                  +{filteredSuggestions.length - 8} more...
                </div>
              )}
              
              {/* Show "Type to add new" hint */}
              <div style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: '#94a3b8',
                fontStyle: 'italic',
                textAlign: 'center',
                backgroundColor: '#334155',
                borderTop: '1px solid #475569'
              }}>
                💡 Keep typing to add a new incident
              </div>
            </div>
          )}
        </div>
      );
    }
    
    else if (columnName.toLowerCase() === 'log_type') {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={{
            ...baseStyle,
            cursor: 'pointer'
          }}
          onFocus={(e) => Object.assign(e.target.style, focusStyle)}
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#475569', boxShadow: 'none' })}
        >
          <option value="">Select log type...</option>
          <option value="Operational">🔧 Operational</option>
          <option value="Application">💻 Application</option>
        </select>
      );
    }
    
    else if (columnName.toLowerCase() === 'log_status') {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={{
            ...baseStyle,
            cursor: 'pointer'
          }}
          onFocus={(e) => Object.assign(e.target.style, focusStyle)}
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#475569', boxShadow: 'none' })}
        >
          <option value="">Select status...</option>
          <option value="Completed">✅ Completed</option>
          <option value="Scheduled">📅 Scheduled</option>
        </select>
      );
    }
    
    else if (columnName.toLowerCase().includes('district')) {
      const filteredSuggestions = getFilteredDistrictSuggestions(value);
      
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              let inputValue = e.target.value.toUpperCase(); 
              
              if (inputValue.length > 3) {
                inputValue = inputValue.slice(0, 3);
              }
              inputValue = inputValue.replace(/[^A-Z]/g, '');
              
              handleInputChange(columnName, inputValue);
              const currentFilteredSuggestions = getFilteredDistrictSuggestions(inputValue);
              setShowDistrictSuggestions(currentFilteredSuggestions.length > 0);
            }}
            onFocus={() => {
              const currentFilteredSuggestions = getFilteredDistrictSuggestions(value);
              setShowDistrictSuggestions(currentFilteredSuggestions.length > 0);
            }}
            onBlur={() => {
              setTimeout(() => setShowDistrictSuggestions(false), 200);
            }}
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
              backgroundColor: '#1e293b',
              border: '2px solid #475569',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {filteredSuggestions.slice(0, 8).map((district, index) => (
                <div
                  key={district}
                  onClick={() => {
                    handleInputChange(columnName, district);
                    setShowDistrictSuggestions(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #334155' : 'none',
                    backgroundColor: '#1e293b',
                    transition: 'background-color 0.2s ease',
                    fontSize: '14px',
                    fontWeight: '500',
                    letterSpacing: '1px',
                    color: '#e2e8f0'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#334155';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#1e293b';
                  }}
                >
                  {district}
                </div>
              ))}
              
              {filteredSuggestions.length > 8 && (
                <div style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  backgroundColor: '#334155'
                }}>
                  +{filteredSuggestions.length - 8} more...
                </div>
              )}
              
              <div style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: '#94a3b8',
                fontStyle: 'italic',
                textAlign: 'center',
                backgroundColor: '#334155',
                borderTop: '1px solid #475569'
              }}>
                💡 Type to filter existing or add new district
              </div>
            </div>
          )}
        </div>
      );
    } 
    else if (columnName.toLowerCase().includes('estimated_time') || columnName.toLowerCase().includes('actual_time')) {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            value={value} // Use value directly as hours
            onChange={(e) => {
              // Store the value directly as hours (decimal)
              const hours = parseFloat(e.target.value) || '';
              handleInputChange(columnName, hours);
            }}
            placeholder="Enter hours (e.g., 2.5)"
            step="0.25" 
            min="0"
            style={baseStyle}
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#475569', boxShadow: 'none' })}
          />
          <div style={{
            fontSize: '12px',
            color: '#94a3b8',
            marginTop: '4px',
            fontStyle: 'italic'
          }}>
            {value && `= ${Math.round(parseFloat(value) * 60)} minutes`}
          </div>
        </div>
      );
    }
    
    else if (dataType.includes('time') || columnName.toLowerCase().includes('time') && !columnName.toLowerCase().includes('expected_down_time')) {
      return (
        <input
          type="time"
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={{
            ...baseStyle,
            colorScheme: 'dark'
          }}
          onFocus={(e) => Object.assign(e.target.style, focusStyle)}
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#475569', boxShadow: 'none' })}
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
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#475569', boxShadow: 'none' })}
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
          onBlur={(e) => Object.assign(e.target.style, { borderColor: hasError ? '#ef4444' : '#475569', boxShadow: 'none' })}
        />
      );
    }
  };

  const resetForm = () => {
    setFormData({});
    setErrors({});
    setIsRecurrence(false);
    setRecurrenceType('weekly');
    setSelectedDayOfWeek('');
    setSelectedDayOfMonth('');
  };

  if (!isOpen) return null;

  const filteredColumns = columns.filter(column => 
    !['id', 'created_at', 'updated_at', 'uploader'].includes(column.COLUMN_NAME.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        border: '1px solid #1e293b'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1e293b'
        }}>
          <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '20px' }}>📝 Add New Log Entry</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#64748b',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#334155'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div style={{
            padding: '24px',
            backgroundColor: '#0f172a',
            maxHeight: '60vh',
            overflowY: 'auto'
          }}>
            {/* Existing form grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 300px))',
              gap: '24px 32px',
              justifyContent: 'start'
            }}>
              {filteredColumns.map(column => (
                <div key={column.COLUMN_NAME} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxWidth: '280px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#e2e8f0',
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
                      color: '#fecaca',
                      padding: '4px 8px',
                      backgroundColor: '#7f1d1d',
                      borderRadius: '4px',
                      border: '1px solid #ef4444'
                    }}>
                      {errors[column.COLUMN_NAME]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Enhanced Recurrence Section */}
            <div style={{
              marginTop: '32px',
              padding: '20px',
              backgroundColor: isRecurrence ? '#1e40af' : '#1e293b',
              border: `2px solid ${isRecurrence ? '#3b82f6' : '#334155'}`,
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '24px' }}>
                  {isRecurrence ? '🔄' : '⭕'}
                </div>
                <h4 style={{
                  margin: 0,
                  color: isRecurrence ? '#dbeafe' : '#e2e8f0',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  Recurrence Settings
                </h4>
                {isRecurrence && (
                  <div style={{
                    padding: '4px 8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {recurrenceType === 'weekly' && selectedDayOfWeek && `Every ${selectedDayOfWeek}`}
                    {recurrenceType === 'monthly' && selectedDayOfMonth && (
                      selectedDayOfMonth === 'last' ? 'Last day of month' :
                      selectedDayOfMonth === 'last-weekday' ? 'Last weekday of month' :
                      `${selectedDayOfMonth}${getOrdinalSuffix(parseInt(selectedDayOfMonth))} of month`
                    )}
                  </div>
                )}
              </div>
              
              {/* Recurrence Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <input
                  type="checkbox"
                  id="isRecurrence"
                  checked={isRecurrence}
                  onChange={(e) => {
                    setIsRecurrence(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedDayOfWeek('');
                      setSelectedDayOfMonth('');
                    }
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <label 
                  htmlFor="isRecurrence"
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  This is a recurring event
                </label>
              </div>
              
              {/* Recurrence Type Selection */}
              {isRecurrence && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#e2e8f0',
                    marginBottom: '8px'
                  }}>
                    🔁 Recurrence Type *
                  </label>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '8px 16px',
                      backgroundColor: recurrenceType === 'weekly' ? '#3b82f6' : '#334155',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="recurrenceType"
                        value="weekly"
                        checked={recurrenceType === 'weekly'}
                        onChange={(e) => {
                          setRecurrenceType(e.target.value);
                          setSelectedDayOfMonth(''); // Clear monthly selection
                        }}
                        style={{ margin: 0 }}
                      />
                      <span style={{ color: '#e2e8f0', fontSize: '14px' }}>📅 Weekly</span>
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '8px 16px',
                      backgroundColor: recurrenceType === 'monthly' ? '#3b82f6' : '#334155',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="recurrenceType"
                        value="monthly"
                        checked={recurrenceType === 'monthly'}
                        onChange={(e) => {
                          setRecurrenceType(e.target.value);
                          setSelectedDayOfWeek(''); // Clear weekly selection
                        }}
                        style={{ margin: 0 }}
                      />
                      <span style={{ color: '#e2e8f0', fontSize: '14px' }}>🗓️ Monthly</span>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Day of Week Selection (Weekly) */}
              {isRecurrence && recurrenceType === 'weekly' && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#e2e8f0',
                    marginBottom: '8px'
                  }}>
                    📅 Day of the Week *
                  </label>
                  <select
                    value={selectedDayOfWeek}
                    onChange={(e) => setSelectedDayOfWeek(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      padding: '12px 16px',
                      border: `2px solid ${errors.recurrence ? '#ef4444' : '#334155'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: errors.recurrence ? '#7f1d1d' : '#1e293b',
                      color: '#e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a day...</option>
                    <option value="monday">📅 Monday</option>
                    <option value="tuesday">📅 Tuesday</option>
                    <option value="wednesday">📅 Wednesday</option>
                    <option value="thursday">📅 Thursday</option>
                    <option value="friday">📅 Friday</option>
                    <option value="saturday">📅 Saturday</option>
                    <option value="sunday">📅 Sunday</option>
                  </select>
                </div>
              )}

              {/* Day of Month Selection (Monthly) */}
              {isRecurrence && recurrenceType === 'monthly' && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#e2e8f0',
                    marginBottom: '8px'
                  }}>
                    🗓️ Day of the Month *
                  </label>
                  <select
                    value={selectedDayOfMonth}
                    onChange={(e) => setSelectedDayOfMonth(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      padding: '12px 16px',
                      border: `2px solid ${errors.recurrence ? '#ef4444' : '#334155'}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: errors.recurrence ? '#7f1d1d' : '#1e293b',
                      color: '#e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a day...</option>
                    {getDayOfMonthOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  
                  <div style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    marginTop: '6px',
                    fontStyle: 'italic'
                  }}>
                    💡 If the selected day doesn't exist in a month (e.g., 31st in February), it will use the last available day of that month.
                  </div>
                </div>
              )}
              
              {errors.recurrence && (
                <div style={{
                  fontSize: '12px',
                  color: '#fecaca',
                  marginTop: '6px',
                  fontStyle: 'italic'
                }}>
                  {errors.recurrence}
                </div>
              )}
            </div>

            {/* Submit error section */}
            {errors.submit && (
              <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#7f1d1d',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#fecaca',
                fontSize: '14px'
              }}>
                <strong>Error:</strong> {errors.submit}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            gap: '16px',
            justifyContent: 'flex-end',
            backgroundColor: '#1e293b'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                border: '2px solid #334155',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#1e293b';
                e.target.style.borderColor = '#475569';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#0f172a';
                e.target.style.borderColor = '#334155';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: isLoading ? '#64748b' : '#3b82f6',
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