/* filepath: c:\Users\William\Documents\ProjetExcel\src\components\KPITab.jsx */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ThresholdManager from './ThresholdManager';

const KPITab = ({ data = [], columns = [], formatCellValue, hasPermission }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState([]);
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
        body: JSON.stringify({ filters })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data || []);
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

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const applyFilters = () => {
    fetchDashboardData();
  };

  const clearFilters = () => {
    setFilters({
      year: '',
      month: ''
    });
    setTimeout(() => {
      fetchDashboardData();
    }, 100);
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

  // Helper functions for filters
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2018;
    const years = [];
    
    for (let year = currentYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
  };

  const getAvailableMonths = (selectedYear) => {
    const months = [
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

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (selectedYear === 2018) {
      return months.filter(month => month.value >= 8);
    } else if (selectedYear === currentYear) {
      return months.filter(month => month.value <= currentMonth);
    } else {
      return months;
    }
  };

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
            <button onClick={applyFilters} className="apply-filters-btn">
              ✅ Apply Filters
            </button>
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
              onChange={(e) => {
                handleFilterChange('year', e.target.value);
                if (e.target.value !== filters.year) {
                  handleFilterChange('month', '');
                }
              }}
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
          <div className="no-data-text">📊 No analytics data found</div>
          {hasPermission('Administrator') && (
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