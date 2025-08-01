import React, { useState, useEffect } from 'react';

import ThresholdManager from './ThresholdManager';

const DashboardTab = () => {
  const [dashboardData, setDashboardData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    year: '',
    month: ''
  });
  const [showThresholdManager, setShowThresholdManager] = useState(false);
  const [thresholds, setThresholds] = useState({});

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
        setColumns(result.columns || []);
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

  // Add this temporarily in your component to see all available columns
  useEffect(() => {
    if (columns.length > 0) {
    }
  }, [columns]);

  const formatColumnName = (columnName) => {
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatCellValue = (value, columnName, dataType) => {
    if (value === null || value === undefined) return '-';
    
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

  // Update the getCellColorClass function
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

  // Update the getCellStyle function
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

  // Update the handleThresholdSave function
  const handleThresholdSave = (newThresholds) => {
    setThresholds(newThresholds);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-text">
          ⏳ Loading dashboard data...
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
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>📊 Dashboard</h2>
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
          <h3>🔍 Dashboard Filters</h3>
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
                // Clear month when year changes
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
          <div className="no-data-text">📊 No dashboard data found</div>
        </div>
      ) : (
        <div className="dashboard-table-container">
          <div className="table-header">
            <h3 className="table-title">📋 DASHBOARD</h3>
          </div>
          
          <div className="table-scroll-container">
            <table className="data-table">
              <thead className="table-head">
                <tr>
                  {columns
                    .filter(column => column.COLUMN_NAME.toLowerCase() !== 'id')
                    .map((column) => (
                      <th 
                        key={column.COLUMN_NAME} 
                        className="table-header-cell"
                        title={`${column.DATA_TYPE} ${column.IS_NULLABLE === 'NO' ? '(Required)' : '(Optional)'}`}
                      >
                        {formatColumnName(column.COLUMN_NAME)}
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
                    {columns
                      .filter(column => column.COLUMN_NAME.toLowerCase() !== 'id')
                      .map((column) => {
                        const cellValue = entry[column.COLUMN_NAME];
                        const baseClasses = [
                          'table-cell',
                          getDashboardColumnType(column.COLUMN_NAME, column.DATA_TYPE)
                        ];
                        
                        // Add threshold class
                        const thresholdClass = getCellColorClass(cellValue, column.COLUMN_NAME);
                        if (thresholdClass) {
                          baseClasses.push(thresholdClass);
                        }
                        
                        const cellClasses = baseClasses.filter(Boolean).join(' ');
                        const cellStyle = getCellStyle(cellValue, column.COLUMN_NAME);

                        return (
                          <td 
                            key={column.COLUMN_NAME} 
                            className={cellClasses}
                            style={cellStyle}
                            title={cellValue}
                          >
                            <div className="cell-content">
                              {formatCellValue(cellValue, column.COLUMN_NAME, column.DATA_TYPE)}
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

      {/* Threshold Manager - Add this section */}
      <div className="threshold-manager-container">
        <h3>⚙️ Threshold Manager</h3>
        <button 
          onClick={() => setShowThresholdManager(!showThresholdManager)} 
          className="toggle-threshold-manager"
        >
          {showThresholdManager ? '🔽 Hide Thresholds' : '▶️ Show Thresholds'}
        </button>

        {showThresholdManager && (
          <div className="threshold-manager-content">
            <ThresholdManager 
              thresholds={thresholds} 
              onSave={handleThresholdSave} 
              onClose={() => setShowThresholdManager(false)}
            />
          </div>
        )}
      </div>

      {/* Threshold Manager Modal */}
      <ThresholdManager
        isOpen={showThresholdManager}
        onClose={() => setShowThresholdManager(false)}
        columns={columns}
        onSave={handleThresholdSave}
      />
    </div>
  );
};

function getDashboardColumnType(columnName, dataType) {
  const lowerName = columnName.toLowerCase();
  
  if (dataType === 'bit' || typeof dataType === 'boolean') {
    return 'center';
  }
  
  if (lowerName.includes('status')) {
    return 'status';
  }
  
  if (lowerName.includes('count') || lowerName.includes('total') || lowerName.includes('percentage')) {
    return 'numeric';
  }
  
  if (lowerName.includes('description') || lowerName.includes('notes')) {
    return 'note';
  }
  
  return '';
}

// Keep these helper functions
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 2018; // First entry is August 2018
  const years = [];
  
  for (let year = currentYear; year >= startYear; year--) {
    years.push(year);
  }
  
  return years;
};

const getAvailableMonths = (year) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-based
  const selectedYear = parseInt(year);
  
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
  
  if (selectedYear === 2018) {
    // For 2018, only show August onwards (month 8+)
    return months.filter(month => month.value >= 8);
  } else if (selectedYear === currentYear) {
    // For current year, only show up to current month
    return months.filter(month => month.value <= currentMonth);
  } else {
    // For other years, show all months
    return months;
  }
};

export default DashboardTab;