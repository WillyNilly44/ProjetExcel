import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ExportPdfBtn({ sheetName }) {
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    // 1. Trouver le tableau visible
    const table = document.querySelector('table');
    if (!table) {
      alert("Aucun tableau trouvé à l'écran.");
      return;
    }

    // 2. Cloner le tableau pour le modifier sans toucher à l'original
    const cloned = table.cloneNode(true);

    // 3. Colonnes à exclure (exact nom d'en-tête visible)
    const excludedColumns = ["Incident", "Event", "Incid.", "Impact?", "RCA"]; // adapte selon ton contexte

    // 4. Trouver les index des colonnes à exclure
    const headerCells = Array.from(cloned.querySelectorAll('thead th'));
    const indexesToRemove = headerCells
      .map((cell, idx) => (excludedColumns.includes(cell.textContent.trim()) ? idx : -1))
      .filter(idx => idx !== -1);

    // 5. Supprimer les colonnes exclues dans le head
    headerCells.forEach((cell, idx) => {
      if (indexesToRemove.includes(idx)) cell.remove();
    });

    // 6. Supprimer les colonnes exclues dans chaque ligne
    cloned.querySelectorAll('tbody tr').forEach(row => {
      indexesToRemove.forEach(idx => {
        if (row.children[idx]) row.children[idx].remove();
      });
    });

    // 7. Exporter avec autoTable
    doc.setFontSize(10);
    doc.text(sheetName || 'Export', 14, 15);
    doc.autoTable({
      html: cloned,
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
