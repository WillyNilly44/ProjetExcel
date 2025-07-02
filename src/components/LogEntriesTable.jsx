import React, { useState, useEffect } from 'react';
import AddEntryModal from './AddEntryModal';

export default function LogEntriesTable() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Ready to load');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false); // ✅ NEW: Modal state

  const fetchLogEntries = async () => {
    setIsLoading(true);
    setConnectionStatus('Loading log entries...');
    
    try {
      console.log('🔄 Fetching LOG_ENTRIES...');
      
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
  const handleSaveEntry = async (formData) => {
    try {
      console.log('💾 Saving new entry:', formData);
      
      const response = await fetch('/.netlify/functions/AddLogEntry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Entry saved successfully');
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
      console.log('🗑 Deleting entry:', entryId);
      
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
        console.log('✅ Entry deleted successfully');
        // Refresh data to remove deleted entry
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

  // Auto-load data on component mount
  useEffect(() => {
    fetchLogEntries();
  }, []);

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
          <h2 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>🗄 AWS Database - LOG_ENTRIES</h2>
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
        <div style={{ display: 'flex', gap: '12px' }}>
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

      {/* Connection Info */}
      {connectionInfo && (
        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '16px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>📊 Connection Info:</strong> {connectionInfo.server} → {connectionInfo.database}
          {connectionInfo.totalRecords && (
            <span> | {connectionInfo.totalRecords} records | {connectionInfo.columnCount} columns | {new Date(connectionInfo.timestamp).toLocaleString()}</span>
          )}
          {connectionInfo.error && (
            <div style={{ color: '#dc2626', marginTop: '8px' }}>
              <strong>Error:</strong> {connectionInfo.error}
            </div>
          )}
        </div>
      )}

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
              📋 LOG_ENTRIES ({data.length} records{columns.length > 0 ? ` × ${columns.length} columns` : ''})
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
                  {columns.length > 0 ? (
                    columns.map((column) => (
                      <th 
                        key={column.COLUMN_NAME} 
                        style={headerStyle} 
                        title={`${column.DATA_TYPE} ${column.IS_NULLABLE === 'NO' ? '(Required)' : '(Optional)'}`}
                      >
                        {formatColumnName(column.COLUMN_NAME)}
                      </th>
                    ))
                  ) : (
                    data.length > 0 && Object.keys(data[0]).map((key) => (
                      <th key={key} style={headerStyle}>
                        {formatColumnName(key)}
                      </th>
                    ))
                  )}
                  {/* ✅ NEW: Actions column header */}
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
                {data.map((entry, index) => (
                  <tr key={entry.id || index} style={{
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    {columns.length > 0 ? (
                      columns.map((column) => (
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
                      ))
                    ) : (
                      Object.keys(entry).map((key) => (
                        <td key={key} style={cellStyle} title={entry[key]}>
                          <div style={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap'
                          }}>
                            {entry[key] || '-'}
                          </div>
                        </td>
                      ))
                    )}
                    {/* ✅ NEW: Add delete button column */}
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
                        onMouseOver={(e) => {
                          if (entry.id) {
                            e.target.style.backgroundColor = '#dc2626';
                            e.target.style.transform = 'scale(1.05)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (entry.id) {
                            e.target.style.backgroundColor = '#ef4444';
                            e.target.style.transform = 'scale(1)';
                          }
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