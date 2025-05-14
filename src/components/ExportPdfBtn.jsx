import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ExportPdfBtn({ filteredData, currentPage, pageSize, sheetName }) {
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    const excludedColumns = ["Stack Trace", "Durée"]; // <- à personnaliser
    const start = currentPage * pageSize;
    const pageData = filteredData.slice(start, start + pageSize);

    if (pageData.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }

    const headers = Object.keys(pageData[0]).filter(h => !excludedColumns.includes(h));
    const body = pageData.map(row => headers.map(h => row[h] ?? ''));

    doc.setFontSize(10);
    doc.text(sheetName, 14, 15);
    doc.autoTable({
      head: [headers],
      body,
      startY: 20,
      styles: {
        fontSize: 8,
        overflow: 'linebreak',
        cellPadding: 2,
        valign: 'top'
      },
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        halign: 'left'
      },
      margin: { left: 10, right: 10 }
    });

    doc.save(sheetName + '.pdf');
  };

  return (
    <button onClick={exportPdf} style={{ marginBottom: '15px' }}>📄 Export</button>
  );
}
