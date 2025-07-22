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
      const doc = new jsPDF('l', 'mm', 'a4'); 
      

      const currentData = data;
      const currentColumns = getDisplayColumns();
      
      if (currentData.length === 0) {
        alert('No data to export. Please adjust your filters or add some entries.');
        return;
      }
      
      const title = 'LOG REPORT';
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(title, 14, 15);

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const exportDate = new Date().toLocaleString();
      
      const tableHeaders = currentColumns.map(column => formatColumnName(column.COLUMN_NAME));
      

      const tableData = currentData.map(entry => {
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
      

      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 3, 
          overflow: 'linebreak', 
          halign: 'left',
          valign: 'top' 
        },
        headStyles: {
          fillColor: [59, 130, 246], 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        columnStyles: {
          ...Object.fromEntries(
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
          )
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        didParseCell: function (data) {
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
        },
        pageBreak: 'auto',
        showHead: 'everyPage', 
        margin: { top: 45, left: 10, right: 10, bottom: 14 } 
      });
      

      const hasVirtualEntries = currentData.some(entry => entry.is_virtual);
      if (hasVirtualEntries) {
        const finalY = doc.lastAutoTable.finalY || 45;
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text('🔄 = Virtual/Recurring entry', 14, finalY + 10);
      }
      
      const finalY = doc.lastAutoTable.finalY || 45;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('Note: All note and description fields are displayed in full without truncation.', 14, finalY + (hasVirtualEntries ? 20 : 10));
      
    
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      let filename = `log_entries_${dateStr}_${timeStr}`;
      
      filename += '.pdf';
      
   
      doc.save(filename);
      
 
      alert(`PDF exported successfully!\nEntries exported: ${currentData.length}\nFilename: ${filename}\n\nNote: All note fields are displayed in full.`);
      
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      alert('Failed to export PDF: ' + error.message);
    }
  };

  if (compact) {
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