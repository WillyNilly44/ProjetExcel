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
  compact = false // ✅ NEW: Add compact mode for dropdown
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
      const title = 'LOG  REPORT';
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
          
          // Convert to string and limit length for PDF
          const stringValue = String(cellValue);
          return stringValue.length > 50 ? stringValue.substring(0, 47) + '...' : stringValue;
        });
      });
      
      // Generate table
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'left'
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue color
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        columnStyles: {
          // Make some columns wider/narrower based on content
          ...Object.fromEntries(
            currentColumns.map((column, index) => {
              const columnName = column.COLUMN_NAME.toLowerCase();
              let width = 'auto';
              
              if (columnName.includes('note') || columnName.includes('description')) {
                width = 40;
              } else if (columnName.includes('date') || columnName.includes('time')) {
                width = 25;
              } else if (columnName.includes('id')) {
                width = 15;
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
        },
        margin: { top: 45, left: 14, right: 14, bottom: 14 }
      });
      
      // Add legend for virtual entries if any exist
      const hasVirtualEntries = currentData.some(entry => entry.is_virtual);
      if (hasVirtualEntries) {
        const finalY = doc.lastAutoTable.finalY || 45;
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('🔄 = Virtual/Recurring entry', 14, finalY + 10);
      }
      
      // Generate filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      let filename = `log_entries_${dateStr}_${timeStr}`;
      
      filename += '.pdf';
      
      // Save the PDF
      doc.save(filename);
      
      // Show success message
      alert(`PDF exported successfully!\nEntries exported: ${currentData.length}\nFilename: ${filename}`);
      
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
          title={data.length === 0 ? 'No data to export' : `Export ${data.length} entries to PDF`}
        >
          📄 Export PDF ({data.length})
        </button>
        
        {data.length > 0 && (
          <div className="export-info-compact">
            <span className="export-count">
              {data.length} entries ready
              {showVirtualEntries && data.filter(e => e.is_virtual).length > 0 && (
                <span className="virtual-count">
                  ({data.filter(e => e.is_virtual).length} virtual)
                </span>
              )}
            </span>
          </div>
        )}
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
        title={data.length === 0 ? 'No data to export' : `Export ${data.length} entries to PDF`}
      >
        📄 Export PDF ({data.length})
      </button>
      
      {/* Export Info Panel */}
      {data.length > 0 && (
        <div className="export-info">
          <div className="export-info-content">
            <span className="export-info-icon">📄</span>
            <span className="export-info-text">
              Ready to export: <strong>{data.length}</strong> entries
              {showVirtualEntries && data.filter(e => e.is_virtual).length > 0 && (
                <span className="export-virtual-note">
                  (including {data.filter(e => e.is_virtual).length} virtual entries)
                </span>
              )}
            </span>
            <button 
              onClick={exportToPDF}
              className="export-quick-btn"
              disabled={disabled}
            >
              📄 Quick Export
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PDFExport;