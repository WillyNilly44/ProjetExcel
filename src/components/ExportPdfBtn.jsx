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

    // Clone le tableau HTML visible
    const cloned = table.cloneNode(true);

    // Colonnes à exclure (exactes, sensibles à la casse)
    const excludedColumns = ["Incident", "Event", "Incid.", "Impact?", "RCA", "", "End", "Est. (hrs)"];

    // Ordre final désiré pour l’export
    const exportOrder = ["Ticket #", "Assigned", "Note", "Date", "Acc. time", "Temps Réel", "District"];

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
    const orderedIndexes = exportOrder.map(col => finalHeaders.indexOf(col)).filter(i => i !== -1);
    const orderedHeaders = exportOrder.filter(col => finalHeaders.includes(col));

    // Étape 5 : Lire lignes dans l’ordre
    const body = Array.from(cloned.querySelectorAll('tbody tr')).map(row => {
      const cells = Array.from(row.children);
      return orderedIndexes.map(idx => cells[idx]?.textContent.trim() ?? '');
    });

    // Étape 6 : Export PDF
    doc.setFontSize(10);
    doc.text(sheetName || 'Export', 14, 15);
    doc.autoTable({
      head: [orderedHeaders],
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
