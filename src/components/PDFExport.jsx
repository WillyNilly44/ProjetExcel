import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PDFExport = ({ 
  data, 
  columns, 
  filters, 
  showVirtualEntries, 
  formatColumnName, 
  formatCellValue, 
  getDisplayColumns,
  disabled = false,
  compact = false,
  // New dashboard-specific props
  mode = 'logs', // 'logs' or 'dashboard'
  title = 'LOG REPORT',
  formatDateTime = null, // Dashboard-specific date formatter
  getCellValue = null, // Dashboard-specific cell value getter
  customStats = null // Dashboard-specific statistics
}) => {
  
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); 
      
      let currentData, currentColumns;
      
      // Handle different modes
      if (mode === 'dashboard') {
        currentData = data;
        currentColumns = [
          { COLUMN_NAME: 'row_number', DISPLAY_NAME: '#' },
          { COLUMN_NAME: 'ticket_number', DISPLAY_NAME: 'Ticket #' },
          { COLUMN_NAME: 'assigned', DISPLAY_NAME: 'Assignee' },
          { COLUMN_NAME: 'note', DISPLAY_NAME: 'Note' },
          { COLUMN_NAME: 'datetime_combined', DISPLAY_NAME: 'Date & Time' },
          { COLUMN_NAME: 'risk_level', DISPLAY_NAME: 'Risk Level' },
          { COLUMN_NAME: 'actual_time', DISPLAY_NAME: 'Duration' },
          { COLUMN_NAME: 'expected_down_time', DISPLAY_NAME: 'Est. Downtime' },
          { COLUMN_NAME: 'log_status', DISPLAY_NAME: 'Status' },
          { COLUMN_NAME: 'district', DISPLAY_NAME: 'District' }
        ];
      } else {
        // Original logs mode
        currentData = data;
        currentColumns = getDisplayColumns();
      }
      
      if (currentData.length === 0) {
        alert(`No ${mode} data to export.`);
        return;
      }
      
      // MINIMAL HEADER: Only title
      const reportTitle = mode === 'dashboard' ? 'OPERATIONS DASHBOARD REPORT' : title;
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(reportTitle, 14, 20);

      // Prepare table headers
      const tableHeaders = mode === 'dashboard' 
        ? currentColumns.map(col => col.DISPLAY_NAME)
        : currentColumns.map(column => formatColumnName(column.COLUMN_NAME));
      
      // Prepare table data
      let tableData;
      
      if (mode === 'dashboard') {
        tableData = currentData.map((entry, index) => {
          return currentColumns.map(column => {
            if (column.COLUMN_NAME === 'row_number') {
              return (index + 1).toString();
            } else if (column.COLUMN_NAME === 'datetime_combined') {
              return formatDateTime ? formatDateTime(entry) : '';
            } else {
              const value = getCellValue ? getCellValue(entry, column) : entry[column.COLUMN_NAME];
              return value ? value.toString() : '';
            }
          });
        });
      } else {
        // Original logs mode logic
        tableData = currentData.map(entry => {
          return currentColumns.map(column => {
            let cellValue = formatCellValue(entry[column.COLUMN_NAME], column.COLUMN_NAME, column.DATA_TYPE);
            
            if (entry.is_virtual && column.COLUMN_NAME.toLowerCase().includes('incident')) {
              cellValue = `🔄 ${cellValue}`;
            }
            
            const stringValue = String(cellValue);
            const columnName = column.COLUMN_NAME.toLowerCase();
            
            if (columnName.includes('note') || 
                columnName.includes('description') || 
                columnName.includes('comment') ||
                columnName.includes('remarks')) {
              return stringValue; 
            }
            
            return stringValue.length > 50 ? stringValue.substring(0, 47) + '...' : stringValue;
          });
        });
      }

      // Column styles based on mode
      let columnStyles = {};
      
      if (mode === 'dashboard') {
        columnStyles = {
          0: { cellWidth: 15, halign: 'center' }, // #
          1: { cellWidth: 25 }, // Ticket #
          2: { cellWidth: 25 }, // Assignee
          3: { cellWidth: 50, fontSize: 6 }, // Note
          4: { cellWidth: 30, fontSize: 6 }, // Date & Time
          5: { cellWidth: 20, halign: 'center' }, // Risk Level
          6: { cellWidth: 18, halign: 'center' }, // Duration
          7: { cellWidth: 20, halign: 'center' }, // Est. Downtime
          8: { cellWidth: 20, halign: 'center' }, // Status
          9: { cellWidth: 25 } // District
        };
      } else {
        // Original column styles for logs
        columnStyles = Object.fromEntries(
          currentColumns.map((column, index) => {
            const columnName = column.COLUMN_NAME.toLowerCase();
            let width = 'auto';
            let minCellHeight = 10;
            
            if (columnName.includes('note') || 
                columnName.includes('description') || 
                columnName.includes('comment') ||
                columnName.includes('remarks')) {
              width = 60; 
              minCellHeight = 15; 
              return [index, { 
                cellWidth: width,
                minCellHeight: minCellHeight,
                overflow: 'linebreak',
                fontSize: 7 
              }];
            } else if (columnName.includes('date') || columnName.includes('time')) {
              width = 25;
            } else if (columnName.includes('id')) {
              width = 15;
            } else if (columnName.includes('status')) {
              width = 20;
            } else {
              width = 25; 
            }
            
            return [index, { cellWidth: width }];
          })
        );
      }

      // Create table - START RIGHT AFTER TITLE
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 30, // Start right after title
        styles: {
          fontSize: mode === 'dashboard' ? 7 : 8,
          cellPadding: mode === 'dashboard' ? 2 : 3,
          overflow: 'linebreak',
          halign: 'left',
          valign: mode === 'dashboard' ? 'middle' : 'top'
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: mode === 'dashboard' ? 8 : 9,
          halign: 'center'
        },
        columnStyles: columnStyles,
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        didParseCell: function (data) {
          if (mode === 'dashboard') {
            // Dashboard-specific cell styling
            if (data.column.index === 5) { // Risk Level
              const value = data.cell.text[0];
              if (value && value.toLowerCase().includes('high')) {
                data.cell.styles.fillColor = [239, 68, 68];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (value && value.toLowerCase().includes('medium')) {
                data.cell.styles.fillColor = [245, 158, 11];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (value && value.toLowerCase().includes('low')) {
                data.cell.styles.fillColor = [34, 197, 94];
                data.cell.styles.textColor = [255, 255, 255];
              }
            }
            
            if (data.column.index === 8) { // Status
              const value = data.cell.text[0];
              if (value && value.toLowerCase().includes('completed')) {
                data.cell.styles.fillColor = [34, 197, 94];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (value && (value.toLowerCase().includes('progress') || value.toLowerCase().includes('pending'))) {
                data.cell.styles.fillColor = [245, 158, 11];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (value && (value.toLowerCase().includes('failed') || value.toLowerCase().includes('error'))) {
                data.cell.styles.fillColor = [239, 68, 68];
                data.cell.styles.textColor = [255, 255, 255];
              }
            }
          } else {
            // Original logs mode styling
            const rowData = currentData[data.row.index];
            if (rowData && rowData.is_virtual) {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.textColor = [30, 64, 175];
            }
            
            const column = currentColumns[data.column.index];
            if (column) {
              const columnName = column.COLUMN_NAME.toLowerCase();
              if (columnName.includes('note')) {
                data.cell.styles.minCellHeight = 15;
                data.cell.styles.overflow = 'linebreak';
                data.cell.styles.cellPadding = 4;
              }
            }
          }
        },
        pageBreak: 'auto',
        showHead: 'everyPage',
        margin: { top: 30, left: 14, right: 14, bottom: 14 } // Minimal margins
      });

      // NO STATISTICS, NO METADATA, NO FOOTER NOTES - JUST TABLE!
      
      // Generate filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      let filename = mode === 'dashboard' 
        ? `dashboard_report_${dateStr}_${timeStr}`
        : `log_entries_${dateStr}_${timeStr}`;
      
      filename += '.pdf';
      
      // Save PDF
      doc.save(filename);
      
      // Minimal success message
      alert(`PDF exported successfully!\nEntries: ${currentData.length}\nFilename: ${filename}`);
      
    } catch (error) {
      console.error(`❌ ${mode} PDF export failed:`, error);
      alert(`Failed to export ${mode} PDF: ` + error.message);
    }
  };

  // Dynamic button text based on mode
  const getButtonText = () => {
    if (mode === 'dashboard') {
      return compact ? `📄 Export Dashboard PDF` : `📄 Export Dashboard PDF (${data.length})`;
    }
    return compact ? `📄 Export PDF` : `📄 Export PDF (${data.length})`;
  };

  const getButtonTitle = () => {
    if (data.length === 0) {
      return `No ${mode} data to export`;
    }
    if (mode === 'dashboard') {
      return `Export current week dashboard (${data.length} entries) to PDF`;
    }
    return `Export ${data.length} entries to PDF`;
  };

  if (compact) {
    return (
      <div className="pdf-export-compact">
        <button 
          onClick={exportToPDF}
          disabled={disabled || data.length === 0}
          className={`btn btn-export compact ${mode === 'dashboard' ? 'dashboard' : ''}`}
          title={getButtonTitle()}
        >
          {getButtonText()}
        </button>
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={exportToPDF}
        disabled={disabled || data.length === 0}
        className={`btn btn-export ${mode === 'dashboard' ? 'dashboard' : ''}`}
        title={getButtonTitle()}
      >
        {getButtonText()}
      </button>
    </>
  );
};

export default PDFExport;