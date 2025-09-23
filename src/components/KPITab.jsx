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

  // FIXED: Proper chronological sorting function
  const sortKPIDataChronologically = (data) => {
    if (!data || data.length === 0) return data;

    return data.sort((a, b) => {
      // Extract year, month, and week data for both entries
      const entryA = parseEntryDate(a.month, a.week);
      const entryB = parseEntryDate(b.month, b.week);

      // Sort newest to oldest (descending order)
      return entryB.sortDate.getTime() - entryA.sortDate.getTime();
    });
  };

  // Helper function to parse entry dates
  const parseEntryDate = (monthString, weekString) => {
    let year = new Date().getFullYear();
    let month = 1; // January default
    let weekStartDay = 1;

    // Parse year and month from month string
    if (monthString) {
      const yearMatch = monthString.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      }

      const monthNames = {
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

      const monthStr = monthString.toLowerCase().replace(/\d+/g, '').trim();
      for (const [name, num] of Object.entries(monthNames)) {
        if (monthStr.includes(name)) {
          month = num;
          break;
        }
      }
    }

    // Parse week start day
    if (weekString) {
      // Handle "Month DD to Month DD" format (e.g., "Dec 30 to Jan 5", "July 21 to July 27")
      const weekRangeMatch = weekString.match(/([A-Za-z]+)\s+(\d{1,2})\s+to\s+([A-Za-z]+)\s+(\d{1,2})/);
      if (weekRangeMatch) {
        const startMonth = weekRangeMatch[1].toLowerCase();
        const startDay = parseInt(weekRangeMatch[2]);
        const endMonth = weekRangeMatch[3].toLowerCase();
        const endDay = parseInt(weekRangeMatch[4]);

        // For cross-year weeks like "Dec 30 to Jan 5" where month is "January 2025"
        if (startMonth.includes('dec') && endMonth.includes('jan') && month === 1) {
          // This is a cross-year week - use January 1st as reference for consistent sorting
          weekStartDay = 1;
        } else if (startMonth.includes('jul') && endMonth.includes('aug')) {
          // Cross-month week like "July 28 to August 3" - use start day
          weekStartDay = startDay;
          // If month context is August, adjust the month for sorting
          if (month === 8) {
            month = 7; // Use July for sorting since week starts in July
          }
        } else {
          // Same month week - use start day
          weekStartDay = startDay;
        }
      } else {
        // Handle "DD-DD" format or extract first number
        const dayMatch = weekString.match(/(\d{1,2})/);
        if (dayMatch) {
          weekStartDay = parseInt(dayMatch[1]);
        }
      }
    }

    // Create sort date
    const sortDate = new Date(year, month - 1, weekStartDay);

    return {
      year,
      month,
      weekStartDay,
      sortDate,
      originalMonth: monthString,
      originalWeek: weekString
    };
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
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // FIXED: Use proper chronological sorting
        const sortedData = sortKPIDataChronologically(result.data || []);
        
        console.log('=== SORTED KPI DATA ===');
        sortedData.forEach((entry, index) => {
          const parsed = parseEntryDate(entry.month, entry.week);
          console.log(`${index + 1}. ${entry.month} | ${entry.week} → ${parsed.sortDate.toDateString()}`);
        });
        
        setAllDashboardData(sortedData);
        setDashboardData(sortedData);
        setDashboardColumns(result.columns || []);
      } else {
        setError(result.error || 'Failed to load dashboard data');
      }

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load thresholds
  const loadThresholds = async () => {
    try {
      const response = await fetch('/api/getthresholds');
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
        }
      }
    } catch (error) {
      console.error('Error loading thresholds:', error);
    }
  };

  // Simple filter functions
  const getAvailableYears = () => {
    const years = new Set();
    allDashboardData.forEach(entry => {
      const monthStr = entry.month || '';
      const yearMatch = monthStr.match(/(\d{4})/);
      if (yearMatch) {
        years.add(parseInt(yearMatch[1]));
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getAvailableMonths = (selectedYear) => {
    if (!selectedYear) return [];
    
    const months = new Set();
    allDashboardData.forEach(entry => {
      const monthStr = entry.month || '';
      if (monthStr.includes(selectedYear)) {
        const monthName = monthStr.replace(selectedYear, '').trim();
        months.add(monthName);
      }
    });
    
    return Array.from(months).sort();
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    if (filterType === 'year') {
      newFilters.month = '';
    }
    setFilters(newFilters);

    // Apply filters
    let filtered = [...allDashboardData];
    
    if (newFilters.year) {
      filtered = filtered.filter(entry => 
        (entry.month || '').includes(newFilters.year)
      );
    }
    
    if (newFilters.month) {
      filtered = filtered.filter(entry => 
        (entry.month || '').includes(newFilters.month)
      );
    }
    
    setDashboardData(filtered);
  };

  const clearFilters = () => {
    setFilters({ year: '', month: '' });
    setDashboardData(allDashboardData);
  };

  // KPI CRUD operations
  const handleAddKPI = async () => {
    if (!newKPI.month.trim() || !newKPI.week.trim()) {
      alert('Month and Week are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/addkpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (result.success) {
        await fetchDashboardData();
        setShowAddKPIModal(false);
        setNewKPI({
          month: '', week: '', maintenance_1: 0, maintenance_2: 0,
          incidents_1: 0, incidents_2: 0, business_impacted: 0
        });
        alert('✅ KPI entry added successfully!');
      } else {
        throw new Error(result.error || 'Failed to add KPI');
      }
    } catch (err) {
      alert('Failed to add KPI: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditKPI = async () => {
    if (!editingKPI.month.trim() || !editingKPI.week.trim()) {
      alert('Month and Week are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/updatekpi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      if (result.success) {
        await fetchDashboardData();
        setShowEditKPIModal(false);
        setEditingKPI(null);
        alert('✅ KPI entry updated successfully!');
      } else {
        throw new Error(result.error || 'Failed to update KPI');
      }
    } catch (err) {
      alert('Failed to update KPI: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKPI = async (kpiId) => {
    if (!confirm('Are you sure you want to delete this KPI entry?')) return;

    try {
      const response = await fetch('/api/deletekpi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: kpiId, user: user })
      });

      const result = await response.json();
      if (result.success) {
        await fetchDashboardData();
        alert('✅ KPI entry deleted successfully!');
      } else {
        throw new Error(result.error || 'Failed to delete KPI');
      }
    } catch (err) {
      alert('Failed to delete KPI: ' + err.message);
    }
  };

  // Helper functions
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
    setNewKPI(prev => ({ ...prev, [field]: value }));
  };

  const handleEditInputChange = (field, value) => {
    setEditingKPI(prev => ({ ...prev, [field]: value }));
  };

  const getCurrentMonthYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('default', { month: 'long' });
    return `${month} ${year}`;
  };

  const getMonthOptions = () => {
    const currentYear = new Date().getFullYear();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return months.map(month => ({
      value: `${month} ${currentYear}`,
      label: `${month} ${currentYear}`
    }));
  };

  // Threshold functions
  const getCellColorClass = (value, columnName) => {
    if (!thresholds || value === null || value === undefined) return '';
    
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

  const handleThresholdSave = (newThresholds) => {
    setThresholds(newThresholds);
  };

  // Load data on mount
  useEffect(() => {
    loadThresholds();
    fetchDashboardData();
  }, []);

  // Set default month for new KPI
  useEffect(() => {
    if (showAddKPIModal && !newKPI.month) {
      setNewKPI(prev => ({ ...prev, month: getCurrentMonthYear() }));
    }
  }, [showAddKPIModal]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-text">⏳ Loading KPI data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-text">❌ Error: {error}</div>
        <button onClick={fetchDashboardData} className="retry-btn">🔄 Retry</button>
      </div>
    );
  }

  return (
    <div className="kpi-container">
      {/* Header */}
      <div className="dashboard-section-header">
        <h2>📈 Performance Analytics</h2>
        <div className="dashboard-actions">
          {hasPermission('Administrator') && (
            <button 
              onClick={() => setShowAddKPIModal(true)}
              className="add-kpi-btn"
              title="Add new KPI entry"
            >
              ➕ Add KPI Entry
            </button>
          )}
          <button 
            onClick={() => setShowThresholdManager(true)} 
            className="threshold-btn"
            title="Manage color thresholds"
          >
            Thresholds
          </button>
          <button onClick={fetchDashboardData} className="refresh-btn" disabled={isLoading}>
            {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-filters">
        <div className="filter-header">
          <h3>🔍 Analytics Filters</h3>
          <button onClick={clearFilters} className="clear-filters-btn">🗑 Clear All</button>
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
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
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
                      >
                        {formatColumnName(column)}
                      </th>
                    ))}
                  {hasPermission('Administrator') && (
                    <th className="table-header-cell actions-header">Actions</th>
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
                        const cellStyle = getCellStyle(cellValue, column.COLUMN_NAME);

                        return (
                          <td 
                            key={column.COLUMN_NAME} 
                            className="table-cell"
                            style={cellStyle}
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
              <button onClick={() => setShowAddKPIModal(false)} className="modal-close">✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label>📅 Month *</label>
                  <select
                    value={newKPI.month}
                    onChange={(e) => handleKPIInputChange('month', e.target.value)}
                    className="filter-select"
                  >
                    {getMonthOptions().map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>📆 Week Date Range *</label>
                  <input
                    type="text"
                    value={newKPI.week}
                    onChange={(e) => handleKPIInputChange('week', e.target.value)}
                    placeholder="e.g., Dec 30 to Jan 5"
                  />
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
              <button onClick={() => setShowEditKPIModal(false)} className="modal-close">✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label>📅 Month *</label>
                  <input
                    type="text"
                    value={editingKPI.month}
                    onChange={(e) => handleEditInputChange('month', e.target.value)}
                    placeholder="e.g., January 2025"
                  />
                </div>

                <div className="form-field">
                  <label>📆 Week Date Range *</label>
                  <input
                    type="text"
                    value={editingKPI.week}
                    onChange={(e) => handleEditInputChange('week', e.target.value)}
                    placeholder="e.g., Dec 30 to Jan 5"
                  />
                </div>

                <div className="form-field">
                  <label>🔧 Maintenance (Quantity)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingKPI.maintenance_1}
                    onChange={(e) => handleEditInputChange('maintenance_1', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>🔧 Maintenance (Time)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingKPI.maintenance_2}
                    onChange={(e) => handleEditInputChange('maintenance_2', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>🚨 Incidents (Quantity)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingKPI.incidents_1}
                    onChange={(e) => handleEditInputChange('incidents_1', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>🚨 Incidents (Time)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingKPI.incidents_2}
                    onChange={(e) => handleEditInputChange('incidents_2', e.target.value)}
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