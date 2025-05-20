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
      "Assigned": "Resource",
      "Note": "Summary",
      "Date+Start": "Scheduled date & time",
      "Acc. time": "Duration (hrs)",
      "District": "Affected site",
      "No": "#",
    };

    const excludedColumns = ["Incident", "Event", "Incid.", "Impact?", "RCA", "", "End", "Est. (hrs)"];
    const exportOrder = ["No", "Ticket #", "Assigned", "Note", "Date+Start", "Acc. time", "District"];
    const summaryCol = "Note";

    const cloned = table.cloneNode(true);
    const headers = Array.from(cloned.querySelectorAll('thead th')).map(th => th.textContent.trim());

    const indexesToRemove = headers
      .map((name, idx) => (excludedColumns.includes(name) ? idx : -1))
      .filter(idx => idx !== -1);

    [...indexesToRemove].sort((a, b) => b - a).forEach(idx => {
      cloned.querySelectorAll('thead tr').forEach(tr => tr.children[idx]?.remove());
      cloned.querySelectorAll('tbody tr').forEach(tr => tr.children[idx]?.remove());
    });

    const headersAfter = Array.from(cloned.querySelectorAll('thead th')).map(th => th.textContent.trim());

    // === Lignes du tableau HTML ===
    const body = Array.from(cloned.querySelectorAll('tbody tr')).map((tr, i) => {
      const cells = Array.from(tr.children).map(td => td.textContent.trim());
      const data = exportOrder.map(col => {
        if (col === "No") return `${i + 1}`;
        if (col === "Date+Start") {
          const dateIdx = headersAfter.indexOf("Date");
          const startIdx = headersAfter.indexOf("Start");
          const date = dateIdx !== -1 ? cells[dateIdx] : '';
          const start = startIdx !== -1 ? cells[startIdx] : '';
          return `${date} ${start}`.trim();
        }
        const idx = headersAfter.indexOf(col);
        return idx !== -1 ? cells[idx] : '';
      });

      const summaryIndex = exportOrder.indexOf(summaryCol);
      const summaryValue = data[summaryIndex]?.toLowerCase() ?? '';

      const isNoteMatched = adminNotes
        .filter(n => typeof n === 'string')
        .map(n => n.toLowerCase().trim())
        .some(note => summaryValue.includes(note));

      data.raw = { highlight: isNoteMatched, fromAdmin: false };
      return data;
    });

    // === Entrées admin (complètes)
    const adminFullRows = adminNotes
      .filter(n => typeof n === 'object' && n.date)
      .map((entry, i) => {
        const rowData = exportOrder.map(col => {
          if (col === "No") return `A${i + 1}`; // A = Admin
          if (col === "Date+Start") {
            const d = entry.date || '';
            const h = entry["Start"] || entry["Start(Duration (hrs))"] || '';
            return `${d} ${h}`.trim();
          }
          return entry[col] || entry[col.replace(" ", "_")] || '';
        });

        rowData.raw = { fromAdmin: true };
        return rowData;
      });

    const allRows = [...body, ...adminFullRows];

    // === Trié par date (col Date+Start si possible)
    const dateIndex = exportOrder.indexOf("Date+Start");

    allRows.sort((a, b) => {
      const da = new Date(a[dateIndex] || '');
      const db = new Date(b[dateIndex] || '');
      return da - db;
    });

    const translatedHeaders = exportOrder.map(col => columnRenames[col] || col);

    doc.setFontSize(10);
    doc.text('Export', 14, 15);

    doc.autoTable({
      head: [translatedHeaders],
      body: allRows,
      willDrawCell(data) {
        const meta = data.row.raw;
        if (meta?.fromAdmin) {
          data.cell.styles.fillColor = [220, 255, 220]; // vert pâle
          data.cell.styles.textColor = [0, 100, 0];     // vert foncé
        } else if (meta?.highlight) {
          data.cell.styles.fillColor = [255, 250, 205]; // jaune
          data.cell.styles.textColor = [200, 0, 0];     // rouge
        }
      },
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

    doc.save('Export.pdf');
  };

  return (
    <button onClick={exportPdf} style={{ marginBottom: '15px' }}>
      📄 Export
    </button>
  );
}
