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
    const range1 = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const summaryStartIndex = range1.findIndex(row => Array.isArray(row) && row.includes("Année"));
    const summaryRows = range1.slice(summaryStartIndex + 1).filter(row => row.some(cell => cell !== ''));
    const summaryHeaders = range1[summaryStartIndex];
    const formattedSummary = summaryRows.map(row => {
      const obj = {};
      summaryHeaders.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    const range2 = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const weeklyStartIndex = range2.findIndex(row => Array.isArray(row) && row.includes("Week"));
    const weeklyRows = range2.slice(weeklyStartIndex + 1).filter(row => row.some(cell => cell !== ''));
    const weeklyHeaders = range2[weeklyStartIndex];
    const formattedWeekly = weeklyRows.map(row => {
      const obj = {};
      weeklyHeaders.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    // Nettoyage du premier tableau : transformer [ [Année, Maint, Incid]... ] en objets
    setSummaryData(formattedSummary);
    setWeeklyData(formattedWeekly);
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
