// ===============================
// DashboardPage.jsx

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export default function DashboardPage({ workbook }) {
  const [summaryData, setSummaryData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    if (!workbook) return;

    const dashboardSheetName = workbook.SheetNames.find(name =>
      name.toLowerCase().includes('dashboard')
    );
    if (!dashboardSheetName) return;

    const sheet = workbook.Sheets[dashboardSheetName];
    const fullRange = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // ---- Tableau 1 : Statistiques globales (par année)
    const summaryStartIndex = fullRange.findIndex(row => row.includes("Année"));
    const summaryHeaders = fullRange[summaryStartIndex] || [];
    const summaryRows = fullRange
      .slice(summaryStartIndex + 1, summaryStartIndex + 15)
      .filter(row => row.some(cell => cell !== ''));
    const formattedSummary = summaryRows.map(row => {
      const obj = {};
      summaryHeaders.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    // ---- Tableau 2 : Détails hebdomadaires
    const weeklyStartIndex = fullRange.findIndex(row => row.includes("Week"));
    const weeklyHeaders = fullRange[weeklyStartIndex] || [];
    const weeklyRows = fullRange
      .slice(weeklyStartIndex + 1)
      .filter(row => row.some(cell => cell !== ''));
    const formattedWeekly = weeklyRows.map(row => {
      const obj = {};
      weeklyHeaders.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

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
                {Object.entries(row).map(([key, val], cIdx) => {
                  let backgroundColor;

                  if (typeof val === 'number') {
                    const k = key.toLowerCase();

                    if (k.includes('maintenance')) {
                      if (val > 16) backgroundColor = '#ffcccc'; // rouge
                      else if (val >= 5) backgroundColor = '#fffacc'; // jaune
                      else backgroundColor = '#d5fdd5'; // vert
                    }

                    else if (k.includes('incident')) {
                      backgroundColor = val >= 30 ? '#fffacc' : '#d5fdd5';
                    }

                    else if (k.includes('impact') && val > 0) {
                      backgroundColor = '#ffe0e0';
                    }
                  }

                  return (
                    <td key={cIdx} style={{ border: '1px solid #eee', padding: 8, backgroundColor }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ color: 'gray' }}>Aucune donnée trouvée pour les semaines.</p>}
    </div>
  );
}
