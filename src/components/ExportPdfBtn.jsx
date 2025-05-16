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

    // === Clonage du tableau ===
    const cloned = table.cloneNode(true);

    const headers = Array.from(cloned.querySelectorAll('thead th')).map(th => th.textContent.trim());

    // Supprimer colonnes exclues
    const indexesToRemove = headers
      .map((name, idx) => excludedColumns.includes(name) ? idx : -1)
      .filter(idx => idx !== -1);

    [...indexesToRemove].sort((a, b) => b - a).forEach(idx => {
      cloned.querySelectorAll('thead tr').forEach(tr => tr.children[idx]?.remove());
      cloned.querySelectorAll('tbody tr').forEach(tr => tr.children[idx]?.remove());
    });

    // Recalculer les headers restants
    const headersAfter = Array.from(cloned.querySelectorAll('thead th')).map(th => th.textContent.trim());

    // === Construction des lignes ===
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
      const summaryValue = data[summaryIndex]?.toLowerCase() ?? "";

      console.log(summaryValue);

      const isNoteMatched = adminNotes
        .map(n => n.toLowerCase().trim())
        .some(note => summaryValue.includes(note));

      // Ajouter métadonnée de surlignage
      data.raw = { highlight: isNoteMatched };

      return data;
    });

    // Traduire les colonnes
    const translatedHeaders = exportOrder.map(col => columnRenames[col] || col);

    // === Génération PDF ===
    doc.setFontSize(10);
    doc.text('Export', 14, 15);

    doc.autoTable({
      head: [translatedHeaders],
      body,
      willDrawCell: function (data) {
        if (data.row.raw?.highlight) {
          data.cell.styles.fillColor = [255, 250, 205];
          data.cell.styles.textColor = [200, 0, 0];
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
