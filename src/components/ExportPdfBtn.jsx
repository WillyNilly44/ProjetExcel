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

    // Clone du tableau HTML visible
    const cloned = table.cloneNode(true);

    // Colonnes à exclure
    const excludedColumns = ["Incident", "Event", "Incid.", "Impact?", "RCA", "", "End", "Est. (hrs)"];

    // Ordre désiré à l’export
    const exportOrder = ["No", "Ticket #", "Assigned", "Note", "Date+Start", "Acc. time", "District"];

    // === Étape 1 : En-têtes
    const headerCells = Array.from(cloned.querySelectorAll('thead th'));
    const headerNames = headerCells.map(cell => cell.textContent.trim());

    // === Étape 2 : Supprimer colonnes exclues
    const indexesToRemove = headerNames
      .map((name, idx) => (excludedColumns.includes(name) ? idx : -1))
      .filter(idx => idx !== -1);

    [...indexesToRemove].sort((a, b) => b - a).forEach(idx => {
      if (headerCells[idx]) headerCells[idx].remove();
      cloned.querySelectorAll('tbody tr').forEach(row => {
        if (row.children[idx]) row.children[idx].remove();
      });
    });

    // === Étape 3 : Nouvelles entêtes
    const finalHeaderCells = Array.from(cloned.querySelectorAll('thead th'));
    const finalHeaders = finalHeaderCells.map(cell => cell.textContent.trim());

    // === Étape 4 : Réordonner selon exportOrder
    const orderedHeaders = exportOrder;
    const orderedIndexes = exportOrder.map(col => {
      if (col === "Date+Start") return ["Date", "Start"];
      return finalHeaders.indexOf(col);
    }).filter(i => i !== -1);

    // === Étape 5 : Construire les lignes
    const body = Array.from(cloned.querySelectorAll('tbody tr')).map((row, i) => {
      const cells = Array.from(row.children);
      return exportOrder.map(col => {
        if (col === "No") return (i + 1).toString();

        if (col === "Date+Start") {
          const idxDate = finalHeaders.indexOf("Date");
          const idxStart = finalHeaders.indexOf("Start");
          const date = idxDate !== -1 ? cells[idxDate]?.textContent.trim() : '';
          const start = idxStart !== -1 ? cells[idxStart]?.textContent.trim() : '';
          return `${date} ${start}`.trim();
        }

        const idx = finalHeaders.indexOf(col);
        return idx !== -1 ? cells[idx]?.textContent.trim() ?? '' : '';
      });
    });

    // === Étape 6 : Traduire les noms de colonnes
    const headersRenamed = exportOrder.map(h => columnRenames[h] || h);

    // === Étape 7 : Export PDF avec surlignage de notes
    doc.setFontSize(10);
    doc.text('Export', 14, 15);

    const normalizedNotes = adminNotes.map(n => n.toLowerCase().trim());

    doc.autoTable({
      head: [headersRenamed],
      body: body,
      willDrawCell: function (data) {
        const colIdx = data.column.index;
        const colName = headersRenamed[colIdx];

        if (colName === "Summary") {
          const content = data.cell.text.join(' ').toLowerCase().trim();

          const match = normalizedNotes.some(note =>
            content.includes(note)
          );

          if (match) {
            console.log("🔍 Note trouvée dans Summary:", content);
            data.cell.styles.fillColor = [255, 250, 205]; // jaune pâle
            data.cell.styles.textColor = [200, 0, 0];     // rouge foncé
          }
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

    doc.save(`Export.pdf`);
  };

  return (
    <button onClick={exportPdf} style={{ marginBottom: '15px' }}>
      📄 Export
    </button>
  );
}
