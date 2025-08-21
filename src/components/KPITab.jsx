/* filepath: c:\Users\William\Documents\ProjetExcel\src\components\KPITab.jsx */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ThresholdManager from './ThresholdManager';

const KPITab = ({ data = [], columns = [], formatCellValue, hasPermission }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState([]);
  const [allDashboardData, setAllDashboardData] = useState([]);
  const [dashboardColumns, setDashboardColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    year: '',
    month: ''
  });
  const [showThresholdManager, setShowThresholdManager] = useState(false);
  const [showAddKPIModal, setShowAddKPIModal] = useState(false);
  const [showEditKPIModal, setShowEditKPIModal] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [newKPI, setNewKPI] = useState({
    month: '',
    week: '',
    maintenance_1: 0,
    maintenance_2: 0,
    incidents_1: 0,
    incidents_2: 0,
    business_impacted: 0
  });
  const [saving, setSaving] = useState(false);
  const [thresholds, setThresholds] = useState({
    maintenance_yellow: 3,
    maintenance_red: 7,
    incident_yellow: 2,
    incident_red: 5,
    impact: 5
  });

  // Load thresholds from database on component mount
  const loadThresholds = async () => {
    try {
      const response = await fetch('/api/getthresholds', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          const dbThresholds = result.data[0];
          const loadedThresholds = {
            maintenance_yellow: dbThresholds.maintenance_yellow || 3,
            maintenance_red: dbThresholds.maintenance_red || 7,
            incident_yellow: dbThresholds.incident_yellow || 2,
            incident_red: dbThresholds.incident_red || 5,
            impact: dbThresholds.impact || 5
          };
          
          setThresholds(loadedThresholds);
          localStorage.setItem('columnThresholds', JSON.stringify(loadedThresholds));
        } else {
          const savedThresholds = localStorage.getItem('columnThresholds');
          if (savedThresholds) {
            const parsedThresholds = JSON.parse(savedThresholds);
            setThresholds(parsedThresholds);
          }
        }
      } else {
        const savedThresholds = localStorage.getItem('columnThresholds');
        if (savedThresholds) {
          const parsedThresholds = JSON.parse(savedThresholds);
          setThresholds(parsedThresholds);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load thresholds from database, using defaults:', error);
      
      const savedThresholds = localStorage.getItem('columnThresholds');
      if (savedThresholds) {
        try {
          const parsedThresholds = JSON.parse(savedThresholds);
          setThresholds(parsedThresholds);
        } catch (parseError) {
          console.warn('⚠️ Failed to parse localStorage thresholds, using defaults');
        }
      }
    }
  };

 // NEW: Sort KPI data by month (newest to oldest)
  const sortKPIData = (data) => {
    if (!data || data.length === 0) return data;

    return data.sort((a, b) => {
      // Get month values from both entries
      const monthA = a.month || '';
      const monthB = b.month || '';

      // Parse the date information from month column
      const dateA = parseMonthYear(monthA);
      const dateB = parseMonthYear(monthB);

      // Sort newest first (descending order)
      return dateB.getTime() - dateA.getTime();
    });
  };

  // NEW: Parse month-year string to Date object for comparison
  const parseMonthYear = (monthString) => {
    if (!monthString || typeof monthString !== 'string') {
      return new Date(0); // Return very old date for invalid entries
    }

    try {
      // Handle different month formats:
      // "January 2025", "Jan 2025", "2025-01", "01/2025", etc.
      
      const cleanMonth = monthString.trim();
      
      // Check for "Month YYYY" format (e.g., "January 2025", "Jan 2025")
      const monthYearMatch = cleanMonth.match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (monthYearMatch) {
        const monthName = monthYearMatch[1];
        const year = parseInt(monthYearMatch[2]);
        const monthNumber = getMonthNumber(monthName);
        return new Date(year, monthNumber - 1, 1); // First day of month
      }

      // Check for "YYYY-MM" format (e.g., "2025-01")
      const yearMonthMatch = cleanMonth.match(/^(\d{4})-(\d{1,2})$/);
      if (yearMonthMatch) {
        const year = parseInt(yearMonthMatch[1]);
        const month = parseInt(yearMonthMatch[2]);
        return new Date(year, month - 1, 1);
      }

      // Check for "MM/YYYY" format (e.g., "01/2025")
      const monthSlashYearMatch = cleanMonth.match(/^(\d{1,2})\/(\d{4})$/);
      if (monthSlashYearMatch) {
        const month = parseInt(monthSlashYearMatch[1]);
        const year = parseInt(monthSlashYearMatch[2]);
        return new Date(year, month - 1, 1);
      }

      // Check for "YYYY MM" format (e.g., "2025 01")
      const yearSpaceMonthMatch = cleanMonth.match(/^(\d{4})\s+(\d{1,2})$/);
      if (yearSpaceMonthMatch) {
        const year = parseInt(yearSpaceMonthMatch[1]);
        const month = parseInt(yearSpaceMonthMatch[2]);
        return new Date(year, month - 1, 1);
      }

      // If no pattern matches, try to parse as a general date
      const fallbackDate = new Date(cleanMonth);
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate;
      }

      console.warn(`⚠️ Could not parse month format: "${monthString}"`);
      return new Date(0); // Return very old date for unparseable entries

    } catch (error) {
      console.warn(`⚠️ Error parsing month "${monthString}":`, error);
      return new Date(0);
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/getdashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Store all data and apply sorting
        const sortedAllData = sortKPIData(result.data || []);
        setAllDashboardData(sortedAllData);
        
        // Apply current filters to get displayed data
        const filteredData = applyClientSideFilters(sortedAllData, filters);
        setDashboardData(filteredData);
        
        setDashboardColumns(result.columns || []);
      } else {
        setError(result.error || 'Failed to load dashboard data');
      }

    } catch (error) {
      console.error('❌ Dashboard data fetch failed:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters on the client side
  const applyClientSideFilters = (data, currentFilters) => {
    if (!data || data.length === 0) return data;

    let filteredData = [...data];

    // Filter by year if selected
    if (currentFilters.year) {
      filteredData = filteredData.filter(entry => {
        const monthColumn = entry.month || '';
        const yearFromMonth = extractYearFromMonth(monthColumn);
        return yearFromMonth === parseInt(currentFilters.year);
      });
    }

    // Filter by month if selected (and year is also selected)
    if (currentFilters.year && currentFilters.month) {
      filteredData = filteredData.filter(entry => {
        const monthColumn = entry.month || '';
        const monthFromColumn = extractMonthFromMonth(monthColumn);
        return monthFromColumn === parseInt(currentFilters.month);
      });
    }

    return filteredData;
  };

  // Extract year from month column
  const extractYearFromMonth = (monthString) => {
    if (!monthString || typeof monthString !== 'string') {
      return null;
    }

    try {
      const cleanMonth = monthString.trim();
      
      // Check for "Month YYYY" format (e.g., "January 2025", "Jan 2025")
      const monthYearMatch = cleanMonth.match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (monthYearMatch) {
        return parseInt(monthYearMatch[2]);
      }

      // Check for "YYYY-MM" format (e.g., "2025-01")
      const yearMonthMatch = cleanMonth.match(/^(\d{4})-(\d{1,2})$/);
      if (yearMonthMatch) {
        return parseInt(yearMonthMatch[1]);
      }

      // Check for "MM/YYYY" format (e.g., "01/2025")
      const monthSlashYearMatch = cleanMonth.match(/^(\d{1,2})\/(\d{4})$/);
      if (monthSlashYearMatch) {
        return parseInt(monthSlashYearMatch[2]);
      }

      // Check for "YYYY MM" format (e.g., "2025 01")
      const yearSpaceMonthMatch = cleanMonth.match(/^(\d{4})\s+(\d{1,2})$/);
      if (yearSpaceMonthMatch) {
        return parseInt(yearSpaceMonthMatch[1]);
      }

      return null;
    } catch (error) {
      console.warn(`⚠️ Error extracting year from "${monthString}":`, error);
      return null;
    }
  };

  // Extract month number from month column
  const extractMonthFromMonth = (monthString) => {
    if (!monthString || typeof monthString !== 'string') {
      return null;
    }

    try {
      const cleanMonth = monthString.trim();
      
      // Check for "Month YYYY" format (e.g., "January 2025", "Jan 2025")
      const monthYearMatch = cleanMonth.match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (monthYearMatch) {
        const monthName = monthYearMatch[1];
        return getMonthNumber(monthName);
      }

      // Check for "YYYY-MM" format (e.g., "2025-01")
      const yearMonthMatch = cleanMonth.match(/^(\d{4})-(\d{1,2})$/);
      if (yearMonthMatch) {
        return parseInt(yearMonthMatch[2]);
      }

      // Check for "MM/YYYY" format (e.g., "01/2025")
      const monthSlashYearMatch = cleanMonth.match(/^(\d{1,2})\/(\d{4})$/);
      if (monthSlashYearMatch) {
        return parseInt(monthSlashYearMatch[1]);
      }

      // Check for "YYYY MM" format (e.g., "2025 01")
      const yearSpaceMonthMatch = cleanMonth.match(/^(\d{4})\s+(\d{1,2})$/);
      if (yearSpaceMonthMatch) {
        return parseInt(yearSpaceMonthMatch[2]);
      }

      return null;
    } catch (error) {
      console.warn(`⚠️ Error extracting month from "${monthString}":`, error);
      return null;
    }
  };

  // Convert month name to number
  const getMonthNumber = (monthName) => {
    const months = {
      'january': 1, 'jan': 1,
      'february': 2, 'feb': 2,
      'march': 3, 'mar': 3,
      'april': 4, 'apr': 4,
      'may': 5,
      'june': 6, 'jun': 6,
      'july': 7, 'jul': 7,
      'august': 8, 'aug': 8,
      'september': 9, 'sep': 9, 'sept': 9,
      'october': 10, 'oct': 10,
      'november': 11, 'nov': 11,
      'december': 12, 'dec': 12
    };

    const lowerMonth = monthName.toLowerCase();
    return months[lowerMonth] || 1; // Default to January if not found
  };

  // FIXED: Single version of getAvailableYears that extracts from actual data
  const getAvailableYears = () => {
    if (!allDashboardData || allDashboardData.length === 0) {
      return [];
    }

    const years = new Set();
    
    allDashboardData.forEach(entry => {
      const monthColumn = entry.month || '';
      const year = extractYearFromMonth(monthColumn);
      if (year) {
        years.add(year);
      }
    });

    // Convert to array and sort newest first
    return Array.from(years).sort((a, b) => b - a);
  };

  // FIXED: Single version of getAvailableMonths that works with selected year
  const getAvailableMonths = (selectedYear) => {
    if (!selectedYear || !allDashboardData || allDashboardData.length === 0) {
      return [];
    }

    const months = new Set();
    
    allDashboardData.forEach(entry => {
      const monthColumn = entry.month || '';
      const year = extractYearFromMonth(monthColumn);
      const month = extractMonthFromMonth(monthColumn);
      
      if (year === parseInt(selectedYear) && month) {
        months.add(month);
      }
    });

    // Convert to array with names and sort
    const monthNames = [
      { value: 1, name: 'January' },
      { value: 2, name: 'February' },
      { value: 3, name: 'March' },
      { value: 4, name: 'April' },
      { value: 5, name: 'May' },
      { value: 6, name: 'June' },
      { value: 7, name: 'July' },
      { value: 8, name: 'August' },
      { value: 9, name: 'September' },
      { value: 10, name: 'October' },
      { value: 11, name: 'November' },
      { value: 12, name: 'December' }
    ];

    return monthNames
      .filter(month => months.has(month.value))
      .sort((a, b) => a.value - b.value);
  };

  // Handle filter changes with immediate filtering
  const handleFilterChange = (filterType, value) => {
    const newFilters = {
      ...filters,
      [filterType]: value
    };

    // If changing year, reset month
    if (filterType === 'year') {
      newFilters.month = '';
    }

    setFilters(newFilters);

    // Apply filters immediately
    const filteredData = applyClientSideFilters(allDashboardData, newFilters);
    setDashboardData(filteredData);
  };

  // Clear filters function
  const clearFilters = () => {
    const clearedFilters = {
      year: '',
      month: ''
    };
    setFilters(clearedFilters);
    
    // Apply cleared filters immediately
    const filteredData = applyClientSideFilters(allDashboardData, clearedFilters);
    setDashboardData(filteredData);
  };

  // Add new KPI to LOG_ENTRIES_DASHBOARD
  const handleAddKPI = async () => {
    if (!newKPI.month.trim() || !newKPI.week.trim()) {
      alert('Month and Week are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/addkpi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          month: newKPI.month,
          week: newKPI.week,
          maintenance_1: parseInt(newKPI.maintenance_1) || 0,
          maintenance_2: parseInt(newKPI.maintenance_2) || 0,
          incidents_1: parseInt(newKPI.incidents_1) || 0,
          incidents_2: parseInt(newKPI.incidents_2) || 0,
          business_impacted: parseInt(newKPI.business_impacted) || 0
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success) {
        // Refresh data which will automatically sort
        await fetchDashboardData();
        setShowAddKPIModal(false);
        setNewKPI({
          month: '',
          week: '',
          maintenance_1: 0,
          maintenance_2: 0,
          incidents_1: 0,
          incidents_2: 0,
          business_impacted: 0
        });
        alert('✅ KPI entry added successfully!');
      } else {
        throw new Error(result.error || 'Failed to add KPI entry');
      }
    } catch (err) {
      console.error('❌ Error adding KPI entry:', err);
      alert('Failed to add KPI entry: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Edit existing KPI entry
  const handleEditKPI = async () => {
    if (!editingKPI.month.trim() || !editingKPI.week.trim()) {
      alert('Month and Week are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/updatekpi', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingKPI.id,
          month: editingKPI.month,
          week: editingKPI.week,
          maintenance_1: parseInt(editingKPI.maintenance_1) || 0,
          maintenance_2: parseInt(editingKPI.maintenance_2) || 0,
          incidents_1: parseInt(editingKPI.incidents_1) || 0,
          incidents_2: parseInt(editingKPI.incidents_2) || 0,
          business_impacted: parseInt(editingKPI.business_impacted) || 0
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success) {
        // Refresh data which will automatically sort
        await fetchDashboardData();
        setShowEditKPIModal(false);
        setEditingKPI(null);
        alert('✅ KPI entry updated successfully!');
      } else {
        throw new Error(result.error || 'Failed to update KPI entry');
      }
    } catch (err) {
      console.error('❌ Error updating KPI entry:', err);
      alert('Failed to update KPI entry: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete KPI entry
  const handleDeleteKPI = async (kpiId) => {
    if (!confirm('Are you sure you want to delete this KPI entry? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/deletekpi', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: kpiId,
          user: user
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success) {
        // Refresh data which will automatically sort
        await fetchDashboardData();
        alert('✅ KPI entry deleted successfully!');
      } else {
        throw new Error(result.error || 'Failed to delete KPI entry');
      }
    } catch (err) {
      console.error('❌ Error deleting KPI entry:', err);
      alert('Failed to delete KPI entry: ' + err.message);
    }
  };

  // Open edit modal
  const openEditModal = (kpi) => {
    setEditingKPI({
      id: kpi.id,
      month: kpi.month || '',
      week: kpi.week || '',
      maintenance_1: kpi.maintenance_1 || 0,
      maintenance_2: kpi.maintenance_2 || 0,
      incidents_1: kpi.incidents_1 || 0,
      incidents_2: kpi.incidents_2 || 0,
      business_impacted: kpi.business_impacted || 0
    });
    setShowEditKPIModal(true);
  };

  const handleKPIInputChange = (field, value) => {
    setNewKPI(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditInputChange = (field, value) => {
    setEditingKPI(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Load thresholds immediately when component mounts
  useEffect(() => {
    loadThresholds();
  }, []);

  // Fetch dashboard data after thresholds are loaded
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // UPDATED: Apply filters function
  const applyFilters = () => {
    const filteredData = applyClientSideFilters(allDashboardData, filters);
    setDashboardData(filteredData);
  };

 

  // Threshold functions with improved logic
  const getCellColorClass = (value, columnName) => {
    if (!thresholds || value === null || value === undefined) {
      return '';
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';

    const columnNameLower = columnName.toLowerCase();

    if (columnNameLower.includes('maintenance')) {
      if (numValue <= thresholds.maintenance_yellow) return 'threshold-green';
      if (numValue <= thresholds.maintenance_red) return 'threshold-yellow';
      return 'threshold-red';
    }
    
    if (columnNameLower.includes('incident')) {
      if (numValue <= thresholds.incident_yellow) return 'threshold-green';
      if (numValue <= thresholds.incident_red) return 'threshold-yellow';
      return 'threshold-red';
    }

    if (columnNameLower.includes('business') || columnNameLower.includes('impact')) {
      if (numValue <= 2) return 'threshold-green';
      if (numValue <= 5) return 'threshold-yellow';
      return 'threshold-red';
    }

    return '';
  };

  const getCellStyle = (value, columnName) => {
    const colorClass = getCellColorClass(value, columnName);
    
    switch (colorClass) {
      case 'threshold-green':
        return { backgroundColor: '#28a745', color: 'white', fontWeight: '500' };
      case 'threshold-yellow':
        return { backgroundColor: '#ffc107', color: 'white', fontWeight: '500' };
      case 'threshold-red':
        return { backgroundColor: '#dc3545', color: 'white', fontWeight: '500' };
      default:
        return {};
    }
  };

  const handleThresholdSave = (newThresholds) => {
    setThresholds(newThresholds);
    localStorage.setItem('columnThresholds', JSON.stringify(newThresholds));
  };



  
  // Dashboard formatting functions
  const formatColumnName = (column) => {
    if (column.IS_AVERAGE_COLUMN && column.AVERAGE_VALUE) {
        const avgValue = parseFloat(column.AVERAGE_VALUE);
        const formattedValue = !isNaN(avgValue) ? avgValue.toFixed(2) : '0.00';        
        
        if (column.COLUMN_NAME === "maintenance_1" || column.COLUMN_NAME === "incidents_1") {
          return `${formattedValue} Avg Qty`;
        } else if (column.COLUMN_NAME === "maintenance_2" || column.COLUMN_NAME === "incidents_2") {
          return `${formattedValue} Avg Count`;
        } else {
          return `${formattedValue} Avg`;
        }
      }
      
      return column.COLUMN_NAME
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatDashboardCellValue = (value, columnName, dataType) => {
    if (value === null || value === undefined) return '';
    
    const lowerColumnName = columnName.toLowerCase();
    
    if (dataType === 'datetime' || dataType === 'date' || lowerColumnName.includes('date')) {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value;
      }
    }
    
    if (dataType === 'bit' || typeof value === 'boolean') {
      return value ? '✅' : '❌';
    }
  
    if (typeof value === 'number') {
      if (lowerColumnName.includes('count') || lowerColumnName.includes('total')) {
        return value.toLocaleString();
      }
      if (lowerColumnName.includes('percentage') || lowerColumnName.includes('rate')) {
        return `${value.toFixed(2)}%`;
      }
    }
    
    return value.toString();
  };

  // Load thresholds and fetch data on component mount
  useEffect(() => {
    loadThresholds();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-text">
          ⏳ Loading KPI data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-text">
          ❌ Error: {error}
        </div>
        <button onClick={fetchDashboardData} className="retry-btn">
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="kpi-container">
      {/* Dashboard Section Header */}
      <div className="dashboard-section-header">
        <h2>📈 Performance Analytics</h2>
        <div className="dashboard-actions">
          {hasPermission('Administrator') && (
            <>
              <button 
                onClick={() => setShowAddKPIModal(true)}
                className="add-kpi-btn"
                title="Add new KPI entry"
              >
                ➕ Add KPI Entry
              </button>
            </>
          )}
          
          <button 
            onClick={() => setShowThresholdManager(true)} 
            className="threshold-btn"
            title="Manage color thresholds"
          >
            🎨 Thresholds
          </button>
          <button onClick={fetchDashboardData} className="refresh-btn" disabled={isLoading}>
            {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Dashboard Filters */}
      <div className="dashboard-filters">
        <div className="filter-header">
          <h3>🔍 Analytics Filters</h3>
          <div className="filter-actions">
            <button onClick={clearFilters} className="clear-filters-btn">
              🗑 Clear All
            </button>
          </div>
        </div>

        <div className="filter-grid">
          <div className="filter-group">
            <label>📅 Year</label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="filter-select"
            >
              <option value="">All Years</option>
              {getAvailableYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>📊 Month</label>
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              disabled={!filters.year}
              className="filter-select"
            >
              <option value="">All Months</option>
              {filters.year && getAvailableMonths(filters.year).map(month => (
                <option key={month.value} value={month.value}>{month.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dashboard Data Table */}
      {dashboardData.length === 0 ? (
        <div className="no-data">
          <div className="no-data-text">
            {allDashboardData.length === 0 ? 
              '📊 No analytics data found' : 
              '🔍 No data matches current filters'
            }
          </div>
          {hasPermission('Administrator') && allDashboardData.length === 0 && (
            <button 
              onClick={() => setShowAddKPIModal(true)}
              className="add-first-kpi-btn"
            >
              ➕ Add Your First KPI Entry
            </button>
          )}
          {allDashboardData.length > 0 && (
            <button 
              onClick={clearFilters}
              className="btn-secondary"
            >
              🗑 Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="dashboard-table-container">
          <div className="table-header">
            <h3 className="table-title">📋 PERFORMANCE METRICS</h3>
          </div>
          
          <div className="table-scroll-container">
            <table className="data-table">
              <thead className="table-head">
                <tr>
                  {dashboardColumns
                    .filter(column => column.COLUMN_NAME.toLowerCase() !== 'id')
                    .map((column) => (
                      <th 
                        key={column.COLUMN_NAME} 
                        className={`table-header-cell ${column.IS_AVERAGE_COLUMN ? 'average-header' : ''}`}
                        title={column.IS_AVERAGE_COLUMN ? 
                          `${column.ORIGINAL_NAME?.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())} - Average: ${column.AVERAGE_VALUE}` : 
                          `${column.DATA_TYPE} ${column.IS_NULLABLE === 'NO' ? '(Required)' : '(Optional)'}`
                        }
                      >
                        {formatColumnName(column)}
                      </th>
                    ))}
                  {hasPermission('Administrator') && (
                    <th className="table-header-cell actions-header">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {dashboardData.map((entry, index) => (
                  <tr 
                    key={entry.id || index} 
                    className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                  >
                    {dashboardColumns
                      .filter(column => column.COLUMN_NAME.toLowerCase() !== 'id')
                      .map((column) => {
                        const cellValue = entry[column.COLUMN_NAME];
                        const thresholdClass = getCellColorClass(cellValue, column.COLUMN_NAME);
                        const cellStyle = getCellStyle(cellValue, column.COLUMN_NAME);

                        return (
                          <td 
                            key={column.COLUMN_NAME} 
                            className={`table-cell ${thresholdClass}`}
                            style={cellStyle}
                            title={cellValue}
                          >
                            <div className="cell-content">
                              {formatDashboardCellValue(cellValue, column.COLUMN_NAME, column.DATA_TYPE)}
                            </div>
                          </td>
                        );
                      })}
                    {hasPermission('Administrator') && (
                      <td className="table-cell actions-cell">
                        <div className="action-buttons">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="edit-btn"
                            title="Edit this KPI entry"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteKPI(entry.id)}
                            className="delete-btn"
                            title="Delete this KPI entry"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add KPI Modal */}
      {showAddKPIModal && hasPermission('Administrator') && (
        <div className="modal-overlay" onClick={() => setShowAddKPIModal(false)}>
          <div className="add-kpi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Add New KPI Entry</h3>
              <button 
                onClick={() => setShowAddKPIModal(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label>📅 Month *</label>
                  <input
                    type="text"
                    value={newKPI.month}
                    onChange={(e) => handleKPIInputChange('month', e.target.value)}
                    placeholder="e.g., January"
                    maxLength={20}
                  />
                </div>

                <div className="form-field">
                  <label>📆 Week Date Range *</label>
                  <input
                    type="text"
                    value={newKPI.week}
                    onChange={(e) => handleKPIInputChange('week', e.target.value)}
                    placeholder="e.g., 14-20"
                    maxLength={50}
                    pattern="[0-9]{1,2}-[0-9]{1,2}"
                  />
                  <small className="help-text">
                    Format: DD-DD (will be auto-converted to readable dates)
                  </small>
                </div>

                <div className="form-field">
                  <label>🔧 Maintenance (Quantity)</label>
                  <input
                    type="number"
                    min="0"
                    value={newKPI.maintenance_1}
                    onChange={(e) => handleKPIInputChange('maintenance_1', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>🔧 Maintenance (Time)</label>
                  <input
                    type="number"
                    min="0"
                    value={newKPI.maintenance_2}
                    onChange={(e) => handleKPIInputChange('maintenance_2', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>🚨 Incidents (Quantity)</label>
                  <input
                    type="number"
                    min="0"
                    value={newKPI.incidents_1}
                    onChange={(e) => handleKPIInputChange('incidents_1', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>🚨 Incidents (Time)</label>
                  <input
                    type="number"
                    min="0"
                    value={newKPI.incidents_2}
                    onChange={(e) => handleKPIInputChange('incidents_2', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field full-width">
                  <label>🏢 Business Impacted</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newKPI.business_impacted}
                    onChange={(e) => handleKPIInputChange('business_impacted', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowAddKPIModal(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddKPI}
                className="btn-primary"
                disabled={saving || !newKPI.month.trim() || !newKPI.week.trim()}
              >
                {saving ? 'Adding...' : 'Add KPI Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit KPI Modal */}
      {showEditKPIModal && hasPermission('Administrator') && editingKPI && (
        <div className="modal-overlay" onClick={() => setShowEditKPIModal(false)}>
          <div className="add-kpi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit KPI Entry</h3>
              <button 
                onClick={() => setShowEditKPIModal(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label>📅 Month *</label>
                  <input
                    type="text"
                    value={editingKPI.month}
                    onChange={(e) => handleEditInputChange('month', e.target.value)}
                    placeholder="e.g., January"
                    maxLength={20}
                  />
                </div>

                <div className="form-field">
                  <label>📆 Week Date Range *</label>
                  <input
                    type="text"
                    value={editingKPI.week}
                    onChange={(e) => handleEditInputChange('week', e.target.value)}
                    placeholder="e.g., 14-20"
                    maxLength={50}
                    pattern="[0-9]{1,2}-[0-9]{1,2}"
                  />
                  <small className="help-text">
                    Format: DD-DD (will be auto-converted to readable dates)
                  </small>
                </div>

                <div className="form-field">
                  <label>🔧 Maintenance (Quantity)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingKPI.maintenance_1}
                    onChange={(e) => handleEditInputChange('maintenance_1', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>🔧 Maintenance (Time)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingKPI.maintenance_2}
                    onChange={(e) => handleEditInputChange('maintenance_2', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>🚨 Incidents (Quantity)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingKPI.incidents_1}
                    onChange={(e) => handleEditInputChange('incidents_1', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>🚨 Incidents (Time)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingKPI.incidents_2}
                    onChange={(e) => handleEditInputChange('incidents_2', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="form-field full-width">
                  <label>🏢 Business Impacted</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editingKPI.business_impacted}
                    onChange={(e) => handleEditInputChange('business_impacted', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowEditKPIModal(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleEditKPI}
                className="btn-primary"
                disabled={saving || !editingKPI.month.trim() || !editingKPI.week.trim()}
              >
                {saving ? 'Updating...' : 'Update KPI Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Manager Modal */}
      <ThresholdManager
        isOpen={showThresholdManager}
        onClose={() => setShowThresholdManager(false)}
        columns={dashboardColumns}
        onSave={handleThresholdSave}
      />
    </div>
  );
};

export default KPITab;