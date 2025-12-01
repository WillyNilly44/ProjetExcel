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
  data = [], // Add data prop to get existing values
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
  const [dropdownOptions, setDropdownOptions] = useState({
    districts: [],
    incidents: [],
    assigned: []
  });

  // Helper functions
  const isRequiredField = (columnName) => {
    const requiredFields = [
      'log_type', 'approver', 'log_status', 'duration', 'time_start',
      'incident', 'district', 'log_date', 'maintenance_event', 'incident_event'
    ];
    return requiredFields.includes(columnName.toLowerCase());
  };

  // Fields to hide from step 2 display
  const isHiddenField = (columnName) => {
    const hiddenFields = [
      'uploader', // Hide uploader from step 2
      'pending_approval', // Hide pending_approval from form
      'recurrence_type', 'day_of_the_week', 'day_of_the_month' // Hide recurrence fields from step 2
    ];

    // Hide ticket_number from optional fields if it's an application log (we show it in application section)
    if (isApplicationLog() && columnName.toLowerCase() === 'ticket_number') {
      return true;
    }

    return hiddenFields.includes(columnName.toLowerCase());
  };

  const formatColumnName = (columnName) => {
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
    if (columnName === 'risk_level') return 'Low';
    if (columnName === 'uploader') return currentUser?.username || 'Unknown User';
    if (columnName === 'maintenance_event' || columnName === 'incident_event') return '0'; // Default to Maintenance
    if (columnName === 'duration') return '1'; // Default 1 hour
    if (columnName === 'real_business_impact') return '0'; // Default to 0 (No)
    if (columnName === 'root_call_analysis') return '0'; // Default to 0 (No)
    return '';
  };

  // Get unique values for dropdowns
  const getUniqueValues = (fieldName) => {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Try multiple possible field name variations
    const possibleFieldNames = [
      fieldName,
      fieldName.toLowerCase(),
      fieldName.toUpperCase(),
      fieldName.charAt(0).toUpperCase() + fieldName.slice(1).toLowerCase()
    ];

    let actualFieldName = null;
    const sampleRow = data[0] || {};

    // Find the actual field name in the data
    for (const possibleName of possibleFieldNames) {
      if (sampleRow.hasOwnProperty(possibleName)) {
        actualFieldName = possibleName;
        break;
      }
    }

    if (!actualFieldName) {
      return [];
    }


    const values = data
      .map(row => row[actualFieldName])
      .filter(value => value && value.toString().trim() !== '')
      .map(value => value.toString().trim());

    return [...new Set(values)].sort();
  };

  // Load dropdown options
  useEffect(() => {
    if (data && data.length > 0) {

      setDropdownOptions({
        districts: getUniqueValues('district'),
        incidents: getUniqueValues('incident'),
        assigned: getUniqueValues('assigned')
      });
    }
  }, [data]);

  // Initialize form
  useEffect(() => {
    if (isOpen && columns.length > 0) {
      const initialData = {};
      columns.forEach(column => {
        if (column.COLUMN_NAME.toLowerCase() !== 'id') {
          initialData[column.COLUMN_NAME] = getDefaultValue(column);
        }
      });

      if (initialData.time_start && initialData.duration) {
        initialData.time_end = calculateLogEnd(initialData.time_start, initialData.duration);
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


  useEffect(() => {
    if (formData.time_start && formData.duration) {
      const newLogEnd = calculateLogEnd(formData.time_start, formData.duration);
      if (newLogEnd && newLogEnd !== formData.time_end) {
        setFormData(prev => ({ ...prev, time_end: newLogEnd }));
      }
    }
  }, [formData.time_start, formData.duration]);

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

  const handleEventTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      maintenance_event: value,
      incident_event: value
    }));
    // Clear any errors for both fields
    if (errors.maintenance_event) {
      setErrors(prev => ({ ...prev, maintenance_event: null }));
    }
    if (errors.incident_event) {
      setErrors(prev => ({ ...prev, incident_event: null }));
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

    if (columnName.toLowerCase() === 'incident_event') {
      return null; // Don't render separately
    }

    // Special case: Log End (auto-calculated, read-only)
    if (columnName.toLowerCase() === 'time_end') {
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

    if (columnName.toLowerCase() === 'maintenance_event') {
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
              backgroundColor: formData.incident_event === '1' ? '#dc2626' : '#f3f4f6',
              borderRadius: '6px',
              border: `2px solid ${formData.incident_event === '1' ? '#dc2626' : '#d1d5db'}`,
              transition: 'all 0.2s ease',
              minWidth: '140px',
              justifyContent: 'center'
            }}>
              <input
                type="radio"
                name="event_type"
                value="1"
                checked={formData.incident_event === '1'}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                style={{ margin: 0 }}
              />
              <span style={{
                color: formData.incident_event === '1' ? 'white' : '#374151',
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
              backgroundColor: formData.incident_event === '0' ? '#059669' : '#f3f4f6',
              borderRadius: '6px',
              border: `2px solid ${formData.incident_event === '0' ? '#059669' : '#d1d5db'}`,
              transition: 'all 0.2s ease',
              minWidth: '140px',
              justifyContent: 'center'
            }}>
              <input
                type="radio"
                name="event_type"
                value="0"
                checked={formData.incident_event === '0'}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                style={{ margin: 0 }}
              />
              <span style={{
                color: formData.incident_event === '0' ? 'white' : '#374151',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                🔧 Maintenance
              </span>
            </label>
          </div>
          {(errors.maintenance_event || errors.incident_event) && (
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

    // Special cases for dropdown fields
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

    if (columnName.toLowerCase() === 'risk_level') {
      return (
        <select
          value={value || 'Low'}
          onChange={(e) => handleInputChange(columnName, e.target.value)}
          style={inputStyle}
        >
          <option value="Low">🟢 Low</option>
          <option value="Moderate">🟡 Moderate</option>
          <option value="High">🔴 High</option>
        </select>
      );
    }

    // District dropdown/input combo
    if (columnName.toLowerCase() === 'district') {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={`${columnName}-options`}
            value={value}
            onChange={(e) => handleInputChange(columnName, e.target.value)}
            style={inputStyle}
            placeholder="🏢 Enter or select district..."
          />
          <datalist id={`${columnName}-options`}>
            {dropdownOptions.districts.map(district => (
              <option key={district} value={district} />
            ))}
          </datalist>
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Debug: {dropdownOptions.districts.length} districts loaded
            </div>
          )}
        </div>
      );
    }

    // Incident dropdown/input combo
    if (columnName.toLowerCase() === 'incident') {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={`${columnName}-options`}
            value={value}
            onChange={(e) => handleInputChange(columnName, e.target.value)}
            style={inputStyle}
            placeholder="📋 Enter or select incident..."
          />
          <datalist id={`${columnName}-options`}>
            {dropdownOptions.incidents.map(incident => (
              <option key={incident} value={incident} />
            ))}
          </datalist>
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Debug: {dropdownOptions.incidents.length} incidents loaded
            </div>
          )}
        </div>
      );
    }

    // Assigned dropdown/input combo
    if (columnName.toLowerCase() === 'assigned') {
      return (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            list={`${columnName}-options`}
            value={value}
            onChange={(e) => handleInputChange(columnName, e.target.value)}
            style={inputStyle}
            placeholder="👤 Enter or select assignee..."
          />
          <datalist id={`${columnName}-options`}>
            {dropdownOptions.assigned.map(person => (
              <option key={person} value={person} />
            ))}
          </datalist>
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Debug: {dropdownOptions.assigned.length} assignees loaded
            </div>
          )}
        </div>
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

    if (columnName.toLowerCase() === 'duration') {
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

    // Checkbox for specific yes/no fields
    const columnNameLower = columnName.toLowerCase();

    // More specific matching for each field
    const isCheckboxField =
      columnNameLower === 'business_impact' ||
      columnNameLower === 'real_business_impact' ||
      columnNameLower === 'root_call_analysis';

    if (isCheckboxField) {
      const isChecked = value === '1' || value === 1 || value === true || value === 'true' || value === 'Yes';

      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          border: `1px solid ${hasError ? '#dc2626' : '#d1d5db'}`,
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              // Store as '1' for true, '0' for false to match database expectations
              handleInputChange(columnName, e.target.checked ? '1' : '0');
            }}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer'
            }}
          />
          <label
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={(e) => {
              e.preventDefault();
              const newValue = !isChecked;
              handleInputChange(columnName, newValue ? '1' : '0');
            }}
          >
            {isChecked ? '✅ Yes' : '❌ No'}
          </label>
        </div>
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
      const requiredFields = ['log_type', 'log_date', 'incident', 'district', 'maintenance_event', 'incident_event'];
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
        isRecurrence,
        userLevel: currentUser?.level_Name || 'Viewer',
        userId: currentUser?.id || null
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
        borderRadius: '12px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '85vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'modalSlideIn 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#111827', fontWeight: '600' }}>
              📝 Add New Entry
            </h2>
            {isApplicationLog() && (
              <span style={{
                padding: '4px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                💻 Application
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '8px',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
              e.target.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#6b7280';
            }}
          >
            ×
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{
          padding: '20px 24px 16px 24px',
          backgroundColor: '#fafafc',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
            {[1, 2, 3].map(step => (
              <React.Fragment key={step}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= step ? '#3b82f6' : '#e5e7eb',
                  color: currentStep >= step ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: currentStep >= step ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
                }}>
                  {currentStep > step ? '✓' : step}
                </div>
                {step < 3 && (
                  <div style={{
                    width: '40px',
                    height: '2px',
                    backgroundColor: currentStep > step ? '#3b82f6' : '#e5e7eb',
                    transition: 'all 0.3s ease'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div style={{
            textAlign: 'center',
            marginTop: '12px',
            fontSize: '14px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            {currentStep === 1 && '📋 Basic Information'}
            {currentStep === 2 && (isApplicationLog() ? '💻 Application Details' : '📄 Additional Details')}
            {currentStep === 3 && '✅ Review & Submit'}
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#ffffff'
        }}>
          {/* Step 1: Required Fields */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#111827', fontWeight: '600' }}>
                ⚡ Required Information
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                {requiredCols.map(column => {
                  if (column.COLUMN_NAME.toLowerCase() === 'incident_event') {
                    return null;
                  }

                  return (
                    <div key={column.COLUMN_NAME} style={{
                      gridColumn: column.COLUMN_NAME.toLowerCase() === 'maintenance_event' ? '1 / -1' : 'auto'
                    }}>
                      {column.COLUMN_NAME.toLowerCase() !== 'maintenance_event' && (
                        <label style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          {formatColumnName(column.COLUMN_NAME)}
                          {column.COLUMN_NAME.toLowerCase() === 'time_end' &&
                            <span style={{ color: '#6b7280', fontWeight: '400', fontSize: '12px' }}> (Auto-calculated)</span>
                          }
                          {column.COLUMN_NAME.toLowerCase() !== 'time_end' && ' *'}
                        </label>
                      )}
                      {renderSimpleInput(column)}
                      {errors[column.COLUMN_NAME] && column.COLUMN_NAME.toLowerCase() !== 'maintenance_event' && (
                        <div style={{
                          marginTop: '6px',
                          fontSize: '12px',
                          color: '#dc2626',
                          fontWeight: '500'
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
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#111827', fontWeight: '600' }}>
                📄 Additional Details
                {isApplicationLog() && (
                  <span style={{
                    marginLeft: '12px',
                    padding: '4px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    💻 + Application Fields
                  </span>
                )}
              </h3>

              {/* Application-specific fields (only show when Application is selected) */}
              {isApplicationLog() && (
                <div style={{
                  padding: '20px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '10px',
                  marginBottom: '24px',
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e40af', fontWeight: '600' }}>
                    💻 Application-Specific Fields
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    color: '#374151',
                    fontWeight: '600'
                  }}>
                    📋 Standard Optional Fields
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px'
                  }}>
                    {optionalCols.map(column => {
                      return (
                        <div key={column.COLUMN_NAME}>
                          <label style={{
                            display: 'block',
                            marginBottom: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            {formatColumnName(column.COLUMN_NAME)}
                            {column.COLUMN_NAME.toLowerCase() === 'time_end' &&
                              <span style={{ color: '#6b7280', fontWeight: '400', fontSize: '12px' }}> (Auto-calculated)</span>
                            }
                          </label>
                          {renderSimpleInput(column)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                !isApplicationLog() && (
                  <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
                    <div>All required fields are completed!</div>
                    <div style={{ marginTop: '10px', fontSize: '12px' }}>
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
                                {Array.from({ length: 31 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1}</option>))}
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
                  <div><strong>Start Time:</strong> {formData.time_start || 'Not specified'}</div>
                  <div><strong>Duration:</strong> {formData.duration ? `${formData.duration} hours` : 'Not specified'}</div>
                  <div><strong>End Time:</strong> {formData.time_end ? `${formData.time_end} (Auto-calculated)` : 'Not calculated'}</div>
                  <div><strong>Event Type:</strong> {formData.incident_event === '1' ? '🚨 Incident' : formData.incident_event === '0' ? '🔧 Maintenance' : 'Not specified'}</div>
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
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = '#d1d5db';
              }}
            >
              Cancel
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isLoading ? '#9ca3af' : '#10b981',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
              >
                {isLoading ? '⏳ Saving...' : '💾 Save Entry'}
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}