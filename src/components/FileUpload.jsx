import React from 'react';
import * as XLSX from 'xlsx';

export default function FileUpload({ onWorkbookLoaded }) {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const validSheets = workbook.SheetNames.filter(name =>
        name.toLowerCase().includes('operational') ||
        name.toLowerCase().includes('application')
      );

      if (validSheets.length === 0) {
        alert("Aucune feuille valide (Operational/Application Logs) trouvée.");
        return;
      }

      onWorkbookLoaded(workbook, validSheets);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <input type="file" accept=".xlsx, .xls" onChange={handleFile} />
    </div>
  );
}
