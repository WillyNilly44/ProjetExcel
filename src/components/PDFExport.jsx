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
  compact = false
}) => {
  
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      
      // Get current filtered data
      const currentData = data;
      const currentColumns = getDisplayColumns();
      
      if (currentData.length === 0) {
        alert('No data to export. Please adjust your filters or add some entries.');
        return;
      }
      
      // Document title
      const title = 'LOG REPORT';
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(title, 14, 15);
      
      // Export info
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const exportDate = new Date().toLocaleString();
      
      // Prepare table headers
      const tableHeaders = currentColumns.map(column => formatColumnName(column.COLUMN_NAME));
      
      // Prepare table data
      const tableData = currentData.map(entry => {
        return currentColumns.map(column => {
          let cellValue = formatCellValue(entry[column.COLUMN_NAME], column.COLUMN_NAME, column.DATA_TYPE);
          
          // Add virtual entry indicator
          if (entry.is_virtual && column.COLUMN_NAME.toLowerCase().includes('incident')) {
            cellValue = `🔄 ${cellValue}`;
          }
          
          // Convert to string - NO LENGTH LIMIT for note columns
          const stringValue = String(cellValue);
          const columnName = column.COLUMN_NAME.toLowerCase();
          
          // Don't truncate note, description, or comment columns
          if (columnName.includes('note') || 
              columnName.includes('description') || 
              columnName.includes('comment') ||
              columnName.includes('remarks')) {
            return stringValue; // Return full text
          }
          
          // Limit other columns for better layout
          return stringValue.length > 50 ? stringValue.substring(0, 47) + '...' : stringValue;
        });
      });
      
      // Generate table with enhanced note column handling
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 3, // Increased padding for better readability
          overflow: 'linebreak', // Allow text wrapping
          halign: 'left',
          valign: 'top' // Align text to top of cell
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue color
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        columnStyles: {
          // Dynamic column widths with special handling for note columns
          ...Object.fromEntries(
            currentColumns.map((column, index) => {
              const columnName = column.COLUMN_NAME.toLowerCase();
              let width = 'auto';
              let minCellHeight = 10;
              
              if (columnName.includes('note') || 
                  columnName.includes('description') || 
                  columnName.includes('comment') ||
                  columnName.includes('remarks')) {
                width = 60; // Much wider for note columns
                minCellHeight = 15; // Allow more height
                return [index, { 
                  cellWidth: width,
                  minCellHeight: minCellHeight,
                  overflow: 'linebreak',
                  fontSize: 7 // Slightly smaller font to fit more text
                }];
              } else if (columnName.includes('date') || columnName.includes('time')) {
                width = 25;
              } else if (columnName.includes('id')) {
                width = 15;
              } else if (columnName.includes('status')) {
                width = 20;
              } else {
                width = 25; // Default width for other columns
              }
              
              return [index, { cellWidth: width }];
            })
          )
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        didParseCell: function (data) {
          // Color virtual entries differently
          const rowData = currentData[data.row.index];
          if (rowData && rowData.is_virtual) {
            data.cell.styles.fillColor = [219, 234, 254]; // Light blue for virtual entries
            data.cell.styles.textColor = [30, 64, 175]; // Dark blue text
          }
          
          // Special styling for note columns
          const column = currentColumns[data.column.index];
          if (column) {
            const columnName = column.COLUMN_NAME.toLowerCase();
            if (columnName.includes('note')) {
              // Allow more height for note cells
              data.cell.styles.minCellHeight = 15;
              data.cell.styles.overflow = 'linebreak';
              data.cell.styles.cellPadding = 4;
            }
          }
        },
        // Allow table to break across pages if needed
        pageBreak: 'auto',
        showHead: 'everyPage', // Show headers on every page
        margin: { top: 45, left: 10, right: 10, bottom: 14 } // Reduced side margins for more space
      });
      
      // Add legend for virtual entries if any exist
      const hasVirtualEntries = currentData.some(entry => entry.is_virtual);
      if (hasVirtualEntries) {
        const finalY = doc.lastAutoTable.finalY || 45;
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('🔄 = Virtual/Recurring entry', 14, finalY + 10);
      }
      
      // Add note about full text display
      const finalY = doc.lastAutoTable.finalY || 45;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('Note: All note and description fields are displayed in full without truncation.', 14, finalY + (hasVirtualEntries ? 20 : 10));
      
      // Generate filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      let filename = `log_entries_${dateStr}_${timeStr}`;
      
      filename += '.pdf';
      
      // Save the PDF
      doc.save(filename);
      
      // Show success message
      alert(`PDF exported successfully!\nEntries exported: ${currentData.length}\nFilename: ${filename}\n\nNote: All note fields are displayed in full.`);
      
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      alert('Failed to export PDF: ' + error.message);
    }
  };

  if (compact) {
    // Compact version for dropdown
    return (
      <div className="pdf-export-compact">
        <button 
          onClick={exportToPDF}
          disabled={disabled || data.length === 0}
          className="btn btn-export compact"
          title={data.length === 0 ? 'No data to export' : `Export ${data.length} entries to PDF (notes in full)`}
        >
          📄 Export PDF ({data.length})
        </button>
      </div>
    );
  }

  // Original version for standalone use
  return (
    <>
      {/* Export Button */}
      <button 
        onClick={exportToPDF}
        disabled={disabled || data.length === 0}
        className="btn btn-export"
        title={data.length === 0 ? 'No data to export' : `Export ${data.length} entries to PDF (notes in full)`}
      >
        📄 Export PDF ({data.length})
      </button>
    </>
  );
};

export default PDFExport;