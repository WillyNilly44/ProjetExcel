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
  const [thresholds, setThresholds] = useState({});
  
  const [kpiData, setKpiData] = useState({
    totalEntries: 0,
    completedTasks: 0,
    pendingTasks: 0,
    activeDistricts: 0,
    recentActivity: [],
    statusBreakdown: {}
  });

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Load thresholds on component mount
  useEffect(() => {
    const savedThresholds = localStorage.getItem('columnThresholds');
    if (savedThresholds) {
      setThresholds(JSON.parse(savedThresholds));
    }
  }, []);

  useEffect(() => {
    if (data && data.length > 0 && columns && columns.length > 0) {
      calculateKPIs();
    }
  }, [data, columns]);

  const calculateKPIs = () => {
    // Find relevant columns
    const statusColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('status')
    );
    const districtColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('district')
    );
    const dateColumn = columns.find(col => 
      col.COLUMN_NAME.toLowerCase().includes('date') || 
      col.COLUMN_NAME.toLowerCase().includes('created')
    );

    // Calculate basic metrics
    const totalEntries = data.length;
    
    let completedTasks = 0;
    let pendingTasks = 0;
    const statusBreakdown = {};
    const districts = new Set();

    // Process each entry
    data.forEach(entry => {
      // Status analysis
      if (statusColumn) {
        const status = entry[statusColumn.COLUMN_NAME];
        if (status) {
          const statusStr = status.toString().toLowerCase();
          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
          
          if (statusStr.includes('completed') || statusStr.includes('done')) {
            completedTasks++;
          } else if (statusStr.includes('pending') || statusStr.includes('progress')) {
            pendingTasks++;
          }
        }
      }

      // District analysis
      if (districtColumn) {
        const district = entry[districtColumn.COLUMN_NAME];
        if (district) {
          districts.add(district);
        }
      }
    });

    // Get recent activity (last 10 entries)
    const recentActivity = data
      .sort((a, b) => {
        if (dateColumn) {
          const dateA = new Date(a[dateColumn.COLUMN_NAME] || 0);
          const dateB = new Date(b[dateColumn.COLUMN_NAME] || 0);
          return dateB - dateA;
        }
        return 0;
      })
      .slice(0, 10);

    setKpiData({
      totalEntries,
      completedTasks,
      pendingTasks,
      activeDistricts: districts.size,
      recentActivity,
      statusBreakdown
    });
  };

  const getCompletionRate = () => {
    const total = kpiData.completedTasks + kpiData.pendingTasks;
    return total > 0 ? Math.round((kpiData.completedTasks / total) * 100) : 0;
  };

  // Dashboard formatting functions
  const formatColumnName = (column) => {
    if (typeof column === 'object' && column.DISPLAY_NAME) {
      return column.DISPLAY_NAME;
    }
    
    if (typeof column === 'object' && column.COLUMN_NAME) {
      return column.COLUMN_NAME
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    
    return column.toString()
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

  // Threshold functions
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

    if (columnNameLower.includes('impact')) {
      if (numValue <= 4) return 'threshold-green';
      if (numValue <= 7) return 'threshold-yellow';
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
                  </tr>
                ))}
              </tbody>
            </table>
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