import React from 'react';
import * as XLSX from 'xlsx';

export default function FileUpload({ onWorkbookLoaded }) {
  const handleFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const validSheets = workbook.SheetNames
        .filter(name =>
          name.toLowerCase().includes('operational logs') ||
          name.toLowerCase().includes('application logs')
        )
        .slice(-2);

      if (validSheets.length === 0) {
        alert("Aucune feuille 'operational logs' ou 'application logs' trouvée.");
        return;
      }

      onWorkbookLoaded(workbook, validSheets);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <input type="file" accept=".xlsx, .xls" onChange={handleFile} />
  );
}