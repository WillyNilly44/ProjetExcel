import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PDFExport from './PDFExport';

const DashboardTab = ({ data = [], columns = [], formatCellValue, hasPermission }) => {
  const { user } = useAuth();
  const [currentWeekData, setCurrentWeekData] = useState([]);

  // Define specific columns for dashboard
  const dashboardColumns = useMemo(() => {
    const requiredColumns = [
      { key: 'ticket_number', label: 'Ticket #' },
      { key: 'assigned', label: 'Assignee' },
      { key: 'note', label: 'Note' },
      { key: 'datetime', label: 'Date & Time' }, // Combined log_date and log_start
      { key: 'risk_level', label: 'Risk Level' },
      { key: 'actual_time', label: 'Duration' },
      { key: 'expected_down_time', label: 'Estimated Downtime' },
      { key: 'log_status', label: 'Status' },
      { key: 'district', label: 'District' }
    ];

    // Map to actual database columns
    const mappedColumns = requiredColumns.map(reqCol => {
      if (reqCol.key === 'datetime') {
        // Special case for combined date/time - we'll handle this separately
        return {
          COLUMN_NAME: 'datetime',
          DISPLAY_NAME: reqCol.label,
          DATA_TYPE: 'datetime',
          IS_COMBINED: true
        };
      }

      // Find matching column in database
      const dbColumn = columns.find(col => {
        const colName = col.COLUMN_NAME.toLowerCase();
        const keyName = reqCol.key.toLowerCase();
        return colName === keyName || colName.includes(keyName.replace('_', ''));
      });

      if (dbColumn) {
        return {
          ...dbColumn,
          DISPLAY_NAME: reqCol.label
        };
      }

      // Return placeholder if not found
      return {
        COLUMN_NAME: reqCol.key,
        DISPLAY_NAME: reqCol.label,
        DATA_TYPE: 'varchar',
        IS_NULLABLE: 'YES'
      };
    });

    return mappedColumns;
  }, [columns]);

  // FIXED: Get current week's date range without timezone issues
  const getCurrentWeekRange = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start of week (Monday)
    const startOfWeek = new Date(today);
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Calculate end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // FIXED: Return as YYYY-MM-DD strings for comparison
    const startDateString = startOfWeek.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const endDateString = endOfWeek.toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    return { 
      startOfWeek: startDateString, 
      endOfWeek: endDateString,
      startDate: startOfWeek,
      endDate: endOfWeek
    };
  };

  // FIXED: Filter data for current week using string comparison
  useEffect(() => {
    if (data && data.length > 0 && columns && columns.length > 0) {
      const { startOfWeek, endOfWeek } = getCurrentWeekRange();
      
      // Find date column
      const dateColumn = columns.find(col => 
        col.COLUMN_NAME.toLowerCase().includes('log_date') ||
        col.COLUMN_NAME.toLowerCase().includes('date') || 
        col.COLUMN_NAME.toLowerCase().includes('scheduled') ||
        col.COLUMN_NAME.toLowerCase().includes('created')
      );

      if (dateColumn) {
        const filteredData = data.filter(entry => {
          let entryDateString = entry[dateColumn.COLUMN_NAME];
          
          // FIXED: Handle date strings without timezone conversion
          if (typeof entryDateString === 'string') {
            // Extract date part if it includes time
            if (entryDateString.includes('T')) {
              entryDateString = entryDateString.split('T')[0];
            } else if (entryDateString.includes(' ')) {
              entryDateString = entryDateString.split(' ')[0];
            }
            
            // Compare as strings (YYYY-MM-DD format)
            return entryDateString >= startOfWeek && entryDateString <= endOfWeek;
          }
          
          // Fallback for Date objects (though we shouldn't have them)
          try {
            const entryDate = new Date(entryDateString);
            const entryDateStr = entryDate.toLocaleDateString('en-CA');
            return entryDateStr >= startOfWeek && entryDateStr <= endOfWeek;
          } catch (e) {
            return false;
          }
        });
        
        // FIXED: Sort by date using string comparison
        const sortedData = filteredData.sort((a, b) => {
          let dateA = a[dateColumn.COLUMN_NAME];
          let dateB = b[dateColumn.COLUMN_NAME];
          
          // Extract date part if needed
          if (typeof dateA === 'string' && dateA.includes('T')) {
            dateA = dateA.split('T')[0];
          }
          if (typeof dateB === 'string' && dateB.includes('T')) {
            dateB = dateB.split('T')[0];
          }
          
          // Compare as strings (YYYY-MM-DD format sorts correctly)
          return dateB.localeCompare(dateA);
        });
        
        setCurrentWeekData(sortedData.slice(0, 50));
      } else {
        setCurrentWeekData(data.slice(0, 50));
      }
    }
  }, [data, columns]);

  // FIXED: Format combined date and time without timezone conversion
  const formatDateTime = (entry) => {
    const dateCol = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('log_date'));
    const timeCol = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('log_start'));
    
    const dateValue = dateCol ? entry[dateCol.COLUMN_NAME] : null;
    const timeValue = timeCol ? entry[timeCol.COLUMN_NAME] : null;
    
    let formattedDate = '';
    let formattedTime = '';
    
    // FIXED: Format date without timezone conversion
    if (dateValue) {
      if (typeof dateValue === 'string') {
        // Extract date part if it includes time
        let dateString = dateValue;
        if (dateString.includes('T')) {
          dateString = dateString.split('T')[0];
        } else if (dateString.includes(' ')) {
          dateString = dateString.split(' ')[0];
        }
        
        // Format YYYY-MM-DD to MM/DD/YYYY without timezone conversion
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          const [year, month, day] = dateString.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
        } else {
          formattedDate = dateString;
        }
      } else {
        formattedDate = dateValue.toString();
      }
    }
    
    // FIXED: Format time - EXTRACT ONLY TIME PORTION (same as before)
    if (timeValue) {
      try {
        if (typeof timeValue === 'string') {
          // If it's a full datetime string (e.g., "2024-08-06T14:30:00")
          if (timeValue.includes('T')) {
            const timePart = timeValue.split('T')[1];
            if (timePart) {
              const timeOnly = timePart.split('.')[0]; // Remove milliseconds
              const timeParts = timeOnly.split(':');
              formattedTime = `${timeParts[0]}:${timeParts[1]}`; // HH:MM format
            }
          }
          // If it's a date-time string with space
          else if (timeValue.includes(' ')) {
            const parts = timeValue.split(' ');
            if (parts.length > 1) {
              const timePart = parts[1];
              const timeParts = timePart.split(':');
              formattedTime = `${timeParts[0]}:${timeParts[1]}`;
            }
          }
          // If it's already just time
          else if (timeValue.includes(':')) {
            const timeParts = timeValue.split(':');
            formattedTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1]}`;
          }
          else {
            formattedTime = timeValue;
          }
        } 
        else if (timeValue instanceof Date) {
          formattedTime = timeValue.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
        else {
          const dateObj = new Date(timeValue);
          if (!isNaN(dateObj.getTime())) {
            formattedTime = dateObj.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
          } else {
            formattedTime = timeValue.toString();
          }
        }
      } catch (e) {
        formattedTime = timeValue.toString();
      }
    }
    
    // Combine date and time
    if (formattedDate && formattedTime) {
      return `${formattedDate} ${formattedTime}`;
    } else if (formattedDate) {
      return formattedDate;
    } else if (formattedTime) {
      return formattedTime;
    }
    
    return '';
  };

  // Get cell value for display
  const getCellValue = (entry, column) => {
    if (column.COLUMN_NAME === 'datetime' && column.IS_COMBINED) {
      return formatDateTime(entry);
    }
    
    const value = entry[column.COLUMN_NAME];
    
    // Format duration and downtime as hours
    if (column.COLUMN_NAME.toLowerCase().includes('time') && 
        (column.COLUMN_NAME.toLowerCase().includes('actual') || 
         column.COLUMN_NAME.toLowerCase().includes('expected'))) {
      if (value !== null && value !== undefined && value !== '') {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? value : `${numValue}h`;
      }
    }
    
    return formatCellValue ? 
      formatCellValue(value, column.COLUMN_NAME, column.DATA_TYPE) :
      (value?.toString() || '');
  };

  const getStatusColor = (status) => {
    if (!status) return '';
    const statusLower = status.toString().toLowerCase();
    if (statusLower.includes('completed')) return 'status-completed';
    if (statusLower.includes('progress') || statusLower.includes('pending')) return 'status-progress';
    if (statusLower.includes('failed') || statusLower.includes('error')) return 'status-failed';
    return 'status-default';
  };

  const getRiskColor = (risk) => {
    if (!risk) return '';
    const riskLower = risk.toString().toLowerCase();
    if (riskLower.includes('high')) return 'risk-high';
    if (riskLower.includes('medium')) return 'risk-medium';
    if (riskLower.includes('low')) return 'risk-low';
    return 'risk-default';
  };

  const getCellColorClass = (value, columnName) => {
    const colNameLower = columnName.toLowerCase();
    
    if (colNameLower.includes('status') || colNameLower.includes('log_status')) {
      return getStatusColor(value);
    }
    
    if (colNameLower.includes('risk')) {
      return getRiskColor(value);
    }
    
    return '';
  };

  // Calculate dashboard statistics for PDF
  const calculateDashboardStats = () => {
    const totalEntries = currentWeekData.length;
    const completed = currentWeekData.filter(entry => {
      const statusCol = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('status'));
      return statusCol && entry[statusCol.COLUMN_NAME]?.toString().toLowerCase().includes('completed');
    }).length;
    
    const pending = currentWeekData.filter(entry => {
      const statusCol = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('status'));
      const status = statusCol ? entry[statusCol.COLUMN_NAME]?.toString().toLowerCase() : '';
      return status.includes('progress') || status.includes('pending');
    }).length;
    
    const highRisk = currentWeekData.filter(entry => {
      const riskCol = columns.find(col => col.COLUMN_NAME.toLowerCase().includes('risk'));
      return riskCol && entry[riskCol.COLUMN_NAME]?.toString().toLowerCase().includes('high');
    }).length;

    const completionRate = totalEntries > 0 ? Math.round((completed / totalEntries) * 100) : 0;

    return {
      totalEntries,
      completed,
      pending,
      highRisk,
      completionRate
    };
  };

  const { startDate, endDate } = getCurrentWeekRange();

  return (
    <div className="dashboard-container">
      {/* Current Week Table */}
      <div className="dashboard-table-section">
        <div className="table-header">
          <h3 className="table-title">📊 Current Week Activities</h3>
          <div className="table-subtitle">
            {startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })} - {endDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <div className="table-info">
            <span className="record-count">
              {currentWeekData.length} entries this week
            </span>
            <PDFExport
              data={currentWeekData}
              mode="dashboard"
              title="OPERATIONS DASHBOARD REPORT"
              formatDateTime={formatDateTime}
              getCellValue={getCellValue}
              customStats={calculateDashboardStats()}
              disabled={currentWeekData.length === 0}
              compact={true}
            />
          </div>
        </div>

        {currentWeekData.length === 0 ? (
          <div className="no-data">
            <div className="no-data-text">📝 No entries found for this week</div>
          </div>
        ) : (
          <div className="dashboard-table-container">
            <div className="table-scroll-container">
              <table className="dashboard-table">
                <thead className="table-head">
                  <tr>
                    <th className="table-header-cell row-number">#</th>
                    {dashboardColumns.map((column) => (
                      <th 
                        key={column.COLUMN_NAME} 
                        className="table-header-cell"
                        title={column.DISPLAY_NAME}
                      >
                        {column.DISPLAY_NAME}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentWeekData.map((entry, index) => (
                    <tr 
                      key={entry.id || index} 
                      className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                    >
                      <td className="table-cell row-number">{index + 1}</td>
                      {dashboardColumns.map((column) => {
                        const cellValue = getCellValue(entry, column);
                        const colorClass = getCellColorClass(
                          column.IS_COMBINED ? entry[columns.find(col => col.COLUMN_NAME.toLowerCase().includes('status'))?.COLUMN_NAME] : entry[column.COLUMN_NAME], 
                          column.COLUMN_NAME
                        );

                        return (
                          <td 
                            key={column.COLUMN_NAME} 
                            className={`table-cell ${colorClass}`}
                            title={cellValue?.toString() || ''}
                          >
                            <div className="cell-content">
                              {cellValue}
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
      </div>
    </div>
  );
};

export default DashboardTab;