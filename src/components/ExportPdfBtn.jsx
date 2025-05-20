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

    // === Cloner et nettoyer le tableau HTML ===
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

    // === Lignes normales (issues du tableau HTML)
    const body = Array.from(cloned.querySelectorAll('tbody tr')).map((tr, i) => {
      const cells = Array.from(tr.children).map(td => td.textContent.trim());

      const row = exportOrder.map(col => {
        if (col === "No") return `${i + 1}`;
        if (col === "Date+Start") {
          const d = headersAfter.indexOf("Date");
          const s = headersAfter.indexOf("Start");
          const date = d !== -1 ? cells[d] : '';
          const start = s !== -1 ? cells[s] : '';
          return `${date} ${start}`.trim();
        }
        const idx = headersAfter.indexOf(col);
        return idx !== -1 ? cells[idx] : '';
      });

      const summaryIndex = exportOrder.indexOf(summaryCol);
      const summaryValue = row[summaryIndex]?.toLowerCase() ?? '';

      const isNoteMatched = adminNotes
        .filter(n => typeof n === 'string')
        .map(n => n.toLowerCase().trim())
        .some(note => summaryValue.includes(note));

      row.raw = { highlight: isNoteMatched, fromAdmin: false };
      return row;
    });

    const adminKeyMap = {
      "Ticket #": "ticket_number",
      "Assigned": "assigned",
      "Note": "note",
      "Date+Start": { date: "date", time: "start_duration_hrs" },
      "Acc. time": "real_time_duration_hrs",
      "District": "district"
    };

    const adminFormatted = adminNotes
      .filter(note => typeof note === 'object' && note.date)
      .map((entry, i) => {
        const data = exportOrder.map(col => {
          if (col === "No") return `A${i + 1}`;
          if (col === "Date+Start") {
            const d = entry[adminKeyMap[col]?.date] || '';
            const h = entry[adminKeyMap[col]?.time] || '';
            return `${d} ${h}`.trim();
          }
          const key = adminKeyMap[col] || col;
          return entry[key] || '';
        });

        data.raw = { fromAdmin: true };
        return data;
      });

    const allRows = [...body, ...adminFormatted];

    // Tri par date (optionnel)
    const dateIdx = exportOrder.indexOf("Date+Start");
    allRows.sort((a, b) => new Date(a[dateIdx]) - new Date(b[dateIdx]));

    const finalBody = allRows;

    const translatedHeaders = exportOrder.map(col => columnRenames[col] || col);

    // === Génération PDF
    doc.setFontSize(10);
    doc.text('Export', 14, 15);

    doc.autoTable({
      head: [translatedHeaders],
      body: allRows,
      willDrawCell: function (data) {
        if (data.row.raw?.fromAdmin) {
          data.cell.styles.fillColor = [220, 255, 220];
          data.cell.styles.textColor = [0, 100, 0];
        } else if (data.row.raw?.highlight) {
          data.cell.styles.fillColor = [255, 250, 205];
          data.cell.styles.textColor = [200, 0, 0];
        }
      }
      ,
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
