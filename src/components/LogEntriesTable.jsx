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
import AddColumnModal from './AddColumnModal';
import VirtualTable from './VirtualTable';
import KPITab from './KPITab'; // Import KPITab component


export default function LogEntriesTable() {
  // All hooks
  const { hasPermission, user } = useAuth(); 
  const [activeTab, setActiveTab] = useState('kpi'); // Changed from 'dashboard' to 'kpi'
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
    logType: '',
    district: '',
    incident: '',
    assigned: '',
    uploader: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showVirtualEntries, setShowVirtualEntries] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [filterOptions, setFilterOptions] = useState({
    districts: [],
    incidents: [],
    assignees: [],
    uploaders: []
  });
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);

  // CONSOLIDATED useEffect - This fixes the hook rule violation
  useEffect(() => {
    // Initial data fetch
    fetchLogEntries();
  }, []); // Only run once on mount

  // CONSOLIDATED useEffect for column management
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

      // Load filter options when data and columns are available
      if (data && data.length > 0) {
        loadFilterOptions();
      }
    }
  }, [columns, data]); // Run when columns or data change

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

  const loadFilterOptions = () => {
    if (!data || !columns || data.length === 0) return;

    const options = {
      districts: [],
      incidents: [],
      assignees: [],
      uploaders: []
    };

    // Get distinct values for each filter type
    const districtColumn = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('district'));
    const incidentColumn = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('incident'));
    const assignedColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('assigned') || 
      col.COLUMN_NAME.toLowerCase().includes('assignee')
    );
    const uploaderColumn = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('uploader'));

    if (districtColumn) {
      options.districts = [...new Set(data
        .map(entry => entry[districtColumn.COLUMN_NAME])
        .filter(value => value && value.toString().trim())
      )].sort();
    }

    if (incidentColumn) {
      options.incidents = [...new Set(data
        .map(entry => entry[incidentColumn.COLUMN_NAME])
        .filter(value => value && value.toString().trim())
      )].sort();
    }

    if (assignedColumn) {
      options.assignees = [...new Set(data
        .map(entry => entry[assignedColumn.COLUMN_NAME])
        .filter(value => value && value.toString().trim())
      )].sort();
    }

    if (uploaderColumn) {
      options.uploaders = [...new Set(data
        .map(entry => entry[uploaderColumn.COLUMN_NAME])
        .filter(value => value && value.toString().trim())
      )].sort();
    }

    setFilterOptions(options);
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

  const handleColumnAdded = async () => {
    try {
      // Refresh the log entries to get updated column structure
      await fetchLogEntries();
      
      // Show success message
      setConnectionStatus('✅ Column added successfully! Data refreshed.');
      
      // Clear the status message after a few seconds
      setTimeout(() => {
        setConnectionStatus('✅ Loaded');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error refreshing data after column addition:', error);
      setConnectionStatus('❌ Column added but failed to refresh data. Please reload the page.');
    }
  };

  const handleSaveEditedEntry = async (editedEntry) => {
    try {

    
    const response = await fetch('/api/updateentry', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editedEntry)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
 
      
      // Refresh the data to show the updated entry
      await fetchLogEntries();
      
      setConnectionStatus('✅ Entry updated successfully!');
      setTimeout(() => setConnectionStatus('✅ Loaded'), 3000);
      
      return true;
    } else {
      throw new Error(result.error || 'Failed to update entry');
    }
    
  } catch (error) {
    console.error('❌ Error updating entry:', error);
    setConnectionStatus(`❌ Failed to update entry: ${error.message}`);
    setTimeout(() => setConnectionStatus('✅ Loaded'), 5000);
    return false;
  }
};

  const handleDuplicateEntry = async (sourceEntry) => {
    console.log('🔍 Duplicating entry automatically:', sourceEntry);
    
    if (!sourceEntry) {
      alert('No entry selected for duplication');
      return;
    }

    if (!user) {
      alert('Cannot duplicate: User information not available');
      return;
    }

    try {
      // Create duplicate data
      const duplicateData = { ...sourceEntry };
      
      // Remove fields that shouldn't be duplicated
      delete duplicateData.id;
      delete duplicateData.created_at;
      delete duplicateData.updated_at;
      delete duplicateData.is_virtual;
      delete duplicateData.original_id;
      delete duplicateData.week_offset;
      delete duplicateData.target_day;
      delete duplicateData.generated_on;
      delete duplicateData.relative_to_current;
      delete duplicateData.is_recurring;
      delete duplicateData.recurrence_day;
      delete duplicateData.day_of_the_week;
      
      // Set date fields to today
      const today = new Date().toISOString().split('T')[0];
      Object.keys(duplicateData).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('date') && !lowerKey.includes('time')) {
          duplicateData[key] = today;
        }
      });

      // Set current user as uploader
      const uploaderField = Object.keys(duplicateData).find(key => 
        key.toLowerCase().includes('uploader')
      );
      if (uploaderField && user.username) {
        duplicateData[uploaderField] = user.username;
      }

      // Add "Original Log: id#" to notes
      const noteFields = Object.keys(duplicateData).filter(key => 
        key.toLowerCase().includes('note') || 
        key.toLowerCase().includes('comment') || 
        key.toLowerCase().includes('description')
      );

      if (noteFields.length > 0) {
        const noteField = noteFields[0];
        const existingNote = duplicateData[noteField] || '';
        const originalLogText = `Original Log: ${sourceEntry.id}#`;
        
        if (existingNote.trim()) {
          duplicateData[noteField] = `${existingNote.trim()} | ${originalLogText}`;
        } else {
          duplicateData[noteField] = originalLogText;
        }
      }

      // Make sure it's NOT a recurrence
      duplicateData.isRecurrence = false;
      duplicateData.day_of_the_week = null;

      console.log('✅ Duplicate data created:', duplicateData);

      // Save directly to database (without opening modal)
      const response = await fetch('/api/addentryrec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success) {
        // Close detail modal
        setShowDetailModal(false);
        setSelectedEntry(null);
        
        // Show success message
        alert(`✅ Entry duplicated successfully! New entry created with today's date.`);
        
        // Refresh data to show the new entry
        await fetchLogEntries();
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Error duplicating entry:', error);
      alert('Failed to duplicate entry: ' + error.message);
    }
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
    
    // If no filters are applied, return all data
    const hasFilters = Object.values(dateFilters).some(value => value && value !== '');
    if (!hasFilters) {
      return expandedData;
    }
    
    const dateColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('date') || 
      col.COLUMN_NAME.toLowerCase().includes('created')
    );
    
    const logTypeColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('log_type')
    );

    const districtColumn = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('district'));
    const incidentColumn = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('incident'));
    const assignedColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('assigned') || 
      col.COLUMN_NAME.toLowerCase().includes('assignee')
    );
    const uploaderColumn = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('uploader'));
    
    return expandedData.filter(entry => {
      // Date filters (existing logic - keeping year, month, week)
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
      
      // Log type filter (existing logic)
      if (dateFilters.logType && logTypeColumn) {
        const entryLogType = entry[logTypeColumn.COLUMN_NAME];
        if (!entryLogType) return false;
        
        const normalizedEntryType = entryLogType.toString().toLowerCase().trim();
        const selectedType = dateFilters.logType.toLowerCase();

        if (!normalizedEntryType.includes(selectedType)) {
          return false;
        }
      }

      // CONTENT FILTERS (keeping these)
      // District filter
      if (dateFilters.district && districtColumn) {
        const entryDistrict = entry[districtColumn.COLUMN_NAME];
        if (!entryDistrict || entryDistrict.toString().toLowerCase() !== dateFilters.district.toLowerCase()) {
          return false;
        }
      }

      // Incident filter (partial match)
      if (dateFilters.incident && incidentColumn) {
        const entryIncident = entry[incidentColumn.COLUMN_NAME];
        if (!entryIncident || !entryIncident.toString().toLowerCase().includes(dateFilters.incident.toLowerCase())) {
          return false;
        }
      }

      // Assigned filter
      if (dateFilters.assigned && assignedColumn) {
        const entryAssigned = entry[assignedColumn.COLUMN_NAME];
        if (!entryAssigned || entryAssigned.toString().toLowerCase() !== dateFilters.assigned.toLowerCase()) {
          return false;
        }
      }

      // Uploader filter
      if (dateFilters.uploader && uploaderColumn) {
        const entryUploader = entry[uploaderColumn.COLUMN_NAME];
        if (!entryUploader || entryUploader.toString().toLowerCase() !== dateFilters.uploader.toLowerCase()) {
          return false;
        }
      }
      
      return true;
    });
  };

  const clearFilters = () => {
    setDateFilters({
      year: '',
      month: '',
      week: '',
      logType: '',
      district: '',
      incident: '',
      assigned: '',
      uploader: ''
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

  const getActiveFilterCount = () => {
    return Object.values(dateFilters).filter(value => value && value !== '').length;
  };

  const formatColumnName = (columnName) => {
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatCellValue = (value, columnName, dataType) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const lowerColumnName = columnName.toLowerCase();
    const lowerDataType = dataType ? dataType.toLowerCase() : '';

    // Handle boolean/bit values
    if (lowerDataType === 'bit' || typeof value === 'boolean') {
      return value ? '✅ Yes' : '❌ No';
    }

    // Handle status fields
    if (lowerColumnName.includes('status')) {
      const statusValue = value.toString().toLowerCase();
      switch (statusValue) {
        case 'completed':
          return '✅ Completed';
        case 'in progress':
        case 'progress':
          return '🔄 In Progress';
        case 'not completed':
          return '❌ Not Completed';
        case 'scheduled':
          return '📅 Scheduled';
        case 'on hold':
          return '⏸️ On Hold';
        case 'cancelled':
          return '🚫 Cancelled';
        default:
          return value.toString();
      }
    }

    // Handle log type
    if (lowerColumnName.includes('log_type')) {
      const typeValue = value.toString().toLowerCase();
      switch (typeValue) {
        case 'operational':
          return '🔧 Operational';
        case 'application':
          return '💻 Application';
        default:
          return value.toString();
      }
    }

    // Handle estimated/actual time (in hours) - CHECK THIS FIRST BEFORE TIME FIELDS
    if (lowerColumnName.includes('estimated_time') || 
        lowerColumnName.includes('actual_time') || 
        lowerColumnName.includes('expected_down_time') || 
        lowerColumnName.includes('downtime')) {
      const hours = parseFloat(value);
      if (!isNaN(hours)) {
        if (hours === 0) return '0 hours';
        if (hours < 1) {
          const minutes = Math.round(hours * 60);
          return `${minutes} min`;
        } else if (hours >= 24) {
          const days = Math.floor(hours / 24);
          const remainingHours = hours % 24;
          return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
        } else {
          return hours % 1 === 0 ? `${hours} hours` : `${hours}h`;
        }
      }
      return value.toString();
    }

    // Handle time fields (like log_start, log_end) - BUT NOT duration fields
    if (lowerDataType.includes('time') || 
        (lowerColumnName.includes('time') && 
         !lowerColumnName.includes('estimated') && 
         !lowerColumnName.includes('actual') && 
         !lowerColumnName.includes('down') && 
         !lowerColumnName.includes('duration'))) {
      
      // If it's already in HH:MM format, return as-is
      if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
        return value;
      }
      
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
      } catch (e) {
        return value.toString();
      }
    }

    // Handle date fields
    if (lowerDataType.includes('date') || lowerColumnName.includes('date')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      } catch (e) {
        // Fall through to return original value
      }
    }

    // Handle datetime fields
    if (lowerDataType.includes('datetime') || lowerColumnName.includes('datetime')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (e) {
        // Fall through to return original value
      }
    }

    // Handle numeric fields
    if (lowerDataType.includes('int') || lowerDataType.includes('decimal') || lowerDataType.includes('float')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toLocaleString();
      }
    }

    // Handle long text fields (truncate)
    if (lowerColumnName.includes('note') || lowerColumnName.includes('description') || lowerColumnName.includes('comment')) {
      const text = value.toString();
      if (text.length > 100) {
        return text.substring(0, 97) + '...';
      }
      return text;
    }

    // Handle district codes (uppercase)
    if (lowerColumnName.includes('district')) {
      return value.toString().toUpperCase();
    }

    // Default: return as string
    return value.toString();
  };

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-text">
          ⏳ Loading log entries...
        </div>
      </div>
    );
  }

  return (
    <div className="log-entries-container">
      <MiniLogin />
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        hasPermission={hasPermission}
      />

      {/* KPI Tab - Landing Page */}
      {activeTab === 'kpi' && (
        <KPITab 
          data={data}
          columns={columns}
          formatCellValue={formatCellValue}
          hasPermission={hasPermission}
        />
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <DashboardTab 
          data={data}
          columns={columns}
          formatCellValue={formatCellValue}
          hasPermission={hasPermission}
        />
      )}

      {/* Logs Tab */}
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
                setShowAddColumnModal={setShowAddColumnModal}
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
                <h3 className="filter-title">🔍 Filters</h3>
                <div className="filter-actions">
                  {getActiveFilterCount() > 0 && (
                    <span className="active-filter-count">
                      {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} active
                    </span>
                  )}
                  <button onClick={clearFilters} className="filter-clear-btn">
                    🗑 Clear All
                  </button>
                </div>
              </div>
              
              <div className="filter-grid">
                {/* Date Filters Row */}
                <div className="filter-section">
                  <h4 className="filter-section-title">📅 Date Filters</h4>
                  <div className="filter-row">
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

                {/* Content Filters Row */}
                <div className="filter-section">
                  <h4 className="filter-section-title">📋 Content Filters</h4>
                  <div className="filter-row">
                    {/* District Filter */}
                    <div className="filter-group">
                      <label>🏢 District</label>
                      <select
                        value={dateFilters.district}
                        onChange={(e) => handleFilterChange('district', e.target.value)}
                        className="filter-select"
                      >
                        <option value="">All Districts</option>
                        {filterOptions.districts.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </div>

                    {/* Incident Filter */}
                    <div className="filter-group">
                      <label>🚨 Incident</label>
                      <select
                        value={dateFilters.incident}
                        onChange={(e) => handleFilterChange('incident', e.target.value)}
                        className="filter-select"
                      >
                        <option value="">All Incidents</option>
                        {filterOptions.incidents.map(incident => (
                          <option key={incident} value={incident}>
                            {incident.length > 30 ? `${incident.substring(0, 30)}...` : incident}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Assigned Filter */}
                    <div className="filter-group">
                      <label>👤 Assigned To</label>
                      <select
                        value={dateFilters.assigned}
                        onChange={(e) => handleFilterChange('assigned', e.target.value)}
                        className="filter-select"
                      >
                        <option value="">All Assignees</option>
                        {filterOptions.assignees.map(assignee => (
                          <option key={assignee} value={assignee}>{assignee}</option>
                        ))}
                      </select>
                    </div>

                    {/* Uploader Filter */}
                    <div className="filter-group">
                      <label>📝 Uploader</label>
                      <select
                        value={dateFilters.uploader}
                        onChange={(e) => handleFilterChange('uploader', e.target.value)}
                        className="filter-select"
                      >
                        <option value="">All Uploaders</option>
                        {filterOptions.uploaders.map(uploader => (
                          <option key={uploader} value={uploader}>{uploader}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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
                <h3 className="table-title">📊 LOGS</h3>
                <div className="table-info">
                  <span className="record-count">
                    {getFilteredData().length.toLocaleString()} records
                    {getFilteredData().length > 1000 && (
                      <span className="virtual-mode-indicator">⚡ Virtual Mode</span>
                    )}
                  </span>
                </div>
              </div>
              
              {/* Use VirtualTable for better performance */}
              <VirtualTable
                data={getFilteredData()}
                columns={columns}
                getDisplayColumns={getDisplayColumns}
                formatColumnName={formatColumnName}
                formatCellValue={formatCellValue}
                onRowClick={handleRowClick}
                hasPermission={hasPermission}
                getColumnType={getColumnType}
              />
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
          <ColumnManager 
                isOpen={showColumnManager}
                onClose={() => setShowColumnManager(false)}
                columns={columns}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onSave={handleColumnManagerSave}
              />

          {hasPermission('Administrator') && (
            <>
              

              <AddColumnModal
                isOpen={showAddColumnModal}
                onClose={() => setShowAddColumnModal(false)}
                onColumnAdded={handleColumnAdded}
              />
            </>
          )}

          <EntryDetailModal
  isOpen={showDetailModal}
  onClose={handleCloseDetailModal}
  entry={selectedEntry}
  columns={columns}
  formatColumnName={formatColumnName}
  formatCellValue={formatCellValue}
  onSave={handleSaveEditedEntry}
  hasPermission={hasPermission}
  onDuplicate={handleDuplicateEntry}  // Add this line
/>
        </>
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