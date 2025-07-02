import React, { useState, useEffect } from 'react';
import AddEntryModal from './AddEntryModal';
import ColumnManager from './ColumnManager';

export default function LogEntriesTable() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Ready to load');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false); // ✅ NEW: Modal state
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Add new state variables for filters after existing useState declarations:
  const [dateFilters, setDateFilters] = useState({
    year: '',
    month: '',
    week: '',
    logType: '' // ✅ NEW: Add log type filter
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogEntries = async () => {
    setIsLoading(true);
    setConnectionStatus('Loading log entries...');
    
    try {
      
      const response = await fetch('/.netlify/functions/DbConnection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setConnectionStatus(`✅ Loaded ${result.totalRecords} log entries`);
        setData(result.data || []);
        setColumns(result.columns || []);
        setConnectionInfo({
          server: result.server,
          database: result.database,
          totalRecords: result.totalRecords,
          columnCount: result.columns?.length || 0,
          timestamp: result.timestamp
        });
      } else {
        setConnectionStatus('❌ Failed to load data');
        setConnectionInfo({
          error: result.error,
          code: result.code,
          timestamp: result.timestamp
        });
      }

    } catch (error) {
      console.error('🚨 Request failed:', error);
      setConnectionStatus('❌ Request Failed');
      setConnectionInfo({
        error: error.message,
        type: 'Network/Request Error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };
  // Update the handleSaveEntry function to use the new endpoint:
  const handleSaveEntry = async (formData) => {
    try {
      console.log('📤 Sending form data:', formData);
      
      const response = await fetch('/.netlify/functions/AddLogEntryWithRecurrence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success) {
        console.log('✅ Success:', result.message);
        
        // Show success message (you could add a toast notification here)
        alert(result.message);
        
        // Refresh data to show new entry
        await fetchLogEntries();
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Failed to save entry:', error);
      throw error;
    }
  };

  // Add delete function after handleSaveEntry:
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this log entry? This action cannot be undone.')) {
      return;
    }

    try {
      
      const response = await fetch('/.netlify/functions/DeleteLogEntry', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: entryId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        await fetchLogEntries();
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Failed to delete entry:', error);
      alert('Failed to delete entry: ' + error.message);
    }
  };

  // Format column names for display
  const formatColumnName = (columnName) => {
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Format cell values based on column type
  const formatCellValue = (value, columnName, dataType) => {
    if (value === null || value === undefined) return '-';
    
    const lowerColumnName = columnName.toLowerCase();
    
    // ✅ FIXED: Handle log_start and log_end specifically (before general date check)
    if (lowerColumnName.includes('log_start') || lowerColumnName.includes('log_end') || 
        lowerColumnName.includes('start_time') || lowerColumnName.includes('end_time')) {
      if (!value) return '-';
      
      // Handle different time formats
      if (typeof value === 'string') {
        // Pure time format "HH:MM" or "HH:MM:SS"
        if (value.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
          const timeParts = value.split(':');
          return `${timeParts[0].padStart(2, '0')}:${timeParts[1]}`;
        }
        
        // Datetime format - extract time (handles "1970-01-01T13:00:00.000Z" format)
        if (value.includes('T')) {
          const timePart = value.split('T')[1];
          if (timePart) {
            return timePart.substring(0, 5); // Return HH:MM only
          }
        }
        
        // Space-separated datetime
        if (value.includes(' ')) {
          const parts = value.split(' ');
          if (parts.length > 1) {
            return parts[1].substring(0, 5); // Return HH:MM only
          }
        }
        
        // Handle other datetime formats
        if (value.length > 10 && value.includes(':')) {
          // Try to find time pattern in the string
          const timeMatch = value.match(/(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
          }
        }
      }
      
      return value;
    }
    
    // Date formatting (excluding time fields)
    if ((dataType === 'datetime' || dataType === 'date' || lowerColumnName.includes('date') || lowerColumnName.includes('created') || lowerColumnName.includes('updated')) && !lowerColumnName.includes('time') && !lowerColumnName.includes('start') && !lowerColumnName.includes('end')) {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value;
      }
    }
    
    // Boolean formatting
    if (dataType === 'bit' || typeof value === 'boolean') {
      return value ? '✅' : '❌';
    }
    
    // ✅ Format estimated_time and actual_time as hours
    if ((lowerColumnName.includes('estimated_time') || lowerColumnName.includes('actual_time')) && typeof value === 'number') {
      const hours = (value / 60).toFixed(2);
      return `${hours}h`;
    }
    
    // Format other numeric time fields
    if (lowerColumnName.includes('duration') && typeof value === 'number') {
      return `${value}min`;
    }
    
    return value.toString();
  };

  // Get column styling based on type
  const getColumnStyle = (columnName, dataType) => {
    const baseStyle = { ...cellStyle };
    
    if (dataType === 'bit' || typeof data[0]?.[columnName] === 'boolean') {
      baseStyle.textAlign = 'center';
    }
    
    if (columnName.toLowerCase().includes('status')) {
      baseStyle.fontWeight = '500';
      baseStyle.color = '#059669';
    }
    
    if (columnName.toLowerCase().includes('note') || columnName.toLowerCase().includes('description')) {
      baseStyle.maxWidth = '200px';
    }
    
    return baseStyle;
  };

  // Add this useEffect to initialize visible columns when columns are loaded:
  useEffect(() => {
    if (columns.length > 0 && visibleColumns.length === 0) {
      // Initially show all columns
      const allColumns = columns.map(col => col.COLUMN_NAME);
      setVisibleColumns(allColumns);
      setColumnOrder(allColumns);
    }
  }, [columns]);

  // Add function to get filtered and ordered columns:
  const getDisplayColumns = () => {
    return columnOrder
      .filter(columnName => visibleColumns.includes(columnName))
      .map(columnName => columns.find(col => col.COLUMN_NAME === columnName))
      .filter(Boolean);
  };

  // Add import at the top:
  // import ColumnManager from './ColumnManager';

  // Add the column management functions:
  const handleColumnManagerSave = (newVisibleColumns, newColumnOrder) => {
    setVisibleColumns(newVisibleColumns);
    setColumnOrder(newColumnOrder);
    
    // Save to localStorage for persistence
    localStorage.setItem('logEntries_visibleColumns', JSON.stringify(newVisibleColumns));
    localStorage.setItem('logEntries_columnOrder', JSON.stringify(newColumnOrder));
  };

  // Load saved column preferences on mount:
  useEffect(() => {
    if (columns.length > 0) {
      const savedVisible = localStorage.getItem('logEntries_visibleColumns');
      const savedOrder = localStorage.getItem('logEntries_columnOrder');
      
      if (savedVisible && savedOrder) {
        try {
          const parsedVisible = JSON.parse(savedVisible);
          const parsedOrder = JSON.parse(savedOrder);
          
          // Validate that all columns still exist
          const currentColumnNames = columns.map(col => col.COLUMN_NAME);
          const validVisible = parsedVisible.filter(name => currentColumnNames.includes(name));
          const validOrder = parsedOrder.filter(name => currentColumnNames.includes(name));
          
          // Add any new columns that weren't in saved preferences
          const missingColumns = currentColumnNames.filter(name => !validOrder.includes(name));
          
          setVisibleColumns([...validVisible, ...missingColumns]);
          setColumnOrder([...validOrder, ...missingColumns]);
        } catch (e) {
          // If parsing fails, use all columns
          const allColumns = columns.map(col => col.COLUMN_NAME);
          setVisibleColumns(allColumns);
          setColumnOrder(allColumns);
        }
      } else {
        // No saved preferences, show all columns
        const allColumns = columns.map(col => col.COLUMN_NAME);
        setVisibleColumns(allColumns);
        setColumnOrder(allColumns);
      }
    }
  }, [columns]);

  // Auto-load data on component mount
  useEffect(() => {
    fetchLogEntries();
  }, []);

  // Add function to get available years from data:
  const getAvailableYears = () => {
    if (!data || data.length === 0) return [];
    
    // Find date columns (log_date, created_at, etc.)
    const dateColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('date') || 
      col.COLUMN_NAME.toLowerCase().includes('created')
    );
    
    if (!dateColumn) return [];
    
    const years = data
      .map(entry => {
        const dateValue = entry[dateColumn.COLUMN_NAME];
        if (dateValue) {
          try {
            return new Date(dateValue).getFullYear();
          } catch (e) {
            return null;
          }
        }
        return null;
      })
      .filter(year => year && !isNaN(year))
      .filter((year, index, array) => array.indexOf(year) === index)
      .sort((a, b) => b - a); // Most recent first
  
    return years;
  };

  // Add function to get weeks in selected month/year:
  const getWeeksInMonth = (year, month) => {
    if (!year || !month) return [];
    
    const weeks = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    let currentWeek = 1;
    let currentDate = new Date(firstDay);
    
    while (currentDate <= lastDay) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (weekEnd > lastDay) {
        weekEnd.setDate(lastDay.getDate());
      }
      
      weeks.push({
        number: currentWeek,
        start: weekStart.getDate(),
        end: weekEnd.getDate(),
        label: `Week ${currentWeek} (${weekStart.getDate()}-${weekEnd.getDate()})`
      });
      
      currentDate.setDate(currentDate.getDate() + 7);
      currentWeek++;
    }
    
    return weeks;
  };

  // Add function to filter data based on date filters:
  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    if (!dateFilters.year && !dateFilters.month && !dateFilters.week && !dateFilters.logType) return data;
    
    const dateColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('date') || 
      col.COLUMN_NAME.toLowerCase().includes('created')
    );
    
    // Find log type column (could be event_main, log_type, type, etc.)
    const logTypeColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('event_main') ||
      col.COLUMN_NAME.toLowerCase().includes('log_type') ||
      col.COLUMN_NAME.toLowerCase().includes('type') ||
      col.COLUMN_NAME.toLowerCase().includes('category')
    );
    
    return data.filter(entry => {
      // Date filtering (existing logic)
      if (dateColumn) {
        const dateValue = entry[dateColumn.COLUMN_NAME];
        if (dateValue) {
          try {
            const entryDate = new Date(dateValue);
            const entryYear = entryDate.getFullYear();
            const entryMonth = entryDate.getMonth() + 1;
            const entryDay = entryDate.getDate();
            
            // Filter by year
            if (dateFilters.year && entryYear !== parseInt(dateFilters.year)) {
              return false;
            }
            
            // Filter by month
            if (dateFilters.month && entryMonth !== parseInt(dateFilters.month)) {
              return false;
            }
            
            // Filter by week
            if (dateFilters.week && dateFilters.year && dateFilters.month) {
              const weeks = getWeeksInMonth(parseInt(dateFilters.year), parseInt(dateFilters.month));
              const selectedWeek = weeks.find(w => w.number === parseInt(dateFilters.week));
              
              if (selectedWeek && (entryDay < selectedWeek.start || entryDay > selectedWeek.end)) {
                return false;
              }
            }
          } catch (e) {
            return false;
          }
        }
      }
      
      // ✅ NEW: Log type filtering
      if (dateFilters.logType && logTypeColumn) {
        const entryLogType = entry[logTypeColumn.COLUMN_NAME];
        if (!entryLogType) return false;
        
        const normalizedEntryType = entryLogType.toString().toLowerCase().trim();
        const selectedType = dateFilters.logType.toLowerCase();
        
        // Handle different possible values
        switch (selectedType) {
          case 'merged':
            return normalizedEntryType.includes('merged') || normalizedEntryType.includes('merge');
          case 'operational':
            return normalizedEntryType.includes('operational') || normalizedEntryType.includes('ops') || normalizedEntryType.includes('operation');
          case 'application':
            return normalizedEntryType.includes('application') || normalizedEntryType.includes('app');
          default:
            return normalizedEntryType === selectedType;
        }
      }
      
      return true;
    });
  };

  // Add function to get available log types from data:
  const getAvailableLogTypes = () => {
    if (!data || data.length === 0) return [];
    
    // Find log type column
    const logTypeColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('event_main') ||
      col.COLUMN_NAME.toLowerCase().includes('log_type') ||
      col.COLUMN_NAME.toLowerCase().includes('type') ||
      col.COLUMN_NAME.toLowerCase().includes('category')
    );
    
    if (!logTypeColumn) return [];
    
    const types = data
      .map(entry => entry[logTypeColumn.COLUMN_NAME])
      .filter(type => type && typeof type === 'string')
      .map(type => type.trim())
      .filter((type, index, array) => array.indexOf(type) === index)
      .sort();
    
    return types;
  };

  // Update the clearFilters function:
  const clearFilters = () => {
    setDateFilters({
      year: '',
      month: '',
      week: '',
      logType: '' // ✅ Include logType in clear
    });
  };

  // Add function to handle filter changes:
  const handleFilterChange = (filterType, value) => {
    setDateFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      // Reset dependent filters
      if (filterType === 'year') {
        newFilters.month = '';
        newFilters.week = '';
      } else if (filterType === 'month') {
        newFilters.week = '';
      }
      
      return newFilters;
    });
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>
          ⏳ Loading log entries...
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Status Header */}
      <div style={{ 
        backgroundColor: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#1f2937' }}></h2>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: connectionStatus.includes('✅') ? '#10b981' : 
                  connectionStatus.includes('❌') ? '#ef4444' : '#6b7280'
          }}>
            {connectionStatus}
          </div>
        </div>
        
        {/* ✅ UPDATED: Add both buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            disabled={isLoading || columns.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: showFilters ? '#8b5cf6' : (isLoading ? '#9ca3af' : '#6366f1'),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isLoading || columns.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔍 Filters {showFilters ? '▼' : '▶'}
          </button>
          
          <button 
            onClick={() => setShowColumnManager(true)}
            disabled={isLoading || columns.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: isLoading ? '#9ca3af' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isLoading || columns.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ⚙️ Columns
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)}
            disabled={isLoading || columns.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: isLoading ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isLoading || columns.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ➕ Add Entry
          </button>
          
          <button 
            onClick={fetchLogEntries}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isLoading ? '⏳ Loading...' : '🔄 Refresh Data'}
          </button>
        </div>
      </div>

      {/* Data Table */}
      {!data || data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>
            📝 No log entries found
          </div>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '16px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h3 style={{ margin: 0, color: '#1f2937' }}>
              📋 LOG ENTRIES
            </h3>
          </div>
          
          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead style={{ 
                backgroundColor: '#f3f4f6', 
                position: 'sticky', 
                top: 0,
                zIndex: 1
              }}>
                <tr>
                  {getDisplayColumns().map((column) => (
                    <th 
                      key={column.COLUMN_NAME} 
                      style={headerStyle} 
                      title={`${column.DATA_TYPE} ${column.IS_NULLABLE === 'NO' ? '(Required)' : '(Optional)'}`}
                    >
                      {formatColumnName(column.COLUMN_NAME)}
                    </th>
                  ))}
                  <th style={{
                    ...headerStyle,
                    width: '80px',
                    textAlign: 'center'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredData().map((entry, index) => (
                  <tr key={entry.id || index} style={{
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    {getDisplayColumns().map((column) => (
                      <td 
                        key={column.COLUMN_NAME} 
                        style={getColumnStyle(column.COLUMN_NAME, column.DATA_TYPE)}
                        title={entry[column.COLUMN_NAME]}
                      >
                        <div style={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          maxWidth: column.COLUMN_NAME.toLowerCase().includes('note') ? '200px' : 'none'
                        }}>
                          {formatCellValue(entry[column.COLUMN_NAME], column.COLUMN_NAME, column.DATA_TYPE)}
                        </div>
                      </td>
                    ))}
                    {/* Delete button column stays the same */}
                    <td style={{
                      ...cellStyle,
                      width: '80px',
                      textAlign: 'center',
                      padding: '8px'
                    }}>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        disabled={!entry.id}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: entry.id ? 'pointer' : 'not-allowed',
                          fontSize: '12px',
                          fontWeight: '500',
                          opacity: entry.id ? 1 : 0.5,
                          transition: 'all 0.2s ease'
                        }}
                        title={entry.id ? 'Delete this entry' : 'No ID available'}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ✅ NEW: Add Entry Modal */}
      <AddEntryModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveEntry}
        columns={columns}
      />

      {/* ✅ NEW: Column Manager Modal */}
      <ColumnManager 
        isOpen={showColumnManager}
        onClose={() => setShowColumnManager(false)}
        columns={columns}
        visibleColumns={visibleColumns}
        columnOrder={columnOrder}
        onSave={handleColumnManagerSave}
      />

      {/* Add filter panel after the button section: */}
      {showFilters && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, color: '#1f2937', fontSize: '16px' }}>
              📅 Filters
            </h3>
            <button
              onClick={clearFilters}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🗑 Clear All
            </button>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', // ✅ Smaller columns to fit 5 filters
            gap: '16px',
            alignItems: 'end'
          }}>
            {/* ✅ NEW: Log Type Filter - First position */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                🏷️ Log Type
              </label>
              <select
                value={dateFilters.logType}
                onChange={(e) => handleFilterChange('logType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">All Types</option>
                <option value="operational">Operational</option>
                <option value="application">Application</option>
                {/* ✅ Also show other types from actual data */}
                {getAvailableLogTypes()
                  .filter(type => !['merged', 'operational', 'application'].some(predefined => 
                    type.toLowerCase().includes(predefined.toLowerCase())
                  ))
                  .map(type => (
                  <option key={type} value={type}>
                    📋 {type}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Year Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                📅 Year
              </label>
              <select
                value={dateFilters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">All Years</option>
                {getAvailableYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            {/* Month Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                📊 Month
              </label>
              <select
                value={dateFilters.month}
                onChange={(e) => handleFilterChange('month', e.target.value)}
                disabled={!dateFilters.year}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: dateFilters.year ? 'white' : '#f9fafb',
                  cursor: dateFilters.year ? 'pointer' : 'not-allowed'
                }}
              >
                <option value="">All Months</option>
                {/*
                  Month options generated here
                */}
                {/*
                  ... existing month options ...
                */}
              </select>
            </div>
            
            {/* Week Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                📍 Week
              </label>
              <select
                value={dateFilters.week}
                onChange={(e) => handleFilterChange('week', e.target.value)}
                disabled={!dateFilters.year || !dateFilters.month}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: (dateFilters.year && dateFilters.month) ? 'white' : '#f9fafb',
                  cursor: (dateFilters.year && dateFilters.month) ? 'pointer' : 'not-allowed'
                }}
              >
                <option value="">All Weeks</option>
                {dateFilters.year && dateFilters.month && 
                  getWeeksInMonth(parseInt(dateFilters.year), parseInt(dateFilters.month)).map(week => (
                    <option key={week.number} value={week.number}>
                      {week.label}
                    </option>
                  ))
                }
              </select>
            </div>
            
            {/* Filter Summary */}
            <div style={{
              padding: '12px',
              backgroundColor: '#e0f2fe',
              borderRadius: '6px',
              border: '1px solid #0891b2'
            }}>
              <div style={{ fontSize: '12px', color: '#0c4a6e', fontWeight: '500' }}>
                📊 Showing: {getFilteredData().length} of {data.length} entries
              </div>
              {(dateFilters.logType || dateFilters.year || dateFilters.month || dateFilters.week) && (
                <div style={{ fontSize: '11px', color: '#155e75', marginTop: '4px' }}>
                  {dateFilters.logType && `Type: ${dateFilters.logType}`}
                  {dateFilters.year && ` • Year: ${dateFilters.year}`}
                  {dateFilters.month && ` • Month: ${new Date(2024, dateFilters.month - 1).toLocaleString('default', { month: 'long' })}`}
                  {dateFilters.week && ` • Week: ${dateFilters.week}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const headerStyle = {
  padding: '12px 8px',
  textAlign: 'left',
  fontWeight: '600',
  color: '#374151',
  borderBottom: '2px solid #d1d5db'
};

const cellStyle = {
  padding: '8px',
  borderBottom: '1px solid #e5e7eb',
  verticalAlign: 'top'
};