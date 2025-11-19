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
          { COLUMN_NAME: 'duration', DISPLAY_NAME: 'Duration' },
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
            let rawValue = entry[column.COLUMN_NAME];
            let cellValue;
            
            // Handle status and level columns specially to avoid formatting issues
            const columnName = column.COLUMN_NAME.toLowerCase();
            if (columnName.includes('status') || columnName.includes('level') || columnName.includes('type')) {
              // For status/level columns, use raw value directly to avoid formatCellValue issues
              cellValue = rawValue;
            } else {
              cellValue = formatCellValue(rawValue, column.COLUMN_NAME, column.DATA_TYPE);
            }
            
            if (entry.is_virtual && column.COLUMN_NAME.toLowerCase().includes('incident')) {
              cellValue = `🔄 ${cellValue}`;
            }
            
            // Ensure we have a clean string value
            let stringValue = '';
            if (cellValue !== null && cellValue !== undefined) {
              if (Array.isArray(cellValue)) {
                stringValue = cellValue.join(' ');
              } else if (typeof cellValue === 'object') {
                stringValue = JSON.stringify(cellValue);
              } else {
                stringValue = String(cellValue);
              }
            }
            
            // Clean up the string - remove leading dots, commas, extra spaces, and control characters
            stringValue = stringValue
              .replace(/^[.,\s\[\]"{}]+/, '') // Remove leading punctuation, brackets, quotes
              .replace(/[.,\s\[\]"{}]+$/, '') // Remove trailing punctuation, brackets, quotes
              .replace(/\s+/g, ' ') // Replace multiple spaces with single space
              .trim();
            
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
            } else if (columnName.includes('status')) {
              // Keep status values intact - don't truncate, ensure clean display
              return stringValue || 'N/A';
            } else if (columnName.includes('level') || columnName.includes('type')) {
              // Keep level and type values intact
              return stringValue || 'N/A';
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
        // Dashboard mode - improved column widths and styling
        const totalAvailableWidth = availableWidth - 10; // Leave some margin
        columnStyles = {
          0: { cellWidth: Math.max(15, totalAvailableWidth * 0.05), halign: 'center', fontSize: 8 }, // #
          1: { cellWidth: Math.max(25, totalAvailableWidth * 0.12), fontSize: 8 }, // Ticket #
          2: { cellWidth: Math.max(25, totalAvailableWidth * 0.12), fontSize: 8 }, // Assignee
          3: { cellWidth: Math.max(50, totalAvailableWidth * 0.25), fontSize: 7, overflow: 'linebreak' }, // Note
          4: { cellWidth: Math.max(30, totalAvailableWidth * 0.15), fontSize: 7 }, // Date & Time
          5: { cellWidth: Math.max(20, totalAvailableWidth * 0.08), halign: 'center', fontSize: 8 }, // Risk Level
          6: { cellWidth: Math.max(18, totalAvailableWidth * 0.08), halign: 'center', fontSize: 8 }, // Duration
          7: { cellWidth: Math.max(20, totalAvailableWidth * 0.10), halign: 'center', fontSize: 7 }, // Est. Downtime
          8: { cellWidth: Math.max(20, totalAvailableWidth * 0.08), halign: 'center', fontSize: 8 }, // Status
          9: { cellWidth: Math.max(25, totalAvailableWidth * 0.12), fontSize: 8 } // District
        };
      } else {
        // LOGS MODE: Improved dynamic column width calculation
        const totalColumns = currentColumns.length;
        const totalAvailableWidth = availableWidth - 10; // Leave margin for borders
        const baseWidth = Math.floor(totalAvailableWidth / totalColumns);
        
        columnStyles = Object.fromEntries(
          currentColumns.map((column, index) => {
            const columnName = column.COLUMN_NAME.toLowerCase();
            let width;
            let styles = {
              overflow: 'linebreak',
              cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
              fontSize: 8, // Increased default font size
              minCellHeight: 8
            };
            
            if (columnName.includes('note') || 
                columnName.includes('description') || 
                columnName.includes('comment') ||
                columnName.includes('remarks')) {
              // Notes get proportional space but not too wide
              width = Math.min(baseWidth * 2.2, totalAvailableWidth * 0.25);
              styles.fontSize = 7;
              styles.minCellHeight = 12;
              styles.overflow = 'linebreak';
            } else if (columnName.includes('date') || columnName.includes('time')) {
              width = Math.min(baseWidth * 1.1, Math.max(25, totalAvailableWidth * 0.12));
              styles.fontSize = 8;
            } else if (columnName.includes('id')) {
              width = Math.min(baseWidth * 0.8, Math.max(15, totalAvailableWidth * 0.08));
              styles.fontSize = 8;
              styles.halign = 'center';
            } else if (columnName.includes('status') || columnName.includes('type') || columnName.includes('level')) {
              width = Math.min(baseWidth * 0.9, Math.max(20, totalAvailableWidth * 0.10));
              styles.fontSize = 8;
              styles.halign = 'center';
            } else if (columnName.includes('duration') || columnName.includes('risk')) {
              width = Math.min(baseWidth * 0.8, Math.max(18, totalAvailableWidth * 0.08));
              styles.fontSize = 8;
              styles.halign = 'center';
            } else {
              // Default column width with better proportions
              width = Math.max(baseWidth * 0.9, totalAvailableWidth * 0.10);
              styles.fontSize = 8;
            }
            
            // Ensure minimum width and maximum constraints
            width = Math.max(width, 12); // Minimum width
            width = Math.min(width, totalAvailableWidth * 0.3); // Maximum 30% of page width
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
          fontSize: mode === 'dashboard' ? 8 : 7, // Increased base font size
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 }, // Better padding
          overflow: 'linebreak',
          halign: 'left',
          valign: 'top',
          lineColor: [180, 180, 180], // Darker border for better visibility
          lineWidth: 0.2, // Slightly thicker borders
          minCellHeight: 8 // Minimum cell height for better readability
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: mode === 'dashboard' ? 10 : 9, // Larger header font
          halign: 'center',
          cellPadding: { top: 4, right: 2, bottom: 4, left: 2 },
          lineWidth: 0.3 // Thicker header borders
        },
        columnStyles: columnStyles,
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        tableWidth: 'auto', // Changed from 'wrap' to 'auto' for better distribution
        tableLineColor: [180, 180, 180], // Consistent table line color
        tableLineWidth: 0.2,
        didParseCell: function (data) {
          // Clean up cell text - handle arrays and objects properly
          let cellText = '';
          if (data.cell.text && Array.isArray(data.cell.text)) {
            cellText = data.cell.text.join(' ').trim();
          } else if (data.cell.text) {
            cellText = String(data.cell.text).trim();
          } else {
            cellText = '';
          }
          
          // Remove leading dots, commas, or spaces
          cellText = cellText.replace(/^[.,\s]+/, '').trim();
          
          if (mode === 'dashboard') {
            // Dashboard-specific cell styling
            if (data.column.index === 5) { // Risk Level
              if (cellText && cellText.toLowerCase().includes('high')) {
                data.cell.styles.fillColor = [239, 68, 68];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (cellText && cellText.toLowerCase().includes('medium')) {
                data.cell.styles.fillColor = [245, 158, 11];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (cellText && cellText.toLowerCase().includes('low')) {
                data.cell.styles.fillColor = [34, 197, 94];
                data.cell.styles.textColor = [255, 255, 255];
              }
            }
            
            if (data.column.index === 8) { // Status
              if (cellText && cellText.toLowerCase().includes('completed')) {
                data.cell.styles.fillColor = [34, 197, 94];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (cellText && (cellText.toLowerCase().includes('progress') || cellText.toLowerCase().includes('pending'))) {
                data.cell.styles.fillColor = [245, 158, 11];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (cellText && (cellText.toLowerCase().includes('failed') || cellText.toLowerCase().includes('error'))) {
                data.cell.styles.fillColor = [239, 68, 68];
                data.cell.styles.textColor = [255, 255, 255];
              }
            }
          } else {
            // Logs mode styling
            const rowData = currentData[data.row.index];
            if (rowData && rowData.is_virtual) {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.textColor = [30, 64, 175];
            }
            
            // Apply status column styling for logs mode
            const columnName = currentColumns[data.column.index]?.COLUMN_NAME?.toLowerCase();
            
            if (columnName && columnName.includes('status') && cellText) {
              if (cellText.toLowerCase().includes('completed') || cellText.toLowerCase().includes('done')) {
                data.cell.styles.fillColor = [34, 197, 94];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (cellText.toLowerCase().includes('progress') || cellText.toLowerCase().includes('pending') || cellText.toLowerCase().includes('ongoing')) {
                data.cell.styles.fillColor = [245, 158, 11];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (cellText.toLowerCase().includes('failed') || cellText.toLowerCase().includes('error') || cellText.toLowerCase().includes('cancelled')) {
                data.cell.styles.fillColor = [239, 68, 68];
                data.cell.styles.textColor = [255, 255, 255];
              }
            }
            
            // Apply risk level styling for logs mode
            if (columnName && (columnName.includes('risk') || columnName.includes('level')) && cellText) {
              if (cellText.toLowerCase().includes('high')) {
                data.cell.styles.fillColor = [239, 68, 68];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (cellText.toLowerCase().includes('medium') || cellText.toLowerCase().includes('moderate')) {
                data.cell.styles.fillColor = [245, 158, 11];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (cellText.toLowerCase().includes('low')) {
                data.cell.styles.fillColor = [34, 197, 94];
                data.cell.styles.textColor = [255, 255, 255];
              }
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