import React, { useState, useEffect } from 'react';
import '../styles/components/modals.css';
import '../styles/components/forms.css';

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
  const [currentStep, setCurrentStep] = useState(1);
  const [isRecurrence, setIsRecurrence] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('');
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState('');
  // monthly pattern support
  const [monthlyPattern, setMonthlyPattern] = useState('day'); // 'day' or 'weekday'
  const [monthlyDay, setMonthlyDay] = useState(''); // numeric day or 'last'
  const [monthlyWeekOccurrence, setMonthlyWeekOccurrence] = useState('first'); // first, second, third, fourth, last
  const [monthlyWeekday, setMonthlyWeekday] = useState('monday');
  const [applicationFields, setApplicationFields] = useState({
    company: '',
    ticket_number: '',
    project_name: '',
    identified_user_impact: '',
    post_maintenance_testing: '',
    rollback_plan: '',
    wiki_diagram_updated: false,
    communication_to_user: '',
    s3_support_ready: false
  });

  // Helper functions
  const isRequiredField = (columnName) => {
    const requiredFields = [
      'log_type', 'approver', 'log_status', 'actual_time', 'log_start',
      'incident', 'district', 'log_date', 'event_main', 'event_incid'
    ];
    return requiredFields.includes(columnName.toLowerCase());
  };

  // Fields to hide from step 2 display
  const isHiddenField = (columnName) => {
    const hiddenFields = [
      'uploader', // Hide uploader from step 2
      'recurrence_type', 'day_of_the_week', 'day_of_the_month' // Hide recurrence fields from step 2
    ];
    
    // Hide ticket_number from optional fields if it's an application log (we show it in application section)
    if (isApplicationLog() && columnName.toLowerCase() === 'ticket_number') {
      return true;
    }
    
    return hiddenFields.includes(columnName.toLowerCase());
  };

  const formatColumnName = (columnName) => {
    // Handle specific field mappings
    const fieldMappings = {
      'rca': 'Root Call Analysis',
      'incident': 'Incident Name',
      'real_bus_impact': 'Real Business Impact'
    };
    
    const lowerColumnName = columnName.toLowerCase();
    if (fieldMappings[lowerColumnName]) {
      return fieldMappings[lowerColumnName];
    }
    
    // Default formatting for other fields
    return columnName.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const isApplicationLog = () => formData.log_type === 'Application';

  // Calculate log end time based on log start + actual time
  const calculateLogEnd = (logStart, actualTime) => {
    if (!logStart || !actualTime) return '';
    
    try {
      // Parse the start time
      const [startHours, startMinutes] = logStart.split(':').map(Number);
      
      // Parse actual time (assuming it's in hours format like "2.5" or "1")
      const actualHours = parseFloat(actualTime);
      if (isNaN(actualHours)) return '';
      
      // Calculate total minutes
      const startTotalMinutes = startHours * 60 + startMinutes;
      const actualMinutes = actualHours * 60;
      const endTotalMinutes = startTotalMinutes + actualMinutes;
      
      // Convert back to hours and minutes
      const endHours = Math.floor(endTotalMinutes / 60) % 24; // Handle day overflow
      const endMinutes = Math.floor(endTotalMinutes % 60);
      
      // Format as HH:MM
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.warn('Error calculating log end time:', error);
      return '';
    }
  };

  const getDefaultValue = (column) => {
    const columnName = column.COLUMN_NAME.toLowerCase();
    const dataType = column.DATA_TYPE.toLowerCase();

    if (dataType.includes('bit')) return false;
    if (dataType.includes('date')) return new Date().toISOString().split('T')[0];
    if (dataType.includes('time')) return '08:00';
    if (columnName === 'log_status') return 'Scheduled';
    if (columnName === 'log_type') return 'Operational';
    if (columnName === 'uploader') return currentUser?.username || 'Unknown User';
    if (columnName === 'event_main' || columnName === 'event_incid') return '0'; // Default to Maintenance
    if (columnName === 'actual_time') return '1'; // Default 1 hour
    return '';
  };

  // Initialize form
  useEffect(() => {
    if (isOpen && columns.length > 0) {
      const initialData = {};
      columns.forEach(column => {
        if (column.COLUMN_NAME.toLowerCase() !== 'id') {
          initialData[column.COLUMN_NAME] = getDefaultValue(column);
        }
      });
      
      // Calculate initial log_end if we have log_start and actual_time
      if (initialData.log_start && initialData.actual_time) {
        initialData.log_end = calculateLogEnd(initialData.log_start, initialData.actual_time);
      }
      
      setFormData(initialData);
      setErrors({});
      setCurrentStep(1);
      setIsRecurrence(false); // Reset recurrence state
      setRecurrenceType('weekly');
      setSelectedDayOfWeek('');
      setSelectedDayOfMonth('');
      setMonthlyPattern('day');
      setMonthlyDay('');
      setMonthlyWeekOccurrence('first');
      setMonthlyWeekday('monday');
      setApplicationFields({
        company: '', ticket_number: '', project_name: '',
        identified_user_impact: '', post_maintenance_testing: '',
        rollback_plan: '', wiki_diagram_updated: false,
        communication_to_user: '', s3_support_ready: false
      });
    }
  }, [isOpen, columns, currentUser]);

  // Sync application ticket_number with main form when log_type changes
  useEffect(() => {
    if (isApplicationLog() && applicationFields.ticket_number) {
      setFormData(prev => ({ ...prev, ticket_number: applicationFields.ticket_number }));
    }
  }, [formData.log_type, applicationFields.ticket_number]);

  // Auto-update log_end when log_start or actual_time changes
  useEffect(() => {
    if (formData.log_start && formData.actual_time) {
      const newLogEnd = calculateLogEnd(formData.log_start, formData.actual_time);
      if (newLogEnd && newLogEnd !== formData.log_end) {
        setFormData(prev => ({ ...prev, log_end: newLogEnd }));
      }
    }
  }, [formData.log_start, formData.actual_time]);

  const handleInputChange = (columnName, value) => {
    setFormData(prev => ({ ...prev, [columnName]: value }));
    if (errors[columnName]) {
      setErrors(prev => ({ ...prev, [columnName]: null }));
    }
  };

  const handleApplicationFieldChange = (fieldName, value) => {
    setApplicationFields(prev => ({ ...prev, [fieldName]: value }));
    
    // Also update the main form data for ticket_number
    if (fieldName === 'ticket_number') {
      setFormData(prev => ({ ...prev, ticket_number: value }));
    }
    
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  // Handle event type change (both event_main and event_incid)
  const handleEventTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      event_main: value,
      event_incid: value
    }));
    // Clear any errors for both fields
    if (errors.event_main) {
      setErrors(prev => ({ ...prev, event_main: null }));
    }
    if (errors.event_incid) {
      setErrors(prev => ({ ...prev, event_incid: null }));
    }
  };

  // Simple input renderer
  const renderSimpleInput = (column) => {
    const columnName = column.COLUMN_NAME;
    const value = formData[columnName] || '';
    const hasError = errors[columnName];

    const inputStyle = {
      width: '100%',
      padding: '8px 12px',
      border: `1px solid ${hasError ? '#dc2626' : '#d1d5db'}`,
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s'
    };

    // Special case: Skip event_incid as it will be combined with event_main
    if (columnName.toLowerCase() === 'event_incid') {
      return null; // Don't render separately
    }

    // Special case: Log End (auto-calculated, read-only)
    if (columnName.toLowerCase() === 'log_end') {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="time"
            value={value}
            readOnly
            style={{
              ...inputStyle,
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              cursor: 'not-allowed'
            }}
          />
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: '#6b7280',
            pointerEvents: 'none'
          }}>
            🧮 Auto
          </div>
        </div>
      );
    }

    // Special case: Event Type (combines event_main and event_incid)
    if (columnName.toLowerCase() === 'event_main') {
      return (
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Event Type *
          </label>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '10px 16px',
              backgroundColor: formData.event_incid === '1' ? '#dc2626' : '#f3f4f6',
              borderRadius: '6px',
              border: `2px solid ${formData.event_incid === '1' ? '#dc2626' : '#d1d5db'}`,
              transition: 'all 0.2s ease',
              minWidth: '140px',
              justifyContent: 'center'
            }}>
              <input
                type="radio"
                name="event_type"
                value="1"
                checked={formData.event_incid === '1'}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                style={{ margin: 0 }}
              />
              <span style={{ 
                color: formData.event_incid === '1' ? 'white' : '#374151',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                🚨 Incident
              </span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '10px 16px',
              backgroundColor: formData.event_incid === '0' ? '#059669' : '#f3f4f6',
              borderRadius: '6px',
              border: `2px solid ${formData.event_incid === '0' ? '#059669' : '#d1d5db'}`,
              transition: 'all 0.2s ease',
              minWidth: '140px',
              justifyContent: 'center'
            }}>
              <input
                type="radio"
                name="event_type"
                value="0"
                checked={formData.event_incid === '0'}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                style={{ margin: 0 }}
              />
              <span style={{ 
                color: formData.event_incid === '0' ? 'white' : '#374151',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                🔧 Maintenance
              </span>
            </label>
          </div>
          {(errors.event_main || errors.event_incid) && (
            <div style={{
              marginTop: '4px',
              fontSize: '12px',
              color: '#dc2626'
            }}>
              Event Type is required
            </div>
          )}
        </div>
      );
    }

    // Special cases for other fields
    if (columnName.toLowerCase() === 'log_type') {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={inputStyle}
        >
          <option value="">Select...</option>
          <option value="Operational">🔧 Operational</option>
          <option value="Application">💻 Application</option>
        </select>
      );
    }

    if (columnName.toLowerCase() === 'log_status') {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={inputStyle}
        >
          <option value="">Select...</option>
          <option value="Completed">✅ Completed</option>
          <option value="Scheduled">📅 Scheduled</option>
        </select>
      );
    }

    if (column.DATA_TYPE.toLowerCase().includes('time')) {
      return (
        <input
          type="time"
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={inputStyle}
        />
      );
    }

    if (column.DATA_TYPE.toLowerCase().includes('date')) {
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={inputStyle}
        />
      );
    }

    // Special case for actual_time - number input with step
    if (columnName.toLowerCase() === 'actual_time') {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(columnName, e.target.value)}
            style={{
              ...inputStyle,
              paddingRight: '50px'
            }}
            placeholder="Enter hours"
            step="0.5"
            min="0"
            max="24"
          />
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: '#6b7280',
            pointerEvents: 'none'
          }}>
            ⏱️ hrs
          </div>
        </div>
      );
    }

    if (column.DATA_TYPE.toLowerCase().includes('int')) {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={inputStyle}
          placeholder="Enter number"
        />
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(columnName, e.target.value)}
        style={inputStyle}
        placeholder={`Enter ${formatColumnName(columnName).toLowerCase()}`}
      />
    );
  };

  // Validation
  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      const requiredFields = ['log_type', 'log_date', 'incident', 'district', 'event_main', 'event_incid'];
      requiredFields.forEach(field => {
        if (!formData[field] && formData[field] !== '0') {
          newErrors[field] = 'Required';
        }
      });
    }

    if (step === 2 && isApplicationLog()) {
      if (!applicationFields.company.trim()) {
        newErrors.company = 'Company is required for Application logs';
      }
      if (!applicationFields.ticket_number.trim()) {
        newErrors.ticket_number = 'Ticket Number is required for Application logs';
      }
    }

    // Step 3 validation for recurrence fields
    if (step === 3 && isRecurrence) {
      if (recurrenceType === 'weekly' && !selectedDayOfWeek) {
        newErrors.dayOfWeek = 'Please select a day of the week';
      }
      if (recurrenceType === 'monthly') {
        if (monthlyPattern === 'day') {
          if (!monthlyDay) newErrors.monthlyDay = 'Please select a day of the month';
        } else {
          if (!monthlyWeekOccurrence) newErrors.monthlyWeekOccurrence = 'Please select occurrence (e.g. first)';
          if (!monthlyWeekday) newErrors.monthlyWeekday = 'Please select weekday';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    try {
      // Build submission data with only relevant fields
      const submissionData = {
        ...formData,
        uploader: currentUser?.username || 'Unknown User',
        isRecurrence
      };
      
      // Only add recurrence fields if recurrence is enabled
      if (isRecurrence) {
        submissionData.recurrence_type = recurrenceType;
        
        if (recurrenceType === 'weekly') {
          submissionData.day_of_the_week = selectedDayOfWeek;
        } else if (recurrenceType === 'monthly') {
          submissionData.monthly_pattern = monthlyPattern;
          
          if (monthlyPattern === 'day') {
            submissionData.day_of_the_month = monthlyDay;
          } else if (monthlyPattern === 'weekday') {
            submissionData.monthly_week_occurrence = monthlyWeekOccurrence;
            submissionData.monthly_weekday = monthlyWeekday;
          }
        }
      }

      // Only add application fields if it's an application log
      if (isApplicationLog()) {
        submissionData.applicationFields = {
          ...applicationFields,
          created_by: currentUser?.username || 'Unknown User'
        };
      }

      const mainResponse = await fetch('/api/addentry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      const mainResult = await mainResponse.json();
      if (!mainResult.success) throw new Error(mainResult.error);

      if (mainResult.isApplicationLog && mainResult.applicationFields) {
        await fetch('/api/addApplicationFields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logEntryId: mainResult.id,
            applicationFields: mainResult.applicationFields
          })
        });
      }

      onClose();
      if (onSave) onSave(submissionData);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredColumns = columns.filter(col => col.COLUMN_NAME.toLowerCase() !== 'id');
  const requiredCols = filteredColumns.filter(col => isRequiredField(col.COLUMN_NAME));
  const optionalCols = filteredColumns.filter(col => 
    !isRequiredField(col.COLUMN_NAME) && !isHiddenField(col.COLUMN_NAME)
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
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
            📝 Add New Entry
            {isApplicationLog() && (
              <span style={{
                marginLeft: '8px',
                padding: '2px 8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                💻 Application
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[1, 2, 3].map(step => (
              <div key={step} style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: currentStep >= step ? '#3b82f6' : '#e5e7eb',
                color: currentStep >= step ? 'white' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {step}
              </div>
            ))}
            <span style={{ marginLeft: '12px', fontSize: '14px', color: '#6b7280' }}>
              {currentStep === 1 && '📋 Basic Information'}
              {currentStep === 2 && (isApplicationLog() ? '💻 Application Details' : '📄 Additional Details')}
              {currentStep === 3 && '✅ Review & Submit'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px',
          flex: 1,
          overflowY: 'auto'
        }}>
          {/* Step 1: Required Fields */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827' }}>
                ⚡ Required Information
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
              }}>
                {requiredCols.map(column => {
                  // Skip event_incid since it's combined with event_main
                  if (column.COLUMN_NAME.toLowerCase() === 'event_incid') {
                    return null;
                  }
                  
                  return (
                    <div key={column.COLUMN_NAME} style={{
                      gridColumn: column.COLUMN_NAME.toLowerCase() === 'event_main' ? '1 / -1' : 'auto'
                    }}>
                      {column.COLUMN_NAME.toLowerCase() !== 'event_main' && (
                        <label style={{
                          display: 'block',
                          marginBottom: '4px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {formatColumnName(column.COLUMN_NAME)} 
                          {column.COLUMN_NAME.toLowerCase() === 'log_end' && 
                            <span style={{ color: '#6b7280', fontWeight: '400' }}> (Auto-calculated)</span>
                          }
                          {column.COLUMN_NAME.toLowerCase() !== 'log_end' && ' *'}
                        </label>
                      )}
                      {renderSimpleInput(column)}
                      {errors[column.COLUMN_NAME] && column.COLUMN_NAME.toLowerCase() !== 'event_main' && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '12px',
                          color: '#dc2626'
                        }}>
                          {errors[column.COLUMN_NAME]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Application Details or Optional Fields */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827' }}>
                📄 Additional Details
                {isApplicationLog() && (
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    💻 + Application Fields
                  </span>
                )}
              </h3>
              
              {/* Application-specific fields (only show when Application is selected) */}
              {isApplicationLog() && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  border: '1px solid #bfdbfe'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
                    💻 Application-Specific Fields
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '4px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        Company *
                      </label>
                      <input
                        type="text"
                        value={applicationFields.company}
                        onChange={(e) => handleApplicationFieldChange('company', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${errors.company ? '#dc2626' : '#d1d5db'}`,
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        placeholder="🏢 Enter company name"
                      />
                      {errors.company && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>
                          {errors.company}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '4px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Ticket Number *
                        </label>
                        <input
                          type="text"
                          value={applicationFields.ticket_number}
                          onChange={(e) => handleApplicationFieldChange('ticket_number', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: `1px solid ${errors.ticket_number ? '#dc2626' : '#d1d5db'}`,
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                          placeholder="🎫 e.g., CHG-2025-001"
                        />
                        {errors.ticket_number && (
                          <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>
                            {errors.ticket_number}
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '4px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={applicationFields.project_name}
                          onChange={(e) => handleApplicationFieldChange('project_name', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                          placeholder="📁 Enter project name"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: '#374151',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={applicationFields.wiki_diagram_updated}
                          onChange={(e) => handleApplicationFieldChange('wiki_diagram_updated', e.target.checked)}
                        />
                        📚 Wiki/Diagram Updated
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: '#374151',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={applicationFields.s3_support_ready}
                          onChange={(e) => handleApplicationFieldChange('s3_support_ready', e.target.checked)}
                        />
                        ☁️ S3 Support Ready
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Regular optional fields (always show) */}
              {optionalCols.length > 0 ? (
                <div>
                  <h4 style={{ 
                    margin: '0 0 12px 0', 
                    fontSize: '14px', 
                    color: '#374151', 
                    fontWeight: '600' 
                  }}>
                    📋 Standard Optional Fields
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px'
                  }}>
                    {optionalCols.map(column => (
                      <div key={column.COLUMN_NAME}>
                        <label style={{
                          display: 'block',
                          marginBottom: '4px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {formatColumnName(column.COLUMN_NAME)}
                          {column.COLUMN_NAME.toLowerCase() === 'log_end' && 
                            <span style={{ color: '#6b7280', fontWeight: '400' }}> (Auto-calculated)</span>
                          }
                        </label>
                        {renderSimpleInput(column)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                !isApplicationLog() && (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                    <div>All required fields are completed!</div>
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                      Continue to review and submit your entry.
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Step 3: Review & Recurrence */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827' }}>
                ✅ Review & Submit
              </h3>
              
              {/* Recurrence Settings */}
              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e5e7eb'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer',
                  marginBottom: isRecurrence ? '16px' : '0'
                }}>
                  <input
                    type="checkbox"
                    checked={isRecurrence}
                    onChange={(e) => setIsRecurrence(e.target.checked)}
                  />
                  🔄 This is a recurring event
                </label>

                {isRecurrence && (
                  <div style={{ 
                    padding: '16px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                      📅 Recurrence Settings
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          cursor: 'pointer'
                        }}>
                          <input
                            type="radio"
                            name="recurrenceType"
                            value="weekly"
                            checked={recurrenceType === 'weekly'}
                            onChange={(e) => setRecurrenceType(e.target.value)}
                          />
                          📅 Weekly
                        </label>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          cursor: 'pointer'
                        }}>
                          <input
                            type="radio"
                            name="recurrenceType"
                            value="monthly"
                            checked={recurrenceType === 'monthly'}
                            onChange={(e) => setRecurrenceType(e.target.value)}
                          />
                          📆 Monthly
                        </label>
                      </div>

                      {recurrenceType === 'weekly' && (
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#374151'
                          }}>
                            Select Day of Week:
                          </label>
                          <select
                            value={selectedDayOfWeek}
                            onChange={(e) => setSelectedDayOfWeek(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: `1px solid ${errors.dayOfWeek ? '#dc2626' : '#d1d5db'}`,
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          >
                            <option value="">Select day...</option>
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                            <option value="sunday">Sunday</option>
                          </select>
                          {errors.dayOfWeek && (
                            <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>
                              {errors.dayOfWeek}
                            </div>
                          )}
                        </div>
                      )}

                      {recurrenceType === 'monthly' && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#374151' }}>
                            Monthly pattern:
                          </label>
                          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input type="radio" name="monthlyPattern" value="day" checked={monthlyPattern === 'day'} onChange={() => setMonthlyPattern('day')} />
                              Day of month
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input type="radio" name="monthlyPattern" value="weekday" checked={monthlyPattern === 'weekday'} onChange={() => setMonthlyPattern('weekday')} />
                              Nth weekday
                            </label>
                          </div>
                          
                          {monthlyPattern === 'day' && (
                            <div>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#374151' }}>Select day:</label>
                              <select
                                value={monthlyDay}
                                onChange={(e) => setMonthlyDay(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: `1px solid ${errors.monthlyDay ? '#dc2626' : '#d1d5db'}`,
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                              >
                                <option value="">Select day...</option>
                                {Array.from({length: 31}, (_, i) => (<option key={i+1} value={i+1}>{i+1}</option>))}
                                <option value="last">Last day of month</option>
                              </select>
                              {errors.monthlyDay && (<div style={{ marginTop: '4px', color: '#dc2626', fontSize: '12px' }}>{errors.monthlyDay}</div>)}
                            </div>
                          )}

                          {monthlyPattern === 'weekday' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#374151' }}>Occurrence:</label>
                                <select value={monthlyWeekOccurrence} onChange={(e) => setMonthlyWeekOccurrence(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${errors.monthlyWeekOccurrence ? '#dc2626' : '#d1d5db'}`, borderRadius: '6px' }}>
                                  <option value="first">First</option>
                                  <option value="second">Second</option>
                                  <option value="third">Third</option>
                                  <option value="fourth">Fourth</option>
                                  <option value="last">Last</option>
                                </select>
                                {errors.monthlyWeekOccurrence && (<div style={{ marginTop: '4px', color: '#dc2626', fontSize: '12px' }}>{errors.monthlyWeekOccurrence}</div>)}
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#374151' }}>Weekday:</label>
                                <select value={monthlyWeekday} onChange={(e) => setMonthlyWeekday(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${errors.monthlyWeekday ? '#dc2626' : '#d1d5db'}`, borderRadius: '6px' }}>
                                  <option value="monday">Monday</option>
                                  <option value="tuesday">Tuesday</option>
                                  <option value="wednesday">Wednesday</option>
                                  <option value="thursday">Thursday</option>
                                  <option value="friday">Friday</option>
                                  <option value="saturday">Saturday</option>
                                  <option value="sunday">Sunday</option>
                                </select>
                                {errors.monthlyWeekday && (<div style={{ marginTop: '4px', color: '#dc2626', fontSize: '12px' }}>{errors.monthlyWeekday}</div>)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div style={{
                padding: '16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                border: '1px solid #d1d5db'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                  📋 Entry Summary
                </h4>
                <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                  <div><strong>Type:</strong> {formData.log_type || 'Not specified'}</div>
                  <div><strong>Date:</strong> {formData.log_date || 'Not specified'}</div>
                  <div><strong>Status:</strong> {formData.log_status || 'Not specified'}</div>
                  <div><strong>Start Time:</strong> {formData.log_start || 'Not specified'}</div>
                  <div><strong>Duration:</strong> {formData.actual_time ? `${formData.actual_time} hours` : 'Not specified'}</div>
                  <div><strong>End Time:</strong> {formData.log_end ? `${formData.log_end} (Auto-calculated)` : 'Not calculated'}</div>
                  <div><strong>Event Type:</strong> {formData.event_incid === '1' ? '🚨 Incident' : formData.event_incid === '0' ? '🔧 Maintenance' : 'Not specified'}</div>
                  <div><strong>Uploader:</strong> {currentUser?.username || 'Unknown User'}</div>
                  {isApplicationLog() && (
                    <div><strong>Company:</strong> {applicationFields.company || 'Not specified'}</div>
                  )}
                  {isRecurrence && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px' }}>
                      <strong>🔄 Recurrence:</strong>{' '}
                      {recurrenceType === 'weekly' && `Weekly on ${selectedDayOfWeek}`}
                      {recurrenceType === 'monthly' && monthlyPattern === 'day' && `Monthly on ${monthlyDay === 'last' ? 'last day' : `day ${monthlyDay}`}`}
                      {recurrenceType === 'monthly' && monthlyPattern === 'weekday' && `Monthly on the ${monthlyWeekOccurrence} ${monthlyWeekday}`}
                    </div>
                  )}
                </div>
              </div>

              {errors.submit && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontSize: '14px'
                }}>
                  ⚠️ Error: {errors.submit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: isLoading ? '#9ca3af' : '#10b981',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {isLoading ? '⏳ Saving...' : '💾 Save Entry'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}