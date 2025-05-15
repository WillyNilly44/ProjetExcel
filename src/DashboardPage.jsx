// ===============================
// DashboardPage.jsx

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export default function DashboardPage({ workbook }) {
  const [summaryData, setSummaryData] = useState([]); // Tableau 1
  const [weeklyData, setWeeklyData] = useState([]);   // Tableau 2

  useEffect(() => {
    if (!workbook) return;

    const dashboardSheetName = workbook.SheetNames.find(s =>
      s.toLowerCase().includes('dashboard')
    );
    if (!dashboardSheetName) return;

    const sheet = workbook.Sheets[dashboardSheetName];

    // Lire les deux tableaux manuellement
    const range1 = XLSX.utils.sheet_to_json(sheet, { range: "F5:I13", header: 1 });
    const range2 = XLSX.utils.sheet_to_json(sheet, { range: "A17:K50", defval: '' });

    // Nettoyage du premier tableau : transformer [ [Année, Maint, Incid]... ] en objets
    const headers1 = range1[0];
    const rows1 = range1.slice(1);
    const formattedSummary = rows1.map(row => {
      const obj = {};
      headers1.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    setSummaryData(formattedSummary);
    setWeeklyData(range2);
  }, [workbook]);

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Feuille Dashboard</h2>

      <h3>Statistiques globales (par année)</h3>
      {summaryData.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 30 }}>
          <thead>
            <tr>
              {Object.keys(summaryData[0]).map((col, idx) => (
                <th key={idx} style={{ border: '1px solid #ccc', background: '#f0f4f8', padding: 8 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaryData.map((row, rIdx) => (
              <tr key={rIdx}>
                {Object.values(row).map((val, cIdx) => (
                  <td key={cIdx} style={{ border: '1px solid #eee', padding: 8 }}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ color: 'gray' }}>Aucune donnée trouvée pour les statistiques globales.</p>}

      <h3>Détails hebdomadaires</h3>
      {weeklyData.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {Object.keys(weeklyData[0]).map((col, idx) => (
                <th key={idx} style={{ border: '1px solid #ccc', background: '#f0f4f8', padding: 8 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeklyData.map((row, rIdx) => (
              <tr key={rIdx}>
                {Object.values(row).map((val, cIdx) => (
                  <td key={cIdx} style={{ border: '1px solid #eee', padding: 8 }}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ color: 'gray' }}>Aucune donnée trouvée pour les semaines.</p>}
    </div>
  );
}
