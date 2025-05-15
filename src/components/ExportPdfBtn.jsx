import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ExportPdfBtn({ sheetName }) {
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
      "Date": "Scheduled date & time",
      "Acc. time": "Duration (hrs)",
      "District": "Affected site",
      "No": "No",
    };

    // Clone le tableau HTML visible
    const cloned = table.cloneNode(true);

    // Colonnes à exclure (exactes, sensibles à la casse)
    const excludedColumns = ["Incident", "Event", "Incid.", "Impact?", "RCA", "", "End", "Est. (hrs)"];

    // Ordre final désiré pour l’export
    const exportOrder = ["No", "Ticket #", "Assigned", "Note", "Date + Start", "Acc. time", "District"];

    // Étape 1 : Trouver en-têtes
    const headerCells = Array.from(cloned.querySelectorAll('thead th'));
    const headerNames = headerCells.map(cell => cell.textContent.trim());

    // Étape 2 : Supprimer colonnes exclues (descendant pour garder index valides)
    const indexesToRemove = headerNames
      .map((name, idx) => (excludedColumns.includes(name) ? idx : -1))
      .filter(idx => idx !== -1);

    [...indexesToRemove].sort((a, b) => b - a).forEach(idx => {
      if (headerCells[idx]) headerCells[idx].remove();
      cloned.querySelectorAll('tbody tr').forEach(row => {
        if (row.children[idx]) row.children[idx].remove();
      });
    });

    // Étape 3 : Recalculer les en-têtes restants
    const finalHeaderCells = Array.from(cloned.querySelectorAll('thead th'));
    const finalHeaders = finalHeaderCells.map(cell => cell.textContent.trim());

    // Étape 4 : Réordonner selon exportOrder
    const orderedIndexes = exportOrder.map(col => {
      if (col === "Date + Start") return ["Date", "Start"];
      return finalHeaders.indexOf(col);
    }).filter(i => i !== -1);
    const orderedHeaders = exportOrder.filter(col => finalHeaders.includes(col));

    // Étape 5 : Lire lignes dans l’ordre
    const body = Array.from(cloned.querySelectorAll('tbody tr')).map((row, i) => {
      const cells = Array.from(row.children);
      return exportOrder.map(col => {
        if (col === "No") {
          return (i + 1).toString();
        }
        if (col === "Date+Début") {
          const idxDate = finalHeaders.indexOf("Date");
          const idxStart = finalHeaders.indexOf("Début"); // ou "Start"
          const date = cells[idxDate]?.textContent.trim() ?? '';
          const start = cells[idxStart]?.textContent.trim() ?? '';
          return `${date} ${start}`.trim();
        } else {
          const idx = finalHeaders.indexOf(col);
          return cells[idx]?.textContent.trim() ?? '';
        }
      });
    });




    const headersRenamed = orderedHeaders.map(h => columnRenames[h] || h);


    // Étape 6 : Export PDF
    doc.setFontSize(10);
    doc.text(sheetName || 'Export', 14, 15);
    doc.autoTable({
      head: [headersRenamed],
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

    doc.save(`${sheetName || 'export'}.pdf`);
  };

  return (
    <button onClick={exportPdf} style={{ marginBottom: '15px' }}>
      📄 Export
    </button>
  );
}
