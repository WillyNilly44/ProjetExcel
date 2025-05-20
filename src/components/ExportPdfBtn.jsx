// === ExportPdfBtn.jsx ===
import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ExportPdfBtn({ adminNotes = [] }) {
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const table = document.querySelector('table');
    if (!table) {
      alert("Aucun tableau trouvé à l'écran.");
      return;
    }

    const columnRenames = {
      "Incident": "Incident",
      "District": "District",
      "Date": "Date",
      "Maint.(event)": "Maint.",
      "Incid.(Event)": "Incid.",
      "Business impact": "Impact",
      "RCA": "RCA",
      "Est.(Duration (hrs))": "Est.",
      "Start(Duration (hrs))": "Start",
      "End(Duration (hrs))": "End",
      "Real time(Duration (hrs))": "Real",
      "Ticket #": "Ticket",
      "Assigned": "Resource",
      "Note": "Summary"
    };

    const exportOrder = Object.keys(columnRenames);
    const headersRenamed = exportOrder.map(h => columnRenames[h]);

    // === Lignes du tableau HTML ===
    const cloned = table.cloneNode(true);
    const headerCells = Array.from(cloned.querySelectorAll('thead th'));
    const headerNames = headerCells.map(cell => cell.textContent.trim());

    const finalHeaders = exportOrder.filter(h => headerNames.includes(h));
    const body = Array.from(cloned.querySelectorAll('tbody tr')).map((row, i) => {
      const cells = Array.from(row.children);
      const rowData = exportOrder.map(col => {
        const idx = headerNames.indexOf(col);
        return idx !== -1 ? cells[idx]?.textContent.trim() ?? '' : '';
      });
      const rowObj = Object.fromEntries(exportOrder.map((k, i) => [k, rowData[i]]));
      return rowObj;
    });

    // === Ajouter les entrées admin ===
    const allData = [...body, ...adminNotes];

    // === Tri par date ===
    allData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

    const finalBody = allData.map((row, i) => (
      exportOrder.map(k => row[k] ?? '')
    ));

    doc.setFontSize(10);
    doc.text('Export', 14, 15);

    doc.autoTable({
      head: [headersRenamed],
      body: finalBody,
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

    doc.save(`Export.pdf`);
  };

  return (
    <button onClick={exportPdf} style={{ marginBottom: '15px' }}>
      📄 Export
    </button>
  );
}