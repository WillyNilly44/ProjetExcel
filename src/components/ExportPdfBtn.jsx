import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ExportPdfBtn({ filteredData = [], selectedColumns = [] }) {
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    const columnRenames = {
  "Incident": "Incident",
  "District": "Affected site",
  "Date": "Date",
  "Duration (hrs)": "Estimated duration",
  "__EMPTY_2": "Start",
  "__EMPTY_3": "End",
  "__EMPTY_4": "Acc. Bus. Imp.",
  "__EMPTY_5": "Acc. time",
  "Business impact ?": "Impact ?",
  "RCA": "RCA",
  "Ticket #": "Ticket #",
  "Assigned": "Resource",
  "Note": "Summary",
  "Status": "Status"
};

    const fallbackOrder = Object.keys(filteredData[0] || {});
    const exportOrder = selectedColumns.length > 0 ? selectedColumns : fallbackOrder;

    
    const body = filteredData.map((row, idx) => {
      return exportOrder.map(col => {
        if (col === "Date+Start") {
          const date = row["Date"] || "";
          const start = row["__EMPTY_2"] || "";
          return `${date} ${start}`.trim();
        }
        if (col === "No") return `${idx + 1}`;
        return row[col] ?? "";
      });
    });

    const translatedHeaders = exportOrder.map(col => columnRenames[col] || col);

    doc.setFontSize(10);
    doc.text('Export', 14, 15);
    doc.autoTable({
      head: [translatedHeaders],
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

    doc.save('Export.pdf');
  };

  return (
    <button onClick={exportPdf} className="accent-button" style={{ marginBottom: '15px' }}>
      📄 Export
    </button>
  );
}
