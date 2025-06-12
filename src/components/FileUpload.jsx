import React, { useRef } from 'react';
import * as XLSX from 'xlsx';

const FileUpload = ({ onDataLoaded }) => {
  const inputRef = useRef();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/.netlify/functions/uploadExcel', {
        method: 'POST',
        body: formData,
      });

      const text = await res.text();
      const { url } = JSON.parse(text);

      if (!url) throw new Error('URL de téléchargement manquante');

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheets = workbook.SheetNames.reduce((acc, sheetName) => {
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        acc[sheetName] = data;
        return acc;
      }, {});

      onDataLoaded(sheets);
    } catch (err) {
      console.error('Error while uploading:', err);
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <button className="primary-button" onClick={() => inputRef.current?.click()}>
        📤 Upload excel file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default FileUpload;
