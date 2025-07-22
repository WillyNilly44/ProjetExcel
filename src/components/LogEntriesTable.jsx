import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AddEntryModal from './AddEntryModal';
import ColumnManager from './ColumnManager';
import PDFExport from './PDFExport';
import ToolbarDropdown from './ToolBarDropdown';
import MiniLogin from './MiniLogin';
import TabNavigation from './TabNavigation';
import UserManagement from './UserManagement';
import DashboardTab from './DashboardTab';
import EntryDetailModal from './EntryDetailModal';
import CalendarView from './CalendarView'; 
import '../style.css';

export default function LogEntriesTable() {
  const { hasPermission, user } = useAuth(); 
  const [activeTab, setActiveTab] = useState('logs');
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Ready to load');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [dateFilters, setDateFilters] = useState({
    year: '',
    month: '',
    week: '',
    logType: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showVirtualEntries, setShowVirtualEntries] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState('table');

  const fetchLogEntries = async () => {
    setIsLoading(true);
    setConnectionStatus('Loading log entries...');
    
    try {
      
      const response = await fetch('/api/dbconnection', {
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
        setConnectionStatus(`✅ Loaded`);
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
      
      const response = await fetch('/api/addentryrec', {
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
        alert(result.message);
        
        await fetchLogEntries();
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Failed to save entry:', error);
      throw error;
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this log entry? This action cannot be undone.')) {
      return;
    }

    try {
      
      const response = await fetch('/api/deleteentry', {
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

  const formatColumnName = (columnName) => {
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatCellValue = (value, columnName, dataType) => {
    if (value === null || value === undefined) return '-';
    
    const lowerColumnName = columnName.toLowerCase();
    
    if (lowerColumnName.includes('log_start') || lowerColumnName.includes('log_end') || 
        lowerColumnName.includes('start_time') || lowerColumnName.includes('end_time')) {
      if (!value) return '-';
      
      if (typeof value === 'string') {
        if (value.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
          const timeParts = value.split(':');
          return `${timeParts[0].padStart(2, '0')}:${timeParts[1]}`;
        }
        
        if (value.includes('T')) {
          const timePart = value.split('T')[1];
          if (timePart) {
            return timePart.substring(0, 5);
          }
        }
        
        if (value.includes(' ')) {
          const parts = value.split(' ');
          if (parts.length > 1) {
            return parts[1].substring(0, 5);
          }
        }
        
        if (value.length > 10 && value.includes(':')) {
          const timeMatch = value.match(/(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
          }
        }
      }
      
      return value;
    }
    
    if ((dataType === 'datetime' || dataType === 'date' || lowerColumnName.includes('date') || lowerColumnName.includes('created') || lowerColumnName.includes('updated')) && !lowerColumnName.includes('time') && !lowerColumnName.includes('start') && !lowerColumnName.includes('end')) {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value;
      }
    }
    
    if (dataType === 'bit' || typeof value === 'boolean') {
      return value ? '✅' : '❌';
    }
    
    if ((lowerColumnName.includes('estimated_time') || lowerColumnName.includes('actual_time')) && typeof value === 'number') {
      return `${value.toFixed(2)}h`;
    }
    

    if (lowerColumnName.includes('duration') && typeof value === 'number') {
      return `${value}min`;
    }
 
    const stringValue = value.toString();

    let maxLength;
    if (lowerColumnName.includes('note')) {
      maxLength = 50; 
    } else if (lowerColumnName.includes('ticket_number')) {
      maxLength = 15; 
    }  else if (lowerColumnName.includes('id') || lowerColumnName.includes('status')) {
      maxLength = 20; 
    } else {
      maxLength = 25; 
    }
    
    if (stringValue.length > maxLength) {
      return `${stringValue.substring(0, maxLength)}...`;
    }
    
    return stringValue;
  };

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

  useEffect(() => {
    if (columns.length > 0) {
      const allColumnNames = columns.map(col => col.COLUMN_NAME);
      
      const savedVisible = localStorage.getItem('logEntries_visibleColumns');
      const savedOrder = localStorage.getItem('logEntries_columnOrder');
      
      if (savedVisible && savedOrder) {
        try {
          const parsedVisible = JSON.parse(savedVisible);
          const parsedOrder = JSON.parse(savedOrder);
          
          const validVisible = parsedVisible.filter(name => allColumnNames.includes(name));
          const validOrder = parsedOrder.filter(name => allColumnNames.includes(name));
          
          const missingColumns = allColumnNames.filter(name => !validOrder.includes(name));
          
          const finalVisible = [...validVisible, ...missingColumns];
          const finalOrder = [...validOrder, ...missingColumns];
          
          setVisibleColumns(finalVisible);
          setColumnOrder(finalOrder);
          
        } catch (e) {
          console.warn('⚠️ Failed to parse saved column preferences, using defaults');
          setVisibleColumns(allColumnNames);
          setColumnOrder(allColumnNames);
        }
      } else {
        setVisibleColumns(allColumnNames);
        setColumnOrder(allColumnNames);
      }
    }
  }, [columns]);

  const getDisplayColumns = () => {
    const displayColumns = columnOrder
      .filter(columnName => visibleColumns.includes(columnName))
      .map(columnName => columns.find(col => col.COLUMN_NAME === columnName))
      .filter(Boolean);
    
    
    return displayColumns;
  };

  const handleColumnManagerSave = (newVisibleColumns, newColumnOrder) => {
    
    setVisibleColumns(newVisibleColumns);
    setColumnOrder(newColumnOrder);
    
    try {
      localStorage.setItem('logEntries_visibleColumns', JSON.stringify(newVisibleColumns));
      localStorage.setItem('logEntries_columnOrder', JSON.stringify(newColumnOrder));
    } catch (e) {
      console.error('❌ Failed to save column preferences:', e);
    }
  };

  useEffect(() => {
    if (columns.length > 0) {
      const savedVisible = localStorage.getItem('logEntries_visibleColumns');
      const savedOrder = localStorage.getItem('logEntries_columnOrder');
      
      if (savedVisible && savedOrder) {
        try {
          const parsedVisible = JSON.parse(savedVisible);
          const parsedOrder = JSON.parse(savedOrder);
          const currentColumnNames = columns.map(col => col.COLUMN_NAME);
          const validVisible = parsedVisible.filter(name => currentColumnNames.includes(name));
          const validOrder = parsedOrder.filter(name => currentColumnNames.includes(name));
          const missingColumns = currentColumnNames.filter(name => !validOrder.includes(name));
          
          setVisibleColumns([...validVisible, ...missingColumns]);
          setColumnOrder([...validOrder, ...missingColumns]);
        } catch (e) {
          const allColumns = columns.map(col => col.COLUMN_NAME);
          setVisibleColumns(allColumns);
          setColumnOrder(allColumns);
        }
      } else {
        const allColumns = columns.map(col => col.COLUMN_NAME);
        setVisibleColumns(allColumns);
        setColumnOrder(allColumns);
      }
    }
  }, [columns]);

  useEffect(() => {
    fetchLogEntries();
  }, []);


  const getAvailableYears = () => {
    if (!data || data.length === 0) return [];
    

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
      .sort((a, b) => b - a); 
  
    return years;
  };

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

  const getFilteredData = () => {
    if (!data || data.length === 0) return [];

    const expandedData = showVirtualEntries ? generateRecurringEntries(data) : data;
    
    if (!dateFilters.year && !dateFilters.month && !dateFilters.week && !dateFilters.logType) {
      return expandedData;
    }
    
    const dateColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('date') || 
      col.COLUMN_NAME.toLowerCase().includes('created')
    );
    
    const logTypeColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('log_type')
    );
    
    return expandedData.filter(entry => {
      if (dateColumn) {
        const dateValue = entry[dateColumn.COLUMN_NAME];
        if (dateValue) {
          try {
            const entryDate = new Date(dateValue);
            const entryYear = entryDate.getFullYear();
            const entryMonth = entryDate.getMonth() + 1;
            const entryDay = entryDate.getDate();
            
            if (dateFilters.year && entryYear !== parseInt(dateFilters.year)) {
              return false;
            }
            
            if (dateFilters.month && entryMonth !== parseInt(dateFilters.month)) {
              return false;
            }
            
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
      
      if (dateFilters.logType && logTypeColumn) {
        const entryLogType = entry[logTypeColumn.COLUMN_NAME];
        if (!entryLogType) return false;
        
        const normalizedEntryType = entryLogType.toString().toLowerCase().trim();
        const selectedType = dateFilters.logType.toLowerCase();

        return normalizedEntryType.includes(selectedType);
      }
      
      return true;
    });
  };

  const getAvailableLogTypes = () => {
    return ['Operational', 'Application'];
  };


  const clearFilters = () => {
    setDateFilters({
      year: '',
      month: '',
      week: '',
      logType: '' 
    });
  };

  const handleFilterChange = (filterType, value) => {
    setDateFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      if (filterType === 'year') {
        newFilters.month = '';
        newFilters.week = '';
      } else if (filterType === 'month') {
        newFilters.week = '';
      }
      
      return newFilters;
    });
  };

  const generateRecurringEntries = (data) => {
    if (!data || data.length === 0) {
      return data;
    }
    
    const expandedData = [...data];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let recurringFound = 0;
    let virtualCreated = 0;
    
    data.forEach(entry => {
      const hasRecurrence = entry.is_recurring === 1 || entry.is_recurring === true || entry.recurrence_day;
      
      if (hasRecurrence && entry.recurrence_day) {
        recurringFound++;
        
        const dayMapping = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        const targetDay = dayMapping[entry.recurrence_day.toLowerCase()];
        
        if (targetDay !== undefined) {
          const weekOffsets = [-1, 1]; 
          
          weekOffsets.forEach(weekOffset => {
            const startOfTargetWeek = new Date(today);
            startOfTargetWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
            
            const recurringDate = new Date(startOfTargetWeek);
            recurringDate.setDate(startOfTargetWeek.getDate() + targetDay);
            recurringDate.setHours(0, 0, 0, 0); 
            
            const originalDate = new Date(entry.log_date);
            originalDate.setHours(0, 0, 0, 0);
            
            if (recurringDate.getTime() === originalDate.getTime()) {
              return; 
            }
            

            const isFutureDate = recurringDate > today;
            

            const statusColumn = columns.find(col => 
              col.COLUMN_NAME.toLowerCase().includes('status') ||
              col.COLUMN_NAME.toLowerCase().includes('completion')
            );
            
            const virtualEntry = {
              ...entry,
              id: `${entry.id}_recurring_${recurringDate.getTime()}`,
              log_date: recurringDate.toISOString().split('T')[0],
              is_virtual: true,
              original_id: entry.id,
              week_offset: weekOffset,
              target_day: entry.recurrence_day,
              generated_on: today.toISOString().split('T')[0],
              relative_to_current: true
            };
            
            if (statusColumn && isFutureDate) {
              virtualEntry[statusColumn.COLUMN_NAME] = 'Not Completed';
            }
            

            if (isFutureDate) {

              if ('status' in virtualEntry) virtualEntry.status = 'Not Completed';
              if ('completion_status' in virtualEntry) virtualEntry.completion_status = 'Not Completed';
              if ('task_status' in virtualEntry) virtualEntry.task_status = 'Not Completed';
              if ('log_status' in virtualEntry) virtualEntry.log_status = 'Not Completed';
            }
            
            virtualCreated++;
            expandedData.push(virtualEntry);
          });
        }
      }
    });    
    
    return expandedData.sort((a, b) => {
      const dateA = new Date(a.log_date);
      const dateB = new Date(b.log_date);
      
      const dateDiff = dateB - dateA;
      if (dateDiff !== 0) {
        return dateDiff;
      }
      
      const idA = typeof a.id === 'string' ? parseInt(a.original_id || a.id) : a.id;
      const idB = typeof b.id === 'string' ? parseInt(b.original_id || b.id) : b.id;
      
      return idB - idA; 
    });
  };

  const getConnectionStatusClass = () => {
    if (connectionStatus.includes('✅')) return 'success';
    if (connectionStatus.includes('❌')) return 'error';
    return 'neutral';
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-text">
          ⏳ Loading log entries...
        </div>
      </div>
    );
  }

  const handleRowClick = (entry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedEntry(null);
  };


  const getExistingDistricts = () => {
    if (!data || data.length === 0) return [];
    

    const districtColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('district')
    );
    
    if (!districtColumn) return [];
    
    const districts = data
      .map(entry => entry[districtColumn.COLUMN_NAME])
      .filter(district => district && typeof district === 'string')
      .filter((district, index, array) => array.indexOf(district) === index)
      .sort();
    
    return districts;
  };


  const getExistingIncidents = () => {
    if (!data || data.length === 0) return [];
    

    const incidentColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('incident')
    );
    
    if (!incidentColumn) return [];
    

    const incidents = data
      .map(entry => entry[incidentColumn.COLUMN_NAME])
      .filter(incident => incident && typeof incident === 'string')
      .filter((incident, index, array) => array.indexOf(incident) === index)
      .sort();
    
    return incidents;
  };

  return (
    <div className="log-entries-container">
      <MiniLogin />
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        hasPermission={hasPermission}
      />

      {activeTab === 'logs' && (
        <>
          {/* Status Header */}
          <div className="status-header">
            <div>
              <h2> Log Viewing Tool</h2>
              <div className={`status-text ${getConnectionStatusClass()}`}>
                {connectionStatus}
              </div>
            </div>
            
            <div className="toolbar-container">
              {/* Add View Toggle Buttons */}
              <div className="view-toggle">
                <button
                  className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  📋 Table
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                  onClick={() => setViewMode('calendar')}
                  title="Calendar View"
                >
                  📅 Calendar
                </button>
              </div>

              <ToolbarDropdown
                isLoading={isLoading}
                columnsLength={columns.length}
                showVirtualEntries={showVirtualEntries}
                setShowVirtualEntries={setShowVirtualEntries}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                setShowColumnManager={setShowColumnManager}
                setShowAddModal={setShowAddModal}
                fetchLogEntries={fetchLogEntries}
                exportComponent={
                  <PDFExport
                    data={getFilteredData()}
                    columns={columns}
                    filters={dateFilters}
                    showVirtualEntries={showVirtualEntries}
                    formatColumnName={formatColumnName}
                    formatCellValue={formatCellValue}
                    getDisplayColumns={getDisplayColumns}
                    disabled={isLoading || columns.length === 0}
                    compact={true}
                  />
                }
                hasPermission={hasPermission}
                data={data}
                columns={columns}
                dateFilters={dateFilters}
                formatColumnName={formatColumnName}
                formatCellValue={formatCellValue}
                getDisplayColumns={getDisplayColumns}
                getFilteredData={getFilteredData}
              />
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="filter-panel">
              <div className="filter-header">
                <h3 className="filter-title">📅 Filters</h3>
                <button onClick={clearFilters} className="filter-clear-btn">
                  🗑 Clear All
                </button>
              </div>
              
              <div className="filter-grid">
                {/* Log Type Filter */}
                <div className="filter-group">
                  <label>🏷️ Log Type</label>
                  <select
                    value={dateFilters.logType}
                    onChange={(e) => handleFilterChange('logType', e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Types</option>
                    <option value="operational">Operational</option>
                    <option value="application">Application</option>
                  </select>
                </div>
                
                {/* Year Filter */}
                <div className="filter-group">
                  <label>📅 Year</label>
                  <select
                    value={dateFilters.year}
                    onChange={(e) => handleFilterChange('year', e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Years</option>
                    {getAvailableYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                {/* Month Filter */}
                <div className="filter-group">
                  <label>📊 Month</label>
                  <select
                    value={dateFilters.month}
                    onChange={(e) => handleFilterChange('month', e.target.value)}
                    disabled={!dateFilters.year}
                    className="filter-select"
                  >
                    <option value="">All Months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                
                {/* Week Filter */}
                <div className="filter-group">
                  <label>📍 Week</label>
                  <select
                    value={dateFilters.week}
                    onChange={(e) => handleFilterChange('week', e.target.value)}
                    disabled={!dateFilters.year || !dateFilters.month}
                    className="filter-select"
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
              </div>
            </div>
          )}

          {/* Data Display - Table or Calendar */}
          {!data || data.length === 0 ? (
            <div className="no-data">
              <div className="no-data-text">📝 No log entries found</div>
            </div>
          ) : viewMode === 'calendar' ? (
            <CalendarView
              data={getFilteredData()}
              columns={columns}
              formatCellValue={formatCellValue}
              onEventClick={handleRowClick}
              showVirtualEntries={showVirtualEntries}
            />
          ) : (
            <div className="table-container">
              <div className="table-header">
                <h3 className="table-title"> LOGS</h3>
              </div>
              
              <div className="table-scroll-container">
                <table className="data-table">
                  <thead className="table-head">
                    <tr>
                      {getDisplayColumns().map((column) => (
                        <th 
                          key={column.COLUMN_NAME} 
                          className="table-header-cell"
                          title={`${column.DATA_TYPE} ${column.IS_NULLABLE === 'NO' ? '(Required)' : '(Optional)'}`}
                        >
                          {formatColumnName(column.COLUMN_NAME)}
                        </th>
                      ))}
                      <th className="table-header-cell table-header-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredData().map((entry, index) => (
                      <tr 
                        key={entry.id || index} 
                        className={`table-row ${entry.is_virtual ? 'virtual' : ''} ${index % 2 === 0 ? 'even' : 'odd'} clickable-row`}
                        onClick={() => handleRowClick(entry)} 
                        title="Click to view details"
                      >
                        {getDisplayColumns().map((column) => {
                          const cellClasses = [
                            'table-cell',
                            getColumnType(column.COLUMN_NAME, column.DATA_TYPE),
                            entry.is_virtual && column.COLUMN_NAME.toLowerCase().includes('incident') ? 'incident virtual' : ''
                          ].filter(Boolean).join(' ');

                          return (
                            <td 
                              key={column.COLUMN_NAME} 
                              className={cellClasses}
                              title={`${entry[column.COLUMN_NAME]}${entry.is_virtual ? ' (Recurring Entry)' : ''}`}
                            >
                              <div className={`cell-content ${column.COLUMN_NAME.toLowerCase().includes('note') ? 'note' : ''}`}>
                                {entry.is_virtual && column.COLUMN_NAME.toLowerCase().includes('incident') && (
                                  <span className="virtual-icon">🔄</span>
                                )}
                                <span className={entry.is_virtual ? 'virtual-text' : 'normal-text'}>
                                  {formatCellValue(entry[column.COLUMN_NAME], column.COLUMN_NAME, column.DATA_TYPE)}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                        <td className={`table-cell actions ${entry.is_virtual ? 'virtual' : ''}`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); 
                              handleDeleteEntry(entry.original_id || entry.id);
                            }}
                            disabled={!entry.id || entry.is_virtual}
                            className={`action-btn ${entry.is_virtual ? 'virtual' : 'delete'}`}
                            title={entry.is_virtual ? 'Cannot delete recurring instance' : (entry.id ? 'Delete this entry' : 'No ID available')}
                          >
                            {entry.is_virtual ? '🔄' : '🗑'} {entry.is_virtual ? 'Recu.' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conditionally render modals based on permissions */}
          {hasPermission('Operator') && (
            <AddEntryModal 
              isOpen={showAddModal}
              onClose={() => setShowAddModal(false)}
              onSave={handleSaveEntry}
              columns={columns}
              getExistingDistricts={getExistingDistricts}
              getExistingIncidents={getExistingIncidents}
              currentUser={user} 
            />
          )}

          {hasPermission('Administrator') && (
            <ColumnManager 
              isOpen={showColumnManager}
              onClose={() => setShowColumnManager(false)}
              columns={columns}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              onSave={handleColumnManagerSave}
            />
          )}

          <EntryDetailModal
            isOpen={showDetailModal}
            onClose={handleCloseDetailModal}
            entry={selectedEntry}
            columns={columns}
            formatColumnName={formatColumnName}
            formatCellValue={formatCellValue}
            onSave={handleSaveEntry}
          />
        </>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <DashboardTab />
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <UserManagement />
      )}
    </div>
  );
}


function getColumnType(columnName, dataType) {
  const lowerName = columnName.toLowerCase();
  
  if (dataType === 'bit' || typeof dataType === 'boolean') {
    return 'center';
  }
  
  if (lowerName.includes('status')) {
    return 'status';
  }
  
  if (lowerName.includes('note') || lowerName.includes('description')) {
    return 'note';
  }
  
  return '';
}