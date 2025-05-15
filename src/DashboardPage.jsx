import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [sheetName, setSheetName] = useState(null);

  useEffect(() => {
    const workbook = window.workbookDashboard;

    if (!workbook) return;

    const dashboardSheetName = workbook.SheetNames.find(s =>
      s.toLowerCase().includes('dashboard')
    );

    if (!dashboardSheetName) {
      setSheetName(null);
      setData([]);
      return;
    }

    setSheetName(dashboardSheetName);
    const sheet = workbook.Sheets[dashboardSheetName];
    const parsedData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    setData(parsedData);
  }, []);

  if (!sheetName) {
    return <p style={{ padding: 20 }}>📄 Aucune feuille 'Dashboard' trouvée dans le fichier Excel.</p>;
  }

  if (!data.length) {
    return <p style={{ padding: 20 }}>📊 Feuille '{sheetName}' trouvée, mais aucune donnée détectée.</p>;
  }

  const headers = Object.keys(data[0]);

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Données du Dashboard</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {headers.map((h, idx) => (
              <th
                key={idx}
                style={{
                  border: '1px solid #ccc',
                  background: '#f0f4f8',
                  padding: '8px',
                  textAlign: 'left'
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => (
            <tr key={rIdx}>
              {headers.map((h, cIdx) => (
                <td
                  key={cIdx}
                  style={{
                    border: '1px solid #eee',
                    padding: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {row[h]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
