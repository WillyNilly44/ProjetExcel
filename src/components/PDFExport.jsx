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
      const pageWidth = doc.internal.pageSize.getWidth(); // Get actual page width
      const availableWidth = pageWidth - 28; // Account for margins (14mm left + 14mm right)
      
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
      
      // Prepare table data with proper text wrapping
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
        // LOGS MODE: Improved text handling for better fit
        tableData = currentData.map(entry => {
          return currentColumns.map(column => {
            let cellValue = formatCellValue(entry[column.COLUMN_NAME], column.COLUMN_NAME, column.DATA_TYPE);
            
            if (entry.is_virtual && column.COLUMN_NAME.toLowerCase().includes('incident')) {
              cellValue = `🔄 ${cellValue}`;
            }
            
            const stringValue = String(cellValue || '');
            const columnName = column.COLUMN_NAME.toLowerCase();
            
            // Handle different column types for better fitting
            if (columnName.includes('note') || 
                columnName.includes('description') || 
                columnName.includes('comment') ||
                columnName.includes('remarks')) {
              // Keep full text for notes but let autoTable handle wrapping
              return stringValue;
            } else if (columnName.includes('date') || columnName.includes('time')) {
              // Format dates to be more compact
              return stringValue.length > 16 ? stringValue.substring(0, 16) : stringValue;
            } else if (columnName.includes('id')) {
              // IDs should be short
              return stringValue;
            } else {
              // For other columns, limit length but not too aggressively
              return stringValue.length > 30 ? stringValue.substring(0, 27) + '...' : stringValue;
            }
          });
        });
      }

      // DYNAMIC COLUMN STYLES based on actual columns and available width
      let columnStyles = {};
      
      if (mode === 'dashboard') {
        // Dashboard mode - fixed column widths that fit in page
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
        // LOGS MODE: Calculate dynamic column widths to fit page
        const totalColumns = currentColumns.length;
        const baseWidth = Math.floor(availableWidth / totalColumns);
        
        columnStyles = Object.fromEntries(
          currentColumns.map((column, index) => {
            const columnName = column.COLUMN_NAME.toLowerCase();
            let width;
            let styles = {
              overflow: 'linebreak',
              cellPadding: 2
            };
            
            if (columnName.includes('note') || 
                columnName.includes('description') || 
                columnName.includes('comment') ||
                columnName.includes('remarks')) {
              // Notes get more space but still fit in page
              width = Math.min(baseWidth * 2.5, availableWidth * 0.3);
              styles.fontSize = 6;
              styles.minCellHeight = 12;
            } else if (columnName.includes('date') || columnName.includes('time')) {
              width = Math.min(baseWidth * 1.2, 30);
              styles.fontSize = 7;
            } else if (columnName.includes('id')) {
              width = Math.min(baseWidth * 0.7, 20);
              styles.fontSize = 7;
              styles.halign = 'center';
            } else if (columnName.includes('status') || columnName.includes('type')) {
              width = Math.min(baseWidth * 0.9, 25);
              styles.fontSize = 7;
              styles.halign = 'center';
            } else {
              // Default column width
              width = baseWidth;
              styles.fontSize = 7;
            }
            
            // Ensure width doesn't exceed available space
            width = Math.min(width, availableWidth / totalColumns);
            styles.cellWidth = width;
            
            return [index, styles];
          })
        );
      }

      // Create table with improved settings
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 30,
        styles: {
          fontSize: mode === 'dashboard' ? 7 : 6, // Smaller font for better fit
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 }, // Reduced padding
          overflow: 'linebreak',
          halign: 'left',
          valign: 'top',
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: mode === 'dashboard' ? 8 : 7,
          halign: 'center',
          cellPadding: { top: 3, right: 1, bottom: 3, left: 1 }
        },
        columnStyles: columnStyles,
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        tableWidth: 'wrap', // Let table adjust to content
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
          }
        },
        pageBreak: 'auto',
        showHead: 'everyPage',
        margin: { top: 30, left: 14, right: 14, bottom: 14 },
        theme: 'grid' // Add grid theme for better table appearance
      });

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
      
      // Success message with fit info
      const fitMessage = mode === 'logs' ? '\nOptimized to fit all columns on page.' : '';
      alert(`PDF exported successfully!\nEntries: ${currentData.length}\nFilename: ${filename}${fitMessage}`);
      
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
    return `Export ${data.length} entries to PDF (optimized fit)`;
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