import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ExcelExport = ({ 
  data, 
  columns, 
  filters, 
  showVirtualEntries, 
  formatColumnName, 
  formatCellValue,
  getDisplayColumns,
  disabled = false,
  compact = false,
  filename = 'log_entries'
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeFilters: true,
    includeVirtualEntries: showVirtualEntries,
    includeMetadata: true,
    sheetName: 'Log Entries'
  });
  const [showOptions, setShowOptions] = useState(false);

  const prepareExportData = () => {
    const allColumns = getDisplayColumns();
    const exportData = [];

    const filteredData = data.filter(entry => {
      if (entry.is_virtual && !exportOptions.includeVirtualEntries) {
        return false;
      }
      return true;
    });

    if (exportOptions.includeMetadata) {
      exportData.push({});
      exportData.push({ [allColumns[0]?.COLUMN_NAME]: 'LOG ENTRIES EXPORT' });
      exportData.push({ [allColumns[0]?.COLUMN_NAME]: `Generated: ${new Date().toLocaleString()}` });
      exportData.push({ [allColumns[0]?.COLUMN_NAME]: `Total Records: ${filteredData.length}` });
      exportData.push({ [allColumns[0]?.COLUMN_NAME]: `Total Columns: ${allColumns.length}` });
      
      if (exportOptions.includeFilters && filters) {
        const activeFilters = Object.entries(filters).filter(([key, value]) => value && value !== '');
        if (activeFilters.length > 0) {
          exportData.push({});
          exportData.push({ [allColumns[0]?.COLUMN_NAME]: 'APPLIED FILTERS:' });
          
          activeFilters.forEach(([key, value]) => {
            let filterDisplay = '';
            switch(key) {
              case 'logType':
                filterDisplay = `Log Type: ${value}`;
                break;
              case 'year':
                filterDisplay = `Year: ${value}`;
                break;
              case 'month':
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
                filterDisplay = `Month: ${monthNames[parseInt(value) - 1]}`;
                break;
              case 'week':
                filterDisplay = `Week: ${value}`;
                break;
              case 'status':
                filterDisplay = `Status: ${value}`;
                break;
              default:
                filterDisplay = `${key}: ${value}`;
            }
            exportData.push({ 
              [allColumns[0]?.COLUMN_NAME]: filterDisplay 
            });
          });
        }
      }
      
      exportData.push({});
      exportData.push({});
    }

    const headers = {};
    allColumns.forEach(column => {
      headers[column.COLUMN_NAME] = formatColumnName(column.COLUMN_NAME);
    });
    
    if (exportOptions.includeVirtualEntries) {
      headers['Entry_Type'] = 'Entry Type';
    }
    
    exportData.push(headers);

    filteredData.forEach(entry => {
      const row = {};
      
      allColumns.forEach(column => {
        const value = entry[column.COLUMN_NAME];
        row[column.COLUMN_NAME] = formatCellValue(value, column.COLUMN_NAME, column.DATA_TYPE);
      });
      
      if (exportOptions.includeVirtualEntries) {
        row['Entry_Type'] = entry.is_virtual ? 'Recurring' : 'Original';
      }
      
      exportData.push(row);
    });

    return exportData;
  };

  const exportToExcel = async () => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const allColumns = getDisplayColumns();
    if (allColumns.length === 0) {
      alert('No columns available to export');
      return;
    }

    setIsExporting(true);
    
    try {
      const exportData = prepareExportData();
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);


      const columnWidths = allColumns.map(column => {
        const columnName = formatColumnName(column.COLUMN_NAME);
        

        let maxWidth = columnName.length;
        

        const sampleSize = Math.min(data.length, 10);
        for (let i = 0; i < sampleSize; i++) {
          const entry = data[i];
          if (entry) {
            const value = String(formatCellValue(entry[column.COLUMN_NAME], column.COLUMN_NAME, column.DATA_TYPE) || '');
            if (value.length > maxWidth) {
              maxWidth = Math.min(value.length, 50); 
            }
          }
        }
        
        return { width: Math.max(10, maxWidth + 2) };
      });

      if (exportOptions.includeVirtualEntries) {
        columnWidths.push({ width: 15 });
      }

      ws['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(wb, ws, exportOptions.sheetName);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const file = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });


      const timestamp = new Date().toISOString().split('T')[0];
      let finalFilename = `${filename}_${timestamp}`;
      

      if (filters) {
        const activeFilters = Object.entries(filters).filter(([key, value]) => value && value !== '');
        if (activeFilters.length > 0) {
          const filterString = activeFilters.map(([key, value]) => `${key}_${value}`).join('_');
          finalFilename += `_filtered_${filterString}`;
        }
      }
      
      finalFilename += '.xlsx';

      saveAs(file, finalFilename);


      
      const filteredCount = data.filter(entry => !entry.is_virtual || exportOptions.includeVirtualEntries).length;
      alert(`Excel export completed successfully!\n\nExported ${filteredCount} records with ${allColumns.length} columns to ${finalFilename}`);
      
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={exportToExcel}
        disabled={disabled || isExporting}
        className="toolbar-menu-item action"
        title="Export filtered data to Excel file (all columns)"
      >
        <span className="toolbar-menu-item-label">
          {isExporting ? '⏳ Exporting...' : '📊 Export Excel'}
        </span>
      </button>
    );
  }

  return (
    <div className="excel-export">
      <div className="export-actions">
        <button
          onClick={() => setShowOptions(!showOptions)}
          disabled={disabled}
          className="btn btn-secondary"
        >
          ⚙️ Export Options
        </button>
        
        <button
          onClick={exportToExcel}
          disabled={disabled || isExporting}
          className="btn btn-success"
        >
          {isExporting ? '⏳ Exporting...' : '📊 Export to Excel'}
        </button>
      </div>

      {showOptions && (
        <div className="export-options">
          <h4>📊 Export Options</h4>
          
          <div className="option-group">
            <label className="option-label">
              <input
                type="checkbox"
                checked={exportOptions.includeMetadata}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  includeMetadata: e.target.checked
                }))}
              />
              Include metadata (title, date, record count)
            </label>
          </div>

          <div className="option-group">
            <label className="option-label">
              <input
                type="checkbox"
                checked={exportOptions.includeFilters}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  includeFilters: e.target.checked
                }))}
              />
              Include applied filter information
            </label>
          </div>

          <div className="option-group">
            <label className="option-label">
              <input
                type="checkbox"
                checked={exportOptions.includeVirtualEntries}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  includeVirtualEntries: e.target.checked
                }))}
              />
              Include recurring entries {showVirtualEntries ? '(currently shown)' : '(currently hidden)'}
            </label>
          </div>

          <div className="option-group">
            <label className="option-label">
              Sheet Name:
              <input
                type="text"
                value={exportOptions.sheetName}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  sheetName: e.target.value
                }))}
                className="option-input"
                placeholder="Enter sheet name"
              />
            </label>
          </div>

          <div className="export-preview">
            <h5>📋 Export Preview:</h5>
            <div className="preview-info">
              <div className="preview-item">
                <strong>Total Columns:</strong> {getDisplayColumns().length} (all columns)
              </div>
              <div className="preview-item">
                <strong>Filtered Records:</strong> {data.filter(entry => !entry.is_virtual || exportOptions.includeVirtualEntries).length}
              </div>
              <div className="preview-item">
                <strong>Will Export:</strong> {exportOptions.includeVirtualEntries ? 'Original + Recurring' : 'Original only'}
              </div>
              <div className="preview-item">
                <strong>Note:</strong> All database columns will be exported regardless of current visibility settings
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelExport;