import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AddEntryModal from './AddEntryModal';
import ColumnManager from './ColumnManager';
import PDFExport from './PDFExport';
import ToolbarDropdown from './ToolBarDropdown';
import EntryDetailModal from './EntryDetailModal';
import CalendarView from './CalendarView'; 
import AddColumnModal from './AddColumnModal';
import VirtualTable from './VirtualTable';

export default function LogEntriesTable({ 
  data = [], 
  columns = [], 
  formatCellValue = (value) => value,
  hasPermission = () => false,
  isLoading = false,
  connectionStatus = 'Ready to load',
  connectionInfo = null,
  onRefresh = () => {}
}) {
  const { user } = useAuth(); 
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
  const [showFilters, setShowFilters] = useState(true);
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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

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
  }, [columns, data]);

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

  // Sorting functions
  const handleSort = (columnName) => {
    let direction = 'asc';
    
    if (sortConfig.key === columnName) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null; // Remove sorting
      } else {
        direction = 'asc';
      }
    }
    
    setSortConfig({ 
      key: direction ? columnName : null, 
      direction: direction 
    });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return '⇅'; // No sort icon
    }
    
    if (sortConfig.direction === 'asc') {
      return '▲'; // Ascending
    } else if (sortConfig.direction === 'desc') {
      return '▼'; // Descending
    }
    
    return '⇅'; // Fallback
  };

  // Helper functions
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

  const generateRecurringEntries = (data) => {
    if (!data || data.length === 0) {
      return data;
    }
    
    const expandedData = [...data];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    data.forEach(entry => {
      const hasRecurrence = entry.recurrence_type && (entry.recurrence_type === 'weekly' || entry.recurrence_type === 'monthly');
      
      if (hasRecurrence) {
        if (entry.recurrence_type === 'weekly' && entry.day_of_the_week) {
          // Weekly recurrence logic (existing)
          const dayMapping = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
          };
          
          const targetDay = dayMapping[entry.day_of_the_week.toLowerCase()];
          
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
              
              if (recurringDate.getTime() !== originalDate.getTime()) {
                const virtualEntry = createVirtualEntry(entry, recurringDate, 'weekly');
                expandedData.push(virtualEntry);
              }
            });
          }
        } 
        else if (entry.recurrence_type === 'monthly') {
          // Monthly recurrence logic
          const monthOffsets = [-1, 1]; // Previous and next month
          
          monthOffsets.forEach(monthOffset => {
            const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
            let recurringDate;
            
            if (entry.monthly_pattern === 'last') {
              // Last day of the month
              recurringDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
            } else if (entry.monthly_pattern === 'last-weekday') {
              // Last weekday of the month
              recurringDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
              while (recurringDate.getDay() === 0 || recurringDate.getDay() === 6) {
                recurringDate.setDate(recurringDate.getDate() - 1);
              }
            } else if (entry.day_of_the_month) {
              // Specific day of the month
              const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
              const dayOfMonth = Math.min(parseInt(entry.day_of_the_month), lastDayOfMonth);
              recurringDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), dayOfMonth);
            }
            
            if (recurringDate) {
              recurringDate.setHours(0, 0, 0, 0);
              
              const originalDate = new Date(entry.log_date);
              originalDate.setHours(0, 0, 0, 0);
              
              if (recurringDate.getTime() !== originalDate.getTime()) {
                const virtualEntry = createVirtualEntry(entry, recurringDate, 'monthly');
                expandedData.push(virtualEntry);
              }
            }
          });
        }
      }
    });
    
    return expandedData.sort((a, b) => {
      const dateA = new Date(a.log_date);
      const dateB = new Date(b.log_date);
      return dateB - dateA;
    });
  };

  const createVirtualEntry = (entry, recurringDate, recurrenceType) => {
    const isFutureDate = recurringDate > new Date();
    
    const statusColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('status') ||
      col.COLUMN_NAME.toLowerCase().includes('completion')
    );
    
    const virtualEntry = {
      ...entry,
      id: `${entry.id}_recurring_${recurrenceType}_${recurringDate.getTime()}`,
      log_date: recurringDate.toISOString().split('T')[0],
      is_virtual: true,
      original_id: entry.id,
      recurrence_type: recurrenceType,
      generated_on: new Date().toISOString().split('T')[0]
    };
    
    if (statusColumn && isFutureDate) {
      virtualEntry[statusColumn.COLUMN_NAME] = 'Not Completed';
    }
    
    return virtualEntry;
  };

  // SINGLE getFilteredData function with filtering AND sorting
  const getFilteredData = () => {
    if (!data || data.length === 0) return [];

    const expandedData = showVirtualEntries ? generateRecurringEntries(data) : data;
    
    // Apply filters first
    const hasFilters = Object.values(dateFilters).some(value => value && value !== '');
    let filteredData = expandedData;
    
    if (hasFilters) {
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
      
      filteredData = expandedData.filter(entry => {
        // Date filters
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
        
        // Log type filter
        if (dateFilters.logType && logTypeColumn) {
          const entryLogType = entry[logTypeColumn.COLUMN_NAME];
          if (!entryLogType) return false;
          
          const normalizedEntryType = entryLogType.toString().toLowerCase().trim();
          const selectedType = dateFilters.logType.toLowerCase();

          if (!normalizedEntryType.includes(selectedType)) {
            return false;
          }
        }

        // Content filters
        if (dateFilters.district && districtColumn) {
          const entryDistrict = entry[districtColumn.COLUMN_NAME];
          if (!entryDistrict || entryDistrict.toString().toLowerCase() !== dateFilters.district.toLowerCase()) {
            return false;
          }
        }

        if (dateFilters.incident && incidentColumn) {
          const entryIncident = entry[incidentColumn.COLUMN_NAME];
          if (!entryIncident || !entryIncident.toString().toLowerCase().includes(dateFilters.incident.toLowerCase())) {
            return false;
          }
        }

        if (dateFilters.assigned && assignedColumn) {
          const entryAssigned = entry[assignedColumn.COLUMN_NAME];
          if (!entryAssigned || entryAssigned.toString().toLowerCase() !== dateFilters.assigned.toLowerCase()) {
            return false;
          }
        }

        if (dateFilters.uploader && uploaderColumn) {
          const entryUploader = entry[uploaderColumn.COLUMN_NAME];
          if (!entryUploader || entryUploader.toString().toLowerCase() !== dateFilters.uploader.toLowerCase()) {
            return false;
          }
        }
        
        return true;
      });
    }

    // Apply sorting after filters
    if (sortConfig.key && sortConfig.direction) {
      filteredData = [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) {
          if (bValue === null || bValue === undefined) return 0;
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        if (bValue === null || bValue === undefined) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        
        // Try to detect data type and sort accordingly
        const column = columns.find(col => col.COLUMN_NAME === sortConfig.key);
        const dataType = column?.DATA_TYPE?.toLowerCase() || '';
        
        // Handle dates
        if (dataType.includes('date') || dataType.includes('time')) {
          const dateA = new Date(aValue);
          const dateB = new Date(bValue);
          if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            const result = dateA.getTime() - dateB.getTime();
            return sortConfig.direction === 'asc' ? result : -result;
          }
        }
        
        // Handle numbers
        if (dataType.includes('int') || dataType.includes('decimal') || dataType.includes('float')) {
          const numA = parseFloat(aValue);
          const numB = parseFloat(bValue);
          if (!isNaN(numA) && !isNaN(numB)) {
            const result = numA - numB;
            return sortConfig.direction === 'asc' ? result : -result;
          }
        }
        
        // Handle boolean/bit
        if (dataType === 'bit' || typeof aValue === 'boolean' || typeof bValue === 'boolean') {
          const boolA = aValue === true || aValue === 1 || aValue === '1';
          const boolB = bValue === true || bValue === 1 || bValue === '1';
          const result = Number(boolA) - Number(boolB);
          return sortConfig.direction === 'asc' ? result : -result;
        }
        
        // Default string comparison
        const strA = String(aValue).toLowerCase();
        const strB = String(bValue).toLowerCase();
        const result = strA.localeCompare(strB);
        return sortConfig.direction === 'asc' ? result : -result;
      });
    }

    return filteredData;
  };

  // Rest of your functions (handleSaveEntry, handleColumnAdded, etc.) remain exactly the same...
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
        await onRefresh();
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      throw error;
    }
  };

  const handleColumnAdded = async () => {
    try {
      await onRefresh();
      setConnectionStatus('✅ Column added successfully! Data refreshed.');
      setTimeout(() => {
        setConnectionStatus('✅ Loaded');
      }, 3000);
    } catch (error) {
      setConnectionStatus('❌ Column added but failed to refresh data. Please reload the page.');
    }
  };

  const handleSaveEditedEntry = async (editedEntry) => {
    try {
      const requestData = {
        action: 'update',
        entryId: editedEntry.id,
        entryData: editedEntry
      };

      const response = await fetch('/api/updateentry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {        
        await onRefresh();
        setConnectionStatus('✅ Entry updated successfully!');
        setTimeout(() => setConnectionStatus('✅ Loaded'), 3000);
        return true;
      } else {
        throw new Error(result.error || 'Failed to update entry');
      }
      
    } catch (error) {
      setConnectionStatus(`❌ Failed to update entry: ${error.message}`);
      setTimeout(() => setConnectionStatus('✅ Loaded'), 5000);
      return false;
    }
  };

  const handleDuplicateEntry = async (sourceEntry) => {
    if (!sourceEntry) {
      alert('No entry selected for duplication');
      return;
    }

    if (!user) {
      alert('Cannot duplicate: User information not available');
      return;
    }

    try {
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
      
      const todayString = new Date().toLocaleDateString('en-CA');
      
      // Update date fields to today
      Object.keys(duplicateData).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('date') && !lowerKey.includes('time') && !lowerKey.includes('created') && !lowerKey.includes('updated')) {
          const oldValue = duplicateData[key];
          duplicateData[key] = todayString;
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

      duplicateData.isRecurrence = false;
      duplicateData.day_of_the_week = null;

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
        setShowDetailModal(false);
        setSelectedEntry(null);
        
        alert(`✅ Entry duplicated successfully!\n\nNew entry created with today's date: ${todayString}\nOriginal entry ID: ${sourceEntry.id}\nNew entry ID: ${result.id}`);
        
        await onRefresh();
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
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
    }
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

  const getConnectionStatusClass = () => {
    if (connectionStatus.includes('✅')) return 'connected';
    if (connectionStatus.includes('❌')) return 'error';
    if (connectionStatus.includes('Loading')) return 'loading';
    return 'disconnected';
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
    if (!columnName || typeof columnName !== 'string') {
      return 'Unknown Column';
    }
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getColumnType = (columnName, dataType) => {
    const lowerName = columnName ? columnName.toLowerCase() : '';
    const lowerType = dataType ? dataType.toLowerCase() : '';
    
    if (lowerType === 'bit' || lowerType === 'boolean') return 'boolean';
    if (lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('float')) return 'number';
    if (lowerType.includes('date') || lowerType.includes('time')) return 'date';
    if (lowerName.includes('status')) return 'status';
    
    return 'text';
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
      {/* Status Header */}
      <div className="status-header">
        <div>
          <h2>📋 Log Viewing Tool</h2>
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
            fetchLogEntries={onRefresh}
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
          dateFilters={dateFilters}
        />
      ) : (
        <div className="table-container">
          <div className="table-header">
            <h3 className="table-title">📊 LOGS</h3>
            <div className="table-info">
            </div>
          </div>
          
          <VirtualTable
            data={getFilteredData()}
            columns={columns}
            getDisplayColumns={getDisplayColumns}
            formatColumnName={formatColumnName}
            formatCellValue={formatCellValue}
            onRowClick={handleRowClick}
            hasPermission={hasPermission}
            getColumnType={getColumnType}
            sortConfig={sortConfig}
            onSort={handleSort}
            getSortIcon={getSortIcon}
          />
        </div>
      )}

      {/* Modals */}
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
        <AddColumnModal
          isOpen={showAddColumnModal}
          onClose={() => setShowAddColumnModal(false)}
          onColumnAdded={handleColumnAdded}
        />
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
        onDuplicate={handleDuplicateEntry}
      />
    </div>
  );
}